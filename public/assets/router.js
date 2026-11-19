// Pure routing logic for the Clio single-page site. No DOM access here, so it
// can be unit-tested with `node --test` and reused by app.js.

export const VIEWS = ['home', 'how', 'checks', 'score', 'control', 'security', 'who', 'faq', 'contact'];

const HOME_META = {
  title: 'Clio — The AI reads. Your rules decide.',
  description: "Clio reviews every ABA session note against the session's own data and your agency's rules, scores it, and sorts it. Only notes that pass everything are approvable. The rest go to a person.",
};

// Titles follow the page's own section names; descriptions reuse each
// section's lead copy, kept to 160 characters for search snippets.
const META = {
  home: HOME_META,
  how: {
    title: 'How it runs — Clio',
    description: 'Seven steps, the same for every note. A note leaves the path at the first step it does not pass, and lands in a group a person can work.',
  },
  checks: {
    title: 'The ten checks — Clio',
    description: 'All ten checks run on every note, always in the same order. The first one that fails decides the group; the others are still shown on the note.',
  },
  score: {
    title: 'Score and groups — Clio',
    description: 'Every note starts at 100 and loses points for specific, named reasons. It is approvable only if it reaches your threshold and failed no check.',
  },
  control: {
    title: 'Control — Clio',
    description: 'Clio is built so that the cautious option is always the default, and so that a person can step in at every point.',
  },
  security: {
    title: 'Privacy and security — Clio',
    description: 'Clio was designed for HIPAA-regulated work. Its privacy and security commitments are contract terms, not marketing.',
  },
  who: {
    title: 'Who it is for — Clio',
    description: 'For the people who answer for the notes: ABA provider agencies and clinical QA teams. The interface is available in Spanish and English.',
  },
  faq: {
    title: 'Questions — Clio',
    description: 'What agencies ask first: whether the AI decides if a note passes, whether Clio changes anything in your portal, and what happens when the AI fails.',
  },
  contact: {
    title: 'Request a demo — Clio',
    description: 'The clearest demo is a dry-run on your own documentation. Tell us about your agency and we will walk you through one, start to finish.',
  },
};

const isView = (v) => VIEWS.includes(v);

export function pathFor(view) {
  return view === 'home' ? '/' : `/${view}`;
}

// Old links used "#/view". Returns the view named by such a hash, '' for "#/"
// or "#", or null when the hash is an ordinary in-page anchor.
function viewFromHash(hash) {
  if (!hash || hash === '#') return null;
  const m = /^#\/(.*)$/.exec(hash);
  return m ? m[1] : null;
}

export function parseLocation(pathname, hash) {
  const fromHash = viewFromHash(hash);
  if (fromHash !== null) {
    const v = fromHash.replace(/\/+$/, '').toLowerCase() || 'home';
    const view = isView(v) ? v : 'home';
    return { view, redirect: pathFor(view) };
  }
  let p = (pathname || '/').replace(/\/+$/, '').toLowerCase();
  if (p === '' || p === '/index.html') p = '/';
  const v = p === '/' ? 'home' : p.slice(1);
  const view = isView(v) ? v : 'home';
  const canonical = pathFor(view);
  return { view, redirect: pathname === canonical ? null : canonical };
}

export function routeFromHref(href, origin) {
  if (!href) return null;
  if (href.startsWith('#') && !href.startsWith('#/')) return null; // in-page anchor
  let url;
  try {
    url = new URL(href, origin + '/');
  } catch {
    return null;
  }
  if (url.origin !== origin) return null;
  const hashView = viewFromHash(url.hash);
  if (hashView !== null) {
    const v = hashView || 'home';
    return isView(v) ? v : null;
  }
  const v = url.pathname === '/' ? 'home' : url.pathname.slice(1);
  return isView(v) ? v : null;
}

export function metaFor(view) {
  return META[view] || HOME_META;
}
