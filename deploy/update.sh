#!/usr/bin/env bash
# Manual update, timer update and rollback use the same exclusive lock.
set -euo pipefail
cd "$(dirname "$0")/.."
app=$(pwd -P)
mode=${1:---manual}
case "$mode" in --auto|--manual|--rollback|--resume) ;; *) exit 2 ;; esac
if [[ ${2:-} != --locked ]]; then
  exec flock -x /run/gasanovdoc-release.lock bash "$app/deploy/update.sh" "$mode" --locked
fi
store="$app/.site-releases"
if [[ "$mode" == --rollback ]]; then
  exec python3 deploy/activate.py --rollback
fi
if [[ "$mode" == --resume ]]; then rm -f "$store/paused"; fi
if [[ -f "$store/paused" ]]; then echo 'Обновления приостановлены после отката. Для продолжения используйте --resume.'; exit 0; fi
[[ $(git symbolic-ref --short HEAD) == main ]]
git fetch -q origin main
if [[ $(git rev-parse HEAD) != $(git rev-parse origin/main) ]]; then
  git merge-base --is-ancestor HEAD origin/main
  git merge --ff-only origin/main
  exec bash "$app/deploy/update.sh" "$mode" --locked
fi
revision=$(git rev-parse HEAD)
published=$(cat dist/site-version.txt 2>/dev/null || true)
if [[ "$published" == "$revision" && "$mode" == --auto ]]; then exit 0; fi

mkdir -p "$store"
build=$(mktemp -d "$store/build.XXXXXXXX")
trap 'rm -rf -- "$build"' EXIT
git archive "$revision" | tar -x -C "$build"
(
  cd "$build"
  npm ci
  npm run build
  npm run prelaunch
  python3 deploy/check-static.py dist
)
printf '%s\n' "$revision" > "$build/dist/site-version.txt"
# If backend files are unchanged, a static release does not interrupt the API.
api_revision=$(cat "$store/api-version" 2>/dev/null || true)
if [[ -z "$api_revision" ]] || ! git diff --quiet "$api_revision" "$revision" -- server; then
  (cd server && npm ci --omit=dev)
  systemctl restart gasanovdoc-api
  curl --retry 8 --retry-connrefused --retry-delay 1 -fsS http://127.0.0.1:3001/api/health >/dev/null
  printf '%s\n' "$revision" > "$store/api-version.next"
  mv "$store/api-version.next" "$store/api-version"
fi
python3 deploy/activate.py "$build/dist"
echo "Опубликована версия $revision"
bash deploy/apply-nginx.sh || echo 'Настройки кэша nginx требуют проверки' >&2
