'use strict';

/**
 * Field-level encryption for personal data.
 *
 *  - Every personal field is encrypted with AES-256-GCM using a key derived
 *    from MASTER_KEY via HKDF. Each value gets a fresh random 12-byte IV and
 *    a 16-byte authentication tag, so the ciphertext is both confidential and
 *    tamper-evident.
 *  - Email addresses additionally get a deterministic HMAC-SHA256 "blind
 *    index" so we can enforce uniqueness / look people up without ever
 *    storing or indexing the plaintext address.
 *
 * If the database file is copied off the server it is unreadable without
 * MASTER_KEY, which lives only in .env (chmod 600, never committed).
 */

const crypto = require('crypto');
const config = require('./config');

let MASTER;
try {
  MASTER = Buffer.from(config.masterKeyHex, 'hex');
} catch {
  MASTER = Buffer.alloc(0);
}

if (MASTER.length !== 32) {
  throw new Error(
    'MASTER_KEY must be 64 hex characters (32 bytes).\n' +
      'Run:  npm run init-secrets   to generate a .env with fresh keys.'
  );
}

function subkey(info) {
  return Buffer.from(crypto.hkdfSync('sha256', MASTER, Buffer.alloc(0), info, 32));
}

const DATA_KEY = subkey('conf:field-encryption:v1');
const INDEX_KEY = subkey('conf:blind-index:v1');

/** Encrypt a string -> "v1.<iv>.<tag>.<ciphertext>" (all base64url). */
function encrypt(plaintext) {
  if (plaintext === null || plaintext === undefined) return null;
  const text = String(plaintext);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', DATA_KEY, iv);
  const ct = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    'v1',
    iv.toString('base64url'),
    tag.toString('base64url'),
    ct.toString('base64url'),
  ].join('.');
}

/** Decrypt a value produced by encrypt(). Returns '' on failure. */
function decrypt(payload) {
  if (payload === null || payload === undefined || payload === '') return '';
  try {
    const [version, ivB64, tagB64, ctB64] = String(payload).split('.');
    if (version !== 'v1') return '';
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      DATA_KEY,
      Buffer.from(ivB64, 'base64url')
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(ctB64, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return '';
  }
}

/** Deterministic, non-reversible index for lookups (email de-duplication). */
function blindIndex(value) {
  return crypto
    .createHmac('sha256', INDEX_KEY)
    .update(String(value).trim().toLowerCase(), 'utf8')
    .digest('hex');
}

/** Constant-time string comparison. */
function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) {
    // still burn the time
    crypto.timingSafeEqual(ba, ba);
    return false;
  }
  return crypto.timingSafeEqual(ba, bb);
}

function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString('base64url');
}

module.exports = { encrypt, decrypt, blindIndex, safeEqual, randomToken };
