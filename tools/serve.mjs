// Local preview server that behaves like the Amplify deployment: it applies the
// rewrite rule from amplify/custom-rules.json and the headers from
// customHttp.yml (written in JSON syntax, which is valid YAML). No dependencies.
//
//   node tools/serve.mjs            -> http://localhost:8090
//   PORT=3000 node tools/serve.mjs

import http from 'node:http';
import { readFileSync, createReadStream, statSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('..', import.meta.url));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

function loadRewrite() {
  const [rule] = JSON.parse(readFileSync(resolve(REPO, 'amplify/custom-rules.json'), 'utf8'));
  return { re: new RegExp(rule.source.slice(2, -2)), target: rule.target };
}

// Only the "**" pattern (every response) is mirrored. Anything else would be
// silently applied everywhere here while Amplify applies it more narrowly, so
// refuse it instead of pretending to cover it.
export function headerEntries(customHeaders) {
  return customHeaders.flatMap((block) => {
    if (block.pattern !== '**') {
      throw new Error(`customHttp.yml pattern ${JSON.stringify(block.pattern)} is not supported by the local server; use "**"`);
    }
    return block.headers.map(({ key, value }) => [key, value]);
  });
}

function loadHeaders() {
  const { customHeaders } = JSON.parse(readFileSync(resolve(REPO, 'customHttp.yml'), 'utf8'));
  return headerEntries(customHeaders);
}

function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

export function createServer(root) {
  const rootDir = resolve(root);
  const rewrite = loadRewrite();
  const headers = loadHeaders();

  return http.createServer((req, res) => {
    for (const [k, v] of headers) res.setHeader(k, v);

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400).end('Bad request');
      return;
    }

    const target = rewrite.re.test(pathname) ? rewrite.target : pathname;
    const file = resolve(rootDir, '.' + target);
    if ((file !== rootDir && !file.startsWith(rootDir + sep)) || !isFile(file)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
      return;
    }

    res.writeHead(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream' });
    if (req.method === 'HEAD') res.end();
    else createReadStream(file).pipe(res);
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 8090;
  createServer(resolve(REPO, 'public')).listen(port, () => {
    console.log(`Clio site on http://localhost:${port}`);
  });
}
