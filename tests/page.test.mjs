import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VIEWS } from '../public/assets/router.js';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

test('page has no inline script, only the app module', () => {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  assert.match(scripts[0][1], /type="module"/);
  assert.match(scripts[0][1], /src="\/assets\/app\.js"/);
  assert.equal(scripts[0][2].trim(), '');
});

test('no links use the old #/ form', () => {
  assert.doesNotMatch(html, /href="#\//);
});

test('asset URLs are absolute so deep paths load them', () => {
  assert.doesNotMatch(html, /(src|href)="assets\//);
  assert.match(html, /href="\/assets\/favicon\.png"/);
  assert.match(html, /src="\/assets\/clio-logo\.png"/);
});

test('page has no static canonical (app.js sets it per view, so crawlers are not told every path is home)', () => {
  assert.doesNotMatch(html, /rel="canonical"/);
});

test('package.json requires a Node version whose test runner accepts globs', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.engines.node, '>=22');
});

test('every internal route link points at a known view', () => {
  const hrefs = [...html.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]).filter((h) => !h.startsWith('/assets/'));
  assert.ok(hrefs.length > 10);
  for (const h of hrefs) {
    const v = h === '/' ? 'home' : h.slice(1);
    assert.ok(VIEWS.includes(v), h);
  }
});

test('every view has a container in the page', () => {
  for (const v of VIEWS) assert.match(html, new RegExp(`data-view="${v}"`), v);
});
