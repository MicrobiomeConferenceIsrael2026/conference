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
world reading your draft programme — and push:

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
- [ ] The confirmation e-mail actually lands (check spam)
- [ ] `MASTER_KEY` is in a password manager
- [ ] `data/` is backed up somewhere automatic
- [ ] `PUBLIC_URL` matches the real address
- [ ] Delete your test registration

---

## Changing things later

The whole conference — text, dates, speakers, programme, committee — is in
`lib/content.js`. Edit it, then:

- **local:** `Ctrl-C`, `npm start`
- **Render / Fly:** `git push` (they redeploy automatically)
- **your own server:** `git pull && systemctl restart microbiome`
- **Docker:** `git pull && docker compose up -d --build`

Run `npm run smoke` after any change you are unsure about — 64 checks, about two
seconds, and it tells you if you broke something.

Upgrading Node or dependencies never touches `data/`, so registrations are safe
across redeploys as long as the volume is mounted.
