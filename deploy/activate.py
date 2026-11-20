"""Switch a verified static release while retaining the previous site."""
import ctypes
import os
from pathlib import Path
import shutil
import sys
import tempfile


def exchange(left, right):
    libc = ctypes.CDLL(None, use_errno=True)
    if sys.platform == 'darwin':
        result = libc.renamex_np(os.fsencode(left), os.fsencode(right), 2)
    else:
        result = libc.renameat2(-100, os.fsencode(left), -100, os.fsencode(right), 2)
    if result:
        raise OSError(ctypes.get_errno(), 'Atomic directory exchange failed')


def point(link, destination):
    temporary = link.parent / '.dist-next'
    temporary.unlink(missing_ok=True)
    temporary.symlink_to(destination)
    os.replace(temporary, link)


def release_dir(store):
    folder = Path(tempfile.mkdtemp(prefix='release-', dir=store))
    folder.chmod(0o755)
    return folder


def activate(app, candidate):
    store = app / '.site-releases'
    store.mkdir(exist_ok=True)
    live = app / 'dist'
    if live.is_dir() and not live.is_symlink():
        # In one syscall the real directory moves to its permanent location
        # and nginx gets a link to that same directory, including on first use.
        legacy = release_dir(store) / 'site'
        legacy.symlink_to(legacy)
        exchange(live, legacy)
    previous = live.resolve(strict=True) if live.is_symlink() else None
    if previous and previous.parent.parent != store:
        raise RuntimeError('Unexpected live release path')
    folder = release_dir(store)
    os.rename(candidate, folder / 'site')
    # Cached HTML may still request the preceding release's hashed styles.
    assets = folder / 'site' / '_astro'
    own_assets = [p.relative_to(assets).as_posix() for p in assets.rglob('*') if p.is_file()]
    (folder / 'assets-list').write_text('\n'.join(own_assets))
    if previous:
        inventory = previous.parent / 'assets-list'
        old_assets = previous / '_astro'
        names = inventory.read_text().splitlines() if inventory.exists() else [
            p.relative_to(old_assets).as_posix() for p in old_assets.rglob('*') if p.is_file()
        ]
        for name in names:
            target = assets / name
            if not target.exists():
                target.parent.mkdir(parents=True, exist_ok=True)
                os.link(old_assets / name, target)
        (folder / 'previous').symlink_to(previous)
    point(live, folder / 'site')
    for directory in store.glob('release-*'):
        if directory != folder and (not previous or directory != previous.parent):
            shutil.rmtree(directory)


def rollback(app):
    store = app / '.site-releases'
    previous = (app / 'dist').resolve().parent / 'previous'
    if not previous.is_symlink() or not (previous / 'index.html').is_file():
        raise RuntimeError('No previous working release available')
    target = previous.resolve(strict=True)
    if target.parent.parent != store:
        raise RuntimeError('Unexpected rollback path')
    (store / 'paused').touch()
    point(app / 'dist', target)


if __name__ == '__main__':
    if len(sys.argv) == 2 and sys.argv[1] == '--rollback':
        rollback(Path.cwd())
    else:
        activate(Path.cwd(), Path(sys.argv[1]))
