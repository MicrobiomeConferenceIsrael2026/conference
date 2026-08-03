'use strict';

const fs = require('fs');
const path = require('path');
const sqlite = require('./sqlite');
const config = require('./config');
const { encrypt, decrypt, blindIndex, randomToken } = require('./crypto');

fs.mkdirSync(config.dataDir, { recursive: true, mode: 0o700 });
try {
  fs.chmodSync(config.dataDir, 0o700);
} catch {
  /* best effort (e.g. on Windows) */
}

const DB_PATH = path.join(config.dataDir, 'registrations.db');
const db = sqlite.open(DB_PATH);

// Restrict the database file to the owning user.
for (const f of [DB_PATH, `${DB_PATH}-wal`, `${DB_PATH}-shm`]) {
  try {
    if (fs.existsSync(f)) fs.chmodSync(f, 0o600);
  } catch {
    /* best effort */
  }
}

db.exec(`
CREATE TABLE IF NOT EXISTS registrations (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  ref               TEXT    NOT NULL UNIQUE,
  email_index       TEXT    NOT NULL UNIQUE,
  full_name_enc     TEXT    NOT NULL,
  email_enc         TEXT    NOT NULL,
  affiliation_enc   TEXT,
  role_enc          TEXT,
  country_enc       TEXT,
  dietary_enc       TEXT,
  notes_enc         TEXT,
  submits_abstract  INTEGER NOT NULL DEFAULT 0,
  abstract_type     TEXT,
  abstract_title_enc TEXT,
  abstract_authors_enc TEXT,
  abstract_body_enc TEXT,
  abstract_status   TEXT    NOT NULL DEFAULT 'pending',
  consent_updates   INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT    NOT NULL,
  updated_at        TEXT    NOT NULL,
  mail_status       TEXT    NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS admin_audit (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  at         TEXT NOT NULL,
  actor      TEXT NOT NULL,
  action     TEXT NOT NULL,
  detail     TEXT,
  ip_hash    TEXT
);
`);

const PERSON_FIELDS = [
  ['full_name', 'full_name_enc'],
  ['email', 'email_enc'],
  ['affiliation', 'affiliation_enc'],
  ['role', 'role_enc'],
  ['country', 'country_enc'],
  ['dietary', 'dietary_enc'],
  ['notes', 'notes_enc'],
  ['abstract_title', 'abstract_title_enc'],
  ['abstract_authors', 'abstract_authors_enc'],
  ['abstract_body', 'abstract_body_enc'],
];

const insertStmt = db.prepare(`
  INSERT INTO registrations (
    ref, email_index, full_name_enc, email_enc, affiliation_enc, role_enc,
    country_enc, dietary_enc, notes_enc, submits_abstract, abstract_type,
    abstract_title_enc, abstract_authors_enc, abstract_body_enc,
    consent_updates, created_at, updated_at, mail_status
  ) VALUES (
    @ref, @email_index, @full_name_enc, @email_enc, @affiliation_enc, @role_enc,
    @country_enc, @dietary_enc, @notes_enc, @submits_abstract, @abstract_type,
    @abstract_title_enc, @abstract_authors_enc, @abstract_body_enc,
    @consent_updates, @created_at, @updated_at, 'pending'
  )
`);

function createRegistration(input) {
  const now = new Date().toISOString();
  const row = {
    ref: `MB26-${randomToken(4).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)}`,
    email_index: blindIndex(input.email),
    submits_abstract: input.submits_abstract ? 1 : 0,
    abstract_type: input.submits_abstract ? input.abstract_type || 'poster' : null,
    consent_updates: input.consent_updates ? 1 : 0,
    created_at: now,
    updated_at: now,
  };
  for (const [plain, col] of PERSON_FIELDS) {
    row[col] = input[plain] ? encrypt(input[plain]) : null;
  }
  const info = insertStmt.run(row);
  return { id: info.lastInsertRowid, ref: row.ref };
}

function emailExists(email) {
  return Boolean(
    db
      .prepare('SELECT 1 FROM registrations WHERE email_index = ?')
      .get(blindIndex(email))
  );
}

function decodeRow(row) {
  if (!row) return null;
  const out = {
    id: row.id,
    ref: row.ref,
    submits_abstract: !!row.submits_abstract,
    abstract_type: row.abstract_type,
    abstract_status: row.abstract_status,
    consent_updates: !!row.consent_updates,
    created_at: row.created_at,
    updated_at: row.updated_at,
    mail_status: row.mail_status,
  };
  for (const [plain, col] of PERSON_FIELDS) out[plain] = decrypt(row[col]);
  return out;
}

function listRegistrations() {
  return db
    .prepare('SELECT * FROM registrations ORDER BY id DESC')
    .all()
    .map(decodeRow);
}

function getRegistration(id) {
  return decodeRow(db.prepare('SELECT * FROM registrations WHERE id = ?').get(id));
}

function setMailStatus(id, status) {
  db.prepare('UPDATE registrations SET mail_status = ?, updated_at = ? WHERE id = ?').run(
    status,
    new Date().toISOString(),
    id
  );
}

function setAbstractStatus(id, status) {
  db.prepare(
    'UPDATE registrations SET abstract_status = ?, updated_at = ? WHERE id = ?'
  ).run(status, new Date().toISOString(), id);
}

function deleteRegistration(id) {
  db.prepare('DELETE FROM registrations WHERE id = ?').run(id);
}

function stats() {
  const total = db.prepare('SELECT COUNT(*) c FROM registrations').get().c;
  const abstracts = db
    .prepare('SELECT COUNT(*) c FROM registrations WHERE submits_abstract = 1')
    .get().c;
  const talks = db
    .prepare("SELECT COUNT(*) c FROM registrations WHERE abstract_type = 'talk'").get().c;
  const posters = db
    .prepare("SELECT COUNT(*) c FROM registrations WHERE abstract_type = 'poster'").get().c;
  return { total, abstracts, talks, posters };
}

function audit(actor, action, detail, ipHash) {
  db.prepare(
    'INSERT INTO admin_audit (at, actor, action, detail, ip_hash) VALUES (?,?,?,?,?)'
  ).run(new Date().toISOString(), actor, action, detail || null, ipHash || null);
}

function recentAudit(limit = 25) {
  return db.prepare('SELECT * FROM admin_audit ORDER BY id DESC LIMIT ?').all(limit);
}

module.exports = {
  db,
  driver: db.driver,
  DB_PATH,
  createRegistration,
  emailExists,
  listRegistrations,
  getRegistration,
  setMailStatus,
  setAbstractStatus,
  deleteRegistration,
  stats,
  audit,
  recentAudit,
};
