import fs from 'node:fs';
import path from 'node:path';
import { escapeHtml } from './content.mjs';

// Pieces of the standalone /about/ page that are built from data. Every value is escaped; paths are seen from about/index.html.

// Tool groups: [label, [[name, logo slug, role?]]]. A logo shows only when public/assets/images/tools/<slug>.png exists.
// The role is the AI flow's own wording; no other tool gets usage text.
export const toolGroups = [
  ['개발', [['Unity', 'unity'], ['Unreal', 'unreal']]],
  ['협업', [['Notion', 'notion'], ['GitHub', 'github']]],
  ['그래픽', [['Figma', 'figma'], ['Photoshop', 'photoshop'], ['Aseprite', 'aseprite'], ['Blender', 'blender'], ['ComfyUI', 'comfyui']]],
  ['AI', [['GPT', 'chatgpt', '그림'], ['Claude', 'claude', '작업 계획과 코드'], ['Grok', 'grok', '영상'], ['Gemini', 'gemini', '문장 다듬기']]],
];

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

// "AI는 이렇게 씁니다": five steps [title, line]; step 03 adds the AI tool chips from toolGroups, step 04 the retry hint.
const aiSteps = [
  ['문제 정의', '해결할 문제를 먼저 정합니다'],
  ['목표 설정', '도달할 목표를 분명히 세웁니다'],
  ['AI와 제작', '기획은 직접, AI는 수단으로'],
  ['직접 확인', '결과가 목표에 맞는지 끝까지 확인합니다'],
  ['최종 결정', '제 기준으로 마무리합니다'],
];

export function aiFlowHtml(groups, hasLogo) {
  const chips = groups.find(([label]) => label === 'AI')[1].map(([name, slug, role]) => {
    const logo = hasLogo(slug) ? `<img class="ai-logo" src="../assets/images/tools/${slug}.png" width="192" height="192" alt="" aria-hidden="true" loading="lazy" decoding="async">` : '';
    return `<li class="ai-tool">${logo}<span class="ai-tool-text"><span class="ai-tool-name" translate="no">${escapeHtml(name)}</span><span class="ai-tool-role">${escapeHtml(role)}</span></span></li>`;
  }).join('');
  const extra = [, , `<ul class="ai-tools">${chips}</ul>`, '<span class="ai-retry"><span class="ai-retry-arrow" aria-hidden="true"></span>맞지 않으면 다시</span>'];
  const steps = aiSteps.map(([title, line], i) => `        <li class="ai-step"><span class="ai-num" aria-hidden="true">0${i + 1}</span><div class="ai-body"><strong class="ai-title">${escapeHtml(title)}</strong><span class="ai-line">${escapeHtml(line)}</span>${extra[i] ?? ''}</div></li>`).join('\n');
  return `        <ol class="ai-flow" data-ai-flow>\n${steps}\n        </ol>`;
}

// Tool cards, grouped so the page still reads as four labelled lists without JavaScript.
export function toolGroupsHtml(groups, hasLogo) {
  return groups.map(([label, tools]) => {
    const slots = tools.map(([name, slug, role = '']) => {
      const logo = hasLogo(slug) ? `<img class="inv-logo" src="../assets/images/tools/${slug}.png" width="192" height="192" alt="" aria-hidden="true" loading="lazy" decoding="async">` : '';
      const hidden = `, ${label}${role ? `, ${role}` : ''}`;
      return `                <li class="inv-slot" data-slot data-group="${escapeHtml(label)}"><span class="inv-box">${logo}</span><span class="inv-name" translate="no">${escapeHtml(name)}</span><span class="inv-hide">${escapeHtml(hidden)}</span></li>`;
    }).join('\n');
    return `            <div class="inv-group">\n              <p class="inv-label">${escapeHtml(label)}</p>\n              <ul class="inv-list">\n${slots}\n              </ul>\n            </div>`;
  }).join('\n');
}

export const logoExists = root => slug => fs.existsSync(path.join(root, 'public/assets/images/tools', `${slug}.png`));

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
