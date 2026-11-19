import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VIEWS, pathFor, parseLocation, routeFromHref, metaFor } from '../public/assets/router.js';

test('VIEWS lists the nine views in page order', () => {
  assert.deepEqual(VIEWS, ['home', 'how', 'checks', 'score', 'control', 'security', 'who', 'faq', 'contact']);
});

test('pathFor maps home to / and other views to /<view>', () => {
  assert.equal(pathFor('home'), '/');
  assert.equal(pathFor('how'), '/how');
  assert.equal(pathFor('contact'), '/contact');
});

test('parseLocation accepts canonical paths without redirect', () => {
  assert.deepEqual(parseLocation('/', ''), { view: 'home', redirect: null });
  assert.deepEqual(parseLocation('/security', ''), { view: 'security', redirect: null });
});

test('parseLocation canonicalises trailing slash and case', () => {
  assert.deepEqual(parseLocation('/security/', ''), { view: 'security', redirect: '/security' });
  assert.deepEqual(parseLocation('/FAQ', ''), { view: 'faq', redirect: '/faq' });
  assert.deepEqual(parseLocation('/index.html', ''), { view: 'home', redirect: '/' });
});

test('parseLocation redirects old hash links to clean paths', () => {
  assert.deepEqual(parseLocation('/', '#/faq'), { view: 'faq', redirect: '/faq' });
  assert.deepEqual(parseLocation('/', '#/'), { view: 'home', redirect: '/' });
  assert.deepEqual(parseLocation('/how', '#/checks'), { view: 'checks', redirect: '/checks' });
});

test('parseLocation sends unknown paths and hashes home', () => {
  assert.deepEqual(parseLocation('/nope', ''), { view: 'home', redirect: '/' });
  assert.deepEqual(parseLocation('/', '#/nope'), { view: 'home', redirect: '/' });
  assert.deepEqual(parseLocation('/assets', ''), { view: 'home', redirect: '/' });
});

test('parseLocation ignores ordinary in-page anchors', () => {
  assert.deepEqual(parseLocation('/faq', '#top'), { view: 'faq', redirect: null });
});

test('routeFromHref recognises internal route links', () => {
  const o = 'https://clio.example';
  assert.equal(routeFromHref('/how', o), 'how');
  assert.equal(routeFromHref('/', o), 'home');
  assert.equal(routeFromHref('#/checks', o), 'checks');
  assert.equal(routeFromHref('https://clio.example/faq', o), 'faq');
});

test('routeFromHref leaves other links to the browser', () => {
  const o = 'https://clio.example';
  assert.equal(routeFromHref('https://other.example/faq', o), null);
  assert.equal(routeFromHref('mailto:info@clioaba.com', o), null);
  assert.equal(routeFromHref('mailto:info@clioaba.com?subject=Clio%20demo%20request', o), null);
  assert.equal(routeFromHref('/assets/clio-logo.png', o), null);
  assert.equal(routeFromHref('/nope', o), null);
  assert.equal(routeFromHref('', o), null);
});

test('metaFor gives every view a Clio title and a short description', () => {
  for (const v of VIEWS.filter((x) => x !== 'home')) {
    const m = metaFor(v);
    assert.ok(m.title.includes('Clio'), `${v} title: ${m.title}`);
    assert.ok(m.description.length > 40 && m.description.length <= 160, `${v} description length ${m.description.length}`);
  }
  assert.equal(metaFor('home').title, 'Clio — The AI reads. Your rules decide.');
  assert.equal(
    metaFor('home').description,
    "Clio reviews every ABA session note against the session's own data and your agency's rules, scores it, and sorts it. Only notes that pass everything are approvable. The rest go to a person.",
  );
  assert.equal(metaFor('security').title, 'Privacy and security — Clio');
});

test('metaFor falls back to home for unknown views', () => {
  assert.deepEqual(metaFor('nope'), metaFor('home'));
});
