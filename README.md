# Microbiome 2026 — conference site

A static conference website published on GitHub Pages, with registration handled
by a Google Form. No server to run, no database to back up, nothing to pay for.

```
lib/content.js   →   npm run build   →   docs/   →   GitHub Pages
```

---

## Everyday use

```bash
npm install       # once
npm run build     # renders docs/ from lib/content.js
npm run preview   # build, then serve it at http://localhost:8080
npm run share     # build, serve, and open a temporary public HTTPS link
npm run smoke     # 29 checks against the built site
```

`zsh: command not found: npm` means Node.js is not installed —
[DEPLOY.md](DEPLOY.md) Appendix A, about two minutes.

**To change anything on the site, edit `lib/content.js`.** Dates, venue,
speakers and their talks, the program, key dates, abstract rules, the committee,
the contact address — all of it lives in that one file. Then `npm run build` and
push.

---

## Setting it up (one time)

**[DEPLOY.md](DEPLOY.md) is the step-by-step guide.** In outline:

1. Run `tools/create-google-form.gs` at <https://script.google.com> — it builds
   the whole form, branch and all, and prints two URLs
2. Change three settings in the form by hand (Google's API can't set them, and
   each one breaks something if missed)
3. Paste the two URLs into `googleForm` in `lib/content.js`, `npm run build`
4. Push to GitHub — the repo must be **public** for Pages on a free account
5. Settings → Pages → Source: **GitHub Actions**

After that, `.github/workflows/pages.yml` rebuilds and republishes on every push
to `main`.

---

## What happens when someone registers

They fill in the Google Form embedded on `register.html`. Google stores the
response, emails them a copy as their confirmation, and appends a row to your
responses spreadsheet. You read registrations in that spreadsheet.

There is no admin area, because there is no server. The spreadsheet is the admin
area: filter it, sort it, share it with the committee, export it.

**Be clear-eyed about where the data lives.** Names, email addresses,
affiliations and unpublished abstracts sit in Google's systems under your Google
account. Google's security is good, but it is Google's — not encryption under a
key only you hold. If an abstract is confidential enough that this matters, say
so on the form, or use the Node version below instead.

Practical notes:

- Restrict the form to your organization and only Bar-Ilan accounts can
  register. Leave that setting **off**.
- Google Forms has no real submission cap for a meeting this size.
- Response receipts must be switched on manually — Settings → Responses → *Send
  responders a copy of their response* → **Always**. Without it, nobody gets a
  confirmation.

---

## Where things are

```
lib/content.js            ← EVERYTHING you edit
views/                    page templates (EJS)
public/css/site.css       the whole design
public/img/               generated imagery — see tools/generate_images.py
tools/
  build-static.js         renders docs/          (npm run build)
  preview.js              serves docs/           (npm run preview)
  share.js                temporary public link  (npm run share)
  test-static.js          29 checks              (npm run smoke)
  create-google-form.gs   builds the form   — paste into script.google.com
  enforce-english.gs      English-only answers — paste into script.google.com
docs/                     the built site — committed, this is what Pages serves
.github/workflows/        rebuild + publish on push
```

Do not edit `docs/` by hand; `npm run build` overwrites it.

---

## The Node version is still here

The original self-hosted app — its own registration flow, encrypted SQLite,
password-protected organizer dashboard, confirmation emails over SMTP — is
intact: `server.js`, `lib/db.js`, `lib/crypto.js`, `views/register-step*.ejs`.

```bash
npm run init-secrets && npm start   # http://localhost:3000
npm run smoke:server                # its own 74-check suite
```

It needs a host that runs Node and keeps a disk (Render, Fly, your university —
see DEPLOY.md Appendix B). Nothing depends on it now, and deleting it would not
affect the static site. It is there if you ever want registration data under
your own key instead of Google's.
