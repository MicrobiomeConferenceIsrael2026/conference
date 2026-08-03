'use strict';

/**
 * Thin SQLite adapter.
 *
 * Prefers better-sqlite3 (fast, battle-tested, ships prebuilt binaries).
 * Falls back to Node's built-in `node:sqlite` (Node 22.5+) when better-sqlite3
 * is missing or its prebuilt binary does not match the machine — so the site
 * still runs on a box where the native module cannot load.
 *
 * Both back-ends are exposed through the same small surface:
 *   db.exec(sql)
 *   db.prepare(sql).run(params) -> { changes, lastInsertRowid }
 *   db.prepare(sql).get(params)
 *   db.prepare(sql).all(params)
 */

function tryBetterSqlite3(file) {
  const Database = require('better-sqlite3');
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return {
    driver: 'better-sqlite3',
    exec: (sql) => db.exec(sql),
    prepare: (sql) => {
      const stmt = db.prepare(sql);
      return {
        // Variadic: callers pass either positional values for `?` placeholders
        // or a single object for named ones. Collapsing this to a single
        // parameter silently drops every argument after the first.
        run: (...args) => {
          const info = stmt.run(...args);
          return {
            changes: Number(info.changes),
            lastInsertRowid: Number(info.lastInsertRowid),
          };
        },
        get: (...args) => stmt.get(...args),
        all: (...args) => stmt.all(...args),
      };
    },
    close: () => db.close(),
  };
}

function tryNodeSqlite(file) {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  return {
    driver: 'node:sqlite',
    exec: (sql) => db.exec(sql),
    prepare: (sql) => {
      const stmt = db.prepare(sql);
      const norm = (args) => {
        if (args.length === 1 && args[0] && typeof args[0] === 'object' && !Array.isArray(args[0])) {
          // node:sqlite rejects undefined and booleans; normalise them.
          const o = {};
          for (const [k, v] of Object.entries(args[0])) {
            o[k] = v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v;
          }
          return [o];
        }
        return args.map((v) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v));
      };
      return {
        run: (...args) => {
          const info = stmt.run(...norm(args));
          return {
            changes: Number(info.changes),
            lastInsertRowid: Number(info.lastInsertRowid),
          };
        },
        get: (...args) => stmt.get(...norm(args)),
        all: (...args) => stmt.all(...norm(args)),
      };
    },
    close: () => db.close(),
  };
}

function open(file) {
  const problems = [];
  for (const attempt of [tryBetterSqlite3, tryNodeSqlite]) {
    try {
      return attempt(file);
    } catch (err) {
      problems.push(`${attempt.name}: ${err.message.split('\n')[0]}`);
    }
  }
  throw new Error(
    'Could not open the SQLite database with any available driver.\n  ' +
      problems.join('\n  ') +
      '\n\nEither run `npm install better-sqlite3` or use Node 22.5 or newer.'
  );
}

module.exports = { open };
