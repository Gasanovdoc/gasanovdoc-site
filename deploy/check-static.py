"""Check public HTML and its same-site resources before activating dist."""
from html.parser import HTMLParser
from pathlib import Path
import sys
from urllib.parse import unquote, urljoin, urlsplit


class Resources(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'link' and set(attrs.get('rel', '').split()) & {'alternate', 'canonical'}:
            return
        for key in ('src', 'poster', 'href'):
            if attrs.get(key) and tag in ('img', 'source', 'video', 'script', 'link', 'a'):
                self.links.append(attrs[key])


root = Path(sys.argv[1]).resolve()
required = ('index.html', '404.html', 'lechenie/index.html', 'pacientam/index.html')
for name in required:
    if not (root / name).is_file():
        sys.exit('Отсутствует страница ' + name)
for page in root.rglob('*.html'):
    parser = Resources()
    parser.feed(page.read_text())
    url = 'https://gasanovdoc.ru/' + page.relative_to(root).as_posix()
    for link in parser.links:
        ref = urlsplit(urljoin(url, link))
        if ref.scheme not in ('http', 'https') or ref.netloc != 'gasanovdoc.ru':
            continue
        if page == root / '404.html' and ref.path == '/404/':
            continue  # The error template links to its own synthetic Astro route.
        local = root / unquote(ref.path).lstrip('/')
        if local.is_dir():
            local = local / 'index.html'
        if not local.is_file() or not local.stat().st_size:
            sys.exit(f'{page.relative_to(root)}: файл не найден или пуст: {link}')
