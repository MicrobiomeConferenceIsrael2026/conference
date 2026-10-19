#!/usr/bin/env node
'use strict';

/**
 * Drafts one email per speaker and per session chair, from the program in
 * lib/content.js and the addresses in contacts.json.
 *
 *   npm run emails
 *
 * Three ways to actually send them, because Outlook for Mac is awkward:
 *
 *   emails/outlook-drafts.applescript
 *       Creates all of them as Outlook drafts, formatting intact. Open in
 *       Script Editor and press Run. Works on Legacy Outlook; New Outlook's
 *       AppleScript support has been coming and going, so if it errors with
 *       "New mode is unscriptable", use the next one.
 *
 *   emails/send.html
 *       A page of buttons. Each opens a new, pre-addressed, ready-to-send
 *       message in whatever your default mail client is. Plain text only —
 *       mailto: cannot carry formatting — but nothing to install and it
 *       cannot fail.
 *
 *   emails/*.eml
 *       One file per person. Opens as a received message, so you need
 *       Message -> Send Again (Apple Mail) or Forward. Keeps the formatting.
 *
 * speaker-emails.md is the same letters as text, for reading through.
 * All outputs are gitignored: they hold people's addresses.
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
// Short forms on purpose: these go inside mailto: links, where every character
// is percent-encoded and some clients truncate the URL past ~2000.
const PLACE = 'Azrieli+Faculty+of+Medicine+Safed';
const MAPS = 'https://maps.google.com/?q=' + PLACE;
const WAZE = 'https://waze.com/ul?q=' + PLACE + '&navigate=yes';

const FROM = 'Microbiome 2026 <microbiomeconferenceisrael@gmail.com>';

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
const CC_LIST = ORGANIZERS.map((n) => ({ name: n, address: addressOf(n) })).filter((x) => x.address);
const CC_HEADER = CC_LIST.map((x) => `${x.name} <${x.address}>`).join(', ');

/* --- walk the program ---------------------------------------------------- */

const prog = c.program;
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const plain = (s) => String(s).replace(/<\/?i>/g, '');

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
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

const andList = (a) =>
  a.length > 1 ? a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1] : a[0] || '';
const chairsOf = (s) =>
  s.chairs ? s.chairs.split(',').map((x) => x.trim()).filter(Boolean) : [];

/* --- shared blocks -------------------------------------------------------
 * No <table> anywhere. Outlook for Mac linearises table cells into separate
 * blocks with blank lines between them, which turned every label/value pair
 * into two paragraphs. Bold label + value on one line, <br> between rows,
 * renders the same in every client.                                        */

const BODY =
  "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;" +
  'font-size:15px;line-height:1.6;color:#1c2333;max-width:640px';
const P = 'margin:0 0 14px';
const LABEL = 'color:#5b6472';
const LINK = 'color:#16707a';

const dayRows = [
  ['Date', c.date],
  ['Arrival', '10:00, coffee and gathering'],
  ['Program', `${c.timeRange} (Israel Time)`],
  ['Venue', `${c.venue}, ${ADDRESS}`],
  ['Parking', 'available on campus'],
];

function dayBlockHtml() {
  const rows = dayRows
    .map(([k, v]) => `<strong style="${LABEL}">${esc(k)}:</strong> ${esc(v)}`)
    .join('<br>');
  return `<p style="${P}">${rows}<br>` +
    `<strong style="${LABEL}">Directions:</strong> ` +
    `<a href="${MAPS}" style="${LINK}">Open in Google Maps</a> or ` +
    `<a href="${WAZE}" style="${LINK}">open in Waze</a></p>`;
}

function dayBlockText() {
  return dayRows.map(([k, v]) => `${k}: ${v}`).join('\n') +
    `\nGoogle Maps: ${MAPS}\nWaze: ${WAZE}`;
}

/* --- the two letters ----------------------------------------------------- */

function speakerLetter(row, session) {
  const dur = row.end ? toMin(row.end) - toMin(row.time) : null;
  const kw = row.kind === 'keynote' ? 'keynote' : 'talk';
  const chairs = chairsOf(session);
  const sessionLine = chairs.length
    ? `${session.name}, chaired by ${andList(chairs)}`
    : session.name;
  const first = row.who.split(' ')[0];
  const timeLine = `${row.time}–${row.end}${dur ? ` (${dur} minutes, including questions)` : ''}`;

  const html = `<div style="${BODY}">
<p style="${P}">Dear ${esc(first)},</p>
<p style="${P}">Thank you for agreeing to give a ${kw} at Microbiome 2026. We are looking forward to it, and wanted to put everything you need in one place before Sunday.</p>
<p style="${P}"><strong>Your ${kw}</strong><br>
<strong style="${LABEL}">Title:</strong> ${italicHtml(row.title)}<br>
<strong style="${LABEL}">Time:</strong> ${esc(timeLine)}<br>
<strong style="${LABEL}">Session:</strong> ${esc(sessionLine)}</p>
<p style="${P}"><strong>The day</strong></p>
${dayBlockHtml()}
<p style="${P}">The <a href="${SITE}#program" style="${LINK}">full program is on the conference site</a>.</p>
<p style="${P}">If you could arrive a few minutes before your session we will load your slides and make sure everything runs. If you would rather send them in advance, just reply to this email.</p>
<p style="${P}">Thank you again — see you in Safed on Sunday.</p>
<p style="${P}">Warm regards,<br>${esc(SIGNOFF)}<br>
<span style="${LABEL}">Microbiome 2026 organizing committee</span></p>
</div>`;

  const text = [
    `Dear ${first},`, '',
    `Thank you for agreeing to give a ${kw} at Microbiome 2026. We are looking forward to it, and wanted to put everything you need in one place before Sunday.`, '',
    `YOUR ${kw.toUpperCase()}`,
    `Title: ${plain(row.title)}`,
    `Time: ${timeLine}`,
    `Session: ${sessionLine}`, '',
    'THE DAY', dayBlockText(), '',
    `Full program: ${SITE}#program`, '',
    'If you could arrive a few minutes before your session we will load your slides and make sure everything runs. If you would rather send them in advance, just reply to this email.', '',
    'Thank you again — see you in Safed on Sunday.', '',
    'Warm regards,', SIGNOFF, 'Microbiome 2026 organizing committee',
  ].join('\n');

  return { subject: `Microbiome 2026 — your ${kw} this coming Sunday in Safed`, to: row.who, html, text };
}

function chairLetter(name, session) {
  const first = name.split(' ')[0];
  const co = chairsOf(session).filter((n) => n !== name);
  const a = session.rows[0];
  const z = session.rows[session.rows.length - 1];

  const htmlList = session.rows
    .map((r) => `<p style="margin:0 0 10px"><strong>${r.time}–${r.end} · ${esc(r.who)}</strong><br>` +
      `<span style="${LABEL}">${italicHtml(r.title)}</span></p>`)
    .join('\n');
  const textList = session.rows
    .map((r) => `${r.time}–${r.end}  ${r.who} — ${plain(r.title)}`)
    .join('\n');

  const html = `<div style="${BODY}">
<p style="${P}">Dear ${esc(first)},</p>
<p style="${P}">Thank you for agreeing to chair ${esc(session.name)} at Microbiome 2026${co.length ? `, together with ${esc(andList(co))}` : ''}. Here is everything you need for Sunday.</p>
<p style="margin:0 0 10px"><strong>${esc(session.name)} · ${a.time}–${z.end}</strong></p>
${htmlList}
<p style="${P}">Keeping to time is the main thing — the day is full and the breaks are what let people actually talk to each other. Beyond that, please run the discussion however you see fit.</p>
<p style="${P}"><strong>The day</strong></p>
${dayBlockHtml()}
<p style="${P}">The <a href="${SITE}#program" style="${LINK}">full program is on the conference site</a>.</p>
<p style="${P}">Thank you again for helping the day run — see you in Safed on Sunday.</p>
<p style="${P}">Warm regards,<br>${esc(SIGNOFF)}<br>
<span style="${LABEL}">Microbiome 2026 organizing committee</span></p>
</div>`;

  const text = [
    `Dear ${first},`, '',
    `Thank you for agreeing to chair ${session.name} at Microbiome 2026${co.length ? `, together with ${andList(co)}` : ''}. Here is everything you need for Sunday.`, '',
    `${session.name.toUpperCase()} · ${a.time}–${z.end}`, textList, '',
    'Keeping to time is the main thing — the day is full and the breaks are what let people actually talk to each other. Beyond that, please run the discussion however you see fit.', '',
    'THE DAY', dayBlockText(), '',
    `Full program: ${SITE}#program`, '',
    'Thank you again for helping the day run — see you in Safed on Sunday.', '',
    'Warm regards,', SIGNOFF, 'Microbiome 2026 organizing committee',
  ].join('\n');

  return { subject: `Microbiome 2026 — chairing ${session.name} this coming Sunday in Safed`, to: name, html, text };
}

/* --- .eml ---------------------------------------------------------------- */

function encodeHeader(s) {
  // eslint-disable-next-line no-control-regex
  if (!/[^\x00-\x7F]/.test(s)) return s;
  return '=?UTF-8?B?' + Buffer.from(s, 'utf8').toString('base64') + '?=';
}

function qp(input) {
  const bytes = Buffer.from(input.replace(/\r\n/g, '\n'), 'utf8');
  const lines = [];
  let line = '';
  const push = () => { lines.push(line); line = ''; };
  const put = (tok) => { if (line.length + tok.length > 75) { line += '='; push(); } line += tok; };
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b === 0x0a) {
      if (/[ \t]$/.test(line)) { const ch = line.slice(-1); line = line.slice(0, -1); put(ch === ' ' ? '=20' : '=09'); }
      push(); continue;
    }
    if (b === 0x3d) put('=3D');
    else if (b >= 0x20 && b <= 0x7e) put(String.fromCharCode(b));
    else if (b === 0x09) put('\t');
    else put('=' + b.toString(16).toUpperCase().padStart(2, '0'));
  }
  if (line.length) push();
  return lines.join('\r\n');
}

/** Paragraphs go out as one long line; the client re-wraps to its own width. */
function flowed(text) {
  return text
    .split('\n')
    .map((l) => (l.length > 78 && !/^[A-Z][A-Za-z ]{0,18}: /.test(l) ? l + ' ' : l))
    .join('\r\n');
}

function buildEml(letter, toAddress) {
  const boundary = 'mb26_' + Math.random().toString(36).slice(2, 12);
  const to = toAddress ? `${letter.to} <${toAddress}>` : `${letter.to} <ADDRESS MISSING>`;
  return [
    `From: ${FROM}`, `To: ${to}`, `Cc: ${CC_HEADER}`,
    `Subject: ${encodeHeader(letter.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`, '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8; format=flowed',
    'Content-Transfer-Encoding: quoted-printable', '',
    qp(flowed(letter.text)), '',
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: quoted-printable', '',
    qp(letter.html), '',
    `--${boundary}--`, '',
  ].join('\r\n');
}

/* --- AppleScript: create them as Outlook drafts -------------------------- */

const asStr = (s) =>
  '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ') + '"';

function appleScript(jobs) {
  const cc = CC_LIST.map((x) => `{${asStr(x.name)}, ${asStr(x.address)}}`).join(', ');

  const calls = jobs
    .filter((j) => j.address)
    .map((j) =>
      `mbDraft(${asStr(j.letter.subject)}, ${asStr(j.letter.html)}, ` +
      `${asStr(j.letter.to)}, ${asStr(j.address)}, mbCcList)`)
    .join('\n');

  return `-- Microbiome 2026 — create the speaker and chair emails as Outlook drafts.
--
-- Open in Script Editor (Applications > Utilities) and press Run.
-- Nothing is sent. Each message lands in Outlook's Drafts folder for you to
-- read and send yourself.
--
-- TRY ONE FIRST: set mbOnlyFirst below to true, Run, and check the draft
-- looks right. Then set it back to false and Run again for the rest.
--
-- If it fails with "New mode is unscriptable", your Outlook is the New
-- Outlook, which dropped AppleScript. Switch to Legacy Outlook from the
-- Outlook menu, or use emails/send.html instead.
--
-- Every name here is prefixed mb… on purpose: plain words like "failed" or
-- "content" collide with terms in Outlook's own dictionary, and AppleScript
-- resolves the dictionary first.

property mbOnlyFirst : false
property mbMade : 0
property mbFailed : ""

on mbDraft(mbSubject, mbHtml, mbToName, mbToAddr, mbCcList)
	if mbOnlyFirst and mbMade > 0 then return
	try
		tell application "Microsoft Outlook"
			set mbMsg to make new outgoing message with properties ¬
				{subject:mbSubject, content:mbHtml}
			make new to recipient at mbMsg with properties ¬
				{email address:{name:mbToName, address:mbToAddr}}
			repeat with mbOne in mbCcList
				make new cc recipient at mbMsg with properties ¬
					{email address:{name:(item 1 of mbOne), address:(item 2 of mbOne)}}
			end repeat
			save mbMsg
		end tell
		set mbMade to mbMade + 1
	on error mbErr
		set mbFailed to mbFailed & mbToName & " — " & mbErr & return
	end try
end mbDraft

set mbMade to 0
set mbFailed to ""
set mbCcList to {${cc}}

tell application "Microsoft Outlook" to activate

${calls}

if mbFailed is "" then
	display dialog "Created " & mbMade & " drafts in Outlook." & return & return & ¬
		"They are in the Drafts folder. Read each one, then send." ¬
		buttons {"OK"} default button 1 with title "Microbiome 2026"
else
	display dialog "Created " & mbMade & " drafts." & return & return & ¬
		"These did not work:" & return & mbFailed ¬
		buttons {"OK"} default button 1 with title "Microbiome 2026"
end if
`;
}

/* --- send.html: mailto buttons, the route that cannot fail --------------- */

function sendPage(jobs) {
  const cc = CC_LIST.map((x) => x.address).join(',');
  const rows = jobs.map((j, i) => {
    const n = String(i + 1).padStart(2, '0');
    if (!j.address) {
      return `<tr><td class="n">${n}</td><td><strong>${esc(j.letter.to)}</strong><br>
<span class="warn">no address on file — send this one by hand</span></td><td></td></tr>`;
    }
    const href = 'mailto:' + encodeURIComponent(j.address) +
      '?cc=' + encodeURIComponent(cc) +
      '&subject=' + encodeURIComponent(j.letter.subject) +
      '&body=' + encodeURIComponent(j.letter.text);
    const long = href.length > 2000;
    return `<tr><td class="n">${n}</td><td><strong>${esc(j.letter.to)}</strong><br>
<span class="sub">${esc(j.address)}${j.session ? ' · chairing ' + esc(j.session) : ''}</span>${long ? '<br><span class="long">long message — if it arrives cut off, use Copy</span>' : ''}</td>
<td class="acts"><a class="btn" href="${href}">Open in mail</a>
<button class="btn btn2" data-to="${esc(j.address)}" data-subject="${esc(j.letter.subject)}"
 data-body="${esc(j.letter.text)}">Copy</button></td></tr>`;
  }).join('\n');

  return `<!doctype html>
<meta charset="utf-8">
<title>Microbiome 2026 — send the speaker emails</title>
<style>
 body{font:15px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
      color:#1c2333;background:#fcfcfd;margin:0;padding:32px 24px;max-width:760px}
 h1{font-size:1.5rem;margin:0 0 8px} p{color:#545d70}
 table{border-collapse:collapse;width:100%;margin-top:20px;background:#fff;
       border:1px solid #e7eaef;border-radius:10px;overflow:hidden}
 td{padding:12px 14px;border-bottom:1px solid #f0f2f5;vertical-align:middle}
 tr:last-child td{border-bottom:0}
 .n{color:#8b93a3;width:34px;font-variant-numeric:tabular-nums}
 .sub{color:#8b93a3;font-size:13px}
 .warn{color:#c25a72;font-size:13px}
 .btn{display:inline-block;background:#1f97a4;color:#fff;text-decoration:none;
      padding:7px 14px;border-radius:7px;font-size:13.5px;font-weight:600;white-space:nowrap}
 .btn:hover{background:#16707a}
 .btn2{background:#fff;color:#16707a;border:1px solid #d3e9eb;cursor:pointer;
       font-family:inherit;margin-left:6px}
 .btn2:hover{background:#e8f5f6}
 .acts{white-space:nowrap;text-align:right}
 .long{color:#9a6f10;font-size:12.5px}
 .note{background:#e8f5f6;border:1px solid #d3e9eb;border-radius:10px;padding:14px 16px;
       margin-top:20px;font-size:14px}
</style>
<h1>Microbiome 2026 — speaker and chair emails</h1>
<p>Each button opens a new message in your default mail app, already addressed,
Cc'd to the organizers, with the subject and body filled in. Read it, then send.
<strong>Copy</strong> puts the whole thing on the clipboard instead, for pasting into a
message you start yourself.</p>
<div class="note"><strong>Plain text only.</strong> A <code>mailto:</code> link cannot carry
formatting, so these arrive without bold or clickable link text — the URLs are still there and
most clients turn them into links. For the formatted version use
<code>outlook-drafts.applescript</code> or the <code>.eml</code> files.</div>
<table>
${rows}
</table>
<script>
document.querySelectorAll('button[data-body]').forEach(function (b) {
  b.addEventListener('click', function () {
    var txt = 'To: ' + b.dataset.to + '\nCc: ${cc}\nSubject: ' + b.dataset.subject +
              '\n\n' + b.dataset.body;
    navigator.clipboard.writeText(txt).then(function () {
      var was = b.textContent; b.textContent = 'Copied';
      setTimeout(function () { b.textContent = was; }, 1400);
    });
  });
});
</script>
`;
}

/* --- assemble ------------------------------------------------------------ */

fs.rmSync(EML_DIR, { recursive: true, force: true });
fs.mkdirSync(EML_DIR, { recursive: true });

const slug = (s) =>
  s.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const jobs = [];
sessions.forEach((s) => {
  s.rows.forEach((r) => jobs.push({ kind: 'speaker', name: r.who, letter: speakerLetter(r, s) }));
  chairsOf(s).forEach((n) =>
    jobs.push({ kind: 'chair', name: n, letter: chairLetter(n, s), session: s.name }));
});
jobs.forEach((j) => { j.address = addressOf(j.name); });

const missing = jobs.filter((j) => !j.address).map((j) => j.name);

jobs.forEach((j, i) => {
  const n = String(i + 1).padStart(2, '0');
  fs.writeFileSync(path.join(EML_DIR, `${n}-${slug(j.name)}.eml`), buildEml(j.letter, j.address));
});
fs.writeFileSync(path.join(EML_DIR, 'outlook-drafts.applescript'), appleScript(jobs));
fs.writeFileSync(path.join(EML_DIR, 'send.html'), sendPage(jobs));

let md = `# Microbiome 2026 — draft emails

Generated ${new Date().toISOString().slice(0, 10)} from \`lib/content.js\` and \`contacts.json\`.
Rerun \`npm run emails\` after any program change.

## Sending them

1. **\`emails/outlook-drafts.applescript\`** — open in Script Editor, press Run.
   Creates all ${jobs.filter((j) => j.address).length} as Outlook drafts with the formatting intact. Nothing is sent.
2. **\`emails/send.html\`** — open in a browser, click each button. Opens a
   ready-to-send message in your default mail app. Plain text only, but it
   works whatever version of Outlook you have.
3. **\`emails/*.eml\`** — one file per person. Opens as a *received* message,
   so you need Message → Send Again or Forward.

${jobs.filter((j) => j.kind === 'speaker').length} speakers · ${jobs.filter((j) => j.kind === 'chair').length} chairs · ${jobs.length} emails
${missing.length ? `\n> **No address on file:** ${missing.join(', ')}. Send by hand.\n` : ''}
---

`;

jobs.forEach((j) => {
  md += `### ${j.name}${j.kind === 'chair' ? ` — chairing ${j.session}` : ''}\n\n`;
  md += `**To:** ${j.address || '⚠️ NO ADDRESS'}  \n**Subject:** ${j.letter.subject}\n\n`;
  md += '```\n' + j.letter.text + '\n```\n\n';
});

fs.writeFileSync(MD, md);

console.log(`\n  ${jobs.length} drafts written`);
console.log(`    emails/outlook-drafts.applescript   Outlook drafts, formatted`);
console.log(`    emails/send.html                    one-click mailto, plain text`);
console.log(`    emails/*.eml                        ${jobs.length} message files`);
console.log(`    speaker-emails.md                   text version`);
if (missing.length) console.log(`\n  No address for: ${missing.join(', ')}`);
console.log('');
