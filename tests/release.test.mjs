import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { compileSite, validateFiles } from '../scripts/site.mjs';
import { releaseSection } from '../scripts/release.mjs';
import { release } from '../scripts/site-config.mjs';
import { root } from './fixture.mjs';

const template = fs.readFileSync(new URL('../src/templates/release.html', import.meta.url), 'utf8');
const sample = {
  title: 'Sample <Game>',
  status: '2026년 11월 출시 예정',
  image: 'assets/images/cards/reflectory-title.webp',
  meta: ['Google Play', '기획 & 개발'],
  links: [{ label: 'Google Play에서 보기', url: 'https://play.google.com/store/apps/details?id=example' }, { label: 'itch.io', url: 'https://minari-kr.itch.io/' }],
};

test('the configured release renders once after the awards, right before the projects, with its image published', () => {
  const { files, publicFiles } = compileSite(root);
  const html = files.get('index.html');
  assert.doesNotMatch(html, /\{\{/);
  if (!release) return assert.doesNotMatch(html, /id="release"|출시 앱/);
  assert.equal((html.match(/id="release"/g) || []).length, 1);
  assert.ok(html.indexOf('</header>') < html.indexOf('id="awards"') && html.indexOf('id="awards"') < html.indexOf('id="release"'));
  assert.ok(html.indexOf('id="release"') < html.indexOf('id="projects"'));
  assert.ok(publicFiles.has(release.image));
  if (!release.links?.length) assert.doesNotMatch(html.slice(html.indexOf('id="release"'), html.indexOf('id="projects"')), /project-actions/);
});

test('an empty release produces no section', () => {
  assert.equal(releaseSection(template, null), '');
});

test('a filled release is escaped, sized and its links pass the site link checks', () => {
  const section = releaseSection(template, { ...sample, imageWidth: 1024, imageHeight: 500 });
  assert.match(section, /Sample &lt;Game&gt;/);
  assert.match(section, /기획 &amp; 개발/);
  assert.match(section, /width="1024" height="500"/);
  assert.match(section, /class="action action-primary" href="https:\/\/play\.google\.com\/[^"]+" target="_blank" rel="noopener noreferrer"/);
  const { files } = compileSite(root);
  const withoutCurrent = files.get('index.html').replace(/    <section class="section release"[\s\S]*?<\/section>\n\n/, '');
  const home = withoutCurrent.replace('    <section class="section" id="projects"', section + '    <section class="section" id="projects"');
  assert.equal((home.match(/id="release"/g) || []).length, 1);
  assert.doesNotThrow(() => validateFiles(new Map(files).set('index.html', home)));
});

test('icon style renders a square app icon instead of a wide project image', () => {
  const icon = releaseSection(template, { ...sample, imageWidth: 256, imageHeight: 256, imageStyle: 'icon' });
  assert.match(icon, /<img class="release-image release-icon" [^>]*width="256" height="256"/);
  assert.match(releaseSection(template, sample), /<img class="release-image project-image" /);
});

test('a release without status or links can link its image to the store instead', () => {
  const { status, links, ...bare } = sample;
  const plain = releaseSection(template, bare);
  assert.doesNotMatch(plain, /release-status|project-actions|<a /);
  const linked = releaseSection(template, { ...bare, url: 'https://play.google.com/store/apps/details?id=example', linkLabel: 'Google Play에서 <보기>' });
  assert.match(linked, /<a class="release-link" href="https:\/\/play\.google\.com\/[^"]+" target="_blank" rel="noopener noreferrer" aria-label="Google Play에서 &lt;보기&gt;"><img [^>]*alt=""><\/a>/);
  assert.throws(() => releaseSection(template, { ...bare, url: 'http://example.com' }), /https/);
});

test('release information rejects missing fields, non-https links, remote images and bad sizes', () => {
  assert.throws(() => releaseSection(template, { ...sample, title: '' }), /title/);
  assert.throws(() => releaseSection(template, { ...sample, links: [{ label: 'x', url: 'http://example.com' }] }), /https/);
  assert.throws(() => releaseSection(template, { ...sample, image: 'https://example.com/a.png' }), /로컬 파일/);
  assert.throws(() => releaseSection(template, { ...sample, imageWidth: -1 }), /크기/);
});
