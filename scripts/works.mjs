import { escapeHtml } from './content.mjs';
import { metaLine } from './projects.mjs';

// The cards of the standalone /games/ page (site-config.mjs `works`), seen from games/index.html. Every value is escaped.
export function worksHtml(works, projects) {
  return works.map(entry => {
    const project = entry.project === undefined ? entry : projects.find(({ slug }) => slug === entry.project);
    if (!project) throw new Error(`만든 게임 목록에 없는 프로젝트입니다: ${entry.project}`);
    const { youtube, start } = entry;
    const { title } = project;
    if (youtube !== '' && !/^[A-Za-z0-9_-]{11}$/.test(youtube)) throw new Error(`만든 게임 ${title}의 영상 주소(youtube)를 확인하세요.`);
    if (start !== undefined && !(Number.isInteger(start) && start >= 0)) throw new Error(`만든 게임 ${title}의 시작 시간(start)을 확인하세요.`);
    const links = entry.project === undefined ? entry.links ?? [] : [
      ...(project.detail ? [{ label: '자세히 보기', url: `../projects/${project.slug}.html` }] : []),
      ...project.actions.filter(({ url }) => url && new URL(url).hostname !== 'www.youtube.com'),
    ];
    for (const { label, url } of entry.links ?? []) {
      if (!/^https:\/\//.test(url)) throw new Error(`만든 게임 ${title}의 링크(${label})는 https 주소여야 합니다.`);
    }
    const picture = `<img src="../${escapeHtml(project.image)}" width="960" height="540" alt="" loading="lazy" decoding="async">`;
    const media = youtube
      ? `<a class="work-media work-video" href="https://www.youtube.com/watch?v=${youtube}${start === undefined ? '' : `&amp;t=${start}s`}" target="_blank" rel="noopener noreferrer" data-youtube="${youtube}"${start === undefined ? '' : ` data-start="${start}"`} aria-label="${escapeHtml(title)} 플레이 영상 재생">${picture}<span class="work-play" aria-hidden="true"></span></a>`
      : `<div class="work-media">${picture}</div>`;
    const button = ({ label, url }, index) => `<a class="${index ? 'action' : 'action action-primary'}" href="${escapeHtml(url)}"${url.startsWith('https:') ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(label)}</a>`;
    return [
      '    <li class="work">',
      `      ${media}`,
      `      <p class="project-genre">${escapeHtml(project.genre)}</p>`,
      `      <h2 class="project-title" translate="no">${escapeHtml(title)}</h2>`,
      ...(project.meta.length ? [`      <p class="project-meta">${metaLine(project)}</p>`] : []),
      ...(project.awards ?? []).map(award => `      <p class="project-award">${escapeHtml(award)}</p>`),
      ...(links.length ? ['      <div class="project-actions">', ...links.map((link, index) => `        ${button(link, index)}`), '      </div>'] : []),
      '    </li>',
    ].join('\n');
  }).join('\n');
}
