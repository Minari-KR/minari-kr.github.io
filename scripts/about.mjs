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

// Work cards: facts come from site-config `projects` and `release`; only the role label is written here.
export function workCards(projects, release) {
  const project = (slug, role) => {
    const found = projects.find(item => item.slug === slug);
    if (!found) throw new Error(`작업 카드에 쓸 프로젝트가 없습니다: ${slug}`);
    return { title: found.title, genre: found.genre, image: found.image, width: 960, height: 540, role, event: found.meta[0], award: found.awards[0] };
  };
  const cards = [
    project('reflectory', '4인 팀 · 팀장'),
    project('barrel-good-barrel', '3인 팀 · 팀장'),
    project('aiden-magnus-kartrider', '1인 개발'),
    { title: release.title, genre: release.meta[1], image: release.image, width: release.imageWidth, height: release.imageHeight, icon: true, role: '1인 개발 · 출시', event: 'Google Play 정식 출시' },
  ];
  return cards.map(card => {
    const image = `<img class="project-image${card.icon ? ' work-icon' : ''}" src="../${card.image}" width="${card.width}" height="${card.height}" alt="" loading="lazy" decoding="async">`;
    const award = card.award ? `\n                <p class="work-award">${escapeHtml(card.award)}</p>` : '';
    return `            <li class="work" data-work>
              <div class="work-faces">
                <div class="work-face work-front is-shown">
                  ${image}
                  <p class="project-genre">${escapeHtml(card.genre)}</p>
                  <h3 class="project-title" translate="no">${escapeHtml(card.title)}</h3>
                  <p class="release-status">${escapeHtml(card.role)}</p>
                </div>
                <div class="work-face work-back">
                  <p class="work-event">${escapeHtml(card.event)}</p>${award}
                </div>
              </div>
            </li>`;
  }).join('\n');
}
