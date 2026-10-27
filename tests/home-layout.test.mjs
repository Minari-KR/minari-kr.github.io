import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { games } from '../scripts/site-config.mjs';
import { compileSite } from '../scripts/site.mjs';
import { root, cssRule } from './fixture.mjs';

const template = fs.readFileSync(new URL('../src/templates/home.html', import.meta.url), 'utf8');
const homeStyles = fs.readFileSync(new URL('../src/styles/home.css', import.meta.url), 'utf8');
const detailStyles = fs.readFileSync(new URL('../src/styles/detail.css', import.meta.url), 'utf8');
const scripts = ['games.js', 'project-tabs.js', 'awards.js'].map(name => fs.readFileSync(new URL(`../src/scripts/${name}`, import.meta.url), 'utf8')).join('\n');

test('intro has no contact buttons or clipboard code', () => {
  assert.doesNotMatch(template, /mailto:|minari-kr\.itch\.io\/"|intro-actions|email-copy|copy-status|email-actions/);
  assert.doesNotMatch(scripts, /clipboard|email-copy|copy-status/);
});

test('intro, awards and projects follow the single-column order with the approved copy', () => {
  assert.doesNotMatch(template, /생년월일|2003\.02\.26|profile-birthday|게임 기획</);
  const order = ['id="intro-title"', '게임 디자이너</p>', '우송대학교 게임멀티미디어학과', 'class="intro-statement"','id="awards-title"', 'id="projects-title"', 'id="reflectory-title"', 'id="barrel-good-barrel-title"', 'id="aiden-magnus-kartrider-title"', 'id="games-title"'];
  // The project cards are generated, so the order is read from the built page.
  const built = compileSite(root).files.get('index.html');
  const positions = order.map(marker => built.indexOf(marker));
  assert.ok(positions.every(position => position >= 0), String(positions));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.equal((template.match(/<strong class="award-name"><span class="marker">/g) || []).length, 4);
  // Awards are four memo cards: sheet with paper and tape (decorative), year, name, event and a game sticker. The empty-slot buttons
  // are added by the script, never in the template; no glare, band, clip or back face is left.
  assert.equal((template.match(/<li class="award-card[ "]/g) || []).length, 4);
  assert.equal((template.match(/<span class="award-sheet"><span class="award-paper" aria-hidden="true"><\/span><span class="award-tape" aria-hidden="true"><\/span>/g) || []).length, 4);
  assert.doesNotMatch(template, /<button[^>]*award-slot|award-glare/);
  assert.equal((template.match(/<span class="award-year">(2026|2025|2025|2020)<\/span>/g) || []).length, 4);
  assert.equal((template.match(/<span class="award-event">/g) || []).length, 4);
  assert.doesNotMatch(template, /award-flip|award-band|award-clip|award-back|award-swing|award-face/);
  // Names and events stay readable text; the longest name is split into two lines by a <br>.
  for (const text of ['국가수리과학<br>연구소장상', '대상', '베스트 리더상', '우수상', '대전 인디(inD) 게임잼', '대전 게임 브릿지', '스토브 크루 2기', '넷마블<wbr>게임아카데미 5기']) assert.ok(template.includes(text), text);
  assert.doesNotMatch(template, /is-best/);
  // Each card ends with its game sticker (decorative) after the year, name and event, which read in that order.
  for (const sticker of ['paimon', 'helmet', 'shiroko', 'creeper']) {
    assert.ok(template.includes(`<img class="award-sticker" src="./assets/images/awards/sticker-${sticker}.webp" width="360" height="360" alt="" aria-hidden="true"`), sticker);
    assert.ok(fs.existsSync(new URL(`../public/assets/images/awards/sticker-${sticker}.webp`, import.meta.url)), sticker);
  }
  assert.match(template, /<span class="award-year">2026<\/span><strong class="award-name"><span class="marker">국가수리과학<br>연구소장상<\/span><\/strong><span class="award-event">/);
  // Text never truncates, keeps Korean words whole and stays on one line (the longest name is split by a <br>), sized from the card width (never under 12px).
  assert.doesNotMatch(homeStyles.slice(homeStyles.indexOf('.award-list'), homeStyles.indexOf('/* Projects: image')), /text-overflow|line-clamp|ellipsis/);
  assert.equal(cssRule(homeStyles, '.award-name', '*').get('word-break'), 'keep-all');
  assert.equal(cssRule(homeStyles, '.award-event', '*').get('word-break'), 'keep-all');
  const phone = homeStyles.slice(homeStyles.indexOf('@media (max-width: 640px)'));
  for (const sel of ['.award-name', '.award-event']) assert.equal(cssRule(homeStyles, sel, '*').get('white-space'), 'nowrap', sel);
  assert.match(homeStyles, /--fs: clamp\(12px, /);
  assert.match(cssRule(homeStyles, '.award-event', '*').get('font-size'), /^max\(12px,/);
  // Two columns where a card keeps 296px, one column on phones; cards share a row height and the awards CSS has no lanyard left.
  assert.match(homeStyles, /\.award-list \{ display: grid; grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 296px\), 1fr\)\)/);
  assert.match(homeStyles, /\.award-card:nth-child\(1\) \{ --rest: -1\.2deg;[\s\S]*\.award-card:nth-child\(2\) \{ --rest: \.8deg;[\s\S]*\.award-card:nth-child\(3\) \{ --rest: 1\.4deg;[\s\S]*\.award-card:nth-child\(4\) \{ --rest: -\.9deg;/);
  assert.match(homeStyles, /\.award-list \{[^}]*grid-auto-rows: 1fr;/);
  assert.match(phone, /\.award-list \{ grid-template-columns: minmax\(0, 1fr\); gap: 24px; \}/);
  assert.match(phone, /\.award-sheet \{ --sticker: 88px; \}/);
  assert.doesNotMatch(homeStyles, /award-band|award-clip|award-flip|award-face|award-glare|--bleed|--sheen|backface-visibility/);
  // Memo paper with a seamless paper-fibre texture, a masking-tape strip, the name on the highlighter stroke, the year in deep green.
  const awardCss = homeStyles.slice(homeStyles.indexOf('.award-list'), homeStyles.indexOf('/* Projects: image'));
  assert.match(cssRule(homeStyles, '.award-paper', '*').get('background'), /^#fbfaf6 url\(["']?\.\.\/images\/awards\/paper\.webp["']?\) 0 0\/256px 256px$/);
  assert.ok(fs.existsSync(new URL('../public/assets/images/awards/paper.webp', import.meta.url)));
  assert.equal(cssRule(homeStyles, '.award-paper', '*').get('border-radius'), '8px');
  assert.match(cssRule(homeStyles, '.award-tape', '*').get('width'), /72px/);
  assert.match(cssRule(homeStyles, '.award-tape', '*').get('background'), /accent-soft/);
  assert.match(cssRule(homeStyles, '.marker', '*').get('border-image'), /^url\(["']?\.\.\/icons\/marker\.svg["']?\)/); // the name sits on the section-title stroke, line by line
  // Text on the left (year, name, event), the game sticker on the right across the three lines.
  assert.equal(cssRule(homeStyles, '.award-year', '*').get('grid-row'), '1');
  assert.equal(cssRule(homeStyles, '.award-sticker', '*').get('grid-column'), '2');
  // The empty slot draws nothing (no outline); before sticking the card is only transparent (opacity, never visibility), so it stays
  // in the page for screen readers and search and its cell keeps its size. 
  assert.equal(cssRule(homeStyles, '.award-slot', '*').get('border'), '0');
  assert.equal(cssRule(homeStyles, '.award-slot', '*').get('border-radius'), '8px');
  assert.match(homeStyles, /\.award-list\.is-live \.award-card:not\(\.is-stuck\) \.award-sheet \{ opacity: 0;/);
  assert.doesNotMatch(awardCss, /visibility|display: none/);
  assert.doesNotMatch(awardCss, /\.award-slot:hover/);
  assert.match(homeStyles, /@property --lift/);
  // The corners never curl any more (2026-10-27 user request): no fold element, no peel variable.
  assert.doesNotMatch(homeStyles + template, /--peel|award-fold|data-corner/);
  assert.doesNotMatch(template, /role-list/);
  assert.doesNotMatch(template, /section-shortcuts|project-shortcuts|journal|award-project|<dialog/);
});

test('page drops template chrome: menus, middle-dot meta, link arrows and tile cards', () => {
  const main = template.slice(template.indexOf('<main'), template.indexOf('</main>'));
  assert.doesNotMatch(main, / · |<nav/);
  assert.doesNotMatch(template, /arrow-right\.svg|class="tile|tile-more/);
  assert.doesNotMatch(homeStyles, /#fffefa|--paper-solid/);
});

test('action buttons share one transition and darken on hover and press', () => {
  const prop = (css, selector, name) => cssRule(css, selector, '*').get(name);
  for (const selector of ['.action', '.release-link']) assert.equal(prop(homeStyles, selector, 'transition'), 'var(--action-transition)', selector);
  for (const selector of ['.home-link', '.play-link']) assert.equal(prop(detailStyles, selector, 'transition'), 'var(--action-transition)', selector);
  for (const state of [':hover', ':active']) {
    assert.equal(prop(homeStyles, `.action-primary${state}`, 'background'), 'var(--accent-hover)', state);
    assert.equal(prop(detailStyles, `.play-link${state}`, 'background'), 'var(--accent-hover)', state);
  }
});

test('projects open their own pages without JavaScript, and the page has no back-to-top button', () => {
  // The cards and the detail pages are generated from the projects list, so they are read from the build.
  const { files } = compileSite(root);
  const home = files.get('index.html');
  for (const slug of ['reflectory', 'barrel-good-barrel']) {
    assert.ok(home.includes(`<a class="action action-primary" href="./projects/${slug}.html">자세히 보기</a>`));
    const page = files.get(`projects/${slug}.html`);
    assert.match(page, /class="home-link" href="\.\.\/index\.html#projects"/);
    assert.match(page, /<p class="project-award">[^<]+<\/p>/);
    assert.match(page, /<video controls playsinline preload="none"/);
    assert.match(page, /class="play-link" href="https:\/\/minari-kr\.itch\.io\/[a-z-]+" target="_blank" rel="noopener noreferrer"/);
  }
  // The solo fan game (2026-10-16) has no page of its own: its only button, the primary one, opens the YouTube video in a new
  // tab (the site's security policy keeps YouTube out of the page), and nothing else on its card links anywhere.
  for (const [slug, video] of [['aiden-magnus-kartrider', 'https://www.youtube.com/watch?v=RrdQxWXoZO4&amp;t=35s']]) {
    const card = home.slice(home.indexOf(`<article class="project" id="project-${slug}"`), home.indexOf('</article>', home.indexOf(`id="project-${slug}"`)));
    assert.equal((card.match(/<a /g) || []).length, 1, slug);
    assert.ok(card.includes(`<a class="action action-primary" href="${video}" target="_blank" rel="noopener noreferrer">플레이 영상</a>`), slug);
    assert.ok(fs.existsSync(new URL(`../public/assets/images/cards/${slug}-title.webp`, import.meta.url)), slug);
  }
  // The back-to-top button was taken out at the user's request (2026-10-14).
  assert.doesNotMatch(template, /back-to-top|home-actions|circle-arrow-up/);
});

test('the home page ends projects -> games and no longer has the AI collaboration section', () => {
  const order = ['id="projects-title"', 'id="games-title"'].map(marker => template.indexOf(marker));
  assert.ok(order.every(position => position >= 0) && order[0] < order[1], String(order));
  const built = compileSite(root).files.get('index.html');
  assert.doesNotMatch(built, /id="ai-party|ai-party\.(css|js)|pixelarticons|ap-cursor/);
  // The page loads the shared loop first (it alone knows reduced motion, the viewport and the hidden tab).
  const loopAt = built.indexOf('assets/js/motion-loop.js');
  assert.ok(loopAt > 0 && loopAt < built.indexOf('assets/js/games.js'));
});

test('home and About Me have a first-visit glass intro layer of every game with an image, driven by a timer-free script', () => {
  const files = compileSite(root).files;
  const wanted = games.filter(game => game.image).map(game => game.image);
  for (const [name, base] of [['index.html', '\.'], ['about/index.html', '\.\.']]) {
    const page = files.get(name);
    const layer = page.match(/<div class="intro-layer" data-intro hidden>[\s\S]*?<\/div>/)[0];
    const cards = [...layer.matchAll(new RegExp(`<img class="intro-card" src="${base}/(assets/images/games/[^"]+)" width="352" height="336" alt="" decoding="async">`, 'g'))].map(match => match[1]);
    assert.deepEqual(cards, wanted, name);
    assert.equal(cards.length, 30);
    assert.doesNotMatch(layer, /<button|skip|aria-hidden/);
    assert.ok(page.indexOf('data-intro hidden') < page.indexOf('<main'), name);
    assert.ok(page.indexOf('assets/js/motion-loop.js') < page.indexOf('assets/js/intro.js') && page.indexOf('assets/js/intro.js') < page.indexOf('assets/js/scroll-exit.js'), name);
    assert.ok(page.indexOf('assets/css/intro.css') < page.indexOf('assets/css/page-transitions.css'), name);
  }
  const home = files.get('index.html'), about = files.get('about/index.html');
  assert.ok(home.indexOf('data-scroll-exit="top"') < home.indexOf('data-intro hidden'));
  assert.ok(home.indexOf('assets/css/games.css') < home.indexOf('assets/css/intro.css'));
  assert.ok(about.indexOf('assets/css/about.css') < about.indexOf('assets/css/intro.css'));
  for (const name of ['projects/reflectory.html', 'projects/barrel-good-barrel.html']) assert.doesNotMatch(files.get(name), /data-intro|intro.(js|css)/, name);
  const css = fs.readFileSync(path.join(root, 'src/styles/intro.css'), 'utf8');
  assert.match(css, /backdrop-filter: blur\(24px\) saturate\(1\.4\)/);
  assert.match(css, /@supports not \(\(backdrop-filter/);
  assert.doesNotMatch(css, /skip|will-change/);
  const source = fs.readFileSync(path.join(root, 'src/scripts/intro.js'), 'utf8');
  for (const part of ['.animate(', 'motionLoop.reduce', 'pageshow', 'decode()', 'first-contentful-paint', 'Math.random', 'stopImmediatePropagation', 'is-waiting', "'intro-seen'"]) assert.ok(source.includes(part), part);
  assert.match(source, /try {[^}]*sessionStorage/);
  assert.doesNotMatch(source, /requestAnimationFrame|IntersectionObserver|setTimeout|setInterval|intro-skip/);
  // The only matchMedia is the phone/touch query (intro.js is a helper, not a motionLoop script).
  assert.equal((source.match(/matchMedia/g) || []).length, 1);
  assert.ok(source.includes("matchMedia('(max-width: 640px), (pointer: coarse)')"));
  // Phones keep all cards and the full-screen grid (4x8 at 390x844, 2026-10-26 user request); only the blur and shadows go.
  assert.ok(source.includes("classList.add('is-lite')") && !source.includes('splice(16)') && !source.includes('lite ? 4 :'));
  assert.match(source, /lite \? \{ opacity: \['1', '0'\] \}\s*: \{ background: [^}]*backdropFilter/); // phones fade opacity, never animate backdrop-filter
  // Animated end values are also set as plain style, so a dropped last frame cannot flash the layer or a card back (phone flicker).
  assert.ok(source.includes("for (const card of all) card.style.opacity = '0';") && source.includes("layer.style.opacity = '0';"));
  assert.match(css, /\.intro-layer\.is-lite \{[^}]*rgba\(236, 238, 234, \.92\)[^}]*backdrop-filter: none/);
  assert.match(css, /\.intro-layer\.is-lite \.intro-card \{ box-shadow: none; \}/);
});

test('awards script loads after project-tabs, uses the shared loop and has a reduced-motion path', () => {
  const tags = [...template.matchAll(/<script src="\.\/assets\/js\/([a-z-]+)\.js" defer>/g)].map(match => match[1]);
  assert.equal(tags.indexOf('awards'), tags.indexOf('project-tabs') + 1);
  const script = fs.readFileSync(new URL('../src/scripts/awards.js', import.meta.url), 'utf8');
  assert.match(script, /motionLoop\(/);
  assert.doesNotMatch(script, /requestAnimationFrame|IntersectionObserver|setTimeout|setInterval|matchMedia/);
  assert.match(script, /reduce\.matches/);
  assert.match(script, /onReduce/);
  assert.match(script, /pointerType === 'mouse'|pointerType !== 'mouse'/);
  assert.match(script, /\[data-intro\]/);
  // The slot buttons come from the script; the 0.6 s quiet time is an empty Web Animation (no timers), 0.7 s apart afterwards.
  assert.match(script, /createElement\('button'\)[\s\S]*type = 'button'[\s\S]*붙이기/);
  assert.match(script, /new Animation\(new KeyframeEffect\(null, \[\], ms\)\)/);
  assert.match(script, /WAIT_MS = 600/);
  assert.match(script, /GAP_MS = 700/);
  assert.doesNotMatch(script, /PEEL|--peel|dataset\.corner/);
  assert.match(script, /DROP_MS = 320/);
  assert.match(script, /cubic-bezier\(\.2,\.9,\.3,1\.15\)/);
  assert.match(script, /SWING_MAX = 8/);
  assert.doesNotMatch(script, /visibility|award-glare|MAX_TILT|PERSPECTIVE/);
  // Reduced motion switching on later sticks everything at once.
  assert.match(script, /onReduce: on => \{\s*if \(!on\) return;[\s\S]*classList\.remove\('is-live'\)/);
});
