'use strict';

const crypto = require('crypto');
const path = require('path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');

const config = require('./lib/config');
const content = require('./lib/content');
const store = require('./lib/db');
const SqliteSessionStore = require('./lib/session-store');
const { safeEqual, randomToken } = require('./lib/crypto');
const { sendConfirmation } = require('./lib/mailer');

const app = express();
app.disable('x-powered-by');
if (config.trustProxy) app.set('trust proxy', 1);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/* -------------------------------------------------------------------------- */
/* security middleware                                                        */
/* -------------------------------------------------------------------------- */

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        upgradeInsecureRequests: config.isProd ? [] : null,
      },
    },
    hsts: config.isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
    referrerPolicy: { policy: 'same-origin' },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: config.isProd ? '7d' : 0,
    etag: true,
  })
);

app.use(express.urlencoded({ extended: false, limit: '128kb' }));

if (!config.sessionSecret || config.sessionSecret.length < 24) {
  throw new Error(
    'SESSION_SECRET is missing or too short. Run `npm run init-secrets` to create a .env.'
  );
}

app.use(
  session({
    name: 'mb26.sid',
    store: new SqliteSessionStore(store.db, { ttlMs: 1000 * 60 * 60 * 2 }),
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: true,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.isProd,
      maxAge: 1000 * 60 * 60 * 2, // 2 hours
    },
  })
);

/* --- CSRF (double-submit token held in the session) ----------------------- */
app.use((req, res, next) => {
  if (!req.session.csrf) req.session.csrf = randomToken(24);
  res.locals.csrf = req.session.csrf;
  next();
});

function checkCsrf(req, res, next) {
  const sent = req.body && req.body._csrf;
  if (!sent || !req.session.csrf || !safeEqual(sent, req.session.csrf)) {
    return res.status(403).render('message', {
      c: content,
      admin: false,
      heading: 'Session expired',
      body: 'Your session timed out or the form was opened in another tab. Please go back and try again.',
      backHref: '/register',
      backLabel: 'Restart registration',
    });
  }
  next();
}

/* --- template locals ------------------------------------------------------ */
app.use((req, res, next) => {
  res.locals.c = content;
  res.locals.path = req.path;
  res.locals.admin = Boolean(req.session.admin);
  res.locals.year = new Date().getFullYear();
  next();
});

/* --- rate limits ---------------------------------------------------------- */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts. Try again in 15 minutes.',
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 25,
  standardHeaders: true,
  legacyHeaders: false,
});

/* -------------------------------------------------------------------------- */
/* validation helpers                                                         */
/* -------------------------------------------------------------------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

function clean(v, max) {
  return String(v == null ? '' : v)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);
}

function wordCount(s) {
  const t = String(s || '').trim();
  return t ? t.split(/\s+/).length : 0;
}

function validateDetails(body, wantsAbstract) {
  const errors = {};
  const d = {
    full_name: clean(body.full_name, 120),
    email: clean(body.email, 160),
    affiliation: clean(body.affiliation, 160),
    role: clean(body.role, 60),
    country: clean(body.country, 60),
    dietary: clean(body.dietary, 300),
    notes: clean(body.notes, 600),
    consent_updates: body.consent_updates ? 1 : 0,
    submits_abstract: wantsAbstract ? 1 : 0,
    abstract_type: '',
    abstract_title: '',
    abstract_authors: '',
    abstract_body: '',
  };

  if (d.full_name.length < 2) errors.full_name = 'Please enter your full name.';
  if (!EMAIL_RE.test(d.email)) errors.email = 'Please enter a valid email address.';
  if (d.affiliation.length < 2) errors.affiliation = 'Please enter your institution or company.';
  if (!content.roles.includes(d.role)) errors.role = 'Please choose your role.';

  if (!errors.email && store.emailExists(d.email)) {
    errors.email = 'This address is already registered. Write to us if you need to change anything.';
  }

  if (wantsAbstract) {
    d.abstract_type = body.abstract_type === 'talk' ? 'talk' : 'poster';
    d.abstract_title = clean(body.abstract_title, 250);
    d.abstract_authors = clean(body.abstract_authors, 400);
    d.abstract_body = clean(body.abstract_body, 4000);
    if (d.abstract_title.length < 5) errors.abstract_title = 'Please enter the abstract title.';
    if (d.abstract_authors.length < 3)
      errors.abstract_authors = 'Please list the authors, presenting author first.';
    if (wordCount(d.abstract_body) < 40)
      errors.abstract_body = 'The abstract looks very short — please write at least 40 words.';
    if (wordCount(d.abstract_body) > 300)
      errors.abstract_body = 'The abstract is over the 300-word limit.';
  }

  return { data: d, errors };
}

/* -------------------------------------------------------------------------- */
/* public routes                                                              */
/* -------------------------------------------------------------------------- */

app.get('/', (req, res) => res.render('index'));

/* --- registration step 1: abstract yes/no --------------------------------- */
app.get('/register', (req, res) => {
  res.render('register-step1', {
    selected: req.session.reg ? req.session.reg.wantsAbstract : null,
  });
});

app.post('/register', registerLimiter, checkCsrf, (req, res) => {
  const choice = req.body.abstract_choice;
  if (choice !== 'yes' && choice !== 'no') {
    return res.status(400).render('register-step1', {
      selected: null,
      error: 'Please choose whether you would like to submit an abstract.',
    });
  }
  req.session.reg = { wantsAbstract: choice === 'yes', startedAt: Date.now() };
  res.redirect('/register/details');
});

/* --- registration step 2: details (+ abstract) ---------------------------- */
app.get('/register/details', (req, res) => {
  if (!req.session.reg) return res.redirect('/register');
  res.render('register-step2', {
    wantsAbstract: req.session.reg.wantsAbstract,
    values: req.session.regDraft || {},
    errors: {},
  });
});

app.post('/register/details', registerLimiter, checkCsrf, async (req, res, next) => {
  if (!req.session.reg) return res.redirect('/register');
  const wantsAbstract = req.session.reg.wantsAbstract;

  // Honeypot: bots fill everything, humans never see this field.
  if (clean(req.body.website, 100)) return res.redirect('/register/done');

  const { data, errors } = validateDetails(req.body, wantsAbstract);

  if (Object.keys(errors).length) {
    req.session.regDraft = { ...data, email: data.email };
    return res.status(422).render('register-step2', { wantsAbstract, values: data, errors });
  }

  try {
    const { id, ref } = store.createRegistration(data);
    const saved = store.getRegistration(id);
    delete req.session.regDraft;
    req.session.reg = null;
    req.session.lastRef = ref;
    req.session.lastAbstract = wantsAbstract;

    try {
      const result = await sendConfirmation(saved);
      store.setMailStatus(id, result.mode === 'smtp' ? 'sent' : 'queued-file');
    } catch (mailErr) {
      console.error('[mail] confirmation failed:', mailErr.message);
      store.setMailStatus(id, `failed: ${mailErr.message.slice(0, 120)}`);
    }

    res.redirect('/register/done');
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(422).render('register-step2', {
        wantsAbstract,
        values: data,
        errors: { email: 'This address is already registered.' },
      });
    }
    next(err);
  }
});

app.get('/register/done', (req, res) => {
  res.render('register-done', {
    ref: req.session.lastRef || null,
    withAbstract: Boolean(req.session.lastAbstract),
  });
});

/* -------------------------------------------------------------------------- */
/* admin                                                                      */
/* -------------------------------------------------------------------------- */

let ADMIN_HASH = config.admin.passwordHash;
if (!ADMIN_HASH) {
  if (!config.admin.password) {
    throw new Error(
      'No admin credentials. Set ADMIN_PASSWORD (or ADMIN_PASSWORD_HASH) in .env — see README.'
    );
  }
  ADMIN_HASH = bcrypt.hashSync(config.admin.password, 12);
}

function ipHash(req) {
  return crypto
    .createHash('sha256')
    .update(String(req.ip || '') + config.sessionSecret)
    .digest('hex')
    .slice(0, 16);
}

function requireAdmin(req, res, next) {
  if (req.session.admin) return next();
  req.session.returnTo = req.originalUrl;
  return res.redirect('/admin/login');
}

function noStore(req, res, next) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  next();
}

app.get('/admin/login', noStore, (req, res) => {
  res.render('admin-login', { error: null, layout: false });
});

app.post('/admin/login', loginLimiter, checkCsrf, noStore, (req, res) => {
  const user = clean(req.body.username, 80);
  const pass = String(req.body.password || '');

  const userOk = safeEqual(user.toLowerCase(), config.admin.user.toLowerCase());
  const passOk = bcrypt.compareSync(pass, ADMIN_HASH);

  if (!userOk || !passOk) {
    store.audit(user || '(blank)', 'login-failed', null, ipHash(req));
    return res.status(401).render('admin-login', {
      error: 'Incorrect username or password.',
      layout: false,
    });
  }

  req.session.regenerate((err) => {
    if (err) {
      return res.status(500).render('admin-login', {
        error: 'Could not start a session. Try again.',
        layout: false,
      });
    }
    req.session.admin = { user: config.admin.user, at: Date.now() };
    req.session.csrf = randomToken(24);
    store.audit(config.admin.user, 'login-ok', null, ipHash(req));
    res.redirect('/admin');
  });
});

app.post('/admin/logout', requireAdmin, checkCsrf, (req, res) => {
  const who = req.session.admin.user;
  req.session.destroy(() => {
    store.audit(who, 'logout', null, null);
    res.redirect('/admin/login');
  });
});

app.get('/admin', requireAdmin, noStore, (req, res) => {
  const q = clean(req.query.q, 80).toLowerCase();
  const filter = clean(req.query.filter, 20);
  let rows = store.listRegistrations();

  if (filter === 'abstracts') rows = rows.filter((r) => r.submits_abstract);
  if (filter === 'talks') rows = rows.filter((r) => r.abstract_type === 'talk');
  if (filter === 'posters') rows = rows.filter((r) => r.abstract_type === 'poster');
  if (q) {
    rows = rows.filter((r) =>
      [r.full_name, r.email, r.affiliation, r.abstract_title, r.ref]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }

  res.render('admin-dashboard', {
    rows,
    stats: store.stats(),
    q,
    filter,
    audit: store.recentAudit(12),
    smtpConfigured: config.smtp.enabled,
  });
});

app.get('/admin/registration/:id', requireAdmin, noStore, (req, res) => {
  const reg = store.getRegistration(parseInt(req.params.id, 10));
  if (!reg) return res.status(404).render('message', {
    heading: 'Not found',
    body: 'That registration does not exist.',
    backHref: '/admin',
    backLabel: 'Back to dashboard',
  });
  store.audit(req.session.admin.user, 'view-registration', reg.ref, ipHash(req));
  res.render('admin-detail', { reg });
});

app.post('/admin/registration/:id/abstract', requireAdmin, checkCsrf, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const status = ['pending', 'accepted-talk', 'accepted-poster', 'rejected'].includes(
    req.body.status
  )
    ? req.body.status
    : 'pending';
  store.setAbstractStatus(id, status);
  store.audit(req.session.admin.user, 'set-abstract-status', `${id} -> ${status}`, ipHash(req));
  res.redirect(`/admin/registration/${id}`);
});

app.post('/admin/registration/:id/delete', requireAdmin, checkCsrf, (req, res) => {
  const id = parseInt(req.params.id, 10);
  store.deleteRegistration(id);
  store.audit(req.session.admin.user, 'delete-registration', String(id), ipHash(req));
  res.redirect('/admin');
});

app.get('/admin/export.csv', requireAdmin, noStore, (req, res) => {
  const rows = store.listRegistrations();
  store.audit(req.session.admin.user, 'export-csv', `${rows.length} rows`, ipHash(req));
  const cols = [
    'ref', 'created_at', 'full_name', 'email', 'affiliation', 'role', 'country',
    'dietary', 'notes', 'submits_abstract', 'abstract_type', 'abstract_status',
    'abstract_title', 'abstract_authors', 'abstract_body', 'consent_updates', 'mail_status',
  ];
  const escape = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    // Guard against spreadsheet formula injection.
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const csv = [
    cols.join(','),
    ...rows.map((r) => cols.map((c) => escape(r[c])).join(',')),
  ].join('\r\n');
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="registrations-${content.dateISO}.csv"`);
  res.send('﻿' + csv);
});

app.get('/admin/abstracts.txt', requireAdmin, noStore, (req, res) => {
  const rows = store.listRegistrations().filter((r) => r.submits_abstract);
  store.audit(req.session.admin.user, 'export-abstracts', `${rows.length}`, ipHash(req));
  const out = rows
    .map(
      (r) =>
        `${'='.repeat(76)}\n[${r.ref}] ${r.abstract_type.toUpperCase()} — ${r.abstract_status}\n` +
        `${r.abstract_title}\n${r.abstract_authors}\n(${r.full_name}, ${r.affiliation})\n\n${r.abstract_body}\n`
    )
    .join('\n');
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.send(out || 'No abstracts submitted yet.\n');
});

/* -------------------------------------------------------------------------- */
/* health check (for Docker, Render, Fly, uptime monitors)                     */
/* -------------------------------------------------------------------------- */

app.get('/healthz', (req, res) => {
  try {
    const n = store.stats().total;
    res.json({ ok: true, registrations: n, mail: config.smtp.enabled ? 'smtp' : 'file' });
  } catch (err) {
    res.status(503).json({ ok: false, error: 'database unavailable' });
  }
});

/* -------------------------------------------------------------------------- */
/* errors                                                                     */
/* -------------------------------------------------------------------------- */

app.use((req, res) => {
  res.status(404).render('message', {
    heading: 'Page not found',
    body: 'That page does not exist. It may have moved.',
    backHref: '/',
    backLabel: 'Back to the conference',
  });
});

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).render('message', {
    heading: 'Something went wrong',
    body: 'We hit an unexpected error. Nothing was lost — please try again, and tell us if it keeps happening.',
    backHref: '/',
    backLabel: 'Back to the conference',
  });
});

/* -------------------------------------------------------------------------- */

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`\n  ${content.shortTitle}`);
    console.log(`  running at ${config.publicUrl}`);
    console.log(`  admin at   ${config.publicUrl}/admin/login  (user: ${config.admin.user})`);
    console.log(`  database   ${store.DB_PATH}  (${store.driver})`);
    console.log(
      `  email     ${config.smtp.enabled ? `SMTP ${config.smtp.host}` : 'NOT configured — confirmations saved to data/outbox/'}\n`
    );
  });
}

module.exports = app;
