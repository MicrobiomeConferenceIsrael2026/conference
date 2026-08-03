#!/usr/bin/env node
'use strict';

/**
 * Serves docs/ exactly the way GitHub Pages will.
 *
 *   npm run preview        -> http://localhost:8080
 *
 * Used on its own to check the built site, and by tools/share.js behind a
 * tunnel. Deliberately dumb: no rendering, no state, just files on disk.
 */

const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const DOCS = path.join(__dirname, '..', 'docs');
const PORT = parseInt(process.env.PREVIEW_PORT || process.env.PORT || '8080', 10);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

if (!fs.existsSync(path.join(DOCS, 'index.html'))) {
  console.error('\n  docs/ has not been built yet. Run:  npm run build\n');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath.endsWith('/')) urlPath += 'index.html';

  const file = path.normalize(path.join(DOCS, urlPath));
  if (!file.startsWith(DOCS)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    const notFound = path.join(DOCS, '404.html');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.existsSync(notFound) ? fs.readFileSync(notFound) : 'Not found');
    return;
  }

  res.writeHead(200, {
    'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  res.end(fs.readFileSync(file));
});

if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    const lan = Object.values(os.networkInterfaces())
      .flat()
      .filter((a) => a && a.family === 'IPv4' && !a.internal)
      .map((a) => a.address);

    console.log(`\n  Static preview of docs/ — this is exactly what GitHub Pages will serve.\n`);
    console.log(`  this computer   http://localhost:${PORT}`);
    for (const ip of lan) console.log(`  same Wi-Fi      http://${ip}:${PORT}`);
    console.log(`  anywhere        npm run share\n`);
    console.log(`  Ctrl-C to stop.\n`);
  });
}

module.exports = server;
