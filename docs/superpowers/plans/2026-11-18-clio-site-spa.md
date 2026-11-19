# Clio Site Clean-URL SPA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the delivered single-file Clio page into a clean-URL SPA ready for AWS Amplify Hosting, version-controlled in `codexaba/clio-ui`.

**Architecture:** Static files in `public/`. A pure ES module (`router.js`) maps locations and hrefs to views; `app.js` wires it to the DOM with the History API. Amplify serves `index.html` for every non-file path and adds security headers; a zero-dependency Node server mirrors both locally.

**Tech Stack:** Plain HTML/CSS/ES modules, Node 24 (`node --test`, `node:http`), AWS Amplify Hosting.

**Spec:** `docs/superpowers/specs/2026-11-18-clio-site-spa-design.md`

## Global Constraints

- No npm dependencies, no build step, no framework.
- Do not change any visible copy or styling in `index.html`.
- Views, in order: `home, how, checks, score, control, security, who, faq, contact`.
- Paths: `home` → `/`, every other view → `/<view>`.
- No analytics or third-party scripts; only external origins allowed are `fonts.googleapis.com` (CSS) and `fonts.gstatic.com` (fonts).
- Respect `prefers-reduced-motion` exactly as the current script does.

## Review Focus

1. Reload or open `/security` directly (and `/security/`) → Security view, logo and favicon load.
2. Response headers' CSP blocks nothing the page needs (fonts, inline `<style>`, `app.js`, the score ring's `style.setProperty`) → no console CSP errors.
3. Old shared link `/#/faq` → address becomes `/faq`, FAQ shows, one history entry (replace, not push).
4. Ctrl/Cmd-click, middle-click, `mailto:` and external links → browser default, not hijacked.
5. `/assets/clio-logo.png` and other files never rewritten to `index.html`; `/nope` → `/` home.

---

### Task 1: Repository scaffold and site import

**Files:**
- Create: `public/index.html`, `public/assets/clio-logo.png`, `public/assets/favicon.png` (copied unchanged from the zip; drop `__MACOSX`)
- Create: `package.json`, `.gitignore`, `README.md`

**Interfaces:**
- Produces: `npm test` → `node --test tests/`; `npm run serve` → `node tools/serve.mjs` (file arrives in Task 3).

- [ ] **Step 1:** Copy the three files from the extracted zip into `public/`.
- [ ] **Step 2:** Verify byte-identical: `cmp` each copy against the zip source. Expected: no output.
- [ ] **Step 3:** `package.json`: `"name": "clio-ui"`, `"private": true`, `"type": "module"`, scripts above, no dependencies. `.gitignore`: `node_modules/`, `.DS_Store`, `__MACOSX/`. `README.md`: what the site is, `npm run serve`, `npm test`, and a "Deploy" section filled in by Task 5.
- [ ] **Step 4:** Commit with the spec and this plan: `chore: import Clio site and design docs`.

### Task 2: Pure router module

**Files:**
- Create: `public/assets/router.js`
- Test: `tests/router.test.mjs`

**Interfaces:**
- Produces:
  - `export const VIEWS: string[]` (order above)
  - `export function pathFor(view: string): string`
  - `export function parseLocation(pathname: string, hash: string): { view: string, redirect: string | null }` — `redirect` is the canonical path to `replaceState` to, or `null` when already canonical.
  - `export function routeFromHref(href: string, origin: string): string | null` — view for an internal route link, else `null`.
  - `export function metaFor(view: string): { title: string, description: string }`

- [ ] **Step 1: Write failing tests** in `tests/router.test.mjs`:

```js
assert.deepEqual(parseLocation('/', ''), { view: 'home', redirect: null });
assert.deepEqual(parseLocation('/security', ''), { view: 'security', redirect: null });
assert.deepEqual(parseLocation('/security/', ''), { view: 'security', redirect: '/security' });
assert.deepEqual(parseLocation('/FAQ', ''), { view: 'faq', redirect: '/faq' });
assert.deepEqual(parseLocation('/', '#/faq'), { view: 'faq', redirect: '/faq' });
assert.deepEqual(parseLocation('/', '#/'), { view: 'home', redirect: '/' });
assert.deepEqual(parseLocation('/index.html', ''), { view: 'home', redirect: '/' });
assert.deepEqual(parseLocation('/nope', ''), { view: 'home', redirect: '/' });
assert.deepEqual(parseLocation('/', '#/nope'), { view: 'home', redirect: '/' });
assert.equal(pathFor('home'), '/'); assert.equal(pathFor('how'), '/how');
const o = 'https://clio.example';
assert.equal(routeFromHref('/how', o), 'how');
assert.equal(routeFromHref('/', o), 'home');
assert.equal(routeFromHref('#/checks', o), 'checks');
assert.equal(routeFromHref('https://clio.example/faq', o), 'faq');
assert.equal(routeFromHref('https://other.example/faq', o), null);
assert.equal(routeFromHref('mailto:info@clioaba.com', o), null);
assert.equal(routeFromHref('/assets/clio-logo.png', o), null);
assert.equal(routeFromHref('/nope', o), null);
for (const v of VIEWS) { const m = metaFor(v); assert.ok(m.title.includes('Clio')); assert.ok(m.description.length > 40 && m.description.length <= 160); }
assert.equal(metaFor('home').title, 'Clio — The AI reads. Your rules decide.');
```

- [ ] **Step 2:** `npm test` → FAIL (module not found).
- [ ] **Step 3: Implement** `router.js`. A hash of the form `#/x` wins over the pathname. `metaFor`: home keeps the current `<title>` and meta description verbatim; other titles are `<nav label> — Clio` using the page's names map (`How it runs`, `The ten checks`, `Score and groups`, `Control`, `Privacy and security`, `Who it is for`, `Questions`, `Request a demo`); other descriptions are the view's lead sentence from `index.html`, trimmed to ≤160 chars.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: pure router for clean-URL views`.

### Task 3: Rewrite rules and local server

**Files:**
- Create: `amplify/custom-rules.json`, `customHttp.yml` (JSON syntax — valid YAML — so Node can `JSON.parse` it), `tools/serve.mjs`
- Test: `tests/hosting.test.mjs`

**Interfaces:**
- Produces: `custom-rules.json` = Amplify `customRules` array, exactly:
  `[{ "source": "</^[^.]+$|\\.(?!(css|gif|ico|jpg|jpeg|js|mjs|png|txt|svg|woff|woff2|ttf|map|json|webp|xml|webmanifest)$)([^.]+$)/>", "target": "/index.html", "status": "200" }]`
- Produces: `customHttp.yml` = `{ "customHeaders": [{ "pattern": "**/*", "headers": [{ "key", "value" }...] }] }` with:
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; object-src 'none'`
  - `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- Produces: `export function createServer(root: string): http.Server` in `tools/serve.mjs`; run directly → listens on `PORT` (default 8090). Applies the rewrite regex from `custom-rules.json` and headers from `customHttp.yml`; correct `Content-Type` for html/js/png/css/svg/json; 404 for missing files.

- [ ] **Step 1: Write failing tests:** the rule's regex (strip `</` `/>`) matches `/`, `/how`, `/security/`, `/nope`; does not match `/assets/app.js`, `/assets/clio-logo.png`, `/favicon.ico`. Start `createServer('public')` on port 0 and assert: `GET /security` → 200, `text/html`, body contains `data-view="security"`, has the CSP header; `GET /assets/clio-logo.png` → 200 `image/png`; `GET /assets/missing.png` → 404.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement the three files.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: Amplify rewrite, security headers, local server`.

### Task 4: Wire the page to clean URLs

**Files:**
- Modify: `public/index.html` (remove inline `<script>`, add `<script type="module" src="/assets/app.js">`; all `href="#/x"` → `href="/x"`, `#/` → `/`; `assets/` → `/assets/`; add `<link rel="canonical" href="/">`)
- Create: `public/assets/app.js`

**Interfaces:**
- Consumes: everything `router.js` exports (Task 2).

- [ ] **Step 1:** Move the existing script body into `app.js` unchanged except routing: `route()` uses `parseLocation(location.pathname, location.hash)`; if `redirect` → `history.replaceState(null, '', redirect)`; set `document.title`, the description meta and canonical `href` (absolute, `location.origin + pathFor(view)`) from `metaFor`; nav `on` class compares to `pathFor(k)`; pager links use `pathFor`. Listen to `popstate`, not `hashchange`.
- [ ] **Step 2:** Delegated `click` on `document`: if `e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey`, or the anchor has `target`/`download`, do nothing; else `routeFromHref(a.href, location.origin)` → if a view, `preventDefault`, `pushState` (skip when already on that path), `route()`.
- [ ] **Step 3:** After an in-app navigation (not first load), move focus to the shown view's first `h1`/`h2` (`tabindex="-1"` set in JS) so keyboard and screen-reader users land on the new content.
- [ ] **Step 4:** `npm test` → PASS (unchanged). Run `npm run serve` via the preview tool and verify in the browser: every nav item, pager Next/Prev, logo → home; Back/Forward; reload on `/security` and `/security/`; `/#/faq` → `/faq`; `/nope` → `/`; title changes per view; logo/favicon load on deep paths; home demo runs and stops when leaving home; zero console errors (CSP included); 375 px wide has no horizontal scroll.
- [ ] **Step 5:** Commit `feat: clean-URL routing with History API`.

### Task 5: Amplify build spec, README deploy steps, push

**Files:**
- Create: `amplify.yml`
- Modify: `README.md`

- [ ] **Step 1:** `amplify.yml`: `version: 1`, `frontend.phases.build.commands: ['echo "static site, no build"']`, `artifacts.baseDirectory: public`, `files: ['**/*']`.
- [ ] **Step 2:** README "Deploy": Amplify console → Create app → GitHub → `codexaba/clio-ui`, branch `main` → confirm `amplify.yml` detected → after creation, Hosting → Rewrites and redirects → paste `amplify/custom-rules.json` (or `aws amplify update-app --app-id <id> --custom-rules file://amplify/custom-rules.json`) → Custom domains. Note `customHttp.yml` is read from the repo root on each build.
- [ ] **Step 3:** `npm test` → PASS; commit `chore: Amplify build spec and deploy guide`.
- [ ] **Step 4:** `git push -u origin main`; `gh repo view codexaba/clio-ui` shows the default branch `main`.
