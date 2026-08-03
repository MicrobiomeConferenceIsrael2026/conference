# Getting the site online

You have run the Apps Script, so the Google Form exists. Five steps left,
about twenty minutes:

1. [Three settings in the form](#1-three-settings-in-the-form) — Google can't set these for you
2. [Connect the form to the site](#2-connect-the-form-to-the-site)
3. [Look at it before anyone else does](#3-look-at-it-before-anyone-else-does)
4. [Put it on GitHub](#4-put-it-on-github)
5. [Turn on Pages](#5-turn-on-pages)

Then a [checklist](#6-check-it-worked), [how to change things later](#changing-things-later),
and [what to do when something looks wrong](#when-something-looks-wrong).

---

## 1. Three settings in the form

Open your new form and click the **Settings** tab (next to Questions and
Responses). These three cannot be set reliably through the API, and each one
breaks something real if you skip it.

**Responses → Collect email addresses → Responder input**

Needed before the next setting is available.

**Responses → Send responders a copy of their response → Always**

This *is* the confirmation email. Skip it and people submit the form, hear
nothing back, and email you asking whether it worked.

**Responses → Restrict to users in [your organization] → OFF**

If this is on, only Bar-Ilan accounts can register. Everyone else — Weizmann,
Technion, Hopkins, Columbia — sees a permission error. You will not find out
until someone tells you.

Worth turning on while you're there: **Get email notifications for new
responses**, so you see registrations arrive without checking the sheet.

---

## 2. Connect the form to the site

The script printed two URLs in its execution log. If you closed it: open the
form, click **Send → the link icon (🔗)** for the first, then **Send → the embed
icon (< >)** and copy the `src="..."` value for the second.

Open `lib/content.js` and find the `googleForm` block near the top:

```js
googleForm: {
  formUrl:  'https://docs.google.com/forms/d/e/1FAIpQLSc.../viewform',
  embedUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSc.../viewform?embedded=true',
  embedHeight: 1400,
},
```

Then build and check:

```bash
npm run build
npm run smoke
```

`npm run smoke` should end with **29 passed, 0 failed**. It confirms the form is
embedded, that both URLs point at the same form, and that the site will work at
a GitHub Pages sub-path.

While you're in `lib/content.js`, fix the two remaining placeholders:

```js
contactName:  'Conference Secretariat',            // who people should write to
contactEmail: 'microbiome2026@example.ac.il',      // ← replace this
```

---

## 3. Look at it before anyone else does

```bash
npm run preview
```

Opens at <http://localhost:8080>, serving exactly the files GitHub Pages will
serve. The banner also prints a `same Wi-Fi` address — type that into your phone
to check the layout on a real screen.

**Register yourself as a test.** Fill in the embedded form, then confirm:

- a row appeared in the responses spreadsheet
- the confirmation email arrived (check spam)
- answering *No* to the abstract question skipped the abstract pages
- the form isn't cut off or scrolling inside its own box — if it is, adjust
  `embedHeight` in `lib/content.js` and rebuild

Delete your test row from the spreadsheet afterwards.

To show the committee before it's public:

```bash
brew install cloudflared    # once
npm run share
```

That prints a temporary public HTTPS link anyone can open. It dies when you
press Ctrl-C.

---

## 4. Put it on GitHub

Your folder is already a git repository with the whole history committed.
`.env`, `data/` and `node_modules/` are excluded — nothing sensitive gets
pushed. Verify if you like:

```bash
git status --ignored --short | grep '^!!'
```

It should list `.env`, `data/` and `node_modules/`, meaning git is ignoring them.

### The repository has to be public

GitHub Pages only works from **public** repositories on a free account; private
repos need GitHub Pro. That's fine here — the repo holds page templates, CSS and
generated images. No passwords, no keys, and no registration data. That all
lives in your Google account.

### Create it and push

With the GitHub CLI (`gh --version` works):

```bash
cd ~/Documents/Claude/Projects/2026-08-ConferenceWebsite
gh repo create microbiome2026 --public --source=. --remote=origin --push
```

Otherwise, through the website:

1. Go to <https://github.com/new>
2. Repository name: `microbiome2026` — this becomes part of your URL
3. **Public**
4. Do **not** tick "Add a README", ".gitignore" or "license". The repo already
   has those, and pre-adding them causes a conflict on your first push.
5. **Create repository**, then run:

```bash
cd ~/Documents/Claude/Projects/2026-08-ConferenceWebsite
git remote add origin https://github.com/YOUR-USERNAME/microbiome2026.git
git branch -M main
git push -u origin main
```

GitHub will ask you to authenticate — a browser window is easiest. If it asks
for a password in the terminal, it means a personal access token, not your
account password: <https://github.com/settings/tokens> → Generate new token
(classic) → tick `repo`.

---

## 5. Turn on Pages

In your new repository on github.com:

**Settings** → **Pages** (left sidebar) → under *Build and deployment*, set
**Source** to **GitHub Actions**.

That is the only click. There's no branch to pick and no folder to choose —
`.github/workflows/pages.yml` handles it.

Now watch it: the **Actions** tab shows a job called *Deploy to GitHub Pages*.
It installs dependencies, runs `npm run build`, and publishes `docs/`. The first
run takes a minute or two.

When the green tick appears, your site is at:

```
https://YOUR-USERNAME.github.io/microbiome2026/
```

Settings → Pages shows the exact URL at the top.

If the workflow didn't start, push anything — `git commit --allow-empty -m
"trigger" && git push` — or use Actions → Deploy to GitHub Pages → **Run
workflow**.

---

## 6. Check it worked

Open the live URL and go through these. Use your phone for at least a few.

- [ ] The page loads, over **https**
- [ ] Images appear — the hero, the biofilm, the three speaker tiles
- [ ] It reads well on a phone
- [ ] Every nav link jumps to the right section
- [ ] **Register** opens `register.html` with the form embedded, not just linked
- [ ] A test registration reaches the responses spreadsheet
- [ ] The confirmation email arrives
- [ ] *No* to the abstract question skips the abstract pages
- [ ] A colleague outside your institution can open the form
- [ ] Delete your test row

Then send the link round.

---

## Changing things later

Everything the site says is in `lib/content.js` — dates, venue, speakers and
their talks, the program, key dates, abstract rules, the committee, contact.

```bash
# edit lib/content.js
npm run build && npm run smoke
git commit -am "Add fourth speaker"
git push
```

Live in about a minute. Never edit `docs/` by hand — `npm run build` wipes it.

**Changing a form question** is done in Google directly. The URLs don't change,
so the site needs no rebuild. Do it before people start responding if you can:
adding a question later appends a column to the spreadsheet, leaving earlier
rows blank for it.

### A custom domain

If you get something like `microbiome2026.org`:

1. Settings → Pages → **Custom domain**, enter it, save
2. Add the DNS records GitHub shows you, at your registrar
3. Wait for the check to pass, then tick **Enforce HTTPS**
4. Tell me, and I'll make the build write a `CNAME` file into `docs/` — otherwise
   the next build deletes it and the domain silently detaches

---

## When something looks wrong

**404 at the Pages URL.**
Either Source isn't set to GitHub Actions (step 5), or the workflow failed.
The Actions tab shows a red X on the failing step, with its log.

**The page loads but has no styling, and images are missing.**
Absolute paths — the classic Pages failure, because a project site lives under
`/repo-name/`. `npm run smoke` checks for this specifically, so run the build
and the smoke test, then push the result.

**The form area is blank, or says you need permission.**
The form is still restricted to your organization — step 1, third setting. Also
check the form is open: form → Responses tab → *Accepting responses*.

**The embedded form has its own scrollbar.**
`embedHeight` is too small. Raise it in `lib/content.js`, rebuild, push.

**Nobody gets a confirmation email.**
Response receipts aren't on — step 1, second setting. This failure is silent;
testing it yourself is the only way to catch it.

**The Action fails at `npm ci`.**
`package-lock.json` is out of step with `package.json`. Run `npm install`
locally, commit the updated lockfile, push.

**The live site is a version behind.**
You edited `lib/content.js` but committed without running `npm run build`.
The workflow rebuilds on GitHub so this usually self-corrects — but your local
`docs/` will keep showing as modified until you build.

---

## Appendix A — if npm isn't installed

`zsh: command not found: npm` means Node.js isn't on this machine.

Easiest: <https://nodejs.org> → download the **LTS** macOS installer. Apple
Silicon for an M-series Mac, x64 for Intel (Apple menu → About This Mac). Run
it, then **open a new Terminal window**:

```bash
node --version   # v22 or v24
npm --version
```

With Homebrew: `brew install node`.

Two npm warnings you can ignore. `deprecated prebuild-install` is a transitive
dependency, and `allow-scripts … better-sqlite3` only affects the self-hosted
version in Appendix B — the static site touches neither.

---

## Appendix B — the self-hosted version

`server.js` and the rest of `lib/` still implement the original design: its own
registration flow, AES-256-GCM encrypted SQLite, a password-protected organizer
dashboard, confirmation emails over SMTP.

```bash
npm run init-secrets && npm start   # http://localhost:3000
npm run smoke:server                # its own 74-check suite
```

Nothing in the static site depends on it. It exists for one reason: it keeps
registration data under a key only you hold, rather than in Google's systems. If
an abstract is ever confidential enough that this matters, that's the version to
run. It needs a host with a persistent disk — Render's $7/month tier, Fly.io, or
a Node service from your IT department — and `Dockerfile`, `render.yaml` and
`fly.toml` are in the repo ready for it.
