import test from 'node:test';
import assert from 'node:assert/strict';
import { compileSite } from '../scripts/site.mjs';
import { escapeHtml } from '../scripts/content.mjs';
import { projectCards, validateProjects } from '../scripts/projects.mjs';
import { projects } from '../scripts/site-config.mjs';
import { root } from './fixture.mjs';

test('a share description names its project\'s event and first award, so fields and sentence cannot drift apart', () => {
  const described = projects.filter(project => project.description);
  assert.ok(described.length >= 2);
  for (const { slug, meta, awards, description } of described) {
    assert.ok(description.includes(meta[0]), `${slug}: event "${meta[0]}"`);
    if (awards.length) assert.ok(description.includes(awards[0]), `${slug}: award "${awards[0]}"`);
  }
});

test('tabs, cards and pages all come from the projects list; a project without `detail` gets no page', () => {
  const { files } = compileSite(root);
  const home = files.get('index.html');
  projects.forEach((project, index) => {
    const { slug, title, genre, meta, awards, detail } = project;
    assert.ok(home.includes(`id="tab-${slug}" aria-controls="project-${slug}" aria-selected="${index === 0}"`), slug);
    assert.ok(home.includes(`<h3 class="project-title" id="${slug}-title"><span translate="no">${escapeHtml(title)}</span></h3>`), slug);
    const page = files.get(`projects/${slug}.html`);
    assert.equal(files.get('mobile-preview.html').includes(`./projects/${slug}.html`), Boolean(detail), slug);
    assert.equal(home.includes(`href="./projects/${slug}.html"`), Boolean(detail), slug);
    if (!detail) return assert.equal(page, undefined, slug);
    // The detail page repeats the card's genre, info line and awards, and adds the period.
    assert.ok(page.includes(`<h1 translate="no">${escapeHtml(title)}</h1>`) && page.includes(`<title>${escapeHtml(title)} | 박종찬</title>`), slug);
    for (const text of [genre, ...meta, ...awards]) assert.ok(home.includes(escapeHtml(text)) && page.includes(escapeHtml(text)), `${slug}: ${text}`);
    assert.equal((page.match(/<time datetime=/g) || []).length, 2, slug);
    assert.equal((page.match(/class="project-award"/g) || []).length, awards.length, slug);
  });
});

test('project values are escaped and a bad entry stops the build', () => {
  const [first] = projects;
  assert.doesNotThrow(() => validateProjects(projects));
  const cards = projectCards([{ ...first, title: 'A & <b>x</b>', awards: ['"quoted"'] }]);
  assert.ok(cards.includes('A &amp; &lt;b&gt;x&lt;/b&gt;') && cards.includes('&quot;quoted&quot;') && !cards.includes('<b>'));
  const bad = {
    'a slug with capitals': { slug: 'Bad' },
    'a repeated slug': null,
    'a button link that is not https': { actions: [{ label: '플레이하기', url: 'http://example.com' }] },
    'a page button without a page': { detail: undefined },
    'a script name outside assets/js': { detail: { ...first.detail, scripts: ['../x'] } },
    'a page without a play link': { actions: [{ label: '플레이 영상' }] },
    'a page without a share description': { description: '' },
  };
  for (const [name, change] of Object.entries(bad)) {
    const list = change ? [{ ...first, ...change }] : [first, first];
    assert.throws(() => validateProjects(list), /프로젝트/, name);
  }
});
