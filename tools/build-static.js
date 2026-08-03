#!/usr/bin/env node
'use strict';

/**
 * Builds the static site that GitHub Pages serves.
 *
 *   npm run build
 *
 * Renders the same EJS templates and the same lib/content.js the Node app uses,
 * writes flat HTML into docs/, and rewrites every absolute path to a relative
 * one so the site works whether it lives at
 *   https://you.github.io/microbiome-2026/   (project site, a sub-path)
 * or at
 *   https://microbiome2026.org/              (custom domain, the root).
 *
 * Registration is a Google Form, so nothing here needs a server, a database,
 * or secrets. docs/ is committed — that is what Pages publishes.
 */

const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

const ROOT = path.join(__dirname, '..');
const VIEWS = path.join(ROOT, 'views');
const PUBLIC = path.join(ROOT, 'public');
const OUT = path.join(ROOT, 'docs');

const content = require('../lib/content');

/* -------------------------------------------------------------------------- */
/* link rewriting                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Server URLs -> flat static files.
 *   /               -> index.html
 *   /register       -> register.html
 *   /#speakers      -> #speakers          (on index)   / index.html#speakers (elsewhere)
 *   /css/site.css   -> css/site.css
 *   /admin/...      -> removed (there is no admin area without a server)
 */
function toStatic(html, { onIndex }) {
  let out = html;

  // assets: /css, /js, /img, /favicon.svg  ->  drop the leading slash
  out = out.replace(/(href|src)="\/(css|js|img|favicon\.svg)/g, '$1="$2');

  // in-page anchors
  out = out.replace(/(href)="\/#([a-zA-Z0-9_-]+)"/g, (_m, attr, id) =>
    onIndex ? `${attr}="#${id}"` : `${attr}="index.html#${id}"`
  );

  // pages
  out = out.replace(/(href)="\/register"/g, '$1="register.html"');
  out = out.replace(/(href)="\/"/g, '$1="index.html"');

  return out;
}

/** Drop the organizer-login list item — there is no admin area on Pages. */
function stripAdminLinks(html) {
  return html
    .replace(/\s*<li><a href="\/admin\/login">[^<]*<\/a><\/li>/g, '')
    .replace(/\s*<a[^>]*href="\/admin[^"]*"[^>]*>.*?<\/a>/g, '');
}

function render(view, locals) {
  return ejs.renderFile(path.join(VIEWS, view), locals, { async: false });
}

/* -------------------------------------------------------------------------- */

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dst);
    else fs.copyFileSync(src, dst);
  }
}

async function build() {
  console.log('\n  Building the static site …\n');

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const base = {
    c: content,
    year: new Date().getFullYear(),
    admin: false,
    csrf: '',
    path: '/',
  };

  const pages = [
    { file: 'index.html', view: 'index.ejs', locals: {}, onIndex: true },
    { file: 'register.html', view: 'register-static.ejs', locals: {}, onIndex: false },
    {
      file: '404.html',
      view: 'message.ejs',
      onIndex: false,
      locals: {
        heading: 'Page not found',
        body: 'That page does not exist. It may have moved.',
        backHref: '/',
        backLabel: 'Back to the conference',
      },
    },
  ];

  for (const p of pages) {
    let html = await render(p.view, { ...base, ...p.locals });
    html = stripAdminLinks(html);
    html = toStatic(html, { onIndex: p.onIndex });
    fs.writeFileSync(path.join(OUT, p.file), html);
    console.log(`  ${p.file.padEnd(16)} ${(html.length / 1024).toFixed(1)} KB`);
  }

  // assets, verbatim
  for (const dir of ['css', 'js', 'img']) {
    if (fs.existsSync(path.join(PUBLIC, dir))) {
      copyDir(path.join(PUBLIC, dir), path.join(OUT, dir));
    }
  }
  fs.copyFileSync(path.join(PUBLIC, 'favicon.svg'), path.join(OUT, 'favicon.svg'));

  // js/admin.js is only for the Node app's admin area
  fs.rmSync(path.join(OUT, 'js', 'admin.js'), { force: true });

  // stop GitHub from running Jekyll over the output
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

  /* ---------------- checks ---------------- */
  console.log('');
  let problems = 0;
  const check = (ok, msg, extra) => {
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${msg}${extra ? ' — ' + extra : ''}`);
    if (!ok) problems++;
  };

  for (const p of pages) {
    const html = fs.readFileSync(path.join(OUT, p.file), 'utf8');

    const abs = [...html.matchAll(/(?:href|src)="(\/[^"]*)"/g)].map((m) => m[1]);
    check(abs.length === 0, `${p.file}: no absolute paths left`, abs.slice(0, 3).join(', '));

    check(!/<%/.test(html), `${p.file}: no unrendered template tags`);
    check(!/\/admin/.test(html), `${p.file}: no links to the admin area`);

    // every local asset it references actually exists in docs/
    const refs = [...new Set([...html.matchAll(/(?:href|src)="([^":]+\.[a-z0-9]+)(?:\?[^"]*)?"/g)].map((m) => m[1]))]
      .filter((r) => !r.startsWith('http') && !r.startsWith('mailto') && !r.endsWith('.html'));
    const missing = refs.filter((r) => !fs.existsSync(path.join(OUT, r)));
    check(missing.length === 0, `${p.file}: all ${refs.length} assets present`, missing.join(', '));
  }

  const idx = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
  check(idx.includes(content.title), 'index.html carries the conference title');
  check(
    content.speakers.every((s) => idx.includes(s.name)),
    'index.html lists every speaker'
  );
  check(
    content.committee.every((m) => idx.includes(m.name)),
    'index.html lists the whole committee'
  );

  const reg = fs.readFileSync(path.join(OUT, 'register.html'), 'utf8');
  if (content.googleForm && content.googleForm.embedUrl) {
    check(reg.includes('<iframe'), 'register.html embeds the Google Form');
    check(
      /^https:\/\/docs\.google\.com\/forms\//.test(content.googleForm.embedUrl),
      'the embed URL looks like a Google Form',
      content.googleForm.embedUrl.slice(0, 40)
    );
  } else {
    console.log('  \x1b[33m!\x1b[0m register.html shows the "not connected yet" notice —');
    console.log('    add googleForm.formUrl and googleForm.embedUrl to lib/content.js');
  }

  const bytes = (function size(dir) {
    let n = 0;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      n += e.isDirectory() ? size(p) : fs.statSync(p).size;
    }
    return n;
  })(OUT);

  console.log(`\n  docs/ is ${(bytes / 1024 / 1024).toFixed(2)} MB`);
  if (problems) {
    console.error(`\n  ${problems} problem(s) — not safe to publish.\n`);
    process.exit(1);
  }
  console.log('  Ready to publish.\n');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
