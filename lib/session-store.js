'use strict';

/**
 * SQLite-backed session store for express-session.
 *
 * Why not the default MemoryStore: it leaks under load, logs a warning in
 * production, and throws every organiser out whenever the process restarts.
 *
 * Session payloads are encrypted with the same AES-256-GCM key as the
 * registration data, because a half-finished registration form is held in the
 * session and that contains personal details.
 */

const session = require('express-session');
const { encrypt, decrypt } = require('./crypto');

const Store = session.Store;

class SqliteSessionStore extends Store {
  constructor(db, options = {}) {
    super(options);
    this.db = db;
    this.ttlMs = options.ttlMs || 1000 * 60 * 60 * 2;

    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid        TEXT PRIMARY KEY,
        data_enc   TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions (expires_at);
    `);

    this._get = db.prepare('SELECT data_enc, expires_at FROM sessions WHERE sid = ?');
    this._set = db.prepare(
      'INSERT INTO sessions (sid, data_enc, expires_at) VALUES (?, ?, ?) ' +
        'ON CONFLICT(sid) DO UPDATE SET data_enc = excluded.data_enc, expires_at = excluded.expires_at'
    );
    this._touch = db.prepare('UPDATE sessions SET expires_at = ? WHERE sid = ?');
    this._destroy = db.prepare('DELETE FROM sessions WHERE sid = ?');
    this._sweep = db.prepare('DELETE FROM sessions WHERE expires_at < ?');
    this._count = db.prepare('SELECT COUNT(*) c FROM sessions WHERE expires_at >= ?');
    this._clear = db.prepare('DELETE FROM sessions');

    this.prune();
    // hourly cleanup; unref so it never keeps the process alive
    this.timer = setInterval(() => this.prune(), 60 * 60 * 1000);
    if (this.timer.unref) this.timer.unref();
  }

  prune() {
    try {
      this._sweep.run(Date.now());
    } catch {
      /* non-fatal */
    }
  }

  expiryFor(sess) {
    if (sess && sess.cookie && sess.cookie.expires) {
      return new Date(sess.cookie.expires).getTime();
    }
    return Date.now() + this.ttlMs;
  }

  get(sid, cb) {
    try {
      const row = this._get.get(sid);
      if (!row) return cb(null, null);
      if (row.expires_at < Date.now()) {
        this._destroy.run(sid);
        return cb(null, null);
      }
      const json = decrypt(row.data_enc);
      if (!json) return cb(null, null);
      return cb(null, JSON.parse(json));
    } catch (err) {
      return cb(err);
    }
  }

  set(sid, sess, cb) {
    try {
      this._set.run(sid, encrypt(JSON.stringify(sess)), this.expiryFor(sess));
      return cb(null);
    } catch (err) {
      return cb(err);
    }
  }

  touch(sid, sess, cb) {
    try {
      this._touch.run(this.expiryFor(sess), sid);
      return cb(null);
    } catch (err) {
      return cb(err);
    }
  }

  destroy(sid, cb) {
    try {
      this._destroy.run(sid);
      return cb(null);
    } catch (err) {
      return cb(err);
    }
  }

  length(cb) {
    try {
      return cb(null, this._count.get(Date.now()).c);
    } catch (err) {
      return cb(err);
    }
  }

  clear(cb) {
    try {
      this._clear.run();
      return cb(null);
    } catch (err) {
      return cb(err);
    }
  }
}

module.exports = SqliteSessionStore;
