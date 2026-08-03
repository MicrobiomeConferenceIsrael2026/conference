#!/usr/bin/env node
'use strict';

/**
 * End-to-end check: starts the server on a spare port and walks through every
 * page and both registration paths, then verifies that what landed on disk is
 * actually encrypted and that the admin area is closed to strangers.
 *
 *   npm run smoke
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

process.env.PORT = process.env.SMOKE_PORT || '3999';
process.env.DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data-smoke');

// start from a clean database — do this BEFORE the app opens it
fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true });

const app = require('../server');
const config = require('../lib/config');
const store = require('../lib/db');

const BASE = `http://127.0.0.1:${config.port}`;
let pass = 0;
let fail = 0;
const failures = [];

function ok(name, cond, extra) {
  if (cond) {
    pass++;
    console.log(`  [32m✓[0m ${name}`);
  } else {
    fail++;
    failures.push(name + (extra ? ` — ${extra}` : ''));
    console.log(`  [31m✗[0m ${name}${extra ? ` — ${extra}` : ''}`);
  }
}

function rawRequest(method, url, { body, cookies = [] } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url, BASE);
    const data = body ? new URLSearchParams(body).toString() : null;
    const req = http.request(
      {
        method,
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        // One fresh socket per request. Node keeps sockets alive by default,
        // which races with the server closing idle ones and shows up as a
        // spurious ECONNRESET — a test artefact, not a fault in the site.
        agent: false,
        headers: Object.assign(
          { 'User-Agent': 'smoke-test', Connection: 'close' },
          cookies.length ? { Cookie: cookies.join('; ') } : {},
          data
            ? {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(data),
              }
            : {}
        ),
      },
      (res) => {
        let chunks = '';
        res.setEncoding('utf8');
        res.on('data', (d) => (chunks += d));
        res.on('end', () => {
          const setCookie = res.headers['set-cookie'] || [];
          const jar = setCookie.map((c) => c.split(';')[0]);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: chunks,
            cookies: jar.length ? jar : cookies,
          });
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('request timed out')));
    if (data) req.write(data);
    req.end();
  });
}

const TRANSIENT = new Set(['ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'EAGAIN']);

/**
 * Same as rawRequest, but retries transient socket errors.
 * Only GET/HEAD are retried — replaying a POST could register someone twice.
 */
async function request(method, url, options = {}) {
  const safe = method === 'GET' || method === 'HEAD';
  const attempts = safe ? 3 : 1;
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await rawRequest(method, url, options);
    } catch (err) {
      lastErr = err;
      if (!safe || !TRANSIENT.has(err.code)) throw err;
      await new Promise((r) => setTimeout(r, 60 * (i + 1)));
    }
  }
  throw lastErr;
}

function csrfFrom(html) {
  const m = html.match(/name="_csrf" value="([^"]+)"/);
  return m ? m[1] : null;
}

(async function run() {
  const server = app.listen(config.port);

  // If the server itself ever errors, say so plainly rather than letting it
  // surface as an unexplained socket reset on the client side.
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `\n  Port ${config.port} is already in use — is the site already running?\n` +
          `  Stop it, or run:  SMOKE_PORT=4123 npm run smoke\n`
      );
      process.exit(1);
    }
    console.error('\n  Server error:', err);
  });
  server.on('clientError', (err, socket) => {
    console.error('  client error:', err.code || err.message);
    if (!socket.destroyed) socket.destroy();
  });
  process.on('uncaughtException', (err) => {
    console.error('\n  Uncaught exception in the server:\n', err);
    process.exit(1);
  });

  await new Promise((r) => server.once('listening', r));
  console.log(`\nSmoke test against ${BASE}  (node ${process.version})\n`);

  try {
    /* ---------------- database driver conformance ----------------
     * These run against whichever SQLite driver is actually installed on this
     * machine. The two drivers have subtly different calling conventions, and
     * a mistake in the adapter shows up far away — as sessions silently
     * failing to save, which looks like random 403s. Catch it here instead. */
    console.log(`Database driver: ${store.driver}`);
    {
      const tmp = path.join(process.env.DATA_DIR, 'driver-check.db');
      fs.rmSync(tmp, { force: true });
      const probe = require('../lib/sqlite').open(tmp);
      probe.exec('CREATE TABLE t (a TEXT, b TEXT, c INTEGER)');

      const three = probe.prepare('INSERT INTO t (a, b, c) VALUES (?, ?, ?)');
      let info;
      try {
        info = three.run('one', 'two', 3);
        ok('run() accepts multiple positional parameters', true);
      } catch (err) {
        ok('run() accepts multiple positional parameters', false, err.message);
        info = { changes: 0, lastInsertRowid: 0 };
      }
      ok('run() reports changes as a number', info.changes === 1, `got ${info.changes}`);
      ok(
        'run() reports lastInsertRowid as a number',
        typeof info.lastInsertRowid === 'number' && info.lastInsertRowid > 0,
        `got ${typeof info.lastInsertRowid} ${info.lastInsertRowid}`
      );

      const named = probe.prepare('INSERT INTO t (a, b, c) VALUES (@a, @b, @c)');
      try {
        named.run({ a: 'x', b: null, c: 9 });
        ok('run() accepts a named-parameter object (including nulls)', true);
      } catch (err) {
        ok('run() accepts a named-parameter object (including nulls)', false, err.message);
      }

      const row = probe.prepare('SELECT * FROM t WHERE a = ? AND c = ?').get('one', 3);
      ok('get() accepts multiple positional parameters', row && row.b === 'two');
      const rows = probe.prepare('SELECT * FROM t ORDER BY rowid LIMIT ?').all(5);
      ok('all() binds parameters and returns every row', rows.length === 2, `got ${rows.length}`);

      const upd = probe.prepare('UPDATE t SET b = ? WHERE a = ?').run('changed', 'one');
      ok('run() binds UPDATE parameters in order', upd.changes === 1, `changed ${upd.changes}`);
      ok(
        'the UPDATE actually landed',
        probe.prepare('SELECT b FROM t WHERE a = ?').get('one').b === 'changed'
      );
      probe.close();
      fs.rmSync(tmp, { force: true });
    }

    /* ---------------- session persistence ----------------
     * The failure mode this guards against: a session that cannot be written
     * means every POST looks like a forged CSRF token. */
    console.log('\nSessions');
    {
      const a = await request('GET', '/register');
      const jar0 = a.cookies;
      ok('a session cookie is issued', jar0.length > 0 && jar0.join(';').includes('mb26.sid'));
      const tok0 = csrfFrom(a.body);
      const b = await request('GET', '/register', { cookies: jar0 });
      ok('the session survives a second request', csrfFrom(b.body) === tok0,
        'CSRF token changed between requests — sessions are not persisting');
    }

    /* ---------------- public pages ---------------- */
    console.log('\nPublic pages');
    const home = await request('GET', '/');
    ok('GET /  →  200', home.status === 200, `got ${home.status}`);
    ok('home shows the conference title', home.body.includes('Microbiome'));
    ok('home lists all three speakers',
      ['Tal Korem', 'Jotham Suez', 'Inga Peter'].every((n) => home.body.includes(n)));
    ok('home shows the venue', home.body.includes('Azrieli Faculty of Medicine'));
    ok('home has a program', home.body.includes('Program'));
    ok('home has key dates', home.body.includes('Key dates'));
    ok('home has the committee', home.body.includes('Omry Koren') && home.body.includes('David Zeevi'));
    ok('no unrendered EJS left in the page', !home.body.includes('<%'));

    for (const asset of ['/css/site.css', '/js/site.js', '/favicon.svg',
      '/img/hero-microbiome.jpg', '/img/biofilm.jpg', '/img/culture-plate.jpg',
      '/img/computational.jpg', '/img/speaker-korem.jpg']) {
      const r = await request('GET', asset);
      ok(`asset ${asset}`, r.status === 200, `got ${r.status}`);
    }

    const missing = await request('GET', '/does-not-exist');
    ok('unknown URL → 404 page, not a crash', missing.status === 404 && missing.body.includes('not found'));

    /* ---------------- registration WITH abstract ---------------- */
    console.log('\nRegistration — with abstract');
    let r = await request('GET', '/register');
    ok('GET /register → 200', r.status === 200);
    let jar = r.cookies;
    let token = csrfFrom(r.body);
    ok('step 1 carries a CSRF token', Boolean(token));

    r = await request('POST', '/register', {
      cookies: jar,
      body: { _csrf: token, abstract_choice: 'yes' },
    });
    ok('step 1 redirects to step 2', r.status === 302 && r.headers.location === '/register/details');

    r = await request('GET', '/register/details', { cookies: jar });
    ok('step 2 → 200', r.status === 200);
    ok('step 2 shows the abstract fields', r.body.includes('Abstract text'));
    token = csrfFrom(r.body);

    const abstractText =
      'We followed the gut microbiome of 212 infants through the first two years of life ' +
      'using deep shotgun metagenomics, and paired the sequencing with anaerobic culturing ' +
      'of a subset of samples. Strain-resolved analysis shows that maternally transmitted ' +
      'Bacteroides lineages persist far longer than lineages acquired from the environment, ' +
      'and that antibiotic exposure in the first year selectively removes the persistent ' +
      'lineages while leaving transient ones intact. A simple growth-rate model fitted to ' +
      'coverage patterns predicts which strains will be lost, and we validate the prediction ' +
      'in gnotobiotic mice colonized with a defined community.';

    r = await request('POST', '/register/details', {
      cookies: jar,
      body: {
        _csrf: token,
        full_name: 'Dana Cohen',
        email: 'dana.cohen@example.ac.il',
        affiliation: 'Bar-Ilan University',
        role: 'PhD student',
        country: 'Israel',
        abstract_type: 'talk',
        abstract_title: 'Strain-level persistence in the infant gut microbiome',
        abstract_authors: 'D. Cohen, A. Levi, O. Koren',
        abstract_body: abstractText,
        dietary: 'Vegetarian',
        notes: '',
        consent_updates: '1',
      },
    });
    ok('submitting the form redirects to the confirmation', r.status === 302 && r.headers.location === '/register/done');

    r = await request('GET', '/register/done', { cookies: jar });
    ok('confirmation page → 200', r.status === 200);
    ok('confirmation shows a reference number', /MB26-[A-Z0-9]+/.test(r.body));
    ok('confirmation acknowledges the abstract', /under review/i.test(r.body));

    /* ---------------- registration WITHOUT abstract ---------------- */
    console.log('\nRegistration — attendee only');
    r = await request('GET', '/register');
    jar = r.cookies;
    token = csrfFrom(r.body);
    r = await request('POST', '/register', { cookies: jar, body: { _csrf: token, abstract_choice: 'no' } });
    ok('step 1 (no abstract) redirects', r.status === 302);
    r = await request('GET', '/register/details', { cookies: jar });
    ok('step 2 hides the abstract fields', !r.body.includes('Abstract text'));
    token = csrfFrom(r.body);
    r = await request('POST', '/register/details', {
      cookies: jar,
      body: {
        _csrf: token,
        full_name: 'Yossi Bar',
        email: 'yossi.bar@example.com',
        affiliation: 'Weizmann Institute of Science',
        role: 'Postdoctoral researcher',
      },
    });
    ok('attendee-only registration succeeds', r.status === 302 && r.headers.location === '/register/done');

    /* ---------------- validation ---------------- */
    console.log('\nValidation');
    r = await request('GET', '/register');
    jar = r.cookies;
    token = csrfFrom(r.body);
    await request('POST', '/register', { cookies: jar, body: { _csrf: token, abstract_choice: 'no' } });
    r = await request('GET', '/register/details', { cookies: jar });
    token = csrfFrom(r.body);
    r = await request('POST', '/register/details', {
      cookies: jar,
      body: { _csrf: token, full_name: 'X', email: 'not-an-email', affiliation: '', role: '' },
    });
    ok('bad input is rejected with 422', r.status === 422, `got ${r.status}`);
    ok('the email error is shown', r.body.includes('valid email'));
    ok('the form is redisplayed, not lost', r.body.includes('name="full_name"'));

    r = await request('GET', '/register/details', { cookies: jar });
    token = csrfFrom(r.body);
    r = await request('POST', '/register/details', {
      cookies: jar,
      body: {
        _csrf: token,
        full_name: 'Duplicate Person',
        email: 'dana.cohen@example.ac.il',
        affiliation: 'Somewhere',
        role: 'Faculty member / PI',
      },
    });
    ok('duplicate email is refused', r.status === 422 && r.body.includes('already registered'));

    r = await request('POST', '/register/details', {
      cookies: jar,
      body: { _csrf: 'forged-token', full_name: 'Bad Actor', email: 'b@c.de', affiliation: 'X', role: 'Other' },
    });
    ok('a forged CSRF token is refused', r.status === 403);

    /* ---------------- encryption at rest ---------------- */
    console.log('\nEncryption at rest');
    const dbFile = path.join(process.env.DATA_DIR, 'registrations.db');
    const walFile = dbFile + '-wal';
    const raw =
      fs.readFileSync(dbFile).toString('binary') +
      (fs.existsSync(walFile) ? fs.readFileSync(walFile).toString('binary') : '');
    ok('the database file exists', fs.existsSync(dbFile));
    ok('participant name is NOT readable in the raw file', !raw.includes('Dana Cohen'));
    ok('email is NOT readable in the raw file', !raw.includes('dana.cohen@example.ac.il'));
    ok('affiliation is NOT readable in the raw file', !raw.includes('Bar-Ilan University'));
    ok('abstract text is NOT readable in the raw file', !raw.includes('gnotobiotic mice'));
    const mode = fs.statSync(dbFile).mode & 0o777;
    ok(`database file permissions are owner-only (${mode.toString(8)})`, mode === 0o600, `got ${mode.toString(8)}`);

    const all = store.listRegistrations();
    ok('two registrations are stored', all.length === 2, `got ${all.length}`);
    ok('decryption round-trips the name', all.some((x) => x.full_name === 'Dana Cohen'));
    ok('decryption round-trips the abstract', all.some((x) => x.abstract_body.includes('gnotobiotic mice')));

    /* ---------------- confirmation email ---------------- */
    console.log('\nConfirmation email');
    const outbox = path.join(process.env.DATA_DIR, 'outbox');
    if (config.smtp.enabled) {
      ok('SMTP configured — mail marked sent', all.every((x) => x.mail_status === 'sent'));
    } else {
      const files = fs.existsSync(outbox) ? fs.readdirSync(outbox) : [];
      ok('confirmations were produced (SMTP off → written to data/outbox)', files.length === 2, `${files.length} files`);
      if (files.length) {
        const eml = fs.readFileSync(path.join(outbox, files[0]), 'utf8');
        ok('the email contains the reference number', /MB26-[A-Z0-9]+/.test(eml));
        ok('the email contains the venue', eml.includes('Azrieli'));
      }
    }

    /* ---------------- admin security ---------------- */
    console.log('\nAdmin area');
    r = await request('GET', '/admin');
    ok('/admin is closed to strangers', r.status === 302 && r.headers.location === '/admin/login');
    r = await request('GET', '/admin/export.csv');
    ok('CSV export is closed to strangers', r.status === 302);
    r = await request('GET', '/admin/registration/1');
    ok('registration detail is closed to strangers', r.status === 302);

    r = await request('GET', '/admin/login');
    ok('login page → 200', r.status === 200);
    let adminJar = r.cookies;
    token = csrfFrom(r.body);

    r = await request('POST', '/admin/login', {
      cookies: adminJar,
      body: { _csrf: token, username: config.admin.user, password: 'definitely-wrong' },
    });
    ok('wrong password is rejected (401)', r.status === 401, `got ${r.status}`);

    const adminPassword = process.env.SMOKE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
    if (adminPassword) {
      r = await request('GET', '/admin/login');
      adminJar = r.cookies;
      token = csrfFrom(r.body);
      r = await request('POST', '/admin/login', {
        cookies: adminJar,
        body: { _csrf: token, username: config.admin.user, password: adminPassword },
      });
      ok('correct password signs in', r.status === 302 && r.headers.location === '/admin');
      adminJar = r.cookies;

      r = await request('GET', '/admin', { cookies: adminJar });
      ok('dashboard → 200', r.status === 200);
      ok('dashboard lists the registrants', r.body.includes('Dana Cohen') && r.body.includes('Yossi Bar'));
      ok('dashboard shows the counts', r.body.includes('Registered'));

      r = await request('GET', '/admin/export.csv', { cookies: adminJar });
      ok('CSV export works', r.status === 200 && r.body.includes('dana.cohen@example.ac.il'));
      ok('CSV is sent as an attachment', String(r.headers['content-disposition']).includes('attachment'));

      r = await request('GET', '/admin/abstracts.txt', { cookies: adminJar });
      ok('abstract export works', r.status === 200 && r.body.includes('gnotobiotic mice'));

      r = await request('GET', '/admin/registration/1', { cookies: adminJar });
      ok('registration detail page works', r.status === 200);
      ok('detail page has no unrendered EJS', !r.body.includes('<%'));
    } else {
      console.log('  · skipping signed-in checks (set SMOKE_ADMIN_PASSWORD to enable)');
    }

    /* ---------------- headers ---------------- */
    console.log('\nSecurity headers');
    const h = (await request('GET', '/')).headers;
    ok('Content-Security-Policy is set', Boolean(h['content-security-policy']));
    ok('X-Content-Type-Options: nosniff', h['x-content-type-options'] === 'nosniff');
    ok('X-Frame-Options / frame-ancestors none',
      String(h['content-security-policy']).includes("frame-ancestors 'none'"));
    ok('server does not advertise Express', !h['x-powered-by']);
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
