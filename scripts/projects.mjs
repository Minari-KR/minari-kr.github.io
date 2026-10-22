import { escapeHtml } from './content.mjs';

// Renders everything about the projects that more than one place shows, from site-config.mjs `projects`: the home page's tab buttons
// and cards, and the values the shared detail frame (src/templates/project-detail.html) needs. Every value is escaped.
// The two home blocks are lines joined by "\n" with no trailing newline; home.html puts the closing </div> right after the
// placeholder, which keeps the page byte-identical to the one the hand-written blocks gave.
const SEPARATOR = '<span class="meta-sep" aria-hidden="true">/</span>';
const SIZE = 'width="960" height="540"'; // every card picture is 960×540
const NEW_TAB = 'target="_blank" rel="noopener noreferrer"';
const isText = value => typeof value === 'string' && value.trim() !== '';
const isHttps = value => typeof value === 'string' && /^https:\/\//.test(value);
const isCount = value => Number.isInteger(value) && value > 0;

export function validateProjects(projects) {
  if (!Array.isArray(projects) || !projects.length) throw new Error('프로젝트 목록(projects)이 비어 있습니다.');
  const slugs = new Set();
  for (const project of projects) {
    const { slug, detail } = project;
    if (!/^[a-z0-9-]+$/.test(slug) || slugs.has(slug)) throw new Error(`프로젝트 주소를 확인하세요: ${slug}`);
    slugs.add(slug);
    const bad = what => new Error(`프로젝트 ${slug}의 ${what} 값을 확인하세요.`);
    if (!isText(project.title)) throw bad('title');
    if (!isText(project.genre)) throw bad('genre');
    if (!Array.isArray(project.meta) || !project.meta.every(isText)) throw bad('meta');
    if (!Array.isArray(project.awards) || !project.awards.every(isText)) throw bad('awards');
    if (!/^assets\/images\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(?:png|jpe?g|webp|gif|avif)$/.test(project.image)) throw bad('image');
    if (!Array.isArray(project.actions) || !project.actions.length) throw bad('actions');
    for (const { label, url } of project.actions) {
      // A button without a url opens the project's own page, so it needs one.
      if (!isText(label) || (url === undefined ? !detail : !isHttps(url))) throw bad(`버튼(${label})`);
    }
    if (project.period) {
      const { start, end } = project.period;
      if (![start?.datetime, start?.text, end?.datetime, end?.text].every(isText)) throw bad('period');
    }
    if (!detail) continue;
    if (!isText(project.description)) throw bad('description');
    const { video, scripts } = detail;
    if (!/^assets\/videos\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.mp4$/.test(video?.src) || !isCount(video.width) || !isCount(video.height) || !isText(video.label)) throw bad('detail.video');
    if (!Array.isArray(scripts) || !scripts.every(name => /^[a-z-]+$/.test(name))) throw bad('detail.scripts');
    if (!project.actions.some(action => action.primary && action.url)) throw bad('대표 버튼(primary, url)');
  }
}

const metaLine = (project, period) => [
  ...project.meta.map(part => `<span>${escapeHtml(part)}</span>`),
  ...(period ? [`<span class="project-period"><span class="period-badge"><img src="../assets/icons/calendar.svg" width="16" height="16" alt="" aria-hidden="true"><span class="period-label">개발 기간</span><time datetime="${escapeHtml(period.start.datetime)}">${escapeHtml(period.start.text)}</time> ~ <time datetime="${escapeHtml(period.end.datetime)}">${escapeHtml(period.end.text)}</time></span></span>`] : []),
].join(SEPARATOR);

export function projectTabs(projects) {
  return projects.map(({ slug, title, image }, index) => `          <button class="ptabs-tab" type="button" role="tab" id="tab-${escapeHtml(slug)}" aria-controls="project-${escapeHtml(slug)}" aria-selected="${index === 0}"><img src="./${escapeHtml(image)}" ${SIZE} alt=""><span translate="no">${escapeHtml(title)}</span></button>`).join('\n');
}

export function projectCards(projects) {
  return projects.map(project => {
    const slug = escapeHtml(project.slug);
    const picture = `<img class="project-image" src="./${escapeHtml(project.image)}" ${SIZE} alt="">`;
    const button = ({ label, url, primary }) => {
      const href = url ? `href="${escapeHtml(url)}" ${NEW_TAB}` : `href="./projects/${slug}.html"`;
      return `<a class="${primary ? 'action action-primary' : 'action'}" ${href}>${escapeHtml(label)}</a>`;
    };
    return [
      `          <article class="project" id="project-${slug}" aria-labelledby="${slug}-title">`,
      // Only a project with a page of its own makes its picture a link.
      project.detail ? `            <a class="project-image-link" href="./projects/${slug}.html" tabindex="-1" aria-hidden="true">${picture}</a>` : `            ${picture}`,
      `            <p class="project-genre">${escapeHtml(project.genre)}</p>`,
      `            <h3 class="project-title" id="${slug}-title"><span translate="no">${escapeHtml(project.title)}</span></h3>`,
      `            <p class="project-meta">${metaLine(project)}</p>`,
      ...project.awards.map(award => `            <p class="project-award">${escapeHtml(award)}</p>`),
      '            <div class="project-actions">',
      ...project.actions.map(action => `              ${button(action)}`),
      '            </div>',
      '          </article>',
    ].join('\n');
  }).join('\n');
}

// Values for the shared detail frame. The play link under the video repeats the project's primary button.
export function detailValues(project) {
  const { video, scripts } = project.detail;
  const play = project.actions.find(action => action.primary && action.url);
  return {
    title: escapeHtml(project.title),
    description: escapeHtml(project.description),
    genre: escapeHtml(project.genre),
    meta: metaLine(project, project.period),
    awards: project.awards.map(award => `      <p class="project-award">${escapeHtml(award)}</p>\n`).join(''),
    video_width: String(video.width),
    video_height: String(video.height),
    video_src: escapeHtml(video.src),
    video_label: escapeHtml(`${project.title} ${video.label}`),
    poster: escapeHtml(project.image),
    play_url: escapeHtml(play.url),
    play_label: escapeHtml(play.label),
    scripts: scripts.map(name => `  <script src="../assets/js/${escapeHtml(name)}.js" defer></script>\n`).join(''),
  };
}
