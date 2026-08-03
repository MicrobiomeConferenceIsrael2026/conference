#!/usr/bin/env node
'use strict';

/**
 * Checks the built static site the way GitHub Pages will serve it.
 *
 *   npm run smoke
 *
 * Builds docs/ fresh, serves it, and walks every page: status codes, HTML
 * well-formedness, assets, the Google Form embed, and — the one that bites
 * people — that nothing refers to an absolute path, because a project site
 * lives under https://user.github.io/repo-name/ and absolute paths break there.
 */

const { spawnSync } = require('child_process');
const http = require('http');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = process.env.TEST_PORT || '8199';

let pass = 0;
let fail = 0;
const failures = [];

function ok(name, cond, extra) {
  if (cond) {
    pass++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } else {
    fail++;
    failures.push(name + (extra ? ` — ${extra}` : ''));
    console.log(`  \x1b[31m✗\x1b[0m ${name}${extra ? ` — ${extra}` : ''}`);
  }
}

const VOID = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

function unbalanced(html) {
  const stack = [];
  const errs = [];
  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*?)(\/?)>/g;
  let m;
  while ((m = re.exec(stripped))) {
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    if (VOID.has(tag) || m[4] === '/') continue;
    if (!closing) stack.push(tag);
    else {
      if (!stack.length) { errs.push(`stray </${tag}>`); continue; }
      const top = stack.pop();
      if (top !== tag) errs.push(`</${tag}> closes <${top}>`);
    }
  }
  if (stack.length) errs.push('unclosed: ' + stack.join(', '));
  return errs;
}

function get(urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.get(
      { port: PORT, path: urlPath, agent: false, headers: { Connection: 'close' } },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (d) => (body += d));
        res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
      }
    );
    req.on('error', reject);
    req.setTimeout(10000, () => req.destroy(new Error('timed out')));
  });
}

(async function run() {
  console.log('\n  Building …');
  const build = spawnSync(process.execPath, ['tools/build-static.js'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (build.status !== 0) {
    console.error(build.stdout);
    console.error(build.stderr);
    console.error('\n  Build failed.\n');
    process.exit(1);
  }

  process.env.PREVIEW_PORT = PORT;
  const server = require('./preview');
  const content = require('../lib/content');

  await new Promise((r) => server.listen(PORT, r));
  console.log(`\n  Serving docs/ on port ${PORT}, as GitHub Pages would\n`);

  try {
    console.log('Pages');
    const idx = await get('/');
    ok('GET / → 200', idx.status === 200, `got ${idx.status}`);
    ok('index is well-formed HTML', unbalanced(idx.body).length === 0, unbalanced(idx.body).join('; '));
    ok('index has the conference title', idx.body.includes(content.title));
    ok('index lists every speaker', content.speakers.every((s) => idx.body.includes(s.name)));
    ok('index lists the whole committee', content.committee.every((m) => idx.body.includes(m.name)));
    ok('index has the program', idx.body.includes('Program'));
    ok('index has key dates', idx.body.includes('Key dates'));
    ok('no unrendered template tags', !idx.body.includes('<%'));

    const reg = await get('/register.html');
    ok('GET /register.html → 200', reg.status === 200, `got ${reg.status}`);
    ok('register is well-formed HTML', unbalanced(reg.body).length === 0, unbalanced(reg.body).join('; '));

    const notFound = await get('/no-such-page');
    ok('unknown URL → the 404 page', notFound.status === 404 && /not found/i.test(notFound.body));

    console.log('\nRegistration form');
    if (content.googleForm && content.googleForm.embedUrl) {
      ok('the Google Form is embedded', /<iframe[^>]+docs\.google\.com\/forms/.test(reg.body));
      ok('there is an "open in a new tab" fallback', /target="_blank"/.test(reg.body));
      ok(
        'the embed URL carries ?embedded=true',
        content.googleForm.embedUrl.includes('embedded=true'),
        content.googleForm.embedUrl
      );
      ok(
        'formUrl and embedUrl point at the same form',
        content.googleForm.embedUrl.startsWith(content.googleForm.formUrl.split('?')[0]),
        'they look like different forms'
      );
    } else {
      ok('the "not connected yet" notice is shown', /not connected yet/i.test(reg.body));
      console.log('  \x1b[33m!\x1b[0m No Google Form configured — add it to lib/content.js');
    }

    console.log('\nAssets');
    for (const asset of [
      '/css/site.css', '/js/site.js', '/favicon.svg',
      '/img/hero-microbiome.jpg', '/img/biofilm.jpg', '/img/speaker-korem.jpg',
    ]) {
      const r = await get(asset);
      ok(`${asset}`, r.status === 200, `got ${r.status}`);
    }

    console.log('\nGitHub Pages specifics');
    for (const [name, html] of [['index', idx.body], ['register', reg.body], ['404', notFound.body]]) {
      const abs = [...html.matchAll(/(?:href|src)="(\/[^"]*)"/g)].map((m) => m[1]);
      ok(
        `${name}: no absolute paths (would break under /repo-name/)`,
        abs.length === 0,
        abs.slice(0, 3).join(', ')
      );
    }
    /* The phone-gutter bug: .wrap supplies the side padding, but a second class
     * on the same element using the `padding` shorthand resets padding-inline
     * to 0 and the text ends up flush against the screen edge. Easy to miss on
     * a desktop browser, obvious and ugly on a phone. */
    {
      const fs2 = require('fs');
      const css = fs2.readFileSync(path.join(ROOT, 'public', 'css', 'site.css'), 'utf8');
      const offenders = [];
      for (const [name, html] of [['index', idx.body], ['register', reg.body]]) {
        for (const m of html.matchAll(/class="([^"]*\bwrap(?:-narrow)?\b[^"]*)"/g)) {
          for (const cls of m[1].split(/\s+/)) {
            if (!cls || cls === 'wrap' || cls === 'wrap-narrow') continue;
            const rule = new RegExp(`\\.${cls.replace(/[-_]/g, '[-_]')}\\s*\\{([^}]*)\\}`, 'g');
            let r;
            while ((r = rule.exec(css))) {
              if (/(^|;)\s*padding\s*:/.test(r[1])) offenders.push(`${name}: .${cls}`);
            }
          }
        }
      }
      ok(
        'no class alongside .wrap resets the side padding',
        offenders.length === 0,
        [...new Set(offenders)].join(', ') + ' — use padding-block, not padding'
      );
    }

    ok('nav points at register.html', /href="register\.html"/.test(idx.body));
    ok('register links back to index sections', /href="index\.html#speakers"/.test(reg.body));
    ok('no admin area is published', !/\/admin/.test(idx.body + reg.body));
    ok('admin.js is not published', (await get('/js/admin.js')).status === 404);
    ok('.nojekyll exists', require('fs').existsSync(path.join(ROOT, 'docs', '.nojekyll')));
  } catch (err) {
    fail++;
    failures.push('threw: ' + err.stack);
    console.error('\n', err);
  } finally {
    server.close();
  }

  console.log(`\n${'-'.repeat(60)}`);
  console.log(`  ${pass} passed, ${fail} failed`);
  if (failures.length) {
    console.log('\n  Failures:');
    failures.forEach((f) => console.log('   · ' + f));
  }
  console.log(`${'-'.repeat(60)}\n`);
  process.exit(fail ? 1 : 0);
})();
