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

// Responsive layout. The header nav wraps to a second row below 980px, so the
// header must grow with it; a fixed height lets the links spill over the hero.
const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
function mediaBlock(query) {
  const start = css.indexOf(`@media (${query}){`);
  assert.ok(start >= 0, `missing @media (${query})`);
  let depth = 0;
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(start, i + 1);
  }
  throw new Error(`unclosed @media (${query})`);
}

test('on phones the header height follows its wrapped nav row', () => {
  for (const q of ['max-width:560px', 'max-width:420px']) {
    assert.doesNotMatch(mediaBlock(q), /\.nav\{[^}]*\bheight:\s*\d/, q);
  }
});

test('home never locks page scrolling, so a hero taller than the screen stays reachable', () => {
  assert.doesNotMatch(css, /body\.is-home\{[^}]*overflow:\s*hidden/);
});

test('phone gutters set only the sides, keeping the wrapped nav its top padding', () => {
  for (const q of ['max-width:560px', 'max-width:420px']) {
    assert.doesNotMatch(mediaBlock(q), /\.wrap\{[^}]*\bpadding:/, q);
  }
});

test('the hero strip spans the full width (margin:auto in the flex hero would shrink it)', () => {
  assert.match(css, /\.strip\{[^}]*\bwidth:100%/);
});

test('on phones the sheet caption sits above the sheet instead of overlapping it', () => {
  assert.match(mediaBlock('max-width:560px'), /\.tagline\{[^}]*position:static/);
});
