#!/usr/bin/env node
'use strict';

/**
 * Drafts one email per speaker and per session chair, from the program in
 * lib/content.js and the addresses in contacts.json.
 *
 *   npm run emails
 *
 *     emails/*.eml        one file per person — double-click to open in Mail
 *     speaker-emails.md   the same letters as text, for reading through
 *
 * Both outputs are gitignored: they contain people's addresses and are working
 * documents, not part of the published site.
 *
 * Each .eml is multipart/alternative:
 *   · text/html  — links are real hyperlinks with readable anchor text
 *   · text/plain; format=flowed — paragraphs are single long lines so every
 *     client re-wraps them to its own width instead of showing ragged breaks
 */

const fs = require('fs');
const path = require('path');
const c = require('../lib/content');

const ROOT = path.join(__dirname, '..');
const EML_DIR = path.join(ROOT, 'emails');
const MD = path.join(ROOT, 'speaker-emails.md');

/* --- details the program file does not carry ----------------------------- */

const SITE = 'https://microbiomeconferenceisrael2026.github.io/conference/';
const ADDRESS = 'Henrietta Szold St 8, Safed';
const MAPS = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(c.mapQuery);
const WAZE = 'https://www.waze.com/ul?q=' + encodeURIComponent(c.mapQuery) + '&navigate=yes';

const FROM = 'Microbiome 2026 <microbiomeconferenceisrael@gmail.com>';

/* Organizers, in signature order. Addresses come from contacts.json where the
   registration list has them; override here if you prefer another one. */
const ORGANIZER_OVERRIDES = {
  'David Zeevi': 'david.zeevi@weizmann.ac.il',
};

let contacts = {};
try {
  contacts = JSON.parse(fs.readFileSync(path.join(ROOT, 'contacts.json'), 'utf8'));
} catch {
  console.error('\n  contacts.json not found — no addresses will be filled in.\n');
}

const addressOf = (name) =>
  ORGANIZER_OVERRIDES[name] || (contacts[name] && contacts[name].email) || null;

const ORGANIZERS = c.committee.map((m) => m.name);
const SIGNOFF = ORGANIZERS.slice(0, -1).join(', ') + ' and ' + ORGANIZERS[ORGANIZERS.length - 1];
const CC = ORGANIZERS.map((n) => {
  const a = addressOf(n);
  return a ? `${n} <${a}>` : `${n} <ADDRESS MISSING>`;
}).join(', ');

/* --- walk the program ---------------------------------------------------- */

const prog = c.program;
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const plain = (s) => String(s).replace(/<\/?i>/g, '');
const italicHtml = (s) => esc(String(s)).replace(/&lt;(\/?)i&gt;/g, '<$1i>');

function endOf(i) {
  for (let j = i + 1; j < prog.length; j++) if (prog[j].time) return prog[j].time;
  return null;
}

const sessions = [];
let current = null;
prog.forEach((row, i) => {
  if (row.kind === 'session') {
    current = { name: row.title, chairs: row.chairs || null, rows: [] };
    sessions.push(current);
  } else if (current && (row.kind === 'talk' || row.kind === 'keynote')) {
    current.rows.push({ ...row, end: endOf(i) });
  }
});

const andList = (arr) =>
  arr.length > 1 ? arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1] : arr[0] || '';

const chairsOf = (s) =>
  s.chairs ? s.chairs.split(',').map((x) => x.trim()).filter(Boolean) : [];

/* --- shared blocks ------------------------------------------------------- */

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const dayRowsText = [
  ['Date', c.date],
  ['Arrival', '10:00, coffee and gathering'],
  ['Program', `${c.timeRange} (Israel Time)`],
  ['Venue', `${c.venue}, ${ADDRESS}`],
  ['Parking', 'available on campus'],
];

function dayBlockHtml() {
  const rows = dayRowsText
    .map(([k, v]) => `<tr><td style="${TD_K}">${esc(k)}</td><td style="${TD_V}">${esc(v)}</td></tr>`)
    .join('');
  return `
<table cellpadding="0" cellspacing="0" style="${TABLE}">
${rows}
<tr><td style="${TD_K}">Directions</td><td style="${TD_V}">
<a href="${MAPS}" style="${LINK}">Open in Google Maps</a> &nbsp;·&nbsp;
<a href="${WAZE}" style="${LINK}">Open in Waze</a>
</td></tr>
</table>`;
}

function dayBlockText() {
  return dayRowsText.map(([k, v]) => `${k}: ${v}`).join('\n') +
    `\nGoogle Maps: ${MAPS}` +
    `\nWaze: ${WAZE}`;
}

const TABLE = 'border-collapse:collapse;margin:14px 0;font-size:15px;line-height:1.5';
const TD_K = 'padding:4px 16px 4px 0;color:#6b7280;white-space:nowrap;vertical-align:top';
const TD_V = 'padding:4px 0;vertical-align:top';
const LINK = 'color:#16707a';
// Single quotes inside: the whole thing sits in a double-quoted style="…".
const BODY = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1c2333;max-width:640px";

/* --- the two letters ----------------------------------------------------- */

function speakerLetter(row, session) {
  const dur = row.end ? toMin(row.end) - toMin(row.time) : null;
  const kw = row.kind === 'keynote' ? 'keynote' : 'talk';
  const chairs = chairsOf(session);
  const sessionLine = chairs.length
    ? `${session.name}, chaired by ${andList(chairs)}`
    : session.name;
  const first = row.who.split(' ')[0];

  const slot = [
    ['Title', row.title],
    ['Time', `${row.time}–${row.end}${dur ? ` (${dur} minutes, including questions)` : ''}`],
    ['Session', sessionLine],
  ];

  const html = `<div style="${BODY}">
<p>Dear ${esc(first)},</p>
<p>Thank you for agreeing to give a ${kw} at Microbiome 2026. We are looking forward to it, and wanted to put everything you need in one place before Sunday.</p>
<p style="margin-bottom:0"><strong>Your ${kw}</strong></p>
<table cellpadding="0" cellspacing="0" style="${TABLE}">
${slot.map(([k, v]) => `<tr><td style="${TD_K}">${esc(k)}</td><td style="${TD_V}">${italicHtml(v)}</td></tr>`).join('\n')}
</table>
<p style="margin-bottom:0"><strong>The day</strong></p>
${dayBlockHtml()}
<p>The <a href="${SITE}#program" style="${LINK}">full program is on the conference site</a>.</p>
<p>If you could arrive a few minutes before your session we will load your slides and make sure everything runs. If you would rather send them in advance, just reply to this email.</p>
<p>Thank you again — see you in Safed on Sunday.</p>
<p>Warm regards,<br>
${esc(SIGNOFF)}<br>
<span style="color:#6b7280">Microbiome 2026 organizing committee</span></p>
</div>`;

  const text = [
    `Dear ${first},`,
    '',
    `Thank you for agreeing to give a ${kw} at Microbiome 2026. We are looking forward to it, and wanted to put everything you need in one place before Sunday.`,
    '',
    `YOUR ${kw.toUpperCase()}`,
    ...slot.map(([k, v]) => `${k}: ${plain(v)}`),
    '',
    'THE DAY',
    dayBlockText(),
    '',
    `Full program: ${SITE}#program`,
    '',
    'If you could arrive a few minutes before your session we will load your slides and make sure everything runs. If you would rather send them in advance, just reply to this email.',
    '',
    'Thank you again — see you in Safed on Sunday.',
    '',
    'Warm regards,',
    SIGNOFF,
    'Microbiome 2026 organizing committee',
  ].join('\n');

  return {
    subject: `Microbiome 2026 — your ${kw} this coming Sunday in Safed`,
    to: row.who,
    html,
    text,
  };
}

function chairLetter(name, session) {
  const first = name.split(' ')[0];
  const co = chairsOf(session).filter((n) => n !== name);
  const firstTalk = session.rows[0];
  const lastTalk = session.rows[session.rows.length - 1];

  const htmlList = session.rows
    .map((r) => `<tr><td style="${TD_K}">${r.time}–${r.end}</td><td style="${TD_V}"><strong>${esc(r.who)}</strong><br>${italicHtml(r.title)}</td></tr>`)
    .join('\n');
  const textList = session.rows
    .map((r) => `${r.time}–${r.end}  ${r.who} — ${plain(r.title)}`)
    .join('\n');

  const html = `<div style="${BODY}">
<p>Dear ${esc(first)},</p>
<p>Thank you for agreeing to chair ${esc(session.name)} at Microbiome 2026${co.length ? `, together with ${esc(andList(co))}` : ''}. Here is everything you need for Sunday.</p>
<p style="margin-bottom:0"><strong>${esc(session.name)} · ${firstTalk.time}–${lastTalk.end}</strong></p>
<table cellpadding="0" cellspacing="0" style="${TABLE}">
${htmlList}
</table>
<p>Keeping to time is the main thing — the day is full and the breaks are what let people actually talk to each other. Beyond that, please run the discussion however you see fit.</p>
<p style="margin-bottom:0"><strong>The day</strong></p>
${dayBlockHtml()}
<p>The <a href="${SITE}#program" style="${LINK}">full program is on the conference site</a>.</p>
<p>Thank you again for helping the day run — see you in Safed on Sunday.</p>
<p>Warm regards,<br>
${esc(SIGNOFF)}<br>
<span style="color:#6b7280">Microbiome 2026 organizing committee</span></p>
</div>`;

  const text = [
    `Dear ${first},`,
    '',
    `Thank you for agreeing to chair ${session.name} at Microbiome 2026${co.length ? `, together with ${andList(co)}` : ''}. Here is everything you need for Sunday.`,
    '',
    `${session.name.toUpperCase()} · ${firstTalk.time}–${lastTalk.end}`,
    textList,
    '',
    'Keeping to time is the main thing — the day is full and the breaks are what let people actually talk to each other. Beyond that, please run the discussion however you see fit.',
    '',
    'THE DAY',
    dayBlockText(),
    '',
    `Full program: ${SITE}#program`,
    '',
    'Thank you again for helping the day run — see you in Safed on Sunday.',
    '',
    'Warm regards,',
    SIGNOFF,
    'Microbiome 2026 organizing committee',
  ].join('\n');

  return {
    subject: `Microbiome 2026 — chairing ${session.name} this coming Sunday in Safed`,
    to: name,
    html,
    text,
  };
}

/* --- .eml ---------------------------------------------------------------- */

/** RFC 2047 for non-ASCII header text (the em dash in every subject). */
function encodeHeader(s) {
  // eslint-disable-next-line no-control-regex
  if (!/[^\x00-\x7F]/.test(s)) return s;
  return '=?UTF-8?B?' + Buffer.from(s, 'utf8').toString('base64') + '?=';
}

/**
 * format=flowed: a trailing space marks a soft break the client may re-wrap.
 * Paragraphs go out as one long line, so nothing is pre-wrapped at our width.
 * "Label: value" lines get no trailing space, so they stay put.
 */
function flowed(text) {
  return text
    .split('\n')
    .map((line) => (line.length > 78 && !/^[A-Z][A-Za-z ]{0,18}: /.test(line) ? line + ' ' : line))
    .join('\r\n');
}

/**
 * Quoted-printable. Two reasons, both practical rather than pedantic:
 * it wraps at 76 characters, so a long talk title can never push a line past
 * the 998-character limit SMTP enforces; and it survives any hop that is not
 * 8BITMIME-clean. Trailing spaces become =20, so format=flowed still works.
 */
function qp(input) {
  const bytes = Buffer.from(input.replace(/\r\n/g, '\n'), 'utf8');
  const lines = [];
  let line = '';

  const push = () => { lines.push(line); line = ''; };
  const put = (tok) => {
    if (line.length + tok.length > 75) { line += '='; push(); }
    line += tok;
  };

  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b === 0x0a) {                       // end of a source line
      // a trailing space or tab must be encoded or it will be stripped
      if (/[ \t]$/.test(line)) {
        const ch = line.slice(-1);
        line = line.slice(0, -1);
        put(ch === ' ' ? '=20' : '=09');
      }
      push();
      continue;
    }
    if (b === 0x3d) put('=3D');             // '='
    else if (b >= 0x20 && b <= 0x7e) put(String.fromCharCode(b));
    else if (b === 0x09) put('\t');
    else put('=' + b.toString(16).toUpperCase().padStart(2, '0'));
  }
  if (line.length) push();
  return lines.join('\r\n');
}

function buildEml(letter, toAddress) {
  const boundary = 'mb26_' + Math.random().toString(36).slice(2, 12);
  const to = toAddress ? `${letter.to} <${toAddress}>` : `${letter.to} <ADDRESS MISSING>`;
  return [
    `From: ${FROM}`,
    `To: ${to}`,
    `Cc: ${CC}`,
    `Subject: ${encodeHeader(letter.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8; format=flowed',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    qp(flowed(letter.text)),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    qp(letter.html),
    '',
    `--${boundary}--`,
    '',
  ].join('\r\n');
}

/* --- assemble ------------------------------------------------------------ */

fs.rmSync(EML_DIR, { recursive: true, force: true });
fs.mkdirSync(EML_DIR, { recursive: true });

const slug = (s) =>
  s.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const jobs = [];
sessions.forEach((s) => {
  s.rows.forEach((r) => jobs.push({ kind: 'speaker', name: r.who, letter: speakerLetter(r, s) }));
  chairsOf(s).forEach((n) => jobs.push({ kind: 'chair', name: n, letter: chairLetter(n, s), session: s.name }));
});

const missing = [];
let md = `# Microbiome 2026 — draft emails

Generated ${new Date().toISOString().slice(0, 10)} from \`lib/content.js\` and \`contacts.json\`.
Rerun \`npm run emails\` after any program change.

One \`.eml\` per person in \`emails/\`. Double-click to open it in Mail, check it,
then use **Message → Send Again** (or forward to yourself) to send.

${jobs.filter((j) => j.kind === 'speaker').length} speakers · ${jobs.filter((j) => j.kind === 'chair').length} chairs · ${jobs.length} emails

---

`;

jobs.forEach((j, i) => {
  const addr = addressOf(j.name);
  if (!addr) missing.push(j.name);
  const n = String(i + 1).padStart(2, '0');
  fs.writeFileSync(path.join(EML_DIR, `${n}-${slug(j.name)}.eml`), buildEml(j.letter, addr));
  md += `### ${j.name}${j.kind === 'chair' ? ` — chairing ${j.session}` : ''}\n\n`;
  md += `**To:** ${addr || '⚠️ NO ADDRESS — fill in by hand'}  \n`;
  md += `**Subject:** ${j.letter.subject}\n\n`;
  md += '```\n' + j.letter.text + '\n```\n\n';
});

if (missing.length) {
  md = md.replace('---\n\n', `> **Missing addresses:** ${missing.join(', ')}. Their \`.eml\` says \`ADDRESS MISSING\` in the To field.\n\n---\n\n`);
}

fs.writeFileSync(MD, md);

console.log(`\n  ${jobs.length} drafts written`);
console.log(`    emails/            ${fs.readdirSync(EML_DIR).length} .eml files`);
console.log(`    speaker-emails.md  text version`);
if (missing.length) console.log(`\n  No address for: ${missing.join(', ')}`);
console.log('');
