#!/usr/bin/env node
'use strict';

/**
 * Prints the environment variables a hosting provider needs, without writing
 * any file. Use this when you are deploying to Render / Fly / Railway / Docker
 * and want to paste the values into their dashboard.
 *
 *   npm run keys
 *   npm run keys -- --password 'a long passphrase' --user omry
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const args = process.argv.slice(2);
function arg(name, dflt) {
  const i = args.indexOf('--' + name);
  return i !== -1 && args[i + 1] ? args[i + 1] : dflt;
}

const user = arg('user', 'admin');
const password = arg('password', crypto.randomBytes(12).toString('base64url'));

console.log(`
# ---------------------------------------------------------------------------
# Paste these into your host's environment / secrets panel.
# Generated ${new Date().toISOString()}
#
# MASTER_KEY encrypts the registration data. Save it in a password manager.
# If you change it later, everything already stored becomes unreadable.
# ---------------------------------------------------------------------------

NODE_ENV=production
TRUST_PROXY=true
PUBLIC_URL=https://CHANGE-ME.example.ac.il

MASTER_KEY=${crypto.randomBytes(32).toString('hex')}
SESSION_SECRET=${crypto.randomBytes(48).toString('base64url')}

ADMIN_USER=${user}
ADMIN_PASSWORD_HASH=${bcrypt.hashSync(password, 12)}

SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
MAIL_FROM="Microbiome 2026 <no-reply@example.ac.il>"
MAIL_BCC=

# ---------------------------------------------------------------------------
# Organizer login
#   username  ${user}
#   password  ${password}
# The password is not stored anywhere in plaintext. Write it down now.
# ---------------------------------------------------------------------------
`);
