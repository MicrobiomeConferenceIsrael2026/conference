'use strict';

/**
 * Confirmation email.
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
    ? `  Abstract    : ${reg.abstract_title}
                (${reg.abstract_type === 'talk' ? 'short talk' : 'poster'}, under review —
                 decisions by ${content.notificationDate})
`
    : '';

  const text = `Hello ${reg.full_name},

You are registered for ${content.title}.

  Reference   : ${reg.ref}
  Date        : ${content.date}, ${content.timeRange}
  Venue       : ${content.venue}, ${content.venueCity}
  Fee         : ${content.fee}
${abstractBlockText}
Keep this email — the reference is how we find you at the desk.
To change or cancel, reply to this message.

${content.contactName} · ${content.contactEmail}
${config.publicUrl}
`;

  const F =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const row = (k, v, first) =>
    `<tr><td style="padding:11px 16px;color:#8b93a3;width:110px${
      first ? '' : ';border-top:1px solid #f0f2f5'
    }">${k}</td><td style="padding:11px 16px${
      first ? '' : ';border-top:1px solid #f0f2f5'
    }">${v}</td></tr>`;

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f6f8;font-family:${F};color:#1c2333">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:28px 12px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e7eaef;border-radius:10px">
        <tr><td style="padding:26px 30px 0">
          <div style="color:#1f97a4;font-size:11px;letter-spacing:.13em;text-transform:uppercase;font-weight:700">Registration confirmed</div>
          <div style="font-size:22px;font-weight:650;letter-spacing:-.02em;margin-top:8px">${esc(content.title)}</div>
        </td></tr>
        <tr><td style="padding:20px 30px 28px;font-size:15px;line-height:1.6">
          <p style="margin:0 0 18px">Hello ${esc(reg.full_name)}, you are registered. Keep this email — the reference below is how we find you at the desk.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e7eaef;border-radius:8px;background:#fcfcfd;font-size:14px">
            ${row('Reference', `<strong style="letter-spacing:.05em">${esc(reg.ref)}</strong>`, true)}
            ${row('Date', `${esc(content.date)}, ${esc(content.timeRange)}`)}
            ${row('Venue', `${esc(content.venue)}<br><span style="color:#8b93a3">${esc(content.venueCity)}</span>`)}
            ${row('Fee', esc(content.fee))}
            ${
              reg.submits_abstract
                ? row(
                    'Abstract',
                    `${esc(reg.abstract_title)}<br><span style="color:#8b93a3">${
                      reg.abstract_type === 'talk' ? 'Short talk' : 'Poster'
                    } · under review, decisions by ${esc(content.notificationDate)}</span>`
                  )
                : ''
            }
          </table>
          <p style="margin:20px 0 0;color:#545d70;font-size:14px">To change or cancel, just reply to this message.</p>
          <p style="margin:16px 0 0;color:#8b93a3;font-size:14px">${esc(content.contactName)} ·
          <a href="mailto:${esc(content.contactEmail)}" style="color:#16707a">${esc(content.contactEmail)}</a></p>
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
