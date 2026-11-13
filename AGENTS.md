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
| `site/app.js` | 카드 만들기, 팝업 열고 닫기, PC에서 게임 파일 미리 받기(휴대폰·데이터 절약 모드는 안 함) |
| `site/games.js` | **게임 목록.** 게임을 넣고 빼고 고치는 곳은 여기 하나입니다 |
| `site/thumbs/` | 카드 썸네일(640×360 WebP) |
| `site/games/<slug>/` | Unity 웹 빌드(Chicken Fire·ERZZ·쭉쭉냥·Rio Idle) |
| `.github/workflows/check.yml` | `main`에 올리면 스크립트 문법을 확인하고 `site/`를 GitHub Pages에 배포 |

## 게임 목록 고치기 (`site/games.js`)

- 항목: `title`(제목), `genre`(장르), `thumb`(썸네일), `play`(게임 `games/<slug>/index.html`, 비우면 플레이 버튼 숨김), `video`(YouTube 주소는 새 탭, `.mp4`는 팝업 재생, 비우면 영상 버튼 숨김).
- 목록 순서가 화면의 카드 순서입니다.

## 게임 빌드 기준

- 압축 없음(GitHub Pages는 압축 표시를 보내지 못해 JS로 풀면 1~2초 더 걸림. 실행 파일 `.wasm`은 GitHub이 전송할 때 gzip으로 줄여 줌), 스플래시 끔, 데이터 캐시 켬, 엔진 코드 제거.
- 웹에서 돌리려고 고친 것: ERZZ는 `PC_Renderer`를 Forward+에서 Forward로(Forward+는 웹 GPU에서 셰이더가 모두 실패), 빌드 장면은 `ERZZ_Prototype`. Rio Idle은 데이터 JSON을 `StreamingAssets` 대신 `Resources/data`에서 읽게 하고, 무대 그림 512px·캐릭터 1024px로 줄임(UI·글꼴은 그대로).
- 위 수정은 `D:\5_Archive`의 원본 프로젝트에는 없습니다(복사본에서 고쳤고, 복사본은 지움). 다시 빌드하려면 원본을 복사해 같은 수정을 다시 합니다.
- 빌드한 게임 페이지(`games/<slug>/index.html`)의 `</head>` 앞에 어두운 바탕·창 맞춤 스타일(`<style id="gallery-dark">`)을 넣습니다. 지금 파일에 있는 것을 그대로 쓰면 됩니다.
- GitHub 파일 크기 제한이 100MB라서, 파일 하나가 그보다 커지면 그림 크기를 더 줄입니다.

## 지킬 것

- 사용자에게 보이는 글은 쉬운 한국어로 씁니다.
- 갤러리 페이지(`site/index.html`)에는 CSP가 있습니다. 외부 스크립트를 넣지 않습니다. 게임 페이지는 Unity가 인라인 스크립트와 WebAssembly를 써서 CSP가 없습니다.
- 파일을 직접 열면(`file://`) 게임이 실행되지 않습니다. 확인은 공개 주소나 로컬 웹 서버로 합니다.
