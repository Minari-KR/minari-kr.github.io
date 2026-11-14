"""Builds the 쭉쭉냥 screen-flow diagram: diagram-design skill flowchart (slide-4x3 ramp), dark site palette.
Run: python -I tools/make-screen-flow.py out.html, then the skill's export_svg.py --system-fonts -> site/docs/zzukzzuk-nyang/images/screen-flow.svg"""
import sys
from html import escape

W, H = 1024, 768
BG, CARD, LINE, TEXT, MUTED, ACC = "#16181d", "#1f2228", "rgba(238,240,243,0.38)", "#eef0f3", "#b8bec8", "#7fb89a"
FONT = "'Pretendard','Noto Sans KR','Malgun Gothic',system-ui,sans-serif"
NAME, SUB, ARROW = 16, 12, 12          # presentation ramp (output-spec.md)
out = []
add = out.append


def text(x, y, s, size, fill=TEXT, weight=None, anchor="middle"):
    w = f' font-weight="{weight}"' if weight else ""
    add(f'<text x="{x}" y="{y}" fill="{fill}" font-size="{size}"{w} font-family="{FONT}" text-anchor="{anchor}">{escape(s)}</text>')


def node(cx, cy, w, h, name, sub=None, shape="rect", focal=False):
    x, y = cx - w / 2, cy - h / 2
    stroke = ACC if focal else LINE
    fill = "rgba(127,184,154,0.10)" if focal else CARD
    if shape == "diamond":
        add(f'<polygon points="{cx},{y} {cx + w / 2},{cy} {cx},{y + h} {x},{cy}" fill="{fill}" stroke="{stroke}" stroke-width="1.2"/>')
    else:
        rx = h / 2 if shape == "oval" else 6
        add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="1.2"/>')
    lines = name if isinstance(name, list) else [name]
    total = len(lines) * 20 + (18 if sub else 0)
    ty = cy - total / 2 + 15
    for ln in lines:
        text(cx, ty, ln, NAME, weight=600)
        ty += 20
    if sub:
        text(cx, ty + 2, sub, SUB, fill=MUTED)


def path(d, accent=False, dashed=False):
    c = ACC if accent else MUTED
    dash = ' stroke-dasharray="6 5"' if dashed else ""
    add(f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{1.6 if accent else 1.3}"{dash} marker-end="url(#{"a-acc" if accent else "a"})"/>')


def label(x, y, s, accent=False, anchor="start"):
    # small plate behind the label so a line never runs through the letters
    wid = len(s) * ARROW * 0.95 + 8
    lx = x - (wid / 2 if anchor == "middle" else 4 if anchor == "start" else wid - 4)
    add(f'<rect x="{lx:.0f}" y="{y - 12}" width="{wid:.0f}" height="17" rx="3" fill="{BG}"/>')
    text(x, y, s, ARROW, fill=ACC if accent else MUTED, anchor=anchor)


add(f'<rect width="{W}" height="{H}" fill="{BG}"/>')
# ---- edges (behind nodes) ----
path("M 420 64 H 372")                                                  # 타이틀 → 앱 종료
path("M 472 92 V 136 H 290 V 164", accent=True)                         # 타이틀 → 레벨 선택
path("M 290 136 H 104 V 160")                                           # 타이틀 → 튜토리얼 (same rail)
path("M 552 92 V 136 H 740 V 188")                                      # 타이틀 → 일일 도전 판단
path("M 512 92 V 368")                                                  # 타이틀 → 메달 도감
path("M 604 64 H 920 V 118", dashed=True)                               # 타이틀 ⇢ 메달 연출 (자동)
path("M 270 224 V 316", accent=True)                                    # 레벨 선택 → 인게임
path("M 310 316 V 228")                                                 # 인게임 → 레벨 선택
path("M 378 340 H 412 V 358 H 382")                                     # 인게임 ↻ 다음 레벨
path("M 104 228 V 348 H 198")                                           # 튜토리얼 → 인게임
path("M 290 380 V 468")                                                 # 인게임 → 모든 레벨 클리어
path("M 836 150 H 792 V 213")                                           # 메달 연출 → 판단
path("M 828 240 H 920 V 294")                                           # 판단 → 일일 도전 문제 (바로)
path("M 740 288 V 364")                                                 # 판단 → 소개/완료 카드
path("M 828 400 H 920 V 366")                                           # 카드 → 일일 도전 문제
path("M 652 400 H 592")                                                 # 카드 → 메달 도감
# ---- arrow labels ----
label(300, 30, "게임 종료 접시 · 웹은 없음", anchor="middle")
label(298, 130, "게임 시작 접시", accent=True)
label(112, 130, "튜토리얼 접시")
label(560, 130, "일일 도전 접시")
label(520, 250, "메달 탭")
label(612, 58, "메달이 바뀌면 (자동)")
label(262, 276, "칸 탭", accent=True, anchor="end")
label(318, 276, "▦ / 뒤로")
label(420, 314, "클리어 → 탭")
label(420, 332, "다음 레벨")
label(110, 290, "마지막 단계 · 건너뛰기")
label(298, 430, "마지막 남은 레벨을 깸")
label(800, 196, "바로 도전")
label(840, 232, "바로")
label(748, 330, "카드")
label(836, 420, "시작 / 다시 풀기")
label(622, 392, "메달 도감", anchor="middle")
# ---- nodes ----
node(512, 64, 184, 56, "타이틀", "메뉴 접시에 감아서 고름", shape="oval", focal=True)
node(300, 64, 136, 48, "앱 종료", shape="oval")
node(290, 196, 176, 56, "레벨 선택", "↩ 타이틀로")
node(104, 196, 152, 64, ["튜토리얼", "0-1 ~ 0-4"])
node(290, 348, 176, 64, "인게임 레벨", "197개")
node(290, 500, 200, 64, "모든 레벨 클리어", "↩ 타이틀 · 레벨 선택", shape="oval")
node(512, 400, 152, 56, "메달 도감", shape="oval")
node(920, 150, 168, 56, "메달 연출", "메달이 바뀔 때")
node(740, 240, 176, 96, ["카드를", "볼 때인가"], shape="diamond")
node(740, 400, 176, 64, ["소개 카드 /", "완료 카드"], "↩ 타이틀로 · 뒤로")
node(920, 330, 168, 72, ["일일 도전", "문제 3개"], "끝나면 ↩ 타이틀")
# ---- legend ----
add(f'<line x1="40" y1="620" x2="984" y2="620" stroke="rgba(238,240,243,0.12)"/>')
text(40, 646, "범례", SUB, fill=MUTED, anchor="start")
add(f'<rect x="96" y="634" width="36" height="18" rx="9" fill="{CARD}" stroke="{LINE}"/>'); text(140, 648, "시작 · 끝 화면", SUB, fill=MUTED, anchor="start")
add(f'<rect x="262" y="634" width="36" height="18" rx="3" fill="{CARD}" stroke="{LINE}"/>'); text(306, 648, "화면", SUB, fill=MUTED, anchor="start")
add(f'<polygon points="384,634 400,643 384,652 368,643" fill="{CARD}" stroke="{LINE}"/>'); text(408, 648, "판단", SUB, fill=MUTED, anchor="start")
path("M 470 643 H 506", accent=True); text(514, 648, "핵심 경로", SUB, fill=MUTED, anchor="start")
path("M 600 643 H 636", dashed=True); text(644, 648, "자동으로 열림", SUB, fill=MUTED, anchor="start")
text(764, 648, "↩ = 타이틀로 돌아감", SUB, fill=MUTED, anchor="start")
text(40, 690, "앞으로 가면 새 화면이 오른쪽에서, 뒤로 가면 왼쪽에서 들어옵니다.", SUB, fill=MUTED, anchor="start")

svg = f'''<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="sf-title sf-desc">
<title id="sf-title">쭉쭉냥 화면 흐름</title>
<desc id="sf-desc">타이틀에서 메뉴 접시로 레벨 선택, 튜토리얼, 일일 도전, 메달 도감, 앱 종료로 가는 화면 흐름도.</desc>
<defs>
<marker id="a" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="{MUTED}"/></marker>
<marker id="a-acc" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="{ACC}"/></marker>
</defs>
{chr(10).join(out)}
</svg>'''

html = f'''<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>쭉쭉냥 화면 흐름</title>
<style>
*{{box-sizing:border-box;margin:0;padding:0}} body{{background:{BG};padding:2rem}}
.frame{{max-width:1024px;margin:0 auto;min-width:0}} .diagram-container{{width:100%;overflow-x:auto}}
svg{{width:100%;min-width:1024px;display:block}}
@media print{{.diagram-container{{overflow-x:visible}} svg{{min-width:0}}}}
</style></head>
<body><div class="frame"><div class="diagram-container">
{svg}
</div></div></body></html>
'''
open(sys.argv[1], "w", encoding="utf-8").write(html)
