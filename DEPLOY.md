# Getting this online

The site is static and lives on GitHub Pages; registration is a Google Form.
Parts 0–3 are the whole setup, start to finish, roughly half an hour.

Part 4 covers the alternative — running the self-hosted Node version instead —
and is only relevant if you decide Google should not hold the registration data.

---

## Part 0 — `zsh: command not found: npm`

Node.js is not installed on your Mac. `npm` comes with it. Pick one:

### The easy way (no terminal)

1. Go to <https://nodejs.org>
2. Download the **LTS** macOS installer (`.pkg`). Pick the **Apple Silicon**
   build for an M1/M2/M3/M4 Mac, **x64** for an Intel one. If unsure:
    - Apple menu → About This Mac → look at "Chip" or "Processor".
3. Double-click the `.pkg`, click through the installer.
4. **Close Terminal and open a new window** (it will not see the new command
   otherwise), then check:

```bash
node --version    # should print v22.x or v24.x
npm --version     # should print 10.x or 11.x
```

### The Homebrew way

If you have Homebrew (`brew --version` works):

```bash
brew install node
```

If you do not have Homebrew and would rather not install it, use the installer
above — it is the same result with fewer moving parts.

### Then

```bash
cd ~/Documents/Claude/Projects/2026-08-ConferenceWebsite
npm install
npm run init-secrets
npm start
```

Open <http://localhost:3000>. Stop the server with `Ctrl-C`.

> **Do you even need Node locally?** No. If you only want the site *online*,
> skip to Part 2 and let the host build it. Running it locally is just the
> quickest way to look at your edits before anyone else sees them.

### Things npm says that you can ignore

`npm install` is chatty. These three are normal:

**"1 high severity vulnerability" / `npm audit`** — this was real: an old
`nodemailer` with an SMTP-injection flaw. It is fixed; `package.json` now pins
`nodemailer ^9.0.3` and `npm audit` reports zero. If you installed before that
fix, run `npm install` once more. Never run `npm audit fix --force` on a whim —
it upgrades across breaking changes without asking.

**"npm warn allow-scripts … better-sqlite3"** — newer npm asks before letting a
package run an install script. `better-sqlite3` uses one to fetch its prebuilt
binary. Either allow it:

```bash
npm approve-scripts better-sqlite3 && npm install
```

...or ignore it entirely. The site detects a missing binary and falls back to
Node's own built-in SQLite (`node:sqlite`, Node 22.5+). The database file is
byte-identical either way, so this changes nothing you can see.

**"npm warn deprecated prebuild-install"** — a transitive dependency of
`better-sqlite3`, not something in this project. Nothing to do.

---

## Part 0.5 — Show it to people without deploying anything

You do not need hosting to test the site, open it on your phone, or send a link
to the committee. Three ways, in increasing reach.

### Your own phone, over Wi-Fi

```bash
npm run preview
```

The banner prints a `same Wi-Fi` line — something like
`http://192.168.1.24:8080`. Type that into your phone's browser. Your phone and
your Mac have to be on the same network, and macOS may ask you to allow
incoming connections the first time.

Good for checking the layout on a real phone. Useless for anyone not in the
building.

### A temporary public link — for collaborators

```bash
npm run share
```

This rebuilds `docs/`, serves it exactly as GitHub Pages will, and puts a
Cloudflare tunnel in front of it, giving you a real HTTPS address like `https://weekly-tiger-forest.trycloudflare.com`. Send it
to anyone, anywhere. It works on phones, it works through firewalls, and there
is no signup.

One-time setup:

```bash
brew install cloudflared
```

If you skip that, `npm run share` tells you the alternatives — including
`npx localtunnel --port 3000`, which needs nothing installed.

What to know before you send the link:

- **It only lives while the command runs.** Close the terminal, shut the laptop,
  or lose Wi-Fi and the link dies. Every run generates a different address.
- **It is genuinely public** — anyone with the URL can open it.
- **The form is live.** Anything submitted through it lands in your real
  responses spreadsheet. Delete test rows afterwards.

This is the right tool for "have a look and tell me what you think" before the
site is published.

---

## Part 1 — Put it in git

The repository is already configured to keep secrets out: `.gitignore` excludes
`.env`, `data/` and `node_modules/`. Nothing sensitive gets committed.

```bash
cd ~/Documents/Claude/Projects/2026-08-ConferenceWebsite
git init
git add .
git commit -m "Conference site"
```

Then create an empty repository on GitHub — **private**, unless you want the
world reading your draft program — and push:

```bash
git remote add origin https://github.com/YOUR-USERNAME/microbiome-2026.git
git branch -M main
git push -u origin main
```

Sanity check before you push, if you like:

```bash
git status --ignored --short | grep '^!!'    # should list .env, data/, node_modules/
```

Never commit `.env`. If you ever do by accident, treat `MASTER_KEY` as burnt:
generate a new one, and accept that anything already registered under the old
key is unreadable.

---

## Part 2 — Create the Google Form

The form is the registration system: it collects the answers, emails each
person a copy as their confirmation, and appends a row to a spreadsheet you own.

### Build it with the script (5 minutes)

Rather than clicking twelve questions into existence, run the script in
`tools/create-google-form.gs`:

1. Open <https://script.google.com> → **New project**
2. Delete the sample code, paste in the whole of `tools/create-google-form.gs`
3. Press **Run** ( ▷ ). Approve the permission prompt — it is asking to create a
   form and a spreadsheet in *your* Drive.
4. Open **Execution log**. It prints the two URLs you need.

The script creates every question, sets the email validation and the 300-word
limit, and — the fiddly part — wires the branch so that answering "No" to *are
you submitting an abstract?* skips the abstract questions entirely.

### Three settings you must set by hand

Google's API cannot reliably set these, so open the form → **Settings**:

1. **Responses → Collect email addresses → Responder input**
2. **Responses → Send responders a copy of their response → Always**
   *This is the confirmation email.* Without it, nobody hears anything back.
3. **Responses → Restrict to users in your organization → OFF**
   Leave this on and only Bar-Ilan accounts can register. Everyone else sees a
   permission error, and you will not find out until someone complains.

Optional but useful: **Get email notifications for new responses**.

### Connect it to the site

The script printed a `formUrl` and an `embedUrl`. Put them in
`lib/content.js`:

```js
googleForm: {
  formUrl:  'https://docs.google.com/forms/d/e/1FAIpQLS…/viewform',
  embedUrl: 'https://docs.google.com/forms/d/e/1FAIpQLS…/viewform?embedded=true',
  embedHeight: 1400,
},
```

Then:

```bash
npm run build
npm run smoke     # confirms the form is embedded and points where you think
```

If `embedHeight` is wrong the form gets its own scrollbar inside the page, which
looks bad. Open `register.html`, see how tall the form actually is, adjust.

### Test it properly before announcing

Register yourself. Check that the row appears in the spreadsheet, that the
confirmation email arrives, and that answering "No" to the abstract question
really does skip those pages. Then delete your test row.

---

## Part 3 — Publish on GitHub Pages

```bash
git add .
git commit -m "Conference site"
git push
```

Then in the repository: **Settings → Pages → Build and deployment → Source:
GitHub Actions**. That is the only click required.

`.github/workflows/pages.yml` runs `npm run build` on every push to `main` and
publishes `docs/`. If the build fails, the run fails and the old site stays up —
it will not publish something broken.

Your address is `https://YOUR-USERNAME.github.io/REPO-NAME/`. The site is built
with relative paths, so it works at that sub-path as well as at a domain root;
`npm run smoke` checks this specifically, because absolute paths are the usual
way a Pages site breaks.

### A custom domain

Settings → Pages → Custom domain. Add the DNS records GitHub shows you, tick
**Enforce HTTPS**, and create a file called `CNAME` in `docs/` containing just
the domain. Add it to `tools/build-static.js` so it survives rebuilds — `docs/`
is wiped on every build.

### Updating the site later

Edit `lib/content.js`, then:

```bash
npm run build && npm run smoke
git commit -am "Add fourth speaker"
git push
```

Live in about a minute. You never touch `docs/` by hand.

---

## Part 4 — The alternative: self-host the Node version

Everything below applies only if you abandon Google Forms and run `server.js`
instead — registration under your own encryption key, your own admin dashboard,
your own confirmation emails. It needs a host that runs Node **and gives you a
disk that survives restarts**, because registrations live in a SQLite file.

Set `NODE_ENV=production` on any real host. It switches on HSTS and
HTTPS-only cookies. Do **not** set it if you are on plain `http://`, or you
will not be able to log in to the admin area.

Get your secrets first — this prints them without writing a file:

```bash
npm run keys -- --user omry --password 'a long passphrase you choose'
```

Copy the output somewhere safe. `MASTER_KEY` especially: it is the only thing
that can decrypt the registrations.

---

### Option A — Render (simplest, ~$7/month for the disk)

`render.yaml` in this repo describes the whole service.

1. Push to GitHub (Part 1).
2. <https://render.com> → **New** → **Blueprint** → choose your repo.
3. Render reads `render.yaml`, creates the web service, generates `MASTER_KEY`
   and `SESSION_SECRET` for you, and attaches a 1 GB disk at `/var/data`.
4. In the service's **Environment** tab, fill in the values marked as needing
   input: `PUBLIC_URL` (the URL Render gives you), `ADMIN_USER`,
   `ADMIN_PASSWORD_HASH` (from `npm run keys`), and the SMTP settings.
5. Deploy. HTTPS and a `onrender.com` subdomain come free; add your own domain
   under **Settings → Custom Domain**.

The free tier has **no persistent disk** — registrations would vanish on every
redeploy. Use the paid Starter plan, or Option B.

**Once it is live, immediately go to `/admin/login` and check you can sign in.**
Then submit a test registration and delete it from the admin page.

---

### Option B — Your university's server (free, most control)

Ask the Bar-Ilan / Weizmann IT people: *"can you host a small Node.js service
behind the department web server?"* Most will. Give them this:

```bash
git clone https://github.com/YOUR-USERNAME/microbiome-2026.git /opt/microbiome
cd /opt/microbiome
npm install --omit=dev
npm run keys > /opt/microbiome/.env     # then edit PUBLIC_URL and SMTP
chmod 600 .env
```

**systemd unit** — `/etc/systemd/system/microbiome.service`:

```ini
[Unit]
Description=Microbiome 2026 conference site
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/microbiome
EnvironmentFile=/opt/microbiome/.env
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/opt/microbiome/data

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable --now microbiome
systemctl status microbiome
```

**nginx** — in the existing server block:

```nginx
location / {
    proxy_pass         http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
}
```

Certificate: `certbot --nginx -d microbiome2026.biu.ac.il`, or whatever your IT
department already uses.

**Back up** `/opt/microbiome/data/` on a schedule, and keep `MASTER_KEY` in a
password manager somewhere *other* than that server. A backup of the database
without the key is worthless; the key without the database is likewise.

---

### Option C — Docker (anywhere)

```bash
npm run keys > .env      # edit PUBLIC_URL, add SMTP
docker compose up -d
docker compose logs -f
```

The named volume `conference-data` holds the database. Back it up with:

```bash
docker run --rm -v conference-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/registrations-backup.tgz -C /data .
```

Works the same on a DigitalOcean droplet, a lab machine, or your institution's
container platform.

---

### Option D — Fly.io (cheap, global)

`fly.toml` is included.

```bash
fly launch --no-deploy --copy-config
fly volumes create conference_data --size 1
fly secrets set MASTER_KEY=... SESSION_SECRET=... \
                ADMIN_USER=omry ADMIN_PASSWORD_HASH='...' \
                PUBLIC_URL=https://microbiome-2026.fly.dev
fly deploy
```

Edit `app` and `primary_region` in `fly.toml` first (`fra` = Frankfurt, the
closest region to Israel; `cdg` and `ams` also work).

---

## After it is live — the checklist

- [ ] The site loads at your Pages URL, over **https**
- [ ] Every image appears (a blank hero means an absolute-path problem)
- [ ] It looks right on a phone
- [ ] The registration form loads embedded, not just as a link
- [ ] A test registration reaches the responses spreadsheet
- [ ] The confirmation email arrives — check spam
- [ ] Answering "No" to the abstract question skips the abstract pages
- [ ] The form is **not** restricted to your organization
- [ ] The committee can open the responses spreadsheet
- [ ] Delete your test row

---

## Changing things later

The whole conference — text, dates, speakers, program, committee — is in
`lib/content.js`.

```bash
npm run build && npm run smoke
git commit -am "…" && git push
```

Pages republishes in about a minute.

To change a **question on the form**, edit the form in Google directly. The URLs
do not change, so the site needs no rebuild. Changing questions after people have
started responding adds columns to the spreadsheet rather than rewriting old
rows — do it early if you are going to do it.
