// Public identity and sharing copy for generated pages.
export const siteUrl = 'https://minari-kr.github.io/';
export const shareImage = 'assets/images/minari-share.png';
// Browser tab and shared-link title of the portfolio page (project pages use '<title> | 박종찬').
export const homeTitle = '박종찬 | Game Designer Portfolio';
// The standalone /about/ page (linked from Linktree only, no link to the portfolio).
export const aboutTitle = '박종찬 | 게임 디자이너';
export const aboutDescription = '아이디어를 프로토타입으로 만들고, 플레이하며 재미를 검증합니다. 게임을 꿈꾸게 된 계기, 게임 취향, 쓰는 도구를 소개합니다.';
export const homeDescription = '아이디어를 프로토타입으로 만들고, 플레이하며 재미를 검증합니다. 출시 앱과 수상 프로젝트의 플레이 영상 및 링크를 확인할 수 있습니다.';
// "프로젝트" section on the home page and the project detail pages: the one place for the facts about each project.
// Order = tab and card order on the home page. Text is escaped when rendered; links must be https; images and videos must exist
// in public/assets/ (paths here have no leading "./"). Only `description` (the sentence shown when the page link is shared)
// is hand-written; tests/projects.test.mjs fails when it stops naming the event and the first award.
//   slug         page name (projects/<slug>.html) and element ids; lowercase letters, digits, hyphens
//   title        shown as written (translate="no")
//   genre        small green line above the title
//   meta         info line, items joined by "/" (event, role, team; the fan game: kind, solo)
//   period       detail page only: { start, end }, each { datetime, text } (machine value and visible text)
//   awards       highlighted lines under the info line (0-2)
//   image        card and tab picture (960×540), also the poster of the detail page video
//   actions      home card buttons in order: no url = the project's own page; primary = green button
//   detail       only for projects with a page (without it the project gets no page): video { src, width, height, label }, scripts
//                (page scripts after motion-loop.js, names in assets/js/), body in src/templates/projects/<slug>.html.
//                The play link under the video repeats the primary button; the video's aria text is "<title> <label>".
//   description  share text of the detail page (a project without a page needs none)
export const projects = [
  {
    slug: 'reflectory',
    title: 'Reflectory',
    genre: '퍼즐 디펜스',
    meta: ['2026 대전 인디(inD) 게임잼', '기획 및 팀장', '4인 팀'],
    period: { start: { datetime: '2026-08-07', text: '2026 . 8 . 7' }, end: { datetime: '2026-08-09', text: '8 . 9' } },
    awards: ['국가수리과학연구소장상'],
    image: 'assets/images/cards/reflectory-title.webp',
    actions: [{ label: '플레이 영상' }, { label: '플레이하기', url: 'https://minari-kr.itch.io/reflectory', primary: true }],
    detail: {
      video: { src: 'assets/videos/reflectory-gameplay.mp4', width: 1910, height: 1078, label: '플레이 영상' },
      scripts: ['reflectory-core', 'reflectory-augments', 'reflectory-systems'],
    },
    description: '2026 대전 인디(inD) 게임잼 국가수리과학연구소장상 수상작으로, 4인 팀에서 기획과 팀장을 맡은 퍼즐 디펜스 게임입니다.',
  },
  {
    slug: 'barrel-good-barrel',
    title: 'Barrel Good Barrel',
    genre: '탄막 슈팅 로그라이크',
    meta: ['2025 대전 인디(inD) 게임어스', '기획 및 팀장', '3인 팀'],
    period: { start: { datetime: '2025-03', text: '2025 . 3' }, end: { datetime: '2025-10', text: '10' } },
    awards: ['2025 대전 게임 브릿지 대상', '대전콘텐츠페어·부산 BIC 전시 출품'],
    image: 'assets/images/cards/barrel-good-barrel-title.webp',
    actions: [{ label: '플레이 영상' }, { label: '플레이하기', url: 'https://minari-kr.itch.io/barrel-good-barrel', primary: true }],
    detail: {
      video: { src: 'assets/videos/barrel-good-barrel-gameplay.mp4', width: 1920, height: 1080, label: '플레이 영상' },
      scripts: ['bgb-loadout', 'bgb-systems'],
    },
    description: '2025 대전 게임 브릿지 대상 수상작으로, 2025 대전 인디(inD) 게임어스 3인 팀에서 기획과 팀장을 맡은 탄막 슈팅 로그라이크 게임입니다.',
  },
  {
    // No page: the video opens on YouTube in a new tab (the site's security policy keeps YouTube out of the page).
    slug: 'aiden-magnus-kartrider',
    title: 'Aiden & Magnus KartRider',
    genre: '레이싱',
    meta: ['2차 창작 팬게임', '1인 개발'],
    awards: [],
    image: 'assets/images/cards/aiden-magnus-kartrider-title.webp',
    actions: [{ label: '플레이 영상', url: 'https://www.youtube.com/watch?v=RrdQxWXoZO4&t=35s', primary: true }],
  },
];
export const shareImageAlt = '게임 디자이너 박종찬(Minari)의 포트폴리오입니다. 아이디어를 프로토타입으로 만들고, 플레이하며 재미를 검증합니다.';

// "게임 플레이 경험" section on the home page (right under the intro): one entry per game, shown as cartridges flowing across a small
// LCD game screen in two rows (1st, 3rd, 5th… on top). Pressing a cartridge shows its record on the same screen.
// title is required; platform, genre, hours, achievements and note (one-line review) may be '' (empty fields are hidden on the screen).
// shell: 'gray' | 'yellow' | 'purple' | 'black' (cartridge colour). Placeholders in [brackets] must be replaced before publishing.
// image (optional): 'assets/images/games/<name>.webp', a 352×336 picture shown in the label window (without it the window shows
// the title). The pictures are official art cropped to the window (2026-10-14/15 user choices): games released on mobile use
// their Google Play app icon (Blue Archive, MONGIL, Slay the Spire, Life is Strange, Genshin, Wuthering Waves, Endfield, ZZZ,
// Limbus Company, NTE, GFL2, Trickcal); ten PC games use their Steam PC icon (Apex Legends, ARC Raiders, DJMAX RESPECT V,
// ELDEN RING, Escape from Tarkov, Eternal Return, Marathon, PRAGMATA, PUBG, Stellar Blade); three without a usable PC icon use their
// PlayStation Store square art (Battlefield 6, Clair Obscur, The First Descendant); the rest use Steam library or store art.
// Names, platforms (where the game is released) and genres were checked against official sources on 2026-10-14; hours,
// play hours come from the user (2026-10-16; a game played on two devices shows their sum, e.g. Blue Archive Steam 24.3 + mobile 47.3);
// achievements (2026-10-16 a short record such as a rank, level or ending; all taken out 2026-10-21 at the user's request,
// so every game has ''; a line break in the text starts a new line on the screen) and the one-line review,
// which comes from the user later, stay '' (hidden on the screen) when empty.
const shells = ['gray', 'yellow', 'purple', 'black'];
export const games = [
  ['블루 아카이브', '모바일, PC', '수집형 RPG', 'blue-archive', 71.6],
  ['몬길: STAR DIVE', 'PC, 모바일', '액션 RPG', 'mongil-star-dive', 60.1],
  ['이터널 리턴', 'PC', 'MOBA, 배틀로얄', 'eternal-return', 7195.6],
  ['슬레이 더 스파이어', 'PC, 모바일, 콘솔', '덱빌딩 로그라이크', 'slay-the-spire', 25.4],
  ['슬레이 더 스파이어 2', 'PC', '덱빌딩 로그라이크', 'slay-the-spire-2', 59.1],
  ['DJMAX RESPECT V', 'PC, 콘솔', '리듬', 'djmax-respect-v', 19.7],
  ['스텔라 블레이드', '콘솔, PC', '액션 어드벤처', 'stellar-blade', 16.9],
  ['산나비', 'PC, 콘솔', '액션 플랫포머', 'sanabi', 13.1],
  ['클레르 옵스퀴르: 33 원정대', 'PC, 콘솔', '턴제 RPG', 'clair-obscur', 24.5],
  ['에이펙스 레전드', 'PC, 콘솔', '배틀로얄 FPS', 'apex-legends', 57.5],
  ['아크 레이더스', 'PC, 콘솔', '익스트랙션 슈터', 'arc-raiders', 19.8],
  ['엘든 링', 'PC, 콘솔', '액션 RPG', 'elden-ring', 25.3],
  ['프라그마타', 'PC, 콘솔', '액션 어드벤처', 'pragmata', 10.2],
  ['배틀그라운드', 'PC, 콘솔', '배틀로얄 슈팅', 'pubg', 487.7],
  ['마라톤', 'PC, 콘솔', '익스트랙션 슈터', 'marathon', 39.1],
  ['세피리아', 'PC', '로그라이트 액션', 'sephiria', 19.5],
  ['퍼스트 디센던트', 'PC, 콘솔', '루트 슈터', 'the-first-descendant', 52.2],
  ['로스트아크', 'PC', 'MMORPG', 'lost-ark', 2285.6],
  ['이스케이프 프롬 타르코프', 'PC', '익스트랙션 FPS', 'escape-from-tarkov', 682.9],
  ['라이프 이즈 스트레인지', 'PC, 콘솔, 모바일', '어드벤처', 'life-is-strange', 18.9],
  ['원신', 'PC, 모바일, 콘솔', '오픈월드 액션 RPG', 'genshin-impact', 216.4],
  ['명조: 워더링 웨이브', 'PC, 모바일, 콘솔', '오픈월드 액션 RPG', 'wuthering-waves', 45.6],
  ['명일방주: 엔드필드', 'PC, 모바일, 콘솔', '전략 RPG', 'arknights-endfield', 23.6],
  ['젠레스 존 제로', 'PC, 모바일, 콘솔', '액션 RPG', 'zenless-zone-zero', 112.3],
  ['배틀필드 6', 'PC, 콘솔', 'FPS', 'battlefield-6', 20.8],
  ['림버스 컴퍼니', 'PC, 모바일', '턴제 RPG', 'limbus-company', 17.1],
  ['이환', 'PC, 모바일, 콘솔', '오픈월드 RPG', 'nte', 21.4],
  ['소녀전선2: 망명', 'PC, 모바일', '턴제 전략 RPG', 'girls-frontline-2', 24.9],
  ['트릭컬 리바이브', '모바일', '수집형 RPG', 'trickcal-revive', 32.6],
  // No play time yet for the last one.
  ['툼 레이더 시리즈', 'PC, 콘솔, 모바일', '액션 어드벤처', 'tomb-raider'],
].map(([title, platform, genre, image, hours, achievements = ''], i) => ({
  title,
  platform,
  genre,
  hours: hours === undefined ? '' : `${hours.toLocaleString('en-US')}시간`,
  achievements,
  note: '',
  image: image ? `assets/images/games/${image}.webp` : undefined,
  shell: shells[Math.floor(i / 2) % shells.length],
}));

// "출시 앱" section on the home page (shown between the awards and the projects).
// Keep null until the real information is ready; null means the section is not generated at all.
// Example shape (all text is escaped; links must be https; image must exist in public/assets/images/):
// export const release = {
//   title: '게임 이름',
//   status: '2026년 11월 출시 예정', // optional badge
//   url: 'https://play.google.com/store/apps/details?id=...', linkLabel: '...', // optional: the image links here
//   image: 'assets/images/cards/game-title.webp', imageWidth: 960, imageHeight: 540, // imageStyle: 'icon' for a square app icon
//   meta: ['Google Play', '기획', '1인 개발'],
//   links: [{ label: 'Google Play에서 보기', url: 'https://play.google.com/store/apps/details?id=...' }],
// };
// Source: C:\Unity Project\zzukzzuk-nyang (README 출시 현황, 스토어/스토어_등록정보.md, 스토어/store-icon-512.png).
// 2026-10-16 (user requests): "비공식 2차 창작 팬게임" and "1인 개발" added to the info line. A play video link on YouTube
// (https://www.youtube.com/watch?v=BGQOpXTESr8) was added and then taken out again for now at the user's request.
// 2026-10-21 (user request): "비공식 2차 창작 팬게임" taken off the info line again.
// 2026-10-22 (user request): released on Google Play; no badge or button, the icon itself opens the store page.
export const release = {
  title: '쭉쭉냥 : 고양이 퍼즐',
  url: 'https://play.google.com/store/apps/details?id=com.minari.zzukzzuknyang',
  linkLabel: 'Google Play에서 쭉쭉냥 : 고양이 퍼즐 보기',
  image: 'assets/images/cards/zzukzzuk-nyang-icon.png',
  imageWidth: 256,
  imageHeight: 256,
  imageStyle: 'icon',
  meta: ['Android', '퍼즐', '1인 개발'],
  links: [],
};
