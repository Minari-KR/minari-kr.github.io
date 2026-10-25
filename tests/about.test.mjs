import test from 'node:test';
import assert from 'node:assert/strict';
import { compileSite } from '../scripts/site.mjs';
import { readHtmlTags } from '../scripts/html.mjs';
import { games } from '../scripts/site-config.mjs';
import { root } from './fixture.mjs';

test('about page is standalone: no way back to the portfolio, scripts in order, all stats in the HTML', () => {
  const { files, publicFiles } = compileSite(root);
  assert.ok(publicFiles.has('about/index.html'));
  const page = files.get('about/index.html');
  const tags = readHtmlTags(page);
  const hrefs = tags.filter(({ tag }) => tag === 'a').map(({ attributes }) => attributes.href);
  assert.deepEqual(hrefs, ['#main']);
  assert.doesNotMatch(page, /index\.html|projects\/|mailto:|tel:|https:\/\/(?!fonts\.g|minari-kr\.github\.io\/)/);
  const scripts = tags.filter(({ tag }) => tag === 'script').map(({ attributes }) => attributes.src.replace(/\?v=[a-f0-9]{12}$/, ''));
  assert.deepEqual(scripts, ['../assets/js/motion-loop.js', '../assets/js/about-stats.js']);
  assert.deepEqual([...page.matchAll(/data-count="(\d+)"/g)].map(match => Number(match[1])), [4, 2, 1, games.length]);
  for (const text of ['국가수리과학연구소장상', '베스트 리더상', '우수상', '4인 팀 기획 및 팀장', '3인 팀 기획 및 팀장', '쭉쭉냥 : 고양이 퍼즐']) assert.ok(page.includes(text), text);
  assert.equal((page.match(/role="tab"/g) || []).length, 4);
});
