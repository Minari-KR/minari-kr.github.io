import fs from 'node:fs';
import path from 'node:path';
import { escapeHtml } from './content.mjs';

// Pieces of the standalone /about/ page that are built from data. Every value is escaped; paths are seen from about/index.html.

// Tool groups: [label, [[name, logo slug, role?]]]. A logo shows only when public/assets/images/tools/<slug>.png exists.
// The role is the AI paragraph's own wording; no other tool gets usage text.
export const toolGroups = [
  ['개발', [['Unity', 'unity'], ['Unreal', 'unreal']]],
  ['기획·협업', [['Figma', 'figma'], ['Notion', 'notion'], ['GitHub', 'github']]],
  ['그래픽', [['Photoshop', 'photoshop'], ['Aseprite', 'aseprite'], ['Blender', 'blender'], ['ComfyUI', 'comfyui']]],
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

// Subculture game banner: games picked by title, in this order. A missing title fails the build.
export const bannerTitles = ['블루 아카이브', '명조: 워더링 웨이브', '원신', '이터널 리턴', '젠레스 존 제로', '명일방주: 엔드필드', '몬길: STAR DIVE', '림버스 컴퍼니', '이환', '소녀전선2: 망명', '트릭컬 리바이브'];

function bannerGames(games, titles) {
  return titles.map(title => {
    const game = games.find(item => item.title === title);
    if (!game || !game.image) throw new Error(`배너 게임을 games에서 찾을 수 없습니다: ${title}`);
    return game;
  });
}

export function bannerSlidesHtml(games, titles = bannerTitles) {
  const list = bannerGames(games, titles);
  return list.map((game, i) => `            <div class="banner-slide" data-slide role="group" aria-roledescription="slide" aria-label="${i + 1} / ${list.length} ${escapeHtml(game.title)}">
              <img class="banner-art" src="../${escapeHtml(game.image)}" width="352" height="336" alt="${escapeHtml(game.title)}" decoding="async">
            </div>`).join('\n');
}
