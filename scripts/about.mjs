import fs from 'node:fs';
import path from 'node:path';
import { escapeHtml } from './content.mjs';
import { gamePack } from './games.mjs';

// Pieces of the standalone /about/ page that are built from data. Every value is escaped; paths are seen from about/index.html.

// The 6 games with the most play hours (hours is text such as "7,195.6시간"; a game without hours counts as 0).
const hoursOf = game => parseFloat(game.hours.replace(/,/g, '')) || 0;
export const topGames = (games, count = 6) => [...games].sort((a, b) => hoursOf(b) - hoursOf(a)).slice(0, count);

export function topGameItems(games) {
  return topGames(games).map((game, index) => {
    const info = [game.title, game.hours, game.genre].filter(Boolean).map(text => `<span>${escapeHtml(text)}</span>`).join('');
    return `            <li class="top-game">${gamePack(game, index, { base: '../', label: '정보 보기' })}<p class="top-info">${info}</p></li>`;
  }).join('\n');
}

// Tool groups: [label, [[name, logo slug]]]. A logo shows only when public/assets/images/tools/<slug>.png exists.
export const toolGroups = [
  ['개발', [['Unity', 'unity'], ['Unreal', 'unreal']]],
  ['기획·협업', [['Figma', 'figma'], ['Notion', 'notion'], ['GitHub', 'github']]],
  ['그래픽', [['Photoshop', 'photoshop'], ['Aseprite', 'aseprite'], ['Blender', 'blender'], ['ComfyUI', 'comfyui']]],
  ['AI', [['GPT', 'chatgpt'], ['Claude', 'claude'], ['Grok', 'grok'], ['Gemini', 'gemini']]],
];

export function toolGroupsHtml(groups, hasLogo) {
  return groups.map(([label, tools]) => {
    const chips = tools.map(([name, slug]) => {
      const logo = hasLogo(slug) ? `<img class="tool-logo" src="../assets/images/tools/${slug}.png" height="32" alt="" aria-hidden="true" loading="lazy" decoding="async">` : '';
      return `                <li class="tool-chip">${logo}<span translate="no">${escapeHtml(name)}</span></li>`;
    }).join('\n');
    return `            <div class="tool-group">\n              <h3 class="tool-label">${escapeHtml(label)}</h3>\n              <ul class="tool-list">\n${chips}\n              </ul>\n            </div>`;
  }).join('\n');
}

export const logoExists = root => slug => fs.existsSync(path.join(root, 'public/assets/images/tools', `${slug}.png`));
