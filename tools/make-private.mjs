// Locks the award details (private/awards.html + private/photos/) into site/private.bin.
// Run from the repo root after editing anything in private/:  node tools/make-private.mjs
// The page shows the details only when opened with the link this prints (the key is the #k=... part).
// private/ is not in git; only the locked file is published, so the details cannot be read on GitHub.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import assert from 'node:assert';

const keyFile = 'private/key.txt';
if (!existsSync(keyFile)) writeFileSync(keyFile, randomBytes(32).toString('base64url')); // made once: a new key breaks links already sent
const key = Buffer.from(readFileSync(keyFile, 'utf8').trim(), 'base64url');
assert.equal(key.length, 32, 'private/key.txt must hold a 32-byte base64url key');

// Photos go inside the bundle as data: images, so no photo file is published on its own.
const html = readFileSync('private/awards.html', 'utf8').replace(/src="(photos\/[\w.-]+\.webp)"/g,
  (_, path) => `src="data:image/webp;base64,${readFileSync(`private/${path}`).toString('base64')}"`);
assert(!html.includes('src="photos/'), 'a photo path was not replaced');

// File layout: 12-byte IV, then AES-256-GCM ciphertext with its 16-byte tag at the end (what WebCrypto expects).
const iv = randomBytes(12);
const cipher = createCipheriv('aes-256-gcm', key, iv);
const out = Buffer.concat([iv, cipher.update(html, 'utf8'), cipher.final(), cipher.getAuthTag()]);
writeFileSync('site/private.bin', out);

// Self-check: the file opens with the key and gives back the same text.
const d = createDecipheriv('aes-256-gcm', key, out.subarray(0, 12)).setAuthTag(out.subarray(-16));
assert.equal(Buffer.concat([d.update(out.subarray(12, -16)), d.final()]).toString('utf8'), html);

console.log(`site/private.bin ${Math.round(out.length / 1024)} KB`);
console.log(`link: https://minari-kr.github.io/#k=${key.toString('base64url')}`);
