# Clio website

Marketing site for Clio, note review for ABA agencies. It is one static page
(`public/index.html`) that behaves as a single-page app with clean links:
`/`, `/how`, `/checks`, `/score`, `/control`, `/security`, `/who`, `/faq`,
`/contact`. There is no framework, no build step and no npm dependency.

## Layout

| Path | What it is |
|---|---|
| `public/` | Everything that is published |
| `public/assets/router.js` | Pure routing logic (paths ↔ views, titles) |
| `public/assets/app.js` | Page behaviour: navigation and the home-screen demo |
| `amplify.yml` | Amplify build spec (publishes `public/` as-is) |
| `customHttp.yml` | Security headers Amplify adds to every response |
| `amplify/custom-rules.json` | Rewrite rule: every non-file path serves `index.html` |
| `tools/serve.mjs` | Local server that applies the same rewrite and headers |
| `tests/` | `node --test` suites |

## Work on it locally

Requires Node 20 or newer.

```sh
npm run serve     # http://localhost:8090
npm test
```

## Deploy

See the "Deploy on AWS Amplify" section below.
