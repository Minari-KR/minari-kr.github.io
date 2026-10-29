import fs from 'node:fs';
import path from 'node:path';
import { escapeHtml } from './content.mjs';

// Pieces of the standalone /about/ page that are built from data. Every value is escaped; paths are seen from about/index.html.

// Tool groups: [label, [[name, logo slug, role?]]]. A logo shows only when public/assets/images/tools/<slug>.png exists.
// The role is the AI paragraph's own wording; no other tool gets usage text.
export const toolGroups = [
  ['개발', [['Unity', 'unity'], ['Unreal', 'unreal']]],
  ['협업', [['Notion', 'notion'], ['GitHub', 'github']]],
  ['그래픽', [['Figma', 'figma'], ['Photoshop', 'photoshop'], ['Aseprite', 'aseprite'], ['Blender', 'blender'], ['ComfyUI', 'comfyui']]],
  ['AI', [['GPT', 'chatgpt', '그림'], ['Claude', 'claude', '작업 계획과 코드'], ['Grok', 'grok', '영상'], ['Gemini', 'gemini', '문장 다듬기']]],
];

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
