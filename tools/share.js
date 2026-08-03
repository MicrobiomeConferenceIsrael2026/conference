#!/usr/bin/env node
'use strict';

/**
 * Put the site on a temporary public HTTPS address so you can open it on your
 * phone and send the link to collaborators — without deploying anything.
 *
 *   npm run share
 *
 * Starts the server, then opens a Cloudflare quick tunnel in front of it. You
 * get a URL like https://weekly-tiger-forest.trycloudflare.com that works from
 * anywhere, on any device, for as long as this command keeps running.
 *
 * Needs cloudflared:  brew install cloudflared
 * If it is missing, this prints the alternatives instead of failing.
 */

const { spawn, spawnSync } = require('child_process');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || '3000';

const C = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
};

function lanAddresses() {
  const out = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family === 'IPv4' && !a.internal) out.push({ name, address: a.address });
    }
  }
  return out;
}

function have(cmd) {
  return spawnSync('which', [cmd], { encoding: 'utf8' }).status === 0;
}

function explainMissingCloudflared() {
  const lan = lanAddresses();
  console.log(`
  ${C.bold('cloudflared is not installed.')}

  ${C.bold('Option 1 — install it (recommended, 30 seconds)')}

      brew install cloudflared
      npm run share

  It is a single binary from Cloudflare, no account and no signup needed.

  ${C.bold('Option 2 — no install, works right now')}

      npm start                          ${C.dim('# in this window')}
      npx localtunnel --port ${PORT}        ${C.dim('# in a second window')}

  Slower and occasionally flaky, but it needs nothing installed. It may show
  an interstitial page asking visitors to click through the first time.

  ${C.bold('Option 3 — your phone only, over Wi-Fi')}

      npm start
${
  lan.length
    ? lan.map((l) => `      then open  ${C.cyan(`http://${l.address}:${PORT}`)}  ${C.dim(`(${l.name})`)}`).join('\n')
    : '      then open  http://<your-mac-ip>:' + PORT
}

  Same Wi-Fi network only — fine for testing on your own phone, no use for
  collaborators elsewhere.
`);
}

/* -------------------------------------------------------------------------- */

console.log(`\n  Starting the site on port ${PORT} …`);

const server = spawn(process.execPath, ['server.js'], {
  cwd: ROOT,
  env: {
    ...process.env,
    PORT,
    // Behind the tunnel every request arrives from 127.0.0.1; without this the
    // per-IP rate limits would apply to all visitors as a single bucket.
    TRUST_PROXY: 'true',
    // Deliberately NOT production: production forces HTTPS-only cookies, and
    // the tunnel terminates TLS before us, so login would break.
    NODE_ENV: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

server.stdout.on('data', (d) => process.stdout.write(C.dim(d.toString())));
server.stderr.on('data', (d) => process.stderr.write(C.dim(d.toString())));
server.on('exit', (code) => {
  if (code) console.error(`\n  The server exited with code ${code}.`);
  process.exit(code || 0);
});

let tunnel = null;
let announced = false;

setTimeout(() => {
  if (!have('cloudflared')) {
    explainMissingCloudflared();
    server.kill('SIGTERM');
    process.exit(1);
  }

  console.log('  Opening a public tunnel …\n');

  tunnel = spawn('cloudflared', ['tunnel', '--url', `http://127.0.0.1:${PORT}`], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const scan = (buf) => {
    const text = buf.toString();
    const m = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (m && !announced) {
      announced = true;
      const url = m[0];
      console.log(`
  ${'─'.repeat(64)}

    ${C.green('Your site is live at')}

      ${C.bold(C.cyan(url))}

    Open it on your phone, or send that link to anyone.
    ${C.dim('Organizer login: ' + url + '/admin/login')}

  ${'─'.repeat(64)}

  ${C.yellow('While this is running, the link is public.')} Anyone with the URL
  can register, so treat submissions as test data. The address dies the moment
  you press Ctrl-C, and a new one is generated next time.

  ${C.dim('Press Ctrl-C to stop both the tunnel and the server.')}
`);
    }
  };

  tunnel.stdout.on('data', scan);
  tunnel.stderr.on('data', scan);
  tunnel.on('exit', (code) => {
    if (!announced) console.error(`\n  cloudflared exited with code ${code}.`);
    server.kill('SIGTERM');
    process.exit(code || 0);
  });
}, 1200);

function shutdown() {
  console.log('\n  Stopping …');
  if (tunnel) tunnel.kill('SIGTERM');
  server.kill('SIGTERM');
  setTimeout(() => process.exit(0), 400);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
