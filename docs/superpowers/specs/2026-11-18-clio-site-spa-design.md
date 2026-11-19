# Clio website — clean-URL SPA on AWS Amplify (short design)

Approved 2026-11-18.

## Intent

Publish the existing Clio marketing page (from `Website.zip`) on AWS as a
single-page app with clean links, using `codexaba/clio-ui` for version
control. Copy and visual design stay exactly as delivered.

## Goals

- One page, nine views, clean paths: `/`, `/how`, `/checks`, `/score`,
  `/control`, `/security`, `/who`, `/faq`, `/contact`.
- In-page navigation without reloads; Back/Forward work; deep links and
  reloads on any path work.
- Old `/#/security`-style links redirect to `/security`; unknown paths go
  to `/`.
- Per-view `<title>`, meta description and canonical link.
- Hosted on AWS Amplify, auto-deploying on push to `main`, with security
  headers.

## Non-goals / anti-goals

- No framework, no build step, no npm dependencies.
- No contact form, no analytics or trackers (the page's privacy text
  promises no advertising trackers). Demo requests stay `mailto:`.
- No copy or design changes.

## Approaches

| | Approach | Trade-off |
|---|---|---|
| A | Publish as-is with `#/` links | Zero work; dated links, one URL for search engines |
| **B** | **Same page, History-API clean links + host rewrite** | **Small script change; shareable links, per-view titles — chosen by the user** |
| C | Rebuild in React/Vite | Adds tooling and dependencies with no gain for a static marketing page |

## Decisions (builder's calls, accepted with the design)

1. Site files under `public/`; hosting config at repo root
   (`amplify.yml`, `customHttp.yml`, `amplify/custom-rules.json`).
2. Inline script moves to `public/assets/app.js`; pure routing logic in
   `public/assets/router.js`, unit-tested with `node --test`. This also
   allows a CSP of `script-src 'self'`.
3. Asset URLs become absolute (`/assets/...`) so deep paths load them.
4. Amplify rewrite: every non-file path → `/index.html` (200).
5. Security headers: HSTS, CSP (self + Google Fonts), `frame-ancestors
   'none'`, `X-Content-Type-Options: nosniff`, strict referrer policy.
6. Local verification with a zero-dependency Node server that applies the
   same rewrite and headers.

## Left for later

- Connecting the repo in the Amplify console (needs the user's AWS
  sign-in to authorize GitHub).
- Custom domain and DNS location; sitemap/robots once the domain is known.
- Refreshed AWS CLI credentials if deploy checks should run from here.
