import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { compileSite } from '../scripts/site.mjs';
import { root, cssRule, parseCss, between } from './fixture.mjs';

const read = name => fs.readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

test('projects show as thumbnail tabs over one large card, and nothing of the other cards shows', () => {
  const home = compileSite(root).files.get('index.html');
  const section = home.slice(home.indexOf('id="projects"'), home.indexOf('</section>', home.indexOf('id="projects"')));
  // One tab per card, in the same order, each pointing at its card; the tabs stay hidden until the script runs.
  const tabs = [...section.matchAll(/<button class="ptabs-tab" type="button" role="tab" id="tab-([a-z-]+)" aria-controls="project-\1" aria-selected="(true|false)">/g)];
  const slugs = ['reflectory', 'barrel-good-barrel', 'aiden-magnus-kartrider'];
  assert.deepEqual(tabs.map(tab => tab[1]), slugs);
  assert.deepEqual(tabs.map(tab => tab[2]), ['true', 'false', 'false']);
  assert.match(section, /<div class="ptabs-list" role="tablist" aria-label="프로젝트 고르기" hidden>/);
  for (const slug of slugs) assert.match(section, new RegExp(`<article class="project" id="project-${slug}" aria-labelledby="${slug}-title">`));
  assert.match(home, /<script src="\.\/assets\/js\/project-tabs\.js\?v=[a-f0-9]{12}" defer><\/script>/);
  // The cards share one place: the others are hidden, not slid to the side, and none of the old slider is left.
  const styles = read('src/styles/home.css');
  const stacked = cssRule(styles, '.ptabs.is-ready .ptabs-cards > .project');
  assert.equal(stacked.get('display'), 'flex');
  assert.equal(stacked.get('flex-direction'), 'column');
  assert.equal(stacked.get('grid-area'), '1/1');
  // Each card's buttons follow its content (the same award → buttons gap on every card), not pinned to the bottom.
  assert.ok(!styles.includes('.ptabs-cards > .project > .project-actions'));
  const away = cssRule(styles, '.ptabs.is-ready .ptabs-cards > .project:not(.is-current)');
  assert.equal(away.get('visibility'), 'hidden');
  // Hidden cards leave the flow, so the section is only as tall as the card shown.
  assert.equal(away.get('position'), 'absolute');
  assert.equal(cssRule(styles, '.ptabs.is-ready .ptabs-cards').get('position'), 'relative');
  assert.equal(away.get('opacity'), '0');
  assert.doesNotMatch(styles + section, /slider|translateX|translate: -?\d+px 0/);
  assert.ok(!fs.existsSync(new URL('../src/scripts/slider.js', import.meta.url)));
});

test('the tabs follow the ARIA tabs pattern and the card change is gentle only without reduced motion', () => {
  const script = read('src/scripts/project-tabs.js');
  const flow = read('src/scripts/flow-row.js');
  const styles = read('src/styles/home.css');
  // Arrow keys, Home and End move along the tabs; only the shown card is reachable; one card alone needs no tabs.
  for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) assert.ok(script.includes(key), key);
  assert.match(script, /setAttribute\(\s*['"]aria-selected['"]\s*,\s*String\(on\)/);
  assert.match(script, /tab\.tabIndex\s*=\s*on\s*\?\s*0\s*:\s*-1/);
  assert.match(script, /cards\[i\]\.inert\s*=\s*!on/);
  assert.match(script, /tabs\.length\s*<\s*2\s*\|\|\s*cards\.some\(/);
  // A row of more tabs than fit scrolls sideways: a plain wheel moves it (and gives the scroll back to the page at its ends),
  // a mouse can pull it without that counting as a press, and a chosen tab slides fully into view without moving the page.
  assert.match(script, /list\.addEventListener\(\s*['"]wheel['"]/);
  assert.match(script, /if \(\s*room\s*<\s*1\s*\)\s*return/);
  assert.match(flow, /row\.scrollLeft\s*=\s*pull\.left\s*-\s*dx/);
  assert.match(flow, /if \(\s*!dragged\s*\)\s*return/);
  assert.match(script, /tabs\[to\]\.focus\(\s*\{\s*preventScroll\s*:\s*true/);
  // More tabs than fit: the row flows like the cartridge rows, with copies that are hidden from screen readers, keep no ids
  // and take no Tab stop; it leaves up-and-down wheel turns to the page, stops for keyboard focus, and stays still with
  // reduced motion or when everything fits.
  assert.match(script, /if \(\s*!motion\.matches\s*&&\s*list\.scrollWidth\s*>\s*list\.clientWidth/);
  for (const pattern of [/copy\.removeAttribute\(\s*['"]id['"]/, /lane\.step\(\s*dt\s*,\s*lane\.focused\s*\?\s*0\s*:\s*-speed/, /Math\.abs\(\s*event\.deltaX\s*\)\s*<=\s*Math\.abs\(\s*event\.deltaY\s*\)/]) assert.match(script, pattern);
  for (const pattern of [/copy\.setAttribute\(\s*['"]aria-hidden['"]\s*,\s*['"]true['"]/, /copy\.tabIndex\s*=\s*-1/]) assert.match(flow, pattern);
  const frame = between(script, /const step\s*=\s*dt\s*=>/, /const layout\s*=/);
  assert.doesNotMatch(frame, /getComputedStyle|getBoundingClientRect|offsetWidth|clientWidth|scrollWidth/);
  assert.match(cssRule(styles, '.ptabs').get('--tab-speed'), /^\d+$/);
  const looping = cssRule(styles, '.ptabs-list.is-looping');
  assert.equal(looping.get('overflow'), 'hidden');
  assert.equal(looping.get('touch-action'), 'pan-y');
  // A sideways swipe on the card is for touch only and leaves vertical scrolling to the page.
  assert.match(script, /event\.pointerType\s*===\s*['"]mouse['"]/);
  const stage = cssRule(styles, '.ptabs.is-ready .ptabs-cards');
  assert.equal(stage.get('display'), 'grid');
  assert.equal(stage.get('touch-action'), 'pan-y');
  const fade = '.ptabs.is-ready .ptabs-cards > .project';
  assert.ok(cssRule(styles, fade, 'prefers-reduced-motion: no-preference').has('transition'));
  assert.ok(!cssRule(styles, fade).has('transition'));
});
