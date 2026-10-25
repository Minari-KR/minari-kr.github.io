import fs from 'node:fs';
import path from 'node:path';
import { escapeHtml } from './content.mjs';

// Pieces of the standalone /about/ page that are built from data. Every value is escaped; paths are seen from about/index.html.

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
    return `            <div class="tool-group">\n              <p class="tool-label">${escapeHtml(label)}</p>\n              <ul class="tool-list">\n${chips}\n              </ul>\n            </div>`;
  }).join('\n');
}

export const logoExists = root => slug => fs.existsSync(path.join(root, 'public/assets/images/tools', `${slug}.png`));
