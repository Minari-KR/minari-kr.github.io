import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const template = fs.readFileSync(new URL('../src/templates/home.html', import.meta.url), 'utf8');
const homeStyles = fs.readFileSync(new URL('../src/styles/home.css', import.meta.url), 'utf8');
const scripts = ['games.js', 'project-tabs.js'].map(name => fs.readFileSync(new URL(`../src/scripts/${name}`, import.meta.url), 'utf8')).join('\n');

test('email remains a mail link without copy controls or clipboard code', () => {
  assert.match(template, /class="action action-primary" href="mailto:bkpark0226@naver.com">bkpark0226@naver.com</);
  assert.doesNotMatch(template, /email-copy|copy-status|email-actions/);
  assert.doesNotMatch(scripts, /clipboard|email-copy|copy-status/);
});

test('intro, awards and projects follow the single-column order with the approved copy', () => {
  assert.doesNotMatch(template, /생년월일|2003\.02\.26|profile-birthday|게임 기획</);
  const order = ['id="intro-title"', '게임 디자이너</p>', '우송대학교 게임멀티미디어학과', 'class="intro-statement"', 'href="mailto:bkpark0226@naver.com"', 'href="https://minari-kr.itch.io/"', 'id="awards-title"', 'id="projects-title"', 'id="reflectory-title"', 'id="barrel-good-barrel-title"', 'id="aiden-magnus-kartrider-title"', 'id="ai-party-title"', 'id="games-title"'];
  const positions = order.map(marker => template.indexOf(marker));
  assert.ok(positions.every(position => position >= 0), String(positions));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.equal((template.match(/<strong class="award-name">/g) || []).length, 4);
  // Awards are four identical LCD cards with a pixel game item (CC0, assets/images/awards) and the year.
  assert.equal((template.match(/<li class="award-card[ "]/g) || []).length, 4);
  assert.doesNotMatch(template, /is-best/);
  for (const icon of ['book', 'trophy', 'crown', 'gem']) {
    assert.ok(template.includes(`src="./assets/images/awards/award-${icon}.png" width="48" height="48" alt="" aria-hidden="true"`), icon);
    assert.ok(fs.existsSync(new URL(`../public/assets/images/awards/award-${icon}.png`, import.meta.url)), icon);
  }
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
  assert.match(homeStyles, /\.action, \.home-link, \.play-link, \.release-link \{ transition: var\(--action-transition\); \}/);
  assert.match(homeStyles, /\.action-primary:hover, \.play-link:hover \{ background: #163b32;/);
  assert.match(homeStyles, /\.action-primary:active, \.play-link:active \{ background: #163b32; \}/);
});

test('projects open their own pages without JavaScript, and the page has no back-to-top button', () => {
  for (const slug of ['reflectory', 'barrel-good-barrel']) {
    assert.ok(template.includes(`<a class="action" href="./projects/${slug}.html">플레이 영상</a>`));
    const page = fs.readFileSync(new URL(`../src/templates/projects/${slug}.html`, import.meta.url), 'utf8');
    assert.match(page, /class="home-link" href="\.\.\/index\.html#projects"/);
    assert.match(page, /<p class="project-award">[^<]+<\/p>/);
    assert.match(page, /<video controls playsinline preload="none"/);
    assert.match(page, /class="play-link" href="https:\/\/minari-kr\.itch\.io\/[a-z-]+" target="_blank" rel="noopener noreferrer"/);
  }
  // The solo fan game (2026-10-16) has no page of its own: its only button, the primary one, opens the YouTube video in a new
  // tab (the site's security policy keeps YouTube out of the page), and nothing else on its card links anywhere.
  for (const [slug, video] of [['aiden-magnus-kartrider', 'https://www.youtube.com/watch?v=RrdQxWXoZO4&amp;t=35s']]) {
    const card = template.slice(template.indexOf(`<article class="project" id="project-${slug}"`), template.indexOf('</article>', template.indexOf(`id="project-${slug}"`)));
    assert.equal((card.match(/<a /g) || []).length, 1, slug);
    assert.ok(card.includes(`<a class="action action-primary" href="${video}" target="_blank" rel="noopener noreferrer">플레이 영상</a>`), slug);
    assert.ok(fs.existsSync(new URL(`../public/assets/images/cards/${slug}-title.webp`, import.meta.url)), slug);
  }
  // The back-to-top button was taken out at the user's request (2026-10-14).
  assert.doesNotMatch(template, /back-to-top|home-actions|circle-arrow-up/);
});

test('the AI collaboration screen sits between the projects and the game screen, with real text and one still frame', () => {
  const read = name => fs.readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
  const order = ['id="projects-title"', 'id="ai-party-title"', 'id="games-title"'].map(marker => template.indexOf(marker));
  assert.ok(order.every(position => position >= 0) && order[0] < order[1] && order[1] < order[2], String(order));
  assert.match(template, /<h2 class="section-title" id="ai-party-title"><span class="marker">AI와 일하는 방식<\/span><\/h2>/);
  assert.match(template, /<script src="\.\/assets\/js\/ai-party\.js" defer><\/script>/);
  const section = template.slice(template.indexOf('id="ai-party"'), template.indexOf('id="games"'));
  assert.equal((section.match(/<li class="ap-box ap-m /g) || []).length, 4);
  assert.equal((section.match(/class="core-line"/g) || []).length, 2);
  assert.doesNotMatch(section, /<br|Nintendo|Game Boy| · /);
  assert.match(section, /data-ai-party role="group" aria-label="AI와 일하는 방식 애니메이션/);
  // The cursor and the four role icons (pixelarticons, MIT) are local files; no company logos or trademark line remain.
  assert.ok(section.includes('./assets/icons/ap-cursor.svg'));
  assert.ok(fs.existsSync(new URL('../public/assets/icons/ap-cursor.svg', import.meta.url)));
  for (const icon of ['terminal', 'image', 'clapperboard', 'article']) {
    assert.ok(section.includes(`src="./assets/icons/pixelarticons-${icon}.svg"`), icon);
    const svg = read(`public/assets/icons/pixelarticons-${icon}.svg`);
    assert.match(svg, /fill="#0f380f"/);
    assert.match(svg, /shape-rendering="crispEdges"/);
  }
  assert.match(read('public/assets/icons/pixelarticons-license.txt'), /MIT License/);
  // Step label (one visible per phase) and the two helper-agent chips; both aria-hidden, covered by one sentence in the aria-label.
  assert.match(section, /<p class="ap-hud" aria-hidden="true">/);
  for (const step of ['1/5 의뢰', '2/5 계획·분배', '3/5 작업 중', '4/5 검토', '4/5 재작업', '5/5 완성']) assert.ok(section.includes(`>${step}</span>`), step);
  assert.ok(section.includes('Opus는 필요할 때 탐색·검토 에이전트를 불러 작업을 돕게 합니다.'));
  assert.match(section, /<div class="ap-agents" aria-hidden="true">/);
  assert.ok(section.includes('>탐색 에이전트</span>') && section.includes('>검토 에이전트</span>'));
  assert.ok(section.includes('src="./assets/icons/pixelarticons-robot.svg"'));
  assert.match(read('public/assets/icons/pixelarticons-robot.svg'), /fill="#0f380f"/);
  // Quest packets: one into Opus (in the 전달 connector) and one per member card, plus the dashed branch (four drops) under 출동; all decorative.
  const packet = '<i class="ap-pk" aria-hidden="true"><img src="./assets/icons/pixelarticons-file-text.svg" width="24" height="24" alt=""></i>';
  assert.equal(section.split(packet).length - 1, 5);
  assert.ok(section.includes(`<div class="ap-link ap-l1" aria-hidden="true"><span>전달</span>${packet}</div>`));
  assert.ok(section.includes('<div class="ap-link ap-l2" aria-hidden="true"><span>출동</span><i></i><i></i><i></i><i></i></div>'));
  assert.match(read('public/assets/icons/pixelarticons-file-text.svg'), /fill="#0f380f"/);
  assert.ok(read('src/styles/games.css').includes('.still .ap-pk { display: none; }'));
  assert.doesNotMatch(section, /ap-credit|ai-logos|claude-logo/);
  assert.ok(!fs.existsSync(new URL('../public/assets/images/ai-logos', import.meta.url)));
  assert.ok(!fs.existsSync(new URL('../public/assets/icons/claude-logo.svg', import.meta.url)));
  // The screen shares the game screen's LCD tokens and font; all its text is 16px; it moves only while on screen and visible.
  const styles = read('src/styles/games.css');
  assert.match(styles, /\.games, \.ai-party \{\s*--lcd: #8bac0f;/);
  assert.equal((styles.match(/@font-face/g) || []).length, 1);
  assert.match(styles, /\.ap \{[^}]*font-size: 16px;/);
  const script = read('src/scripts/ai-party.js');
  assert.match(script, /prefers-reduced-motion: reduce/);
  assert.match(script, /IntersectionObserver/);
  assert.match(script, /document\.hidden/);
  assert.match(styles, /\.still \.ap-meter i \{ width: 60%; \}/);
});
