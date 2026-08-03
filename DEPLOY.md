# Getting this online

Three parts, in order: **install Node**, **put it in git**, **pick a host**.
Skip to whichever part you need.

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
npm start
```

The startup banner now prints a `same Wi-Fi` line — something like
`http://192.168.1.24:3000`. Type that into your phone's browser. Your phone and
your Mac have to be on the same network, and macOS may ask you to allow
incoming connections the first time.

Good for checking the layout on a real phone. Useless for anyone not in the
building.

### A temporary public link — for collaborators

```bash
npm run share
```

This starts the server and puts a Cloudflare tunnel in front of it, giving you a
real HTTPS address like `https://weekly-tiger-forest.trycloudflare.com`. Send it
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
- **It is genuinely public.** Anyone with the URL can register, and `/admin/login`
  is reachable too. Rate limiting and the password still apply, but treat
  anything submitted as test data and clear it afterwards.
- **Registrations are real** and land in your local `data/registrations.db`.
  Delete the test ones from the admin page when you're done, or stop the server
  and delete `data/` to start clean.
- Confirmation emails still go to `data/outbox/` unless you have configured SMTP.

This is the right tool for "have a look and tell me what you think". It is not
a way to run the actual conference — for that you need Part 2.

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

## Part 2 — Pick a host

You need somewhere that runs Node **and gives you a disk that survives
restarts**, because the registrations live in a SQLite file. That rules out
GitHub Pages, Netlify and Vercel — they only serve static files or short-lived
functions.

### Why GitHub Pages can't do this

GitHub Pages serves files. It runs no code of yours, has no database, and has
nowhere to put anything a visitor submits. That isn't a limit you can engineer
around — a registration form needs *something* on the other end to receive the
submission, and Pages has no other end.

So "the same site, but on GitHub Pages" isn't a smaller version of this project;
it's a different architecture. The realistic variants:

| Approach | Effort | Where registrations live | Honest assessment |
|---|---|---|---|
| **Pages + Google Form** | ~1 hour | Google's servers | Fine, and genuinely secure — but it's Google's security, not yours. No encryption under your key, the form looks like a Google form, and abstracts land in a spreadsheet. |
| **Pages + Formspree / Netlify Forms** | ~1 hour | The vendor | Same trade. Free tiers cap out around 50–100 submissions/month, which a conference will exceed. |
| **Cloudflare Pages + Workers + D1** | ~1 day | Cloudflare's database, encrypted with your key | The real answer if you want free, git-push deploys, and the current security model. Not GitHub Pages, but it deploys *from* your GitHub repo the same way. Free tier covers a conference comfortably. |
| **Keep what you have** | done | Your server, your key | Already built and tested. Needs a host that runs Node — Render, Fly, or your university. |

The thing you'd give up in the first two rows is the property that took the most
care to build: personal data and unpublished abstracts encrypted at rest with a
key that only you hold. On Google Forms, Google can read every abstract. That
may be perfectly acceptable to you — plenty of conferences run on Google Forms —
but it's the actual trade, so it's worth naming rather than discovering later.

If free-and-git-deployed is the requirement, the Cloudflare row is the one to
pick. Roughly a day of work: the pages and CSS carry over unchanged, the Express
routes become Worker handlers, SQLite becomes D1 (same SQL), and the encryption
and session code port almost as-is since they're plain Web Crypto and cookies.
Say the word and I'll do it.

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

- [ ] `/healthz` returns `{"ok":true,...}`
- [ ] The site loads over **https**, not http
- [ ] You can sign in at `/admin/login`
- [ ] A test registration arrives in the admin table
- [ ] The confirmation email actually lands (check spam)
- [ ] `MASTER_KEY` is in a password manager
- [ ] `data/` is backed up somewhere automatic
- [ ] `PUBLIC_URL` matches the real address
- [ ] Delete your test registration

---

## Changing things later

The whole conference — text, dates, speakers, program, committee — is in
`lib/content.js`. Edit it, then:

- **local:** `Ctrl-C`, `npm start`
- **Render / Fly:** `git push` (they redeploy automatically)
- **your own server:** `git pull && systemctl restart microbiome`
- **Docker:** `git pull && docker compose up -d --build`

Run `npm run smoke` after any change you are unsure about — 64 checks, about two
seconds, and it tells you if you broke something.

Upgrading Node or dependencies never touches `data/`, so registrations are safe
across redeploys as long as the volume is mounted.
