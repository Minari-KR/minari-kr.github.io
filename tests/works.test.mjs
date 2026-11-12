import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { compileSite } from '../scripts/site.mjs';
import { worksHtml } from '../scripts/works.mjs';
import { works, projects } from '../scripts/site-config.mjs';
import { root } from './fixture.mjs';

const { files, publicFiles } = compileSite(root);
const page = files.get('games/index.html');

test('the games page is standalone: in both outputs, one h1, only works.js', () => {
  assert.ok(publicFiles.has('games/index.html'));
  assert.equal((page.match(/<h1[ >]/g) || []).length, 1);
  assert.deepEqual([...page.matchAll(/<script src="([^"]+)"/g)].map(match => match[1].replace(/\?v=[a-f0-9]{12}$/, '')), ['../assets/js/works.js']);
});

test('only the games page may frame YouTube', () => {
  for (const [name, html] of files) {
    if (!name.endsWith('.html')) continue;
    const expected = name === 'games/index.html' ? 'frame-src https://www.youtube-nocookie.com">' : name === 'mobile-preview.html' ? "frame-src 'self'\">" : "frame-src 'none'\">";
    assert.ok(html.includes(expected), name);
  }
});

test('every work renders one card in order; only a video makes a YouTube link', () => {
  const cards = page.split('<li class="work">').slice(1);
  assert.equal(cards.length, works.length);
  works.forEach((entry, index) => {
    const title = entry.project ? projects.find(({ slug }) => slug === entry.project).title : entry.title;
    assert.ok(cards[index].includes(`translate="no">${title.replace(/&/g, '&amp;')}</h2>`), title);
    if (!entry.youtube) return assert.doesNotMatch(cards[index], /work-video/);
    const link = cards[index].match(/<a class="work-media work-video"[^>]*>/)[0];
    assert.match(link, /target="_blank"/);
    assert.match(link, /rel="(?=[^"]*noopener)(?=[^"]*noreferrer)[^"]*"/);
    assert.ok(link.includes(`data-youtube="${entry.youtube}"`));
  });
});

test('worksHtml rejects a bad video id, an unknown project, a bad start and an http link', () => {
  assert.throws(() => worksHtml([{ project: 'reflectory', youtube: 'short' }], projects), /youtube/);
  assert.throws(() => worksHtml([{ project: 'nope', youtube: '' }], projects), /nope/);
  assert.throws(() => worksHtml([{ project: 'reflectory', youtube: '', start: -1 }], projects), /start/);
  assert.throws(() => worksHtml([{ title: 'A', genre: 'B', meta: [], image: 'assets/images/works/erzz.webp', youtube: '', links: [{ label: 'x', url: 'http://a.b' }] }], projects), /https/);
});

test('the home page links to the games page', () => {
  assert.match(files.get('index.html'), /<a class="action action-primary intro-works" href="games\/">/);
});

test('works.js embeds only the no-cookie player and sends a referrer for it', () => {
  const source = fs.readFileSync(new URL('../src/scripts/works.js', import.meta.url), 'utf8');
  assert.ok(source.includes('youtube-nocookie.com') && source.includes('strict-origin-when-cross-origin'));
  assert.deepEqual([...source.matchAll(/https:\/\/[^/'"`]+/g)].map(match => match[0]), ['https://www.youtube-nocookie.com']);
});
