"""Turn a game's documents into pages the gallery can open in its popup.

    python -I tools/make-docs.py site/docs/zzukzzuk-nyang

- every *.md in the folder -> same name .html (links to .md become .html, outside links open a new tab);
  a file whose first line is <!-- wide --> becomes a full-width page with one-line table cells (resource lists)
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



def page(title, body, css, cls="doc"):
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
<main class="{cls}">
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
    title = title.group(1) if title else src.stem
    if text.lstrip().startswith("<!-- wide -->"):
        # a table-heavy page (resource list): whole popup width, every cell on one line,
        # the "목차" list becomes a row of tabs like the sheet tabs of a workbook page
        body = re.sub(r'<h2 id="목차">.*?(?=<h2 )',
                      lambda m: '<nav class="tabs" aria-label="목차">' + "".join(re.findall(r"<a .*?</a>", m[0])) + "</nav>\n",
                      body, count=1, flags=re.S)
        body = body.replace("<table>", '<div class="table-wrap"><table>').replace("</table>", "</table></div>")
        # only a long cell (a file list, a URL, a remark) may fold, so the table still fits the popup
        body = re.sub(r"<td>((?:(?!</td>).)*)</td>",
                      lambda m: f'<td class="wrap">{m[1]}</td>' if len(html.unescape(re.sub(r"<[^>]+>", "", m[1])).strip()) > 28 else m[0],
                      body, flags=re.S)
        return page(title, body, css, "doc wide")
    # the "목차" section becomes a nav, which doc.css keeps beside the text on wide screens
    body = re.sub(r'(<h2 id="목차">.*?)(?=<h2 )', r'<nav class="toc" aria-label="목차">\1</nav>\n', body, count=1, flags=re.S)
    # short cells (labels, values, names) stay on one line; only long explanations wrap (see .nw in doc.css)
    body = re.sub(r"<(td|th)>(.*?)</\1>",
                  lambda m: f'<{m[1]} class="nw">{m[2]}</{m[1]}>' if len(html.unescape(re.sub(r"<[^>]+>", "", m[2])).strip()) <= 16 else m[0],
                  body, flags=re.S)
    # tables with many columns get a slightly smaller size so they fit the column (see table.dense in doc.css)
    body = re.sub(r"<table>(\s*<thead>\s*<tr>(.*?)</tr>)",
                  lambda m: '<table class="dense">' + m[1] if m[2].count("<th") >= 5 else m[0], body, flags=re.S)
    nav = re.search(r'<nav class="toc".*?</nav>\n', body, flags=re.S)
    if nav:  # title, then nav, then the rest in one column; on a PC doc.css puts the nav beside them (grid)
        rest = body.replace(nav.group(0), '')
        h1 = re.search(r'<h1[^>]*>.*?</h1>\n?', rest, flags=re.S)
        head = h1.group(0) if h1 else ''
        body = head + nav.group(0) + '<div class="content">\n' + rest.replace(head, '', 1) + '</div>'
    return page(title, body, css)


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
        has_pic = lambda r, row: any((r, c) in pictures for c in range(1, len(row) + 1))
        is_group = lambda r, row: r > 1 and [x for x in row if x.value is not None] == [row[0]] and not has_pic(r, row)
        # A group heading row (e.g. "■ 앱 아이콘") spans the table. When every row in a group shares one "경로",
        # the path goes into that heading and the column is dropped, so the table fits one screen at a larger size.
        path_col = next((c for c, cell in enumerate(rows[0]) if cell.value == "경로"), None)
        group_paths, current = {}, None
        for r, row in enumerate(rows, start=1):
            if is_group(r, row):
                current = r
                group_paths[r] = set()
            elif current and path_col is not None and row[path_col].value:
                group_paths[current].add(row[path_col].value)
        drop = path_col if path_col is not None and group_paths and all(len(p) == 1 for p in group_paths.values()) else None
        width = len(rows[0]) - (drop is not None)
        parts.append(f'<section id="sheet-{i}"><h2>{html.escape(ws.title)}</h2><div class="table-wrap"><table>')
        for r, row in enumerate(rows, start=1):
            if is_group(r, row):
                path = f' <span class="path">{cell_text(next(iter(group_paths[r])))}</span>' if drop is not None else ""
                parts.append(f'<tr class="group"><td colspan="{width}">{cell_text(row[0].value)}{path}</td></tr>')
                continue
            if not (any(x.value is not None for x in row) or has_pic(r, row)):
                continue
            cells = []
            for c, cell in enumerate(row, start=1):
                if c - 1 == drop:
                    continue
                pics = "".join(f'<img src="{p}" alt="" loading="lazy" width="40" height="40">' for p in pictures.get((r, c), []))
                tag = "th" if r == 1 else "td"
                cells.append(f"<{tag}>{pics}{cell_text(cell.value)}</{tag}>")
            parts.append("<tr>" + "".join(cells) + "</tr>")
        parts.append("</table></div></section>")
    return page(title, "\n".join(parts), css, "doc wide")  # wide: every cell on one line, no sideways scroll


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
