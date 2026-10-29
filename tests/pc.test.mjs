import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { coreBlocks } from '../scripts/pc.mjs';

const body = slug => fs.readFileSync(new URL(`../src/templates/projects/${slug}.html`, import.meta.url), 'utf8');

test('Reflectory summary has its four blocks, each with a flowchart', () => {
  const blocks = coreBlocks(body('reflectory'), 'reflectory');
  assert.deepEqual(blocks.map(block => block.title), ['핵심 루프', '핵심 플레이 규칙 설계', '증강 시스템', '맵 변화 시스템']);
  for (const { img } of blocks) assert.match(img.src, /^\.\.\/assets\/icons\/.+\.svg$/);
  assert.equal(blocks[0].text, '');
  assert.match(blocks[1].text, /core-line/);
});

test('Barrel Good Barrel summary has four blocks; a body without blocks or a broken flow image fails the build', () => {
  assert.equal(coreBlocks(body('barrel-good-barrel'), 'barrel-good-barrel').length, 4);
  assert.throws(() => coreBlocks('<p>none</p>', 'x'), /핵심 블록/);
  assert.throws(() => coreBlocks('<div class="core"><h2 class="core-title">A</h2><figure class="core-flow"><img src="../assets/a.svg" width="1"></figure></div>', 'x'), /순서도 이미지/);
});
