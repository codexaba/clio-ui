import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer, headerEntries } from '../tools/serve.mjs';

const repo = fileURLToPath(new URL('..', import.meta.url));
const rules = JSON.parse(readFileSync(new URL('../amplify/custom-rules.json', import.meta.url), 'utf8'));
const http = JSON.parse(readFileSync(new URL('../customHttp.yml', import.meta.url), 'utf8'));

const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; base-uri 'self'; " +
  "form-action 'none'; frame-ancestors 'none'; object-src 'none'";

function ruleRegex() {
  const src = rules[0].source;
  assert.ok(src.startsWith('</') && src.endsWith('/>'), 'Amplify regex rules are wrapped in </ ... />');
  return new RegExp(src.slice(2, -2));
}

test('the single rewrite rule sends paths to /index.html with status 200', () => {
  assert.equal(rules.length, 1);
  assert.equal(rules[0].target, '/index.html');
  assert.equal(rules[0].status, '200');
});

test('rewrite regex matches page paths', () => {
  const re = ruleRegex();
  for (const p of ['/', '/how', '/security/', '/nope']) assert.ok(re.test(p), p);
});

test('rewrite regex leaves files alone', () => {
  const re = ruleRegex();
  for (const p of ['/assets/app.js', '/assets/router.js', '/assets/clio-logo.png', '/favicon.ico', '/sitemap.xml']) {
    assert.ok(!re.test(p), p);
  }
});

test('customHttp.yml carries the agreed security headers for every path', () => {
  assert.equal(http.customHeaders.length, 1);
  assert.equal(http.customHeaders[0].pattern, '**');
  const h = Object.fromEntries(http.customHeaders[0].headers.map(({ key, value }) => [key, value]));
  assert.deepEqual(h, {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': CSP,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
});

let server;
let base;
before(async () => {
  server = createServer(`${repo}public`);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise((r) => server.close(r)));

test('server serves index.html for a deep page path with headers', async () => {
  const res = await fetch(`${base}/security`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /^text\/html/);
  assert.equal(res.headers.get('content-security-policy'), CSP);
  assert.match(await res.text(), /data-view="security"/);
});

test('server serves index.html for a trailing-slash path', async () => {
  const res = await fetch(`${base}/faq/`);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /data-view="faq"/);
});

test('server serves assets with their own type', async () => {
  const res = await fetch(`${base}/assets/clio-logo.png`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'image/png');
  const js = await fetch(`${base}/assets/router.js`);
  assert.equal(js.status, 200);
  assert.match(js.headers.get('content-type'), /^text\/javascript/);
});

test('server sends the security headers on the root document', async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.headers.get('content-security-policy'), CSP);
  assert.equal(res.headers.get('strict-transport-security'), 'max-age=31536000; includeSubDomains');
});

test('headerEntries refuses header patterns the local server cannot mirror', () => {
  assert.throws(() => headerEntries([{ pattern: '**/*', headers: [{ key: 'X-A', value: '1' }] }]), /pattern/);
  assert.deepEqual(headerEntries([{ pattern: '**', headers: [{ key: 'X-A', value: '1' }] }]), [['X-A', '1']]);
});

test('server returns 404 for a missing file', async () => {
  const res = await fetch(`${base}/assets/missing.png`);
  assert.equal(res.status, 404);
});

test('server never serves files outside the site root', async () => {
  const res = await fetch(`${base}/..%2Fpackage.json`);
  assert.notEqual(res.status, 200);
  const res2 = await fetch(`${base}/assets/..%2F..%2Fpackage.json`);
  assert.notEqual(res2.status, 200);
});

test('amplify.yml publishes public/ with no build step', () => {
  const spec = readFileSync(new URL('../amplify.yml', import.meta.url), 'utf8');
  assert.match(spec, /^version: 1$/m);
  assert.match(spec, /^\s+baseDirectory: public$/m);
  assert.match(spec, /^\s+- '\*\*\/\*'$/m);
  assert.doesNotMatch(spec, /npm (ci|install)/);
});
