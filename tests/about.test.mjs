import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { compileSite } from '../scripts/site.mjs';
import { readHtmlTags } from '../scripts/html.mjs';
import { toolGroups, toolGroupsHtml, bannerTitles, spiralHtml } from '../scripts/about.mjs';
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
  assert.match(page, /<a class="skip-link about-exit" href="\.\.\/" data-scroll-exit="bottom">포트폴리오로 이동<\/a>\s*<\/main>/);
  assert.equal([...files.get('index.html').matchAll(/<a [^>]*href="about\/"[^>]*>/g)].filter(match => match[0].includes('data-scroll-exit="top"')).length, 1);
  assert.equal(files.get('index.html').match(/href="[^"]*about\//g).length, 1);
  assert.doesNotMatch(page, /index\.html|projects\/|mailto:|tel:|https:\/\/(?!fonts\.g|minari-kr\.github\.io\/)/);
  const scripts = tags.filter(({ tag }) => tag === 'script').map(({ attributes }) => attributes.src.replace(/\?v=[a-f0-9]{12}$/, ''));
  assert.deepEqual(scripts, ['../assets/js/intro-gate.js', '../assets/js/motion-loop.js', '../assets/js/intro.js', '../assets/js/scroll-exit.js', '../assets/js/text-loop.js', '../assets/js/about.js']);
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

test('spiral: 11 cards in order, empty alt, one aria-label with all 11 titles', () => {
  assert.deepEqual(bannerTitles, ['블루 아카이브', '명조: 워더링 웨이브', '원신', '이터널 리턴', '젠레스 존 제로', '명일방주: 엔드필드', '몬길: STAR DIVE', '림버스 컴퍼니', '이환', '소녀전선2: 망명', '트릭컬 리바이브']);
  const spiral = tags.filter(({ attributes }) => 'data-spiral' in attributes);
  assert.equal(spiral.length, 1);
  assert.equal(spiral[0].attributes.role, 'img');
  assert.equal(spiral[0].attributes['aria-label'], `서브컬처 게임 11개: ${bannerTitles.join(', ')}`);
  const cards = tags.filter(({ tag, attributes }) => tag === 'img' && /spiral-card/.test(attributes.class));
  assert.equal(cards.length, 11);
  for (const [i, { attributes }] of cards.entries()) {
    const game = games.find(item => item.title === bannerTitles[i]);
    assert.equal(attributes.alt, '');
    assert.equal(attributes.src.replace(/\?v=[a-f0-9]{12}$/, ''), `../${game.image}`);
    assert.ok(fs.statSync(path.join(root, 'public', game.image)).size > 1000, game.image);
  }
  assert.doesNotMatch(page, /banner|data-(slide|track|view|prev|next)/);
  assert.throws(() => spiralHtml(games, ['없는 게임']), /없는 게임/);
});

test('spiral script: driven by motionLoop, no timers or frame loop of its own, mouse-only hover', () => {
  const js = fs.readFileSync(path.join(root, 'src/scripts/about.js'), 'utf8');
  assert.match(js, /window\.motionLoop\(/);
  assert.match(js, /pointerType === 'mouse'/);
  assert.match(js, /onReduce/);
  assert.doesNotMatch(js, /zIndex|z-index/);
  // Flat cards on a 5-per-turn helix: tilted cards cut through each other, and 7 per turn re-sorts overlapping neighbours.
  assert.match(js, /translate3d\(/);
  assert.doesNotMatch(js, /rotateY\(/);
  assert.match(js, /const perTurn = 5;/);
  assert.match(js, /speed = 0\.35;/);
  assert.doesNotMatch(js, /requestAnimationFrame|IntersectionObserver|matchMedia|setTimeout|setInterval/);
});

test('spiral css: perspective + clip on .spiral, a preserve-3d stage for the cards, no will-change', () => {
  const css = fs.readFileSync(path.join(root, 'src/styles/about.css'), 'utf8');
  assert.match(css, /\.spiral\.is-live \{[^}]*overflow: hidden;[^}]*perspective: 1000px/);
  assert.match(css, /\.spiral-stage \{[^}]*transform-style: preserve-3d/);
  assert.doesNotMatch(css, /will-change/);
  assert.match(spiralHtml(games), /<div class="spiral-stage">/);
});

test('character strip: two lazy imgs after the spiral, swapped by CSS at 640px', () => {
  const taste = page.slice(page.indexOf('id="taste"'), page.indexOf('id="tools"'));
  const strips = tags.filter(({ tag, attributes }) => tag === 'img' && /\btaste-strip\b/.test(attributes.class));
  assert.equal(strips.length, 2);
  assert.ok(taste.indexOf('taste-strip') > taste.indexOf('spiral-card'));
  const [wide, narrow] = strips.map(({ attributes }) => attributes);
  const src = attributes => attributes.src.replace(/\?v=[a-f0-9]{12}$/, '');
  assert.deepEqual([src(wide), wide.width, wide.height], ['../assets/images/about/character-strip.webp', '1440', '302']);
  assert.deepEqual([src(narrow), narrow.width, narrow.height], ['../assets/images/about/character-strip-mobile.webp', '1200', '831']);
  assert.ok(wide.alt.length > 0 && wide.alt === narrow.alt);
  assert.equal(wide.loading, 'lazy');
  assert.equal(narrow.loading, 'lazy');
  const css = fs.readFileSync(path.join(root, 'src/styles/about.css'), 'utf8');
  assert.match(css, /\.taste-strip-narrow \{ display: none; \}/);
  assert.match(css, /@media \(max-width: 640px\) \{[^@]*\.taste-strip-wide \{ display: none; \}\s*\.taste-strip-narrow \{ display: block; \}/);
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

test('about.js drives the spiral through motionLoop and uses no timers or frame loop of its own', () => {
  const source = fs.readFileSync(path.join(root, 'src/scripts/about.js'), 'utf8');
  assert.match(source, /motionLoop\(/);
  assert.doesNotMatch(source, /setTimeout|setInterval|requestAnimationFrame|IntersectionObserver|visibilitychange|matchMedia/);
  assert.doesNotMatch(source, /innerHTML/);
});

test('the 14 key phrases in the About Me body text are wrapped in .hl, with no markup beyond the span', () => {
  const phrases = ['부산 지스타', '자부심', '즐거움을 전하는 일', '구상을 빠르게 구현', '함께 바라보는 방향', '세계관에 더 깊이 몰입', '다채로운 세계를 직접 경험하는 즐거움', '시각 요소', '같은 결로 맞물리는지', '깊은 몰입', '해결할 문제를 먼저 정의', '목표를 분명히', '끝까지 직접 확인', '최종 결정'];
  assert.deepEqual([...page.matchAll(/<span class="hl">([^<]+)<\/span>/g)].map(match => match[1]), phrases);
  assert.equal((page.match(/class="hl"/g) || []).length, phrases.length);
  // Only body paragraphs carry them; the school sentence has none and the section titles keep their static .marker.
  assert.equal([...page.matchAll(/<p class="about-text">((?:(?!<\/p>)[\s\S])*?class="hl"[\s\S]*?)<\/p>/g)].length, 5);
  assert.doesNotMatch(page, /우송대학교[^<]*<span class="hl"/);
  const css = fs.readFileSync(path.join(root, 'src/styles/about.css'), 'utf8');
  assert.match(css, /\.hl \{[^}]*marker-body\.svg[^}]*box-decoration-break: clone/);
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\) \{[^@]*\.about-text\.reveal \{[^}]*blur\(8px\)/);
  assert.equal(css.split('.reveal').length - 1, css.split('@media (prefers-reduced-motion: no-preference) {').slice(1).join('').split('.reveal').length - 1);
  assert.match(fs.readFileSync(path.join(root, 'src/scripts/about.js'), 'utf8'), /motionLoop\.reduce\.matches[\s\S]*classList\.add\('reveal'\)[\s\S]*motionLoop\(/);
  // Strokes wait 0.7s (counted by motionLoop, only once no [data-intro] layer is left), gated in CSS by .hl-armed; the blur-in is not gated.
  const js = fs.readFileSync(path.join(root, 'src/scripts/about.js'), 'utf8');
  assert.match(js, /querySelector\('\[data-intro\]'\)\) return;\s*waited \+= dt;\s*if \(waited >= 0\.7\) document\.documentElement\.classList\.add\('hl-armed'\)/);
  assert.match(css, /\.hl-armed \.about-text\.reveal\.is-in \.hl \{ background-size: 100% 100%/);
  assert.doesNotMatch(css, /^ +.about-text\.reveal\.is-in \.hl/m);
  assert.match(css, /\.about-text\.reveal\.is-in \{ opacity: 1; filter: none; \}/);
  assert.match(fs.readFileSync(path.join(root, 'public/assets/icons/marker-body.svg'), 'utf8'), /fill-opacity="\.45"/);
});

test('about.js leaves the scroll exit to scroll-exit.js, which the page link asks for with data-scroll-exit="bottom"', () => {
  const source = fs.readFileSync(path.join(root, 'src/scripts/about.js'), 'utf8');
  assert.doesNotMatch(source, /ARM_AFTER|location\.assign|window\.addEventListener|'(wheel|pageshow)'/);
  assert.match(page, /<a class="skip-link about-exit" href="\.\.\/" data-scroll-exit="bottom">/);
});

test('scroll-exit.js opens About Me on one more scroll at the top of the portfolio, with no timers or frame loop', () => {
  const source = fs.readFileSync(path.join(root, 'src/scripts/scroll-exit.js'), 'utf8');
  for (const rule of ["addEventListener('wheel'", "addEventListener('keydown'", "addEventListener('pageshow'", '.animate(', 'location.assign', 'motionLoop.reduce.matches', 'duration: 600', 'exit-cover']) assert.ok(source.includes(rule), rule);
  assert.doesNotMatch(source, /document\.body\.animate|body\.animate/); // only a cover layer fades, never the whole body
  assert.doesNotMatch(source, /requestAnimationFrame|IntersectionObserver|matchMedia|setTimeout|setInterval/);
});

test('a scroll exit covers with one layer and arrives under a fading cover: the fragment, one target element per page, and the CSS', () => {
  const source = fs.readFileSync(path.join(root, 'src/scripts/scroll-exit.js'), 'utf8');
  assert.ok(source.includes("href += '#from-scroll'"));
  for (const name of ['index.html', 'about/index.html']) assert.equal((files.get(name).match(/id="from-scroll"/g) || []).length, 1, name);
  const css = fs.readFileSync(path.join(root, 'src/styles/page-transitions.css'), 'utf8');
  assert.match(css, /\.exit-cover \{ position: fixed; inset: 0; z-index: 2147483647; background: var\(--bg\); pointer-events: none; opacity: 0; \}/);
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\)\s*\{\s*html:has\(#from-scroll:target\)::before \{[^}]*position: fixed; inset: 0;[^}]*background: var\(--bg\); pointer-events: none; animation: arrive-cover 600ms ease both;/);
  assert.match(css, /@keyframes arrive-cover \{ from \{ opacity: 1; visibility: visible; \} to \{ opacity: 0; visibility: hidden; \} \}/);
  assert.doesNotMatch(css, /body:has\(#from-scroll|arrive-fade|body\s*\{[^}]*animation/); // no body animation on arrival
});

test('the styles never transition everything', () => {
  const css = fs.readFileSync(path.join(root, 'src/styles/about.css'), 'utf8');
  assert.doesNotMatch(css, /transition:\s*all/);
  // Every transition lives inside a no-preference block, so reduced motion never gets one.
  const inside = (css.match(/prefers-reduced-motion: no-preference\) \{[\s\S]*?\n\}/g) || []).join('');
  assert.ok(inside.includes('transition:'));
  assert.equal((css.match(/transition:/g) || []).length, (inside.match(/transition:/g) || []).length);
});

test('scribbled Text Loop ribbons: an empty aria-hidden container outside main, built by text-loop.js (one-time draw-in, no motion loop), shown only from 1256px', () => {
  const containers = tags.filter(({ attributes }) => 'data-text-loop' in attributes);
  assert.equal(containers.length, 1);
  assert.equal(containers[0].attributes['aria-hidden'], 'true');
  assert.match(page, /<div class="text-loop" data-text-loop aria-hidden="true"><\/div>/);
  assert.ok(page.indexOf('data-text-loop') < page.indexOf('<main'));
  const home = files.get('index.html');
  assert.match(home, /<div class="text-loop" data-text-loop aria-hidden="true"><\/div>/); // the portfolio home has the ribbons too
  assert.ok(home.indexOf('data-text-loop') < home.indexOf('<main'));
  assert.doesNotMatch(files.get('projects/reflectory.html'), /text-loop|data-text-loop/);
  const source = fs.readFileSync(path.join(root, 'src/scripts/text-loop.js'), 'utf8');
  assert.doesNotMatch(source, /motionLoop\(/); // after the one-time draw-in everything is still, so no frame loop
  assert.match(source, /createElementNS/);
  assert.match(source, /querySelector\('\[data-intro\]'\)\) return;/); // waits for the intro layer to go
  assert.doesNotMatch(source, /startOffset|speed/); // the text does not move
  assert.match(source, /DRAW = 1600, EASE = 'cubic-bezier\(\.77, 0, \.175, 1\)'/);
  assert.match(source, /COUNT = 5, OUT = 80, STEP = 0\.25/);
  assert.match(source, /Math\.random\(\)/);
  assert.match(source, /36 \+ rnd\(\) \* 12/);
  assert.match(source, /translate\(1\.5 2\.5\)/); // narrow shadow
  assert.equal((source.match(/el\(container, 'svg'/g) || []).length, 1); // one full-viewport svg holding all ribbons
  assert.doesNotMatch(source, /feGaussianBlur|filter=|mask-image/);
  assert.doesNotMatch(source, /setTimeout|setInterval|requestAnimationFrame|IntersectionObserver|visibilitychange|matchMedia|innerHTML/);
  const css = fs.readFileSync(path.join(root, 'src/styles/home.css'), 'utf8'); // shared by home and About Me
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'src/styles/about.css'), 'utf8'), /\.text-loop|\.tl-/);
  assert.match(css, /\.text-loop \{ display: none; \}\s*@media \(min-width: 1256px\) \{\s*\.text-loop \{[^}]*position: fixed; inset: 0; z-index: 0; pointer-events: none/);
  const loopCss = css.slice(css.indexOf('.text-loop {'), css.indexOf('.tl-text'));
  assert.doesNotMatch(loopCss, /mask-image|gradient|blur/);
  assert.match(css, /\.tl-a \{ stroke: var\(--accent-soft\); \}/);
  assert.match(css, /\.tl-text \{ fill: var\(--accent-deep\)/);
});

test('Text Loop layout: ribbons never come closer than (thickA + thickB) / 2 + 24px where visible, and every side has one ribbon per slot', () => {
  const source = fs.readFileSync(path.join(root, 'src/scripts/text-loop.js'), 'utf8');
  const sandbox = { module: { exports: {} } };
  vm.runInNewContext(source, sandbox); // no document there, so the script only exports its pure layout
  const { layoutRibbons, bez, GAP } = sandbox.module.exports;
  const stats = [];
  for (const [W, H] of [[1920, 1000], [1440, 860], [1280, 800]]) {
    const box = { left: (W - 816) / 2, right: (W + 816) / 2, top: 40, bottom: H * 3 }; // main.page: 816px wide, taller than the screen
    for (let seed = 1; seed <= 20; seed++) {
      const ribbons = layoutRibbons(W, H, box, seed * 7919);
      assert.equal(ribbons.length, 5, `${W}x${H} seed ${seed}`);
      const lines = ribbons.map(r => bez(r.pts, 1200).filter(([x, y]) => x >= 0 && x <= W && y >= 0 && y <= H && !(x >= box.left && x <= box.right && y >= box.top && y <= box.bottom)));
      for (let a = 0; a < 5; a++) for (let b = a + 1; b < 5; b++) {
        let min = Infinity;
        for (const p of lines[a]) for (const q of lines[b]) min = Math.min(min, Math.hypot(p[0] - q[0], p[1] - q[1]));
        const need = (ribbons[a].thick + ribbons[b].thick) / 2 + GAP;
        assert.ok(min >= need, `${W}x${H} seed ${seed}: ribbons ${a}/${b} ${min.toFixed(1)} < ${need}`);
        stats.push(min - need);
      }
      ribbons.forEach((r, i) => {
        assert.ok(r.thick >= 36 && r.thick <= 48 && r.size >= 16 && r.size <= 20);
        for (const [side, from, to] of [['left', 0, box.left], ['right', box.right, W]]) {
          const slot = lines[i].filter(([x, y]) => x >= from && x <= to && Math.floor(y / (H / 5)) === i);
          assert.ok(slot.length > 20, `${W}x${H} seed ${seed}: ribbon ${i} misses its ${side} slot`);
        }
      });
    }
  }
  assert.ok(Math.min(...stats) >= 0);
  const short = layoutRibbons(1400, 300, { left: 292, right: 1108, top: 40, bottom: 900 }, 5); // 300px < 5 * 72: fewer ribbons, still no overlap
  assert.ok(short.length >= 1 && short.length < 5);
});
