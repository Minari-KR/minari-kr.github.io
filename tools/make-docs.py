"""Turn a game's documents into pages the gallery can open in its popup.

    python -I tools/make-docs.py site/docs/zzukzzuk-nyang

- every *.md in the folder -> same name .html (links to .md become .html, outside links open a new tab)
- every *.xlsx -> same name .html: each sheet as a table, pictures anchored in cells shown in place
  (saved as WebP under <name>-img/)
Needs python-markdown, openpyxl and Pillow. Run it again after editing a document, then commit the output.
"""
import html
import os
import io
import re
import sys
from pathlib import Path

import markdown
import markdown.extensions.toc
import openpyxl
from PIL import Image



def page(title, body, css):
    return f"""<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'">
  <meta name="referrer" content="no-referrer">
  <meta name="robots" content="noindex">
  <title>{html.escape(title)}</title>
  <link rel="stylesheet" href="{css}">
</head>
<body>
<main class="doc">
{body}
</main>
</body>
</html>
"""


def github_slug(text, sep):
    # Same anchors as GitHub, so the document's own table-of-contents links keep working.
    text = re.sub(r"<[^>]+>", "", text).strip().lower()
    return re.sub(r"[^\w\- ]", "", text).replace(" ", sep)


def md_page(src, css):
    text = src.read_text(encoding="utf-8")
    body = markdown.markdown(text, extensions=["tables", "fenced_code", "sane_lists",
                                               markdown.extensions.toc.TocExtension(slugify=github_slug)])
    body = re.sub(r'href="([^"#:]+)\.md(#[^"]*)?"', r'href="\1.html\2"', body)
    body = re.sub(r'<a href="(https?://[^"]+)"', r'<a href="\1" target="_blank" rel="noopener noreferrer"', body)
    title = re.search(r"^# (.+)$", text, re.M)
    return page(title.group(1) if title else src.stem, body, css)


def cell_text(value):
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    return html.escape(str(value)).replace("\n", "<br>")


def xlsx_page(src, css):
    wb = openpyxl.load_workbook(src)
    img_dir = src.with_name(src.stem + "-img")
    img_dir.mkdir(exist_ok=True)
    title = TITLES.get(src.stem, src.stem)
    parts = [f"<h1>{html.escape(title)}</h1>", "<nav class=\"tabs\">"]
    parts += [f'<a href="#sheet-{i}">{html.escape(ws.title)}</a>' for i, ws in enumerate(wb.worksheets)]
    parts.append("</nav>")
    for i, ws in enumerate(wb.worksheets):
        pictures = {}
        for n, img in enumerate(getattr(ws, "_images", [])):
            at = img.anchor._from  # 0-based row/col of the picture's top-left cell
            name = f"s{i}-{n}.webp"
            pic = Image.open(io.BytesIO(img._data()))
            pic.thumbnail((192, 192))
            pic.save(img_dir / name, "WEBP", quality=82)
            pictures.setdefault((at.row + 1, at.col + 1), []).append(f"{img_dir.name}/{name}")
        rows = list(ws.iter_rows(min_row=1, max_row=ws.max_row, max_col=ws.max_column))
        parts.append(f'<section id="sheet-{i}"><h2>{html.escape(ws.title)}</h2><div class="table-wrap"><table>')
        for r, row in enumerate(rows, start=1):
            cells = []
            for c, cell in enumerate(row, start=1):
                pics = "".join(f'<img src="{p}" alt="" loading="lazy" width="96" height="96">' for p in pictures.get((r, c), []))
                tag = "th" if r == 1 else "td"
                cells.append(f"<{tag}>{pics}{cell_text(cell.value)}</{tag}>")
            filled = [cell for cell in row if cell.value is not None]
            if r > 1 and len(filled) == 1 and filled[0] is row[0] and not any((r, c) in pictures for c in range(1, len(row) + 1)):
                # a group heading row (e.g. "■ 앱 아이콘"): one cell across the whole table
                parts.append(f'<tr class="group"><td colspan="{len(row)}">{cell_text(row[0].value)}</td></tr>')
            elif filled or any((r, c) in pictures for c in range(1, len(row) + 1)):
                parts.append("<tr>" + "".join(cells) + "</tr>")
        parts.append("</table></div></section>")
    return page(title, "\n".join(parts), css)


TITLES = {"zzukzzuk-nyang-resources": "쭉쭉냥 리소스 목록"}  # page titles for files whose names are not readable


def main(folder):
    folder = Path(folder)
    css = lambda src: Path(os.path.relpath(folder.parent / "doc.css", src.parent)).as_posix()  # site/docs/doc.css, shared by every game
    for src in sorted(folder.rglob("*.md")):
        src.with_suffix(".html").write_text(md_page(src, css(src)), encoding="utf-8")
        print("wrote", src.with_suffix(".html"))
    for src in sorted(folder.glob("*.xlsx")):
        src.with_suffix(".html").write_text(xlsx_page(src, css(src)), encoding="utf-8")
        print("wrote", src.with_suffix(".html"))


if __name__ == "__main__":
    main(sys.argv[1])
