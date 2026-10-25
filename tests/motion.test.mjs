import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readHtmlTags } from '../scripts/html.mjs';
import { compileSite } from '../scripts/site.mjs';
import { root } from './fixture.mjs';

const read = name => fs.readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

test('home images retain explicit dimensions and page transitions respect reduced motion', () => {
  const { files } = compileSite(root);
  const home = files.get('index.html');
  const project = files.get('projects/reflectory.html');
  for (const { tag, attributes } of readHtmlTags(home)) {
    if (tag !== 'img') continue;
    assert.ok(Number(attributes.width) > 0);
    assert.ok(Number(attributes.height) > 0);
  }
  assert.match(home, /assets\/css\/page-transitions\.css/);
  assert.match(project, /assets\/css\/page-transitions\.css/);
  const transitions = read('src/styles/page-transitions.css');
  assert.match(transitions, /@media \(prefers-reduced-motion: no-preference\)[\s\S]*navigation: auto/);
  assert.match(transitions, /@media \(prefers-reduced-motion: reduce\)[\s\S]*navigation: none/);
});

test('Barrel Good Barrel detail page has its four blocks, flowcharts and scripts', () => {
  const page = compileSite(root).files.get('projects/barrel-good-barrel.html');
  assert.equal((page.match(/<div class="core"/g) || []).length, 4);
  for (const marker of ['data-bgb-loadout', 'data-bgb-system="map"', 'data-bgb-system="threat"', 'data-bgb-screen', 'data-bgb-hud']) assert.ok(page.includes(marker), marker);
  assert.deepEqual([...page.matchAll(/data-bgb-still="([\d.]+)"/g)].map(match => match[1]), ['2.25', '9.7', '15.7']);
  assert.equal((page.match(/class="core-line"/g) || []).length, 6);
  assert.equal((page.match(/<canvas [^>]*role="img" aria-label="[^"]{20,}"/g) || []).length, 3);
  for (const name of ['loop', 'loadout', 'map', 'threat']) {
    assert.ok(page.includes(`src="../assets/icons/bgb-flow-${name}.svg" width="720"`), name);
    assert.match(read(`public/assets/icons/bgb-flow-${name}.svg`), /^<svg viewBox="0 0 720 \d+"/);
  }
  assert.equal((page.match(/<img src="\.\.\/assets\/icons\/bgb-flow-[a-z]+\.svg"[^>]* alt="[^"]{30,}"/g) || []).length, 4);
  for (const script of ['bgb-loadout', 'bgb-systems']) assert.match(page, new RegExp(`<script src="\\.\\./assets/js/${script}\\.js\\?v=[a-f0-9]{12}" defer></script>`), script);
  assert.doesNotMatch(page, /도탄|시너지|R 키/);
});

test('every animation runs through the shared motion loop, which the pages load first', () => {
  const loop = read('src/scripts/motion-loop.js');
  for (const rule of ['prefers-reduced-motion: reduce', 'IntersectionObserver', 'document.hidden', 'visibilitychange']) assert.ok(loop.includes(rule), rule);
  const { files } = compileSite(root);
  const pages = {
    'index.html': ['./assets/js/', ['games', 'project-tabs', 'ai-party'], ['flow-row']],
    'about/index.html': ['../assets/js/', ['about-stats'], []],
    'projects/reflectory.html': ['../assets/js/', ['reflectory-core', 'reflectory-augments', 'reflectory-systems'], ['canvas-kit']],
    'projects/barrel-good-barrel.html': ['../assets/js/', ['bgb-loadout', 'bgb-systems'], ['canvas-kit']],
  };
  for (const [name, [folder, scripts, helpers]] of Object.entries(pages)) {
    const page = files.get(name);
    const tags = [...page.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(match => match[1].replace(/\?v=[a-f0-9]{12}$/, ''));
    assert.deepEqual(tags, ['motion-loop', ...helpers, ...scripts].map(script => `${folder}${script}.js`), name);
    // The scripts keep only their own drawing; none of them runs its own frame loop or watches the viewport.
    for (const script of scripts) {
      const source = read(`src/scripts/${script}.js`);
      assert.match(source, /motionLoop\(/, script);
      assert.doesNotMatch(source, /IntersectionObserver|visibilitychange|matchMedia|requestAnimationFrame/, script);
    }
  }
});
