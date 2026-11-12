import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { compileSite, validateFiles } from '../scripts/site.mjs';
import { gamePacks } from '../scripts/games.mjs';
import { games } from '../scripts/site-config.mjs';
import { root, parseCss, cssRule, cssDeclared, between } from './fixture.mjs';

const read = name => fs.readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const sample = (overrides = {}) => ({ title: 'Game <1>', platform: 'PC', genre: 'RPG', hours: '10시간', achievements: '3 / 5', note: '"첫" 기억', shell: 'gray', ...overrides });

test('game packs are cartridge images, escaped, dealt into two rows and carry their record as data', () => {
  const html = gamePacks([sample(), sample({ title: 'B', shell: 'yellow' }), sample({ title: 'C', shell: 'purple' }), sample({ title: 'D', shell: 'black', image: 'assets/images/games/d.webp' })]);
  assert.equal((html.match(/class="pack-row"/g) || []).length, 2);
  assert.equal((html.match(/<button class="pack" /g) || []).length, 4);
  assert.match(html, /data-title="Game &lt;1&gt;"/);
  assert.match(html, /data-genre="RPG"/);
  assert.match(html, /data-note="&quot;첫&quot; 기억"/);
  assert.match(html, /<span class="pack-name">Game &lt;1&gt;<\/span>/);
  assert.match(html, /<img class="pack-shell is-gray" src="\.\/assets\/images\/packs\/shell-gray\.webp" width="440" height="540" alt=""/);
  assert.match(html, /<img class="pack-img" src="\.\/assets\/images\/games\/d\.webp" width="352" height="336" alt=""/);
  assert.doesNotMatch(html, /<1>/);
  assert.equal(gamePacks([sample()]).match(/class="pack-row"/g).length, 1);
});

test('game packs reject a missing title, an unknown shell, non-text fields and pictures outside games/', () => {
  assert.throws(() => gamePacks([]), /비어/);
  assert.throws(() => gamePacks([sample({ title: ' ' })]), /title/);
  assert.throws(() => gamePacks([sample({ shell: 'red' })]), /gray, yellow, purple, black/);
  assert.throws(() => gamePacks([sample({ hours: 10 })]), /hours/);
  for (const image of ['https://example.com/a.webp', 'assets/images/cards/a.webp', 'assets/images/games/../a.webp', 'assets/images/games/a.svg']) {
    assert.throws(() => gamePacks([sample({ image })]), /assets\/images\/games/, image);
  }
});

test('the game-play section closes the page: a small game screen of cartridges and a record view', () => {
  const { files, publicFiles } = compileSite(root);
  const home = files.get('index.html');
  // It is the last section, after the projects and the awards (the release app, when there is one, sits right under
  // the intro: release.test.mjs); the site is still the portfolio alone.
  for (const earlier of ['</header>', 'id="projects"', 'id="awards"']) assert.ok(home.indexOf(earlier) < home.indexOf('id="games"'), earlier);
  assert.ok(home.indexOf('id="games"') < home.indexOf('</main>'));
  assert.match(home, /<h2 class="section-title" id="games-title"><span class="marker">게임 플레이 경험<\/span><\/h2>/);
  assert.match(home, /<div class="gs" data-game-screen data-state="select">/);
  assert.equal((home.match(/<button class="pack" /g) || []).length, games.length);
  assert.match(home, /assets\/css\/games\.css\?v=[a-f0-9]{12}/);
  assert.match(home, /<script src="\.\/assets\/js\/games\.js\?v=[a-f0-9]{12}" defer><\/script>/);
  for (const name of ['portfolio.html', 'assets/js/prologue.js', 'assets/js/veil.js', 'assets/js/three.js']) assert.ok(!publicFiles.has(name), name);
  // The cartridge shells, the pixel font and its licence are published with the page.
  for (const color of ['gray', 'yellow', 'purple', 'black']) assert.ok(publicFiles.has(`assets/images/packs/shell-${color}.webp`), color);
  assert.ok(publicFiles.has('assets/fonts/neodgm.woff2') && publicFiles.has('assets/fonts/neodgm-ofl.txt'));
  assert.match(home, /font-src 'self' https:\/\/fonts\.gstatic\.com;/);
  // Tab titles: the portfolio's and each project's.
  assert.match(home, /<title>박종찬 \| Game Designer Portfolio<\/title>/);
  assert.match(files.get('projects/reflectory.html'), /<title>Reflectory \| 박종찬<\/title>/);
});

test('stylesheets may only load reviewed local fonts, local SVG icons and local WebP textures', () => {
  const { files } = compileSite(root);
  const withCss = css => new Map(files).set('assets/css/fonts-check.css', css);
  assert.doesNotThrow(() => validateFiles(withCss('@font-face { font-family: "A"; src: url("../fonts/neodgm.woff2"); }')));
  assert.doesNotThrow(() => validateFiles(withCss('a { border-image: url("../icons/marker.svg") 0 20 fill; }')));
  assert.doesNotThrow(() => validateFiles(withCss('a { background: url("../images/awards/paper.webp"); }')));
  for (const css of ['a { background: url("https://example.com/a.png"); }', 'a { background: url(../images/awards/missing.webp); }', 'a { background: url("../images/awards/paper.png"); }', 'a { background: url("../images/../css/home.css"); }', '@font-face { src: url("../fonts/missing.woff2"); }', '@font-face { src: url(\'../fonts/a"b.woff2\'); }', '@import "x.css";', 'a { background: url("../icons/missing.svg"); }', 'a { background: url("../icons/house.png"); }']) {
    assert.throws(() => validateFiles(withCss(css)), /외부 리소스|연결 대상/, css);
  }
  // An SVG is only a picture: anything that could run code or load something else is refused.
  for (const svg of ['<svg><script>alert(1)</script></svg>', '<svg onload="x()"/>', '<svg><a href="https://example.com"/></svg>', '<svg><foreignObject/></svg>', '<svg><image xlink:href="a.png"/></svg>']) {
    assert.throws(() => validateFiles(new Map(files).set('assets/icons/marker.svg', svg)), /SVG에 허용되지 않는/, svg);
  }
});

test('section titles and award lines use the drawn highlighter stroke, not a flat band', () => {
  const styles = fs.readFileSync(new URL('../src/styles/home.css', import.meta.url), 'utf8');
  const stroke = fs.readFileSync(new URL('../public/assets/icons/marker.svg', import.meta.url), 'utf8');
  assert.match(cssRule(styles, '.marker', '*').get('border-image'), /^url\(["']?\.\.\/icons\/marker\.svg["']?\) .*\bfill\b/);
  assert.match(cssRule(styles, '.project-award', '*').get('border-image'), /^url\(["']?\.\.\/icons\/marker\.svg["']?\)/);
  assert.doesNotMatch(styles, /var\(--marker\)/);
  assert.match(stroke, /width="120" height="40"/);
  // The intro's four key words get the same stroke in four colour steps, in sentence order.
  const home = fs.readFileSync(new URL('../src/templates/home.html', import.meta.url), 'utf8');
  const words = ['아이디어', '프로토타입', '플레이', '재미'];
  words.forEach((word, i) => {
    assert.match(home, new RegExp(`<span class="marker marker-step-${i + 1}">${word}</span>`));
    assert.match(cssRule(styles, `.marker-step-${i + 1}`, '*').get('border-image-source'), new RegExp(`^url\\(["']?\\.\\./icons/marker-step-${i + 1}\\.svg["']?\\)$`), word);
    assert.ok(fs.existsSync(new URL(`../public/assets/icons/marker-step-${i + 1}.svg`, import.meta.url)));
  });
});

test('the game screen moves only without a reduced-motion preference and goes back with a press, Esc, Enter or Space', () => {
  const styles = read('src/styles/games.css');
  const script = read('src/scripts/games.js');
  const flow = read('src/scripts/flow-row.js');
  const template = read('src/templates/home.html');
  const rules = parseCss(styles);
  const calm = rule => rule.context.includes('prefers-reduced-motion: no-preference');
  for (const name of ['gs-blink', 'gs-fade', 'gs-bob']) {
    assert.ok(rules.some(rule => calm(rule) && rule.context.includes(`@keyframes ${name}`)), name);
    assert.ok(!rules.some(rule => !calm(rule) && (rule.context + rule.selector + [...rule.decls.values()].join(' ')).includes(name)), name);
  }
  assert.match(read('src/scripts/motion-loop.js'), /prefers-reduced-motion: reduce/);
  assert.match(script, /=\s*motionLoop\.reduce\b/);
  assert.match(script, /if \(\s*motion\.matches\s*\)\s*return/);
  assert.match(script, /canPlay\s*:[^;\n]*lanes\.some\(/);
  assert.match(script, /!motion\.matches\s*&&\s*copy\.animate/);
  // No back button: a press anywhere on the record, Esc, Enter or Space returns.
  assert.match(script, /detail\.addEventListener\(\s*['"]click['"]\s*,\s*close\b/);
  assert.match(script, /\[\s*['"]Escape['"]\s*,\s*['"]Enter['"]\s*,\s*['"] ['"]\s*\]\.includes\(\s*event\.key/);
  assert.match(compileSite(root).files.get('index.html'), /<p class="gs-exit">화면을 누르면 돌아가요<\/p>/);
  // Rows never stop on hover. "탄성 카트리지": a caught row brakes, a thrown one glides back into its flow and never rests;
  // cartridges lean while a row runs off its flow and wobble back on a spring. Only keyboard focus eases a row to a stop.
  assert.ok(!parseCss(styles).some(rule => /\.pack-row:hover \.pack-track|:focus-within \.pack-track|gs-flow/.test(rule.selector + rule.context)));
  assert.doesNotMatch(script + styles, /--pack-rest|resting|playbackRate/);
  assert.match(flow, /lane\.v\s*=[^;]*\blane\.v\b[^;]*Math\.exp\(/);
  assert.match(flow, /lane\.v\s*\*=\s*Math\.exp\(/);
  assert.match(flow, /addEventListener\(\s*['"]focusin['"][^;]*lane\.focused\s*=\s*keyboard/);
  assert.ok(cssDeclared(styles, '--pack-tilt').some(value => /^\d+$/.test(value)));
  const lean = cssRule(styles, '.pack-track.is-looping .pack', '*');
  assert.match(lean.get('rotate'), /^var\(--tilt\b/);
  assert.ok(lean.has('transform-origin'));
  // Each frame writes transforms only; the rows stop off screen.
  const frame = between(script, /const step\s*=\s*dt\s*=>/, /const layout\s*=/);
  assert.doesNotMatch(frame, /getComputedStyle|getBoundingClientRect|offsetWidth|clientWidth|scrollWidth/);
  assert.match(script, /onSeen\s*:[^;\n]*classList\.toggle\(\s*['"]is-away['"]/);
  // Sound starts only after the visitor's first press, quietly, and is made in the browser (no sound files).
  assert.match(script, /for \(const type of \[\s*['"]pointerdown['"]\s*,\s*['"]keydown['"]\s*\]\)\s*window\.addEventListener\(\s*type\s*,\s*wake/);
  const volume = Number(script.match(/const volume\s*=\s*([\d.]+)/)?.[1]);
  assert.ok(volume > 0 && volume <= 0.1, `volume ${volume} should be quiet`);
  assert.doesNotMatch(template + script, /\.(?:mp3|wav|ogg)\b|<audio/);
});

test('the game screen keeps its pixel type crisp and readable on phones', () => {
  const styles = read('src/styles/games.css');
  // The screen's edge is a sunken glass: a thin line and a soft top shadow laid over the cartridges, never taking a press.
  const glass = cssRule(styles, '.gs::after');
  assert.match(glass.get('box-shadow'), /inset .*var\(--lcd-mid\).*inset /);
  assert.equal(glass.get('pointer-events'), 'none');
  // One font declaration (common.css, shared by every page), on the reviewed local file; Korean words keep an ordinary quarter-cell space.
  const fontFaces = css => parseCss(css).filter(rule => rule.selector === '@font-face');
  assert.equal(fontFaces(styles).length, 0);
  const shared = fontFaces(read('src/styles/common.css'));
  assert.equal(shared.length, 1);
  assert.match(shared[0].decls.get('src'), /url\(["']?\.\.\/fonts\/neodgm\.woff2["']?\)/);
  assert.match(cssRule(styles, '.gs').get('word-spacing'), /^-[\d.]+em$/);
  // Cartridge names snap to the font's 8px grid; a stat or detail left empty is hidden for real, label included.
  assert.ok(cssDeclared(styles, '--px-pack').some(value => /^max\(16px,round\(nearest,.*,8px\)\)$/.test(value)));
  assert.match(cssRule(styles, '.pack-name').get('font-size'), /^var\(--px-pack\)/);
  assert.equal(cssRule(styles, '.gs-info div:not([hidden])').get('display'), 'contents');
  // Phones: the record reads down the middle under its cartridge.
  const phone = selector => cssRule(styles, selector, 'max-width: 640px');
  assert.equal(phone('.gs-detail').get('grid-template-columns'), 'minmax(0,1fr)');
  assert.equal(phone('.gs-detail').get('justify-items'), 'center');
  assert.equal(phone('.gs-record').get('text-align'), 'center');
});
