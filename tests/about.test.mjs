import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { compileSite } from '../scripts/site.mjs';
import { readHtmlTags } from '../scripts/html.mjs';
import { toolGroups, toolGroupsHtml } from '../scripts/about.mjs';
import { games } from '../scripts/site-config.mjs';
import { root } from './fixture.mjs';

const { files, publicFiles } = compileSite(root);
const page = files.get('about/index.html');
const tags = readHtmlTags(page);

test('about page is standalone: one h1, sections in order, no way back to the portfolio, scripts in order', () => {
  assert.ok(publicFiles.has('about/index.html'));
  assert.equal(tags.filter(({ tag }) => tag === 'h1').length, 1);
  assert.match(page, /<h1 id="intro-title" tabindex="-1">About Me<\/h1>\s*<p class="about-handle" translate="no">Minari<\/p>\s*<p class="intro-role">박종찬 /);
  const order = ['intro-title', 'about-title', 'taste-title', 'tools-title', 'stats-title', 'work-title'].map(id => page.indexOf(`id="${id}"`));
  assert.ok(order.every((at, i) => at > (order[i - 1] ?? -1)), order.join());
  const hrefs = tags.filter(({ tag }) => tag === 'a').map(({ attributes }) => attributes.href);
  assert.deepEqual(hrefs, ['#main']);
  assert.doesNotMatch(page, /index\.html|projects\/|mailto:|tel:|https:\/\/(?!fonts\.g|minari-kr\.github\.io\/)/);
  const scripts = tags.filter(({ tag }) => tag === 'script').map(({ attributes }) => attributes.src.replace(/\?v=[a-f0-9]{12}$/, ''));
  assert.deepEqual(scripts, ['../assets/js/motion-loop.js', '../assets/js/about.js']);
  assert.ok(!/<svg|<script>|<style|style=/.test(page));
});

test('stat window keeps its four tabs and counts; the game count includes Tomb Raider', () => {
  assert.equal(games.length, 30);
  assert.ok(games.some(game => game.title === '툼 레이더 시리즈' && game.image === 'assets/images/games/tomb-raider.webp' && game.hours === ''));
  assert.deepEqual([...page.matchAll(/data-count="(\d+)"/g)].map(match => Number(match[1])), [4, 2, 1, games.length]);
  for (const text of ['국가수리과학연구소장상', '베스트 리더상', '우수상', '4인 팀 기획 및 팀장', '3인 팀 기획 및 팀장', '쭉쭉냥 : 고양이 퍼즐']) assert.ok(page.includes(text), text);
  assert.equal((page.match(/role="tab"/g) || []).length, 4);
});

test('the six games with the most play hours show as packs, most hours first, with the play time as text', () => {
  const hours = game => parseFloat(game.hours.replace(/,/g, '')) || 0;
  const expected = [...games].sort((a, b) => hours(b) - hours(a)).slice(0, 6);
  const packs = tags.filter(({ tag, attributes }) => tag === 'button' && /\bpack\b/.test(attributes.class ?? ''));
  assert.deepEqual(packs.map(({ attributes }) => attributes['data-title']), expected.map(game => game.title));
  assert.deepEqual(packs.map(({ attributes }) => attributes['data-hours']), expected.map(game => game.hours));
  assert.equal(expected[0].title, '이터널 리턴');
  for (const game of expected) assert.ok(page.includes(`<span>${game.hours}</span>`), game.title);
  assert.match(page, /<img class="pack-img" src="\.\.\/assets\/images\/games\/eternal-return\.webp"/);
  assert.match(page, /data-top-caption aria-live="polite" hidden/);
});

test('13 tool chips in four groups; a logo shows only when its file exists', () => {
  assert.equal((page.match(/<li class="tool-chip">/g) || []).length, 13);
  assert.deepEqual([...page.matchAll(/<h3 class="tool-label">([^<]+)</g)].map(match => match[1]), ['개발', '기획·협업', '그래픽', 'AI']);
  const slugs = toolGroups.flatMap(([, tools]) => tools.map(([, slug]) => slug));
  assert.equal(slugs.length, 13);
  // Real files decide the real page.
  const present = slugs.filter(slug => fs.existsSync(path.join(root, 'public/assets/images/tools', `${slug}.png`)));
  assert.equal(tags.filter(({ tag, attributes }) => tag === 'img' && /images\/tools\//.test(attributes.src)).length, present.length);
  // A made-up file list: only those chips carry an <img>, 32px tall, hidden from readers (the name is visible).
  const html = toolGroupsHtml(toolGroups, slug => ['unity', 'claude'].includes(slug));
  const logos = readHtmlTags(html).filter(({ tag }) => tag === 'img');
  assert.deepEqual(logos.map(({ attributes }) => attributes.src), ['../assets/images/tools/unity.png', '../assets/images/tools/claude.png']);
  assert.ok(logos.every(({ attributes }) => attributes.alt === '' && attributes['aria-hidden'] === 'true' && attributes.height === '32'));
  assert.doesNotMatch(toolGroupsHtml(toolGroups, () => false), /<img/);
});

test('four work cards with role labels, not links, award or event on the back', () => {
  assert.equal((page.match(/<li class="work" data-work>/g) || []).length, 4);
  assert.deepEqual([...page.matchAll(/<p class="release-status">([^<]+)</g)].map(match => match[1]), ['4인 팀 · 팀장', '3인 팀 · 팀장', '1인 개발', '1인 개발 · 출시']);
  assert.deepEqual([...page.matchAll(/<h3 class="project-title" translate="no">([^<]+)</g)].map(match => match[1]), ['Reflectory', 'Barrel Good Barrel', 'Aiden &amp; Magnus KartRider', '쭉쭉냥 : 고양이 퍼즐']);
  assert.match(page, /<p class="work-award">국가수리과학연구소장상<\/p>/);
  assert.match(page, /<p class="work-event">Google Play 정식 출시<\/p>/);
  assert.equal((page.match(/class="work-face work-back"/g) || []).length, 4);
});

test('the script draws no markup from text, and the styles keep the motion rules', () => {
  const script = fs.readFileSync(path.join(root, 'src/scripts/about.js'), 'utf8');
  assert.doesNotMatch(script, /innerHTML|setTimeout|setInterval/);
  const css = fs.readFileSync(path.join(root, 'src/styles/about.css'), 'utf8');
  assert.doesNotMatch(css, /transition:\s*all/);
  // The turn only exists where motion is allowed; otherwise the face just swaps.
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\)\s*{[^@]*rotateY/);
});
