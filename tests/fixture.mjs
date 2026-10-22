import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Recursive cpSync terminates Node in the current Windows/OneDrive environment.
// Copy the same fixture files individually so assertions still run unchanged.
export function copyFixtureTree(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) copyFixtureTree(from, to);
    else if (entry.isFile() && path.extname(from) === '.mp4') {
      // Most fixtures exercise references and file validation; real media is covered by compileSite(root).
      const video = Buffer.alloc(24);
      video.writeUInt32BE(video.length, 0);
      video.write('ftypisom', 4, 'ascii');
      fs.writeFileSync(to, video);
    } else if (entry.isFile()) fs.copyFileSync(from, to);
    else throw new Error(`Unexpected fixture entry: ${from}`);
  }
}

export function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'minari-portfolio-test-'));
  copyFixtureTree(path.join(root, 'src'), path.join(directory, 'src'));
  copyFixtureTree(path.join(root, 'public'), path.join(directory, 'public'));
  t.after(() => {
    const resolved = path.resolve(directory);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('minari-portfolio-test-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  return directory;
}

export const imageBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3i8AAAAASUVORK5CYII=', 'base64');

const squash = text => text.replace(/\s+/g, ' ').trim();
const tidySelector = text => squash(text).replace(/ ?([>+~]) ?/g, ' $1 ').replace(/\s*,\s*/g, ',');
// Declaration values compare without caring about spacing: "0 .7em" and "0 0.7em" and "a , b" and "a,b" are the same.
const tidyValue = text => squash(text).replace(/\s*,\s*/g, ',').replace(/\s*\/\s*/g, '/').replace(/(^|[^\d])\.(\d)/g, '$10.$2');

function closing(text, open) {
  let depth = 0, quote = '';
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === quote) quote = ''; } else if (c === '"' || c === "'") quote = c;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i;
  }
  throw new Error('Unbalanced braces in CSS');
}

function declarations(body) {
  const map = new Map();
  let buffer = '', quote = '', paren = 0;
  const flush = () => {
    const at = buffer.indexOf(':');
    if (at > 0) map.set(buffer.slice(0, at).trim(), tidyValue(buffer.slice(at + 1).replace(/\s*!important\s*$/, '')));
    buffer = '';
  };
  for (const c of body) {
    if (quote) { if (c === quote) quote = ''; } else if (c === '"' || c === "'") quote = c;
    else if (c === '(') paren++;
    else if (c === ')') paren--;
    else if (c === ';' && !paren) { flush(); continue; }
    buffer += c;
  }
  flush();
  return map;
}

// A tiny CSS reader for tests: [{ context, selector, decls }]. context is the chain of enclosing at-rules ('' at top level);
// a selector list is split into one entry per selector; @font-face and @keyframes steps come out as ordinary entries.
export function parseCss(css, context = '') {
  const rules = [];
  let text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  while (text.trim()) {
    const open = text.indexOf('{');
    const semi = text.indexOf(';');
    if (open < 0 || (semi >= 0 && semi < open)) { text = text.slice(semi + 1); continue; }
    const prelude = squash(text.slice(0, open));
    const end = closing(text, open);
    const body = text.slice(open + 1, end);
    text = text.slice(end + 1);
    if (/^@(media|supports|container|layer)/.test(prelude)) rules.push(...parseCss(body, `${context} ${tidyValue(prelude)}`.trim()));
    else if (prelude.startsWith('@keyframes')) rules.push(...parseCss(body, `${context} ${prelude}`.trim()));
    else {
      const decls = declarations(body);
      for (const selector of prelude.startsWith('@') ? [prelude] : tidySelector(prelude).split(',')) rules.push({ context, selector, decls });
    }
  }
  return rules;
}

// The declarations of every rule for a selector, later ones winning. media: undefined = outside any at-rule,
// '*' = anywhere, otherwise a fragment of the at-rule text (for example 'max-width: 640px').
export function cssRule(css, selector, media) {
  const wanted = tidySelector(selector);
  const fragment = media && media !== '*' ? tidyValue(media) : '';
  const merged = new Map();
  for (const rule of parseCss(css)) {
    const inside = media === undefined ? rule.context === '' : media === '*' || rule.context.includes(fragment);
    if (rule.selector === wanted && inside) for (const [name, value] of rule.decls) merged.set(name, value);
  }
  return merged;
}

// A custom property or any other declaration, wherever it is set.
export const cssDeclared = (css, property) => parseCss(css).flatMap(rule => [...rule.decls]).filter(([name]) => name === property).map(([, value]) => value);

// The source between two code landmarks, matched loosely (whitespace and quotes may change).
export function between(source, startPattern, endPattern) {
  const start = source.search(startPattern);
  const end = source.slice(start + 1).search(endPattern) + start + 1;
  assert.ok(start >= 0 && end > start, `${startPattern} … ${endPattern} not found in order`);
  return source.slice(start, end);
}
