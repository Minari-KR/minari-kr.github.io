import { escapeHtml } from './content.mjs';

// Body pieces of the PC-only pages (/pc/ and /pc/about/), rendered from the same data as the main site. `base` is the path from the page up to the site root (".." or "../.."); every value is escaped.
const NEW_TAB = 'target="_blank" rel="noopener noreferrer"';
const SEPARATOR = '<span class="meta-sep" aria-hidden="true">/</span>';

const metaLine = meta => `<p class="pc-meta">${meta.map(part => `<span>${escapeHtml(part)}</span>`).join(SEPARATOR)}</p>`;

// One slide per project, in site-config order.
export function pcProjects(projects, base) {
  return projects.map(project => {
    const slug = escapeHtml(project.slug);
    const button = ({ label, url, primary }) => {
      const href = url ? `href="${escapeHtml(url)}" ${NEW_TAB}` : `href="${base}/projects/${slug}.html"`;
      return `<a class="${primary ? 'action action-primary' : 'action'}" ${href}>${escapeHtml(label)}</a>`;
    };
    return [
      `            <article class="pc-slide" aria-labelledby="pc-${slug}-title">`,
      `              <div class="pc-media"><img src="${base}/${escapeHtml(project.image)}" width="960" height="540" alt=""></div>`,
      '              <div class="pc-plate">',
      `                <p class="pc-genre">${escapeHtml(project.genre)}</p>`,
      `                <h3 id="pc-${slug}-title" translate="no">${escapeHtml(project.title)}</h3>`,
      `                ${metaLine(project.meta)}`,
      ...project.awards.map(award => `                <p class="pc-award">${escapeHtml(award)}</p>`),
      `                <div class="pc-actions">${project.actions.map(button).join('')}</div>`,
      '              </div>',
      '            </article>',
    ].join('\n');
  }).join('\n');
}

// The released app is the last slide.
export function pcRelease(release, base) {
  if (!release) return ''; // site-config may set release to null, like the main site
  if (!/^https:\/\//.test(release.url ?? '')) throw new Error('출시 앱 링크는 https 주소여야 합니다.');
  return [
    '            <article class="pc-slide" aria-labelledby="pc-release-title">',
    `              <div class="pc-media pc-media-icon"><img src="${base}/${escapeHtml(release.image)}" width="${release.imageWidth ?? 960}" height="${release.imageHeight ?? 540}" alt=""></div>`,
    '              <div class="pc-plate">',
    '                <p class="pc-genre">Released</p>',
    `                <h3 id="pc-release-title" translate="no">${escapeHtml(release.title)}</h3>`,
    `                ${metaLine(release.meta ?? [])}`,
    `                <div class="pc-actions"><a class="action action-primary" href="${escapeHtml(release.url)}" ${NEW_TAB}>${escapeHtml(release.linkLabel ?? release.title)}</a></div>`,
    '              </div>',
    '            </article>',
  ].join('\n');
}

// Summary under the slider for the current slide. The text comes from the detail page body src/templates/projects/<slug>.html (read at build time, never copied).
// A block is every <div class="core"> of that body; only its title, description and flowchart <img> are taken, the rest (canvases, HUDs, stills, cards) is ignored.
export function coreBlocks(html, slug) {
  const starts = [...html.matchAll(/<div class="core"[\s>]/g)].map(match => match.index);
  const blocks = starts.map((start, i) => {
    const part = html.slice(start, starts[i + 1] ?? html.length);
    const title = part.match(/<h2 class="core-title">([^<]+)<\/h2>/)?.[1];
    const text = part.match(/<p class="core-text">([\s\S]*?)<\/p>/)?.[1] ?? '';
    const tag = part.match(/<figure class="core-flow">[\s\S]*?(<img [^>]*>)/)?.[1] ?? '';
    const attr = name => tag.match(new RegExp(String.raw`\s${name}="([^"]+)"`))?.[1];
    const img = { src: attr('src'), width: attr('width'), height: attr('height'), alt: attr('alt') };
    if (!title || !/^\.\.\/assets\//.test(img.src ?? '') || !/^\d+$/.test(img.width ?? '') || !/^\d+$/.test(img.height ?? '') || !img.alt) {
      throw new Error(`${slug} 상세 본문의 ${i + 1}번째 핵심 블록에서 제목이나 순서도 이미지(src·width·height·alt)를 찾지 못했습니다. src/templates/projects/${slug}.html을 확인하세요.`);
    }
    return { title, text, img };
  });
  if (!blocks.length) throw new Error(`${slug} 상세 본문에서 핵심 블록(<div class="core">)을 하나도 찾지 못했습니다. src/templates/projects/${slug}.html을 확인하세요.`);
  return blocks;
}

// One summary per slide, same order as pcProjects + pcRelease. `readBody(slug)` returns the detail body HTML.
export function pcDetails(projects, release, base, readBody) {
  const section = (id, content) => [`            <section class="pc-detail" aria-labelledby="${id}">`, content, '            </section>'].join('\n');
  // The slide right above already has the link, so these summaries are one line only.
  const lineOnly = (id, line) => section(id, `              <p class="pc-detail-line">${line}</p>`);
  const parts = projects.map(project => {
    const slug = escapeHtml(project.slug);
    const id = `pc-${slug}-title`;
    if (!project.detail) return lineOnly(id, '상세 페이지 없이 플레이 영상으로 소개하는 프로젝트예요.');
    const { video } = project.detail;
    const blocks = coreBlocks(readBody(project.slug), project.slug).map(({ title, text, img }) => [
      '              <div class="pc-core">',
      `                <div class="pc-core-text"><h4>${escapeHtml(title)}</h4>${text ? `<p>${text}</p>` : ''}</div>`,
      `                <img src="${base}${img.src.slice(2)}" width="${img.width}" height="${img.height}" alt="${img.alt}">`,
      '              </div>',
    ].join('\n'));
    return section(id, [
      `              <video controls preload="none" playsinline poster="${base}/${escapeHtml(project.image)}" width="${video.width}" height="${video.height}" src="${base}/${escapeHtml(video.src)}" aria-label="${escapeHtml(`${project.title} ${video.label}`)}"></video>`,
      ...blocks,
    ].join('\n'));
  });
  if (release) parts.push(lineOnly('pc-release-title', 'Google Play에 출시한 앱이에요.'));
  return parts.join('\n');
}
