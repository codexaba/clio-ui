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

Requires Node 22 or newer (for `npm test`; the site itself needs no Node).

```sh
npm run serve     # http://localhost:8090
npm test
```

## Deploy on AWS Amplify

Every push to `main` redeploys the site once the app is connected.

### First-time setup (AWS console)

1. Open **AWS Amplify** → **Create new app** → **GitHub**, and authorize
   Amplify for the `codexaba` organization when GitHub asks.
2. Pick repository **codexaba/clio-ui**, branch **main**.
3. On the build settings screen Amplify should detect `amplify.yml`
   (publishes `public/`, no build). Leave the framework as "None".
4. Save and deploy. The first build gives you a `https://main.<id>.amplifyapp.com` address.
5. **Hosting → Rewrites and redirects → Manage → JSON**: paste the contents of
   `amplify/custom-rules.json` and save. Without this rule, reloading
   `/security` returns a 404.

   Or from the command line, with working AWS credentials:

   ```sh
   aws amplify update-app --app-id <app-id> --custom-rules file://amplify/custom-rules.json
   ```

6. **Hosting → Custom domains → Add domain** to point your domain at the app.
   Amplify issues the HTTPS certificate. If DNS is in Route 53 it configures
   the records for you; otherwise it shows the CNAME records to add at your
   DNS provider.

### Headers

`customHttp.yml` at the repo root is read on every build and adds the security
headers (HSTS, Content-Security-Policy, no framing, nosniff, referrer policy).
It is written in JSON syntax, which is valid YAML, so the local server and the
tests can read the same file. If you ever add a third-party script, image host
or font, add its origin to the Content-Security-Policy or the browser will
block it.

### After deploying, check

- `https://<your-domain>/security` loads directly and after a reload.
- `https://<your-domain>/#/faq` ends up at `/faq`.
- Security headers are on both the root and a rewritten page:

  ```sh
  curl -sI https://<your-domain>/ | grep -i content-security-policy
  curl -sI https://<your-domain>/security | grep -i content-security-policy
  ```
