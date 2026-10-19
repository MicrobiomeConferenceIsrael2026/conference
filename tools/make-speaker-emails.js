#!/usr/bin/env node
'use strict';

/**
 * Drafts one email per speaker and per session chair, straight from the
 * program in lib/content.js.
 *
 *   npm run emails          -> writes speaker-emails.md
 *
 * Regenerate it after any program change and the times, titles and session
 * assignments all follow automatically. The file is gitignored — it is a
 * working document, not part of the published site.
 */

const fs = require('fs');
const path = require('path');
const c = require('../lib/content');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'speaker-emails.md');

/* --- things the program file does not know ------------------------------- */

const SITE = 'https://microbiomeconferenceisrael2026.github.io/conference/';
const ADDRESS = 'Henrietta Szold St 8, Safed';
const MAPS = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(c.mapQuery);
const WAZE = 'https://www.waze.com/ul?q=' + encodeURIComponent(c.mapQuery) + '&navigate=yes';

const ORGANIZERS = c.committee.map((m) => m.name);
const SIGNOFF =
  ORGANIZERS.slice(0, -1).join(', ') + ' and ' + ORGANIZERS[ORGANIZERS.length - 1];

// One address per organizer, for the Cc line. Fill these in.
const ORGANIZER_EMAILS = {
  'Omry Koren': 'TODO@biu.ac.il',
  'Naama Geva-Zatorsky': 'TODO@technion.ac.il',
  'Moran Yassour': 'TODO@mail.huji.ac.il',
  'David Zeevi': 'david.zeevi@weizmann.ac.il',
};
const CC = ORGANIZERS.map((n) => ORGANIZER_EMAILS[n] || 'TODO').join(', ');

/* --- walk the program ---------------------------------------------------- */

const prog = c.program;
const toMin = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const fmt = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');

/** Each timed row ends where the next timed row begins. */
function endOf(i) {
  for (let j = i + 1; j < prog.length; j++) {
    if (prog[j].time) return prog[j].time;
  }
  return null;
}

/** Which session a row sits in, and that session's talks. */
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

const plain = (s) => String(s).replace(/<\/?i>/g, '');

/* --- the letters --------------------------------------------------------- */

function whereBlock() {
  return [
    `  Date        ${c.date}`,
    `  Arrival     10:00, coffee and gathering`,
    `  Program     ${c.timeRange} (Israel Time)`,
    `  Venue       ${c.venue}`,
    `              ${ADDRESS}`,
    `  Google Maps ${MAPS}`,
    `  Waze        ${WAZE}`,
    `  Parking     available on campus`,
    ``,
    `  Full program: ${SITE}#program`,
  ].join('\n');
}

function speakerLetter(row, session) {
  const dur = row.end ? toMin(row.end) - toMin(row.time) : null;
  const isKeynote = row.kind === 'keynote';
  const chairNames = session.chairs
    ? session.chairs.split(',').map((x) => x.trim()).filter(Boolean)
    : [];
  const chairLine = chairNames.length
    ? `${session.name}, chaired by ` +
      (chairNames.length > 1
        ? chairNames.slice(0, -1).join(', ') + ' and ' + chairNames[chairNames.length - 1]
        : chairNames[0])
    : session.name;

  return `
Subject: Microbiome 2026 — your ${isKeynote ? 'keynote' : 'talk'} this Sunday in Safed

To:  ${row.who} <TODO@>
Cc:  ${CC}

Dear ${row.who.split(' ')[0]},

Thank you for agreeing to speak at Microbiome 2026. We are glad to have you on
the program, and wanted to send you everything in one place before Sunday.

YOUR ${isKeynote ? 'KEYNOTE' : 'TALK'}
  Title       ${plain(row.title)}
  Time        ${row.time}–${row.end}${dur ? ` (${dur} minutes, including questions)` : ''}
  Session     ${chairLine}

THE DAY
${whereBlock()}

If you could arrive a few minutes before your session we will load your slides
and make sure everything runs. If you would rather send them in advance, just
reply to this email.

Thank you again — we are looking forward to your talk. See you in Safed on
Sunday.

Warm regards,
${SIGNOFF}
Microbiome 2026 organizing committee
`;
}

function chairLetter(name, session) {
  const first = session.rows[0];
  const last = session.rows[session.rows.length - 1];
  const list = session.rows
    .map((r) => `  ${r.time}–${r.end}  ${r.who} — ${plain(r.title)}`)
    .join('\n');
  const coChairs = session.chairs
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== name);

  return `
Subject: Microbiome 2026 — chairing ${session.name} this Sunday in Safed

To:  ${name} <TODO@>
Cc:  ${CC}

Dear ${name.split(' ')[0]},

Thank you for agreeing to chair ${session.name} at Microbiome 2026. Here is
everything you need for Sunday.

YOUR SESSION
  ${session.name}${coChairs.length ? `, with ${coChairs.join(' and ')}` : ''}
  ${first.time}–${last.end}

${list}

Keeping to time is the main thing — the day is tightly packed and the breaks
are what let people actually talk to each other. Please feel free to run the
discussion as you see fit.

THE DAY
${whereBlock()}

Thank you again for helping the day run. See you in Safed on Sunday.

Warm regards,
${SIGNOFF}
Microbiome 2026 organizing committee
`;
}

/* --- assemble ------------------------------------------------------------ */

const speakers = [];
const chairs = [];

sessions.forEach((s) => {
  s.rows.forEach((r) => speakers.push({ row: r, session: s }));
  if (s.chairs) {
    s.chairs.split(',').map((x) => x.trim()).filter(Boolean)
      .forEach((name) => chairs.push({ name, session: s }));
  }
});

let md = `# Microbiome 2026 — draft emails

Generated from \`lib/content.js\` on ${new Date().toISOString().slice(0, 10)}.
Rerun \`npm run emails\` after any program change.

**Before sending:** fill in every \`TODO@\` — the recipient addresses and the
four organizer addresses in \`tools/make-speaker-emails.js\`. The Google Maps and
Waze links are address searches; if you have a pin for the exact building
entrance, swap it in there too.

${speakers.length} speakers · ${chairs.length} session chairs · ${speakers.length + chairs.length} emails

---

## Speakers

`;

speakers.forEach(({ row, session }) => {
  md += `### ${row.who}${row.kind === 'keynote' ? ' — keynote' : ''}\n\n\`\`\`\n${speakerLetter(row, session).trim()}\n\`\`\`\n\n`;
});

md += `---\n\n## Session chairs\n\n`;

chairs.forEach(({ name, session }) => {
  md += `### ${name} — ${session.name}\n\n\`\`\`\n${chairLetter(name, session).trim()}\n\`\`\`\n\n`;
});

fs.writeFileSync(OUT, md);
console.log(`\n  Wrote ${path.relative(process.cwd(), OUT)}`);
console.log(`  ${speakers.length} speakers + ${chairs.length} chairs = ${speakers.length + chairs.length} drafts\n`);
