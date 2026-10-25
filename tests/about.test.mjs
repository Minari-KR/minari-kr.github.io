import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { compileSite } from '../scripts/site.mjs';
import { readHtmlTags } from '../scripts/html.mjs';
import { toolGroups, toolGroupsHtml, bannerTitles, bannerSlidesHtml } from '../scripts/about.mjs';
import { games } from '../scripts/site-config.mjs';
import { root } from './fixture.mjs';

const { files, publicFiles } = compileSite(root);
const page = files.get('about/index.html');
const tags = readHtmlTags(page);

test('about page is standalone: one h1, sections in order, one hidden way to the portfolio, only its own scripts', () => {
  assert.ok(publicFiles.has('about/index.html'));
  assert.equal(tags.filter(({ tag }) => tag === 'h1').length, 1);
  assert.match(page, /<header class="intro about-intro" id="intro">\s*<h1 id="intro-title" tabindex="-1"><span class="about-title">About Me<\/span> <span class="about-role">박종찬 /);
  const order = ['intro-title', 'about-title', 'taste-title', 'tools-title'].map(id => page.indexOf(`id="${id}"`));
  assert.ok(order.every((at, i) => at > (order[i - 1] ?? -1)), order.join());
  const hrefs = tags.filter(({ tag }) => tag === 'a').map(({ attributes }) => attributes.href);
  assert.deepEqual(hrefs, ['#main', '../']);
  // The only way out is a link at the very end of <main> that stays hidden until it gets keyboard focus.
  assert.match(page, /<a class="skip-link about-exit" href="\.\.\/">포트폴리오로 이동<\/a>\s*<\/main>/);
  assert.doesNotMatch(files.get('index.html'), /href="[^"]*about\//);
  assert.doesNotMatch(page, /index\.html|projects\/|mailto:|tel:|https:\/\/(?!fonts\.g|minari-kr\.github\.io\/)/);
  const scripts = tags.filter(({ tag }) => tag === 'script').map(({ attributes }) => attributes.src.replace(/\?v=[a-f0-9]{12}$/, ''));
  assert.deepEqual(scripts, ['../assets/js/motion-loop.js', '../assets/js/about.js']);
  // Specific skills live in the portfolio, so the stat window, the work cards and the game packs are gone.
  assert.doesNotMatch(page, /id="(stats|work)-title"|data-about-stats|data-work|data-top-games|class="pack/);
  assert.doesNotMatch(page, /마스터즈|이터니티|7,000시간/);
  // The profile illustration sits in the 소개 section, with its words as alt text.
  assert.match(page, /id="about-title"[\s\S]*<img class="about-profile" src="\.\.\/assets\/images\/about\/profile\.webp" width="400" height="400" alt="[^"]+">[\s\S]*id="taste-title"/);
  assert.ok(!/<svg|<script>|<style|style=/.test(page));
});

test('the games list includes Tomb Raider', () => {
  assert.equal(games.length, 30);
  assert.ok(games.some(game => game.title === '툼 레이더 시리즈' && game.image === 'assets/images/games/tomb-raider.webp' && game.hours === ''));
});

test('banner: 11 image-only slides in order with the carousel ARIA pattern', () => {
  assert.deepEqual(bannerTitles, ['블루 아카이브', '명조: 워더링 웨이브', '원신', '이터널 리턴', '젠레스 존 제로', '명일방주: 엔드필드', '몬길: STAR DIVE', '림버스 컴퍼니', '이환', '소녀전선2: 망명', '트릭컬 리바이브']);
  assert.match(page, /<div class="banner" data-banner role="region" aria-roledescription="carousel" aria-label="[^"]+"/);
  assert.match(page, /class="banner-view" data-view tabindex="0" role="group" aria-label="방향키로 넘길 수 있습니다"/);
  const slides = tags.filter(({ attributes }) => 'data-slide' in attributes);
  assert.equal(slides.length, 11);
  slides.forEach(({ attributes }, i) => {
    assert.equal(attributes.role, 'group');
    assert.equal(attributes['aria-roledescription'], 'slide');
    assert.equal(attributes['aria-label'], `${i + 1} / 11 ${bannerTitles[i]}`);
  });
  const art = tags.filter(({ tag, attributes }) => tag === 'img' && /banner-art/.test(attributes.class));
  assert.deepEqual(art.map(({ attributes }) => attributes.alt), bannerTitles);
  for (const [i, { attributes }] of art.entries()) {
    const game = games.find(item => item.title === bannerTitles[i]);
    assert.equal(attributes.src.replace(/\?v=[a-f0-9]{12}$/, ''), `../${game.image}`);
    assert.ok(fs.statSync(path.join(root, 'public', game.image)).size > 1000, game.image);
  }
  // Images only: no caption, label, buttons, dots, counter or live region.
  assert.doesNotMatch(page, /banner-(title|meta|label|btn|dot|count|live|controls)|data-(prev|next|dot|live|count)/);
  assert.throws(() => bannerSlidesHtml(games, ['없는 게임']), /없는 게임/);
});

test('tool inventory: 13 slots with logos, 5 filters, AI roles only in the accessible name, no detail panel', () => {
  const slots = tags.filter(({ attributes }) => 'data-slot' in attributes);
  assert.equal(slots.length, 13);
  assert.deepEqual([...page.matchAll(/<p class="inv-label">([^<]+)</g)].map(match => match[1]), ['개발', '기획·협업', '그래픽', 'AI']);
  assert.deepEqual([...page.matchAll(/data-filter="([^"]+)" aria-pressed/g)].map(match => match[1]), ['전체', '개발', '기획·협업', '그래픽', 'AI']);
  assert.match(page, /data-filters role="group" aria-label="[^"]+" hidden/);
  assert.deepEqual([...page.matchAll(/<span class="inv-hide">([^<]*)</g)].map(match => match[1]).filter(text => text.split(', ').length > 2), [', AI, 그림', ', AI, 작업 계획과 코드', ', AI, 영상', ', AI, 문장 다듬기']);
  assert.doesNotMatch(page, /inv-detail|data-detail|<button[^>]*inv-slot/);
  const slugs = toolGroups.flatMap(([, tools]) => tools.map(([, slug]) => slug));
  assert.equal(slugs.length, 13);
  const logos = tags.filter(({ tag, attributes }) => tag === 'img' && /images\/tools\//.test(attributes.src));
  assert.equal(logos.length, 13);
  assert.ok(slugs.every(slug => fs.existsSync(path.join(root, 'public/assets/images/tools', `${slug}.png`))));
  assert.ok(logos.every(({ attributes }) => attributes.alt === '' && attributes['aria-hidden'] === 'true'));
  // A made-up file list: only those slots carry an <img>.
  const html = toolGroupsHtml(toolGroups, slug => ['unity', 'claude'].includes(slug));
  assert.deepEqual(readHtmlTags(html).filter(({ tag }) => tag === 'img').map(({ attributes }) => attributes.src), ['../assets/images/tools/unity.png', '../assets/images/tools/claude.png']);
  assert.doesNotMatch(toolGroupsHtml(toolGroups, () => false), /<img/);
});

test('about.js drives the carousel through motionLoop and uses no timers or frame loop of its own', () => {
  const source = fs.readFileSync(path.join(root, 'src/scripts/about.js'), 'utf8');
  assert.match(source, /motionLoop\(/);
  assert.doesNotMatch(source, /setTimeout|setInterval|requestAnimationFrame|IntersectionObserver|visibilitychange|matchMedia/);
  assert.doesNotMatch(source, /innerHTML/);
});

test('about.js opens the portfolio on one more scroll at the bottom, and resets after the back/forward cache', () => {
  const source = fs.readFileSync(path.join(root, 'src/scripts/about.js'), 'utf8');
  for (const rule of ["addEventListener('wheel'", "addEventListener('touchstart'", "addEventListener('touchend'", "addEventListener('keydown'", "addEventListener('pageshow'", 'ARM_AFTER', "location.assign('../')", 'motionLoop.reduce.matches', 'duration: 600']) assert.ok(source.includes(rule), rule);
});

test('the styles never transition everything', () => {
  const css = fs.readFileSync(path.join(root, 'src/styles/about.css'), 'utf8');
  assert.doesNotMatch(css, /transition:\s*all/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*transition: none/);
});
