#!/usr/bin/env node
'use strict';

/**
 * Creates a .env with fresh cryptographic secrets and an admin password.
 * Safe to run once; it refuses to overwrite an existing .env.
 *
 *   npm run init-secrets
 *   npm run init-secrets -- --user omry --password 'something long'
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const ROOT = path.join(__dirname, '..');
const ENV = path.join(ROOT, '.env');

const args = process.argv.slice(2);
function arg(name, dflt) {
  const i = args.indexOf('--' + name);
  return i !== -1 && args[i + 1] ? args[i + 1] : dflt;
}

if (fs.existsSync(ENV) && !args.includes('--force')) {
  console.error(
    '\n  .env already exists — not touching it.\n' +
      '  Delete it first, or pass --force, if you really want new secrets.\n' +
      '  (Changing MASTER_KEY makes existing registrations unreadable.)\n'
  );
  process.exit(1);
}

const adminUser = arg('user', 'admin');
const adminPassword = arg('password', crypto.randomBytes(12).toString('base64url'));
const hash = bcrypt.hashSync(adminPassword, 12);

const env = `# =============================================================================
#  ${'Microbiome 2026'} — environment
#  Generated ${new Date().toISOString()}
#
#  KEEP THIS FILE SECRET. It is in .gitignore. Never commit it, never e-mail it.
#  If MASTER_KEY is lost or changed, every stored registration becomes
#  permanently unreadable. Back it up somewhere safe (a password manager).
# =============================================================================

NODE_ENV=development
PORT=3000
PUBLIC_URL=http://localhost:3000
# Set to true only when running behind nginx / a load balancer.
TRUST_PROXY=false

# --- cryptography ------------------------------------------------------------
# 32 bytes, hex. Encrypts every personal field before it touches the disk.
MASTER_KEY=${crypto.randomBytes(32).toString('hex')}
# Signs the session cookie.
SESSION_SECRET=${crypto.randomBytes(48).toString('base64url')}

# --- organiser login ---------------------------------------------------------
ADMIN_USER=${adminUser}
# bcrypt hash of the password below. The plaintext is NOT stored anywhere.
ADMIN_PASSWORD_HASH=${hash}
# To change the password: generate a new hash with
#   node -e "console.log(require('bcryptjs').hashSync('NEW PASSWORD', 12))"
# and paste it above. (Or set ADMIN_PASSWORD=... in plaintext — less good.)

# --- e-mail ------------------------------------------------------------------
# Leave SMTP_HOST empty to run without mail: confirmations are then written to
# data/outbox/ as .eml files and registration still works.
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
MAIL_FROM="Microbiome 2026 <no-reply@example.ac.il>"
# Optional: blind-copy every confirmation to the organisers.
MAIL_BCC=
`;

fs.writeFileSync(ENV, env, { mode: 0o600 });

console.log(`
  Wrote ${path.relative(process.cwd(), ENV)} (chmod 600).

  ------------------------------------------------------------------
   Organiser login
     URL       ${'http://localhost:3000/admin/login'}
     username  ${adminUser}
     password  ${adminPassword}
  ------------------------------------------------------------------

  Write the password down now — it is hashed in .env and cannot be recovered.
  Back up MASTER_KEY too: without it the registration database is unreadable.

  Next:  npm start
`);
