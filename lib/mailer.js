'use strict';

/**
 * Confirmation e-mail.
 *
 * If SMTP_HOST is configured in .env, mail is sent with nodemailer.
 * If it is not, the message is written to data/outbox/ as an .eml file and the
 * registration still succeeds — so the site never breaks because mail is not
 * yet configured.
 */

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const config = require('./config');
const content = require('./content');

const OUTBOX = path.join(config.dataDir, 'outbox');

let transporter = null;
if (config.smtp.enabled) {
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });
}

function esc(s) {
  return String(s == null ? '' : s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}

function buildConfirmation(reg) {
  const subject = `Registration confirmed — ${content.shortTitle} (ref ${reg.ref})`;

  const abstractBlockText = reg.submits_abstract
    ? `
ABSTRACT SUBMITTED
  Title       : ${reg.abstract_title}
  Authors     : ${reg.abstract_authors}
  Preference  : ${reg.abstract_type === 'talk' ? 'Short talk' : 'Poster'}
  Status      : under review — decisions by ${content.notificationDate}
`
    : `
You did not submit an abstract. You can still submit one until
${content.abstractDeadline} by writing to ${content.contactEmail}.
`;

  const text = `Dear ${reg.full_name},

Your registration for ${content.title} is confirmed.

  Reference   : ${reg.ref}
  Date        : ${content.date}, ${content.timeRange}
  Venue       : ${content.venue}, ${content.venueCity}
  Fee         : ${content.fee}
${abstractBlockText}
Please keep this e-mail — the reference number is how we find you at the
registration desk.

If you need to change or cancel your registration, reply to this message or
write to ${content.contactEmail}.

${content.contactName}
${content.publicUrl || config.publicUrl}
`;

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f1ea;font-family:Georgia,'Times New Roman',serif;color:#16233f">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:28px 12px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e3ddcf">
        <tr><td style="background:#101c3d;padding:26px 32px">
          <div style="color:#c9a227;font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-family:Helvetica,Arial,sans-serif">Registration confirmed</div>
          <div style="color:#ffffff;font-size:23px;line-height:1.3;margin-top:8px">${esc(content.title)}</div>
        </td></tr>
        <tr><td style="padding:28px 32px;font-size:15px;line-height:1.65">
          <p style="margin:0 0 16px">Dear ${esc(reg.full_name)},</p>
          <p style="margin:0 0 20px">Your registration is confirmed. Please keep this e-mail — the reference number below is how we find you at the desk.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e3ddcf;background:#faf8f3;font-family:Helvetica,Arial,sans-serif;font-size:14px">
            <tr><td style="padding:12px 16px;color:#6b6250;width:120px">Reference</td><td style="padding:12px 16px;font-weight:bold;letter-spacing:.06em">${esc(reg.ref)}</td></tr>
            <tr><td style="padding:12px 16px;color:#6b6250;border-top:1px solid #eee6d8">Date</td><td style="padding:12px 16px;border-top:1px solid #eee6d8">${esc(content.date)}<br><span style="color:#6b6250">${esc(content.timeRange)}</span></td></tr>
            <tr><td style="padding:12px 16px;color:#6b6250;border-top:1px solid #eee6d8">Venue</td><td style="padding:12px 16px;border-top:1px solid #eee6d8">${esc(content.venue)}<br><span style="color:#6b6250">${esc(content.venueCity)}</span></td></tr>
            <tr><td style="padding:12px 16px;color:#6b6250;border-top:1px solid #eee6d8">Fee</td><td style="padding:12px 16px;border-top:1px solid #eee6d8">${esc(content.fee)}</td></tr>
          </table>
          ${
            reg.submits_abstract
              ? `<p style="margin:22px 0 8px;font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8a7f66">Abstract submitted</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e3ddcf;font-family:Helvetica,Arial,sans-serif;font-size:14px">
            <tr><td style="padding:12px 16px;color:#6b6250;width:120px">Title</td><td style="padding:12px 16px">${esc(reg.abstract_title)}</td></tr>
            <tr><td style="padding:12px 16px;color:#6b6250;border-top:1px solid #eee6d8">Authors</td><td style="padding:12px 16px;border-top:1px solid #eee6d8">${esc(reg.abstract_authors)}</td></tr>
            <tr><td style="padding:12px 16px;color:#6b6250;border-top:1px solid #eee6d8">Preference</td><td style="padding:12px 16px;border-top:1px solid #eee6d8">${reg.abstract_type === 'talk' ? 'Short talk' : 'Poster'}</td></tr>
            <tr><td style="padding:12px 16px;color:#6b6250;border-top:1px solid #eee6d8">Status</td><td style="padding:12px 16px;border-top:1px solid #eee6d8">Under review — decisions by ${esc(content.notificationDate)}</td></tr>
          </table>`
              : `<p style="margin:22px 0 0;color:#4a5468">You did not submit an abstract. You can still submit one until ${esc(content.abstractDeadline)} by writing to us.</p>`
          }
          <p style="margin:24px 0 0">To change or cancel your registration, just reply to this message.</p>
          <p style="margin:22px 0 0;color:#6b6250">${esc(content.contactName)}<br>
          <a href="mailto:${esc(content.contactEmail)}" style="color:#1f5f8b">${esc(content.contactEmail)}</a></p>
        </td></tr>
        <tr><td style="background:#faf8f3;border-top:1px solid #e3ddcf;padding:16px 32px;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#8a7f66">
          ${esc(content.venue)}, ${esc(content.venueCity)} · ${esc(content.date)}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject, text, html };
}

async function sendConfirmation(reg) {
  const { subject, text, html } = buildConfirmation(reg);
  const message = {
    from: config.smtp.from,
    to: reg.email,
    bcc: config.smtp.bcc || undefined,
    subject,
    text,
    html,
  };

  if (!transporter) {
    fs.mkdirSync(OUTBOX, { recursive: true, mode: 0o700 });
    const file = path.join(OUTBOX, `${Date.now()}-${reg.ref}.eml`);
    fs.writeFileSync(
      file,
      `To: ${message.to}\nFrom: ${message.from}\nSubject: ${subject}\n` +
        `Content-Type: text/html; charset=utf-8\n\n${html}\n`,
      { mode: 0o600 }
    );
    console.warn(
      `[mail] SMTP not configured — confirmation written to ${path.relative(config.root, file)}`
    );
    return { ok: true, mode: 'file', file };
  }

  await transporter.sendMail(message);
  return { ok: true, mode: 'smtp' };
}

async function verifyTransport() {
  if (!transporter) return { ok: false, reason: 'SMTP not configured' };
  try {
    await transporter.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

module.exports = { sendConfirmation, verifyTransport, buildConfirmation };
