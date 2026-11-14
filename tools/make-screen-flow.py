"""Builds a game's screen-flow diagram: diagram-design skill flowchart (slide-4x3 ramp), dark site palette.
Run: python -I tools/make-screen-flow.py <zzukzzuk-nyang|chicken-fire> out.html, then the skill's
export_svg.py --system-fonts -> site/docs/<game>/images/screen-flow.svg"""
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


def legend(right, note):
    # ---- legend ----
    add(f'<line x1="40" y1="620" x2="984" y2="620" stroke="rgba(238,240,243,0.12)"/>')
    text(40, 646, "범례", SUB, fill=MUTED, anchor="start")
    add(f'<rect x="96" y="634" width="36" height="18" rx="9" fill="{CARD}" stroke="{LINE}"/>'); text(140, 648, "시작 · 끝 화면", SUB, fill=MUTED, anchor="start")
    add(f'<rect x="262" y="634" width="36" height="18" rx="3" fill="{CARD}" stroke="{LINE}"/>'); text(306, 648, "화면", SUB, fill=MUTED, anchor="start")
    add(f'<polygon points="384,634 400,643 384,652 368,643" fill="{CARD}" stroke="{LINE}"/>'); text(408, 648, "판단", SUB, fill=MUTED, anchor="start")
    path("M 470 643 H 506", accent=True); text(514, 648, "핵심 경로", SUB, fill=MUTED, anchor="start")
    path("M 600 643 H 636", dashed=True); text(644, 648, "자동으로 열림", SUB, fill=MUTED, anchor="start")
    text(764, 648, right, SUB, fill=MUTED, anchor="start")
    text(40, 690, note, SUB, fill=MUTED, anchor="start")


def zzukzzuk_nyang():
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
    legend("↩ = 타이틀로 돌아감", "앞으로 가면 새 화면이 오른쪽에서, 뒤로 가면 왼쪽에서 들어옵니다.")
    return "쭉쭉냥 화면 흐름", "타이틀에서 메뉴 접시로 레벨 선택, 튜토리얼, 일일 도전, 메달 도감, 앱 종료로 가는 화면 흐름도."


def chicken_fire():
    # ---- edges (behind nodes) ----
    path("M 215 80 H 310")                                                  # 게임 페이지 → 라운드 준비
    path("M 400 110 V 212")                                                 # 준비 → 라운드
    path("M 510 236 H 580 V 210 H 640", accent=True)                        # 라운드 → 닭 사냥
    path("M 730 242 V 318", accent=True)                                    # 닭 사냥 → 치킨통
    path("M 640 350 H 550 V 266 H 512", accent=True)                        # 치킨통 → 라운드 (시간 추가)
    path("M 470 214 V 150 H 730 V 110", dashed=True)                        # 라운드 ⇢ 보상 알림 (자동)
    path("M 444 286 V 394")                                                 # 라운드 → 판단
    path("M 356 396 V 288")                                                 # 판단 → 라운드 (아니오)
    path("M 400 468 V 515")                                                 # 판단 → 게임 종료 (예)
    path("M 490 545 H 900 V 30 H 400 V 48")                                 # 게임 종료 → 라운드 준비 (다시 하기)
    path("M 290 238 H 217")                                                 # 라운드 → 설정 팝업
    path("M 215 264 H 288")                                                 # 설정 팝업 → 라운드
    # ---- arrow labels ----
    label(262, 70, "바로 시작", anchor="middle")
    label(392, 166, "다 불러오면", anchor="end")
    label(520, 228, "불 뿜기", accent=True)
    label(740, 285, "쓰러지면 치킨통", accent=True)
    label(558, 310, "먹으면 시간 추가", accent=True)
    label(600, 142, "30초마다 (자동)", anchor="middle")
    label(452, 345, "시간이 흐름")
    label(348, 345, "아니오", anchor="end")
    label(408, 497, "예 · 1초 뒤")
    label(700, 537, "PLAY AGAIN · Enter", anchor="middle")
    label(252, 228, "톱니 · ESC", anchor="middle")
    label(252, 282, "닫기 · ESC", anchor="middle")
    # ---- nodes ----
    node(130, 80, 170, 56, "게임 페이지", "갤러리에서 플레이", shape="oval")
    node(400, 80, 180, 60, "라운드 준비", "아레나 소품을 불러옴")
    node(400, 250, 220, 72, "라운드", "남은 시간 30초에서 시작", focal=True)
    node(730, 80, 180, 56, "보상 줄어듦 알림", "REWARD DOWN!")
    node(730, 210, 180, 64, "닭 사냥", "불에 닿으면 도망침")
    node(730, 350, 180, 64, "치킨통 먹기", "1마리당 +5초 → +1초")
    node(400, 420, 176, 96, ["남은 시간", "0초?"], shape="diamond")
    node(400, 545, 200, 60, "게임 종료", "TIME'S UP! · 먹은 치킨 수", shape="oval")
    node(130, 250, 170, 72, "설정 팝업", "게임 멈춤 · 소리 크기")
    legend("화면 글자는 영어", "타이틀 화면은 없습니다. 페이지를 열면 바로 아레나에서 라운드가 시작됩니다.")
    return "Chicken Fire 화면 흐름", "게임 페이지에서 바로 라운드로 들어가 닭 사냥과 치킨통 먹기를 반복하고, 시간이 다 되면 게임 종료 화면에서 다시 하기로 돌아가는 화면 흐름도."


GAMES = {"zzukzzuk-nyang": zzukzzuk_nyang, "chicken-fire": chicken_fire}
add(f'<rect width="{W}" height="{H}" fill="{BG}"/>')
TITLE, DESC = GAMES[sys.argv[1]]()

svg = f'''<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="sf-title sf-desc">
<title id="sf-title">{TITLE}</title>
<desc id="sf-desc">{DESC}</desc>
<defs>
<marker id="a" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="{MUTED}"/></marker>
<marker id="a-acc" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="{ACC}"/></marker>
</defs>
{chr(10).join(out)}
</svg>'''

html = f'''<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{TITLE}</title>
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
open(sys.argv[2], "w", encoding="utf-8").write(html)
