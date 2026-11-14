# AI Game Gallery 관리 안내

이 저장소(GitHub `Minari-KR/minari-kr.github.io`)는 2026-11-14부터 **AI Game Gallery** 전용입니다. 공개 주소는 `https://minari-kr.github.io/`입니다. 변경 이력은 `CHANGELOG.md`에 둡니다.

## 예전 포트폴리오

- 이 저장소는 원래 박종찬 포트폴리오 사이트였습니다. 2026-11-14 사용자 요청으로 갤러리로 바꿨습니다.
- 바꾸기 직전의 저장소 전체(Git 기록 포함)는 `C:\Users\USER\Desktop\Minari-포트폴리오`에 있습니다. GitHub에서는 커밋 `98ed65a`까지가 포트폴리오입니다.
- 예전 주소(`/about/`, `/games/`, `/projects/…`)는 이제 열리지 않습니다. 예전 갤러리 주소 `/ai-games/`는 첫 화면(`/`)으로 넘어갑니다(`site/ai-games/index.html`).

## 구성

| 경로 | 내용 |
|---|---|
| `site/` | 공개되는 파일 전부. 빌드 없이 그대로 올라갑니다 |
| `site/index.html` | 갤러리 페이지 틀(제목, 카드 자리, 게임 팝업, 영상 팝업) |
| `site/style.css` | 다크 모드 디자인 |
| `site/app.js` | 카드 만들기, 팝업 열고 닫기(게임·문서·워크플로우는 한 프레임 `openFrame`; 뒤로 가기는 팝업을 닫음; 프레임 주소는 `location.replace`로 바꿔 브라우저 기록에 남기지 않음), PC에서 게임 파일 미리 받기(휴대폰·데이터 절약 모드는 안 함) |
| `site/awards/` | 맨 위 'Awards' 칸의 스티커 그림 4장(페이몬·헬멧은 예전 포트폴리오, 모코코(스토브·로스트아크)·루디(넷마블·세븐나이츠)는 2026-11-14 Codex, 원본 `D:\GPT_생성물\이미지\2026-11-14_수상스티커_넷마블스토브\`). 수상 내용은 `index.html`에 직접 씀: 2026 국가수리과학연구소장상(대전 인디(inD) 게임잼), 2025 대상(대전 게임 브릿지), 2025 베스트 리더상(스토브 크루 2기), 2020 우수상(넷마블게임아카데미 5기). 사용자가 준 사실만 씀 |
| `site/workflow.webp`·`workflow.html` | 게임 카드 아래 'AI Workflow' 그림(1768×1037, 사이트와 같은 어두운 톤·초록 강조). 그 위에 움직임 층(`index.html`의 `svg.workflow-anim`, 좌표는 그림 픽셀 1768×1037 기준, 스크립트 없이 SMIL·CSS): 반복 점선을 도는 빛, 4번에서 AI 7개로 동시에 퍼지는 빛, 번호 동그라미가 함께 숨 쉬는 빛. 순서대로 켜지는 연출은 넣지 않음(사용자 요청). 동작 줄이기에서는 숨김. 그림을 바꾸면 좌표를 다시 재야 함. 누르면 `workflow.html`이 팝업으로 열림(PC는 팝업에 맞춤, 휴대폰은 읽히는 크기로 옆으로 밀어 봄). 원본·프롬프트는 `D:\GPT_생성물\이미지\2026-11-14_AI워크플로우\`(Codex) |
| `site/games.js` | **게임 목록.** 게임을 넣고 빼고 고치는 곳은 여기 하나입니다 |
| `site/thumbs/` | 카드 썸네일(640×360 WebP) |
| `site/games/<slug>/` | Unity 웹 빌드(Chicken Fire·쭉쭉냥·Rio Idle). ERZZ는 2026-11-14 사용자 요청으로 뺌(카드·빌드·썸네일 삭제, 되살리려면 Git 커밋 `8006806`의 `site/games/erzz`·`site/thumbs/erzz.webp`와 `games.js` 항목) |
| `site/docs/<게임>/` | 게임 문서. 쭉쭉냥: 게임 기획서 `gdd.md`(무엇을 왜 그렇게 설계했는지: 기둥·코어 루프·퍼즐 설계·난이도 곡선 등, 외부 스킬 BMAD `gds-create-gdd` 틀, 카드의 '기획서' 버튼), 구현 값을 적은 제작 명세 `game-design.md`(기획서 안 링크로만 들어감)(그림 `images/`, 레벨 데이터 `data/`)와 리소스 목록 `zzukzzuk-nyang-resources.xlsx`. 원본(.md·.xlsx)을 고친 뒤 `python -I tools/make-docs.py site/docs/zzukzzuk-nyang`로 같은 이름의 `.html`을 다시 만들고 함께 커밋합니다(엑셀 그림은 `<이름>-img/`). 카드의 `links` 버튼이 이 `.html`을 게임과 같은 팝업에서 엽니다. 쭉쭉냥 원본 저장소가 비공개라 원본 코드는 넣지 않습니다(사용자 결정) |
| `site/docs/zzukzzuk-nyang/deck.html` | 쭉쭉냥 카드의 '기획서' 버튼이 여는 HTML 슬라이드 17장(2026-11-14 사용자 결정: 넷마블네오 'AI Game Maker' 인턴십 지원 포트폴리오 기준). 순서(2026-11-14 마지막 점검): 1 표지, 2 어떤 게임인가, 3 만든 이유, 4 플레이 흐름, 5 손맛과 소리, 6 힌트 장치 3개(막힌 시간 25·40·55초, 실제 화면), 7 고민한 지점: 힌트와 조작, 8 유저 리텐션(일일 도전·연속 기록 메달) / 9 역할 나누기, 10~12 AI 리더십(AI별 역할과 규칙 → 기준을 정하고 되돌린 사례 → 직접 조정하려고 만든 레벨 편집 도구: 슬라이드 안에서 집 레벨의 접시를 끌어 보는 체험판 `level-demo.js`, 실제 도구의 검사 기준인 접시 사이 1.3·선과 접시 0.25·170° 일직선을 새로 짠 코드로 옮김, 원래 도구 파일은 비공개 프로젝트 코드라 올리지 않음), 13~14 구조화 능력(어려운 레벨의 기준을 다시 정의 → 레벨 추가 다섯 단계와 통과 기준 표), 15 학습 실행력(문제 → AI로 배운 것 → 게임에 적용, 게임 안 내용만) / 16 출시까지, 17 한 장 정리('상세 기획서'·Google Play 버튼). 역량 순서는 공고와 같은 AI 리더십 → 구조화 능력 → 학습 실행력. 낱말: 한 번의 플레이는 '판', 197개는 '레벨', 연어가 놓인 점은 '접시'(게임 안 문구의 '생선'은 인용할 때만). 한 장에 이야기 하나, 추상적인 말 대신 실제 예시(사용자 지적). 문구는 본인 시점의 짧은 구절(개조식)이고 '~했습니다' 보고체를 쓰지 않음. PC 팝업(1203px)에서 가장 작은 글자 20px. 공통 디자인 `site/docs/deck.css`(16:9 한 장이 팝업에 맞춰 커지고 줄어듦, 휴대폰 세로는 카드로 이어 붙임, 클래스 앞머리 `a-`·`b-`는 처음 만든 앞·뒤 절반, `c-`·`d-`·`e-`는 검토 뒤 고친 장(같은 이름을 다른 장에서 다시 쓰지 않게 앞머리를 지킴))와 넘기기 `site/docs/deck.js`(방향키·버튼·쪽 번호), 10장 체험판 `site/docs/zzukzzuk-nyang/level-demo.js`(배포 때 `?v=`가 함께 붙음). 그림은 `images/deck/`: 웹 빌드에서 직접 녹화한 실제 플레이(`play.mp4`, 하트 레벨)와 화면(`shot-*.webp`, 힌트 3단계 `shot-hint1~3.webp` 포함). 스토어용 그림은 쓰지 않음(사용자 지적). 숫자는 보관 프로젝트 작업 기록에 있는 것만 씀. 글 기획서 `gdd.html`은 마지막 장 링크로 남김 |
| `site/docs/chicken-fire/` | Chicken Fire 문서(미출시 프로토타입이라 스토어 링크 없음): 게임 기획서 `gdd.md`, 리소스 목록 `resources.md`(첫 줄 `<!-- wide -->` = 넓은 표 페이지: 팝업 전체 폭, 칸 한 줄, 28자 넘는 칸만 접힘, 목차는 탭 줄), 그림 `images/`, 썸네일 `resources-img/`. 치킨통 라벨(실제 브랜드 로고를 본뜬 그림) 썸네일은 문서에 넣지 않음 |
| `site/docs/zzukzzuk-nyang/images/screen-flow.svg` | 기획서 9장·제작 명세 6.1의 화면 흐름도(`diagram-design` 스킬 순서도, 사이트 어두운 색). Chicken Fire도 같은 방식(`site/docs/chicken-fire/images/screen-flow.svg`). 고칠 때는 `python -I tools/make-screen-flow.py <zzukzzuk-nyang|chicken-fire> out.html`로 HTML을 만들고 스킬의 `export_svg.py --system-fonts`로 SVG를 뽑습니다(PNG 내보내기는 Playwright가 없어 안 씀) |
| `site/docs/doc.css` | 문서 페이지의 어두운 디자인(모든 게임 문서가 같이 씀) |
| `tools/check-links.py` | 갤러리·문서 페이지의 끊긴 로컬 링크 검사(`python3 tools/check-links.py`, 배포 때 Actions가 실행) |
| `tools/make-docs.py` | 문서 변환 도구(Python, python-markdown·openpyxl·Pillow 필요). 사이트에는 안 올라감 |
| `배운점.md` | 이 프로젝트에서 다음에 다르게 할 점(사용자가 싫어한 것·고치라고 한 것·좋다고 한 것). 큰 일 전에 읽음 |
| `의사결정.md` | 사용자가 고른 것과 그 이유(최신이 위). 사용자가 고르거나 의도를 말할 때마다 바로 적음(전역 규칙, `안내.md` 의사결정) |
| `.github/workflows/check.yml` | `main`에 올리면 스크립트 문법을 확인하고 `site/`를 GitHub Pages에 배포 |

## 게임 목록 고치기 (`site/games.js`)

- 항목: `links`(선택, `[{ label, url }]` 문서 버튼 줄; `docs/…/….html`은 팝업으로, YouTube 주소는 영상 팝업에서 바로 재생(`youtube-nocookie.com`, 갤러리 CSP에 허용), 다른 https 주소는 새 탭으로 엶; 버튼은 파스텔 색(문서 라벤더 `.doc`, 바깥 링크 하늘 `.store`, 영상 분홍 `.video`); 지금은 Chicken Fire의 기획서, 쭉쭉냥의 기획서(슬라이드 `deck.html`)·Google Play·영상. 리소스 문서 버튼은 2026-11-14 사용자 요청으로 뺌(페이지 파일은 남아 있고 글 기획서 안 링크로만 열림)), `title`(제목), `genre`(장르), `thumb`(썸네일), `play`(게임 `games/<slug>/index.html`, 비우면 플레이 버튼 숨김), `video`(YouTube 주소는 새 탭, `.mp4`는 팝업 재생, 비우면 영상 버튼 숨김).
- 목록 순서가 화면의 카드 순서입니다.

## 게임 빌드 기준

- 압축 없음(GitHub Pages는 압축 표시를 보내지 못해 JS로 풀면 1~2초 더 걸림. 실행 파일 `.wasm`은 GitHub이 전송할 때 gzip으로 줄여 줌), 스플래시 끔, 데이터 캐시 켬, 엔진 코드 제거.
- 웹에서 돌리려고 고친 것: ERZZ는 `PC_Renderer`를 Forward+에서 Forward로(Forward+는 웹 GPU에서 셰이더가 모두 실패), 빌드 장면은 `ERZZ_Prototype`. Rio Idle은 데이터 JSON을 `StreamingAssets` 대신 `Resources/data`에서 읽게 하고, 무대 그림 512px·캐릭터 1024px로 줄임(UI·글꼴은 그대로).
- 위 수정은 `D:\5_Archive`의 원본 프로젝트에는 없습니다(복사본에서 고쳤고, 복사본은 지움). 다시 빌드하려면 원본을 복사해 같은 수정을 다시 합니다.
- 빌드한 게임 페이지(`games/<slug>/index.html`)의 `</head>` 앞에 어두운 바탕·창 맞춤 스타일(`<style id="gallery-dark">`)과 `<script src="../../volume.js"></script>`를 넣습니다. 지금 파일에 있는 것을 그대로 쓰면 됩니다.
- 기본 볼륨 40%(사용자 요청 ‘50% 아래’): `site/volume.js`가 Unity 소리가 모두 모이는 출구(`audioContext.destination`) 앞에 볼륨 조절기를 끼웁니다. 값은 그 파일의 `VOLUME` 하나이고, 게임 안 볼륨 설정은 그 위에 곱해집니다. 갤러리 영상 팝업도 0.4.
- GitHub 파일 크기 제한이 100MB라서, 파일 하나가 그보다 커지면 그림 크기를 더 줄입니다.

## 지킬 것

- 사용자에게 보이는 글은 쉬운 한국어로 씁니다.
- 갤러리 페이지(`site/index.html`)에는 CSP가 있습니다. 외부 스크립트를 넣지 않습니다. 게임 페이지는 Unity가 인라인 스크립트와 WebAssembly를 써서 CSP가 없습니다.
- 갤러리의 `style.css`·`games.js`·`app.js`, 문서 페이지(`site/docs/**.html`, `app.js`가 열 때 같은 값을 붙임)와 `doc.css` 주소 끝 `?v=`는 배포할 때 Actions가 내용으로 새로 붙입니다(손으로 고칠 필요 없음).
- 파일을 직접 열면(`file://`) 게임이 실행되지 않습니다. 확인은 공개 주소나 로컬 웹 서버로 합니다.
