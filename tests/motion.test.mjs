import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readHtmlTags } from '../scripts/html.mjs';

const read = name => fs.readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

test('home images retain explicit dimensions and page transitions respect reduced motion', () => {
  const home = read('src/templates/home.html');
  const project = read('src/templates/projects/reflectory.html');
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
  const page = read('src/templates/projects/barrel-good-barrel.html');
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
  for (const script of ['bgb-loadout', 'bgb-systems']) assert.ok(page.includes(`<script src="../assets/js/${script}.js" defer></script>`), script);
  assert.doesNotMatch(page, /도탄|시너지|R 키/);
});
