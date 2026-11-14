"""Fails if a page under site/ (the gallery, docs; not the Unity builds) points to a local file that does not exist.
Run: python3 tools/check-links.py   (also a step in .github/workflows/check.yml)"""
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

site = Path(__file__).resolve().parent.parent / "site"
bad = []
for page in site.rglob("*.html"):
    if "games" in page.relative_to(site).parts[:1]:
        continue  # Unity's own pages
    html = page.read_text(encoding="utf-8")
    ids = set(re.findall(r'\bid="([^"]+)"', html))
    for ref in re.findall(r'\b(?:href|src)="([^"]+)"', html):
        url = urlsplit(ref)
        if url.scheme or ref.startswith("//"):
            continue
        if not url.path:  # "#anchor" on the same page
            if url.fragment and unquote(url.fragment) not in ids:
                bad.append(f"{page.relative_to(site)}: #{unquote(url.fragment)}")
            continue
        target = (page.parent / unquote(url.path)).resolve()
        if target.is_dir():
            target = target / "index.html"
        if not target.is_file():
            bad.append(f"{page.relative_to(site)}: {ref}")
print("\n".join(bad) or "links ok")
sys.exit(1 if bad else 0)
