import { escapeHtml } from './content.mjs';

// Pieces of the standalone /about/ page that are built from data. Every value is escaped; paths are seen from about/index.html.

// 소개 stickers: [label, word, reason?]; a word that is a list of game titles becomes picture stickers (icons come from `games`).
export const stickers = [
  ['학교', '우송대학교 게임멀티미디어학과 3학년'],
  ['지망', '게임 시스템 디자이너'],
  ['꿈의 시작', '중2 때 찾은 부산 지스타'],
  ['취미', '산책', '머리 환기'],
  ['취미', '대화', '게임 인사이트 · 개발 · AI'],
  ['취향', '서브컬처', '캐릭터의 매력'],
  ['최애 게임', ['이터널 리턴', '몬길: STAR DIVE', '블루 아카이브']],
  ['최애 애니', '장송의 프리렌'],
];

export function stickersHtml(items, games) {
  const game = title => `<span class="sticker-game"><img src="../${escapeHtml(games.find(item => item.title === title).image)}" width="352" height="336" alt="" decoding="async"><span class="sticker-name" translate="no">${escapeHtml(title)}</span></span>`;
  const lis = items.map(([label, word, reason]) => {
    const body = Array.isArray(word)
      ? `<span class="sticker-games">${word.map(game).join('')}</span>`
      : `<span class="sticker-word">${escapeHtml(word)}</span>${reason ? `<span class="sticker-reason">${escapeHtml(reason)}</span>` : ''}`;
    return `          <li class="sticker"><span class="sticker-label">${escapeHtml(label)}</span>${body}</li>`;
  }).join('\n');
  return `        <ul class="sticker-board">\n${lis}\n        </ul>`;
}

// Infinite spiral: every game with an image as a card on a helix, in config order (src/scripts/about.js shuffles them per visit).
// Screen readers get the titles once; the cards have empty alt text.
export function spiralHtml(games) {
  const list = games.filter(game => game.image);
  const cards = list.map(game => `            <img class="spiral-card" src="../${escapeHtml(game.image)}" width="352" height="336" alt="" decoding="async">`).join('\n');
  return `        <div class="spiral" data-spiral role="img" aria-label="게임 ${list.length}개: ${escapeHtml(list.map(game => game.title).join(', '))}">
          <div class="spiral-stage">\n${cards}\n          </div>
        </div>`;
}

// First-visit intro layer: every game with an image, in site-config order, hidden until src/scripts/intro.js shows it. `base` is the path
// to the site root ('.' on home, '..' on About Me). The cards have empty alt text, so screen readers pass over them.
export function introHtml(games, base = '.') {
  const cards = games.filter(game => game.image).map(game => `    <img class="intro-card" src="${base}/${escapeHtml(game.image)}" width="352" height="336" alt="" decoding="async">`).join('\n');
  return `<div class="intro-layer" data-intro hidden>\n${cards}\n  </div>\n`;
}
