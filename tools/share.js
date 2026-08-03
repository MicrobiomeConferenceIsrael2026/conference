#!/usr/bin/env node
'use strict';

/**
 * Puts the built site on a temporary public HTTPS address, so you can open it
 * on your phone and send the link to collaborators before publishing.
 *
 *   npm run share
 *
 * Rebuilds docs/, serves it exactly as GitHub Pages would, then opens a
 * Cloudflare quick tunnel in front of it. You get a URL like
 * https://weekly-tiger-forest.trycloudflare.com that works from anywhere, for
 * as long as this command keeps running.
 *
 * Needs cloudflared:  brew install cloudflared
 * If it is missing, this prints the alternatives instead of failing.
 */

const { spawn, spawnSync } = require('child_process');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = process.env.PREVIEW_PORT || '8080';

const C = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
};

function lanAddresses() {
  return Object.entries(os.networkInterfaces())
    .flatMap(([name, addrs]) =>
      (addrs || [])
        .filter((a) => a.family === 'IPv4' && !a.internal)
        .map((a) => ({ name, address: a.address }))
    );
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

  A single binary from Cloudflare. No account, no signup.

  ${C.bold('Option 2 — no install, works right now')}

      npm run preview                    ${C.dim('# in this window')}
      npx localtunnel --port ${PORT}        ${C.dim('# in a second window')}

  Slower and occasionally flaky, and it may show visitors an interstitial the
  first time, but it needs nothing installed.

  ${C.bold('Option 3 — your phone only, over Wi-Fi')}

      npm run preview
${
  lan.length
    ? lan
        .map((l) => `      then open  ${C.cyan(`http://${l.address}:${PORT}`)}  ${C.dim(`(${l.name})`)}`)
        .join('\n')
    : `      then open  http://<your-mac-ip>:${PORT}`
}

  Same Wi-Fi only — fine for your own phone, no use for collaborators.
`);
}

/* -------------------------------------------------------------------------- */

console.log('\n  Building docs/ …');
const build = spawnSync(process.execPath, ['tools/build-static.js'], {
  cwd: ROOT,
  encoding: 'utf8',
});
process.stdout.write(C.dim(build.stdout || ''));
if (build.status !== 0) {
  process.stderr.write(build.stderr || '');
  console.error('\n  Build failed — nothing to share.\n');
  process.exit(1);
}

const server = spawn(process.execPath, ['tools/preview.js'], {
  cwd: ROOT,
  env: { ...process.env, PREVIEW_PORT: PORT },
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', (d) => process.stdout.write(C.dim(d.toString())));
server.stderr.on('data', (d) => process.stderr.write(C.dim(d.toString())));
server.on('exit', (code) => {
  if (code) console.error(`\n  The preview server exited with code ${code}.`);
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
    const m = buf.toString().match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (m && !announced) {
      announced = true;
      console.log(`
  ${'─'.repeat(64)}

    ${C.green('Your site is live at')}

      ${C.bold(C.cyan(m[0]))}

    Open it on your phone, or send that link to anyone.

  ${'─'.repeat(64)}

  ${C.yellow('This is the real static site')} — the same files GitHub Pages will
  serve. The registration form is your live Google Form, so anything submitted
  through it lands in your real responses sheet.

  The address dies the moment you press Ctrl-C, and a new one is generated
  next time. ${C.dim('Ctrl-C to stop.')}
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
}, 900);

function shutdown() {
  console.log('\n  Stopping …');
  if (tunnel) tunnel.kill('SIGTERM');
  server.kill('SIGTERM');
  setTimeout(() => process.exit(0), 400);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
