/* ===================================================
   Experiment 5 — Creation of a web server using Node.js
   Serves the FitLife website with only built-in modules
   (no Express), plus two small JSON endpoints.
   Run:  node server.js     then open http://localhost:3000
   =================================================== */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT    = process.env.PORT || 3000;
const SITE    = path.resolve(__dirname, '../..');   // folder with index.html, style.css, app.js
const STARTED = Date.now();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon'
};

// Only these files of the project are public; everything else returns 404
const PUBLIC_FILES = new Set(['/index.html', '/style.css', '/app.js', '/hero.png']);

let requestCount = 0;

function log(req, status, started) {
  const ms = (Date.now() - started).toString().padStart(3);
  console.log(`${new Date().toLocaleTimeString('en-GB')}  ${req.method.padEnd(4)} ${status}  ${ms} ms  ${req.url}`);
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': MIME['.json'] });
  res.end(JSON.stringify(data, null, 2));
}

const server = http.createServer((req, res) => {
  const started = Date.now();
  requestCount++;
  res.on('finish', () => log(req, res.statusCode, started));

  const url = new URL(req.url, `http://${req.headers.host}`);

  // ── API routes
  if (url.pathname === '/api/health') {
    return sendJson(res, 200, {
      status: 'ok',
      uptimeSeconds: Math.round((Date.now() - STARTED) / 1000),
      requestsServed: requestCount,
      node: process.version
    });
  }

  if (url.pathname === '/api/time') {
    return sendJson(res, 200, { serverTime: new Date().toISOString() });
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  // ── Static files
  const requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  if (!PUBLIC_FILES.has(requested)) {
    res.writeHead(404, { 'Content-Type': MIME['.html'] });
    return res.end('<h1>404 — Page not found</h1><p><a href="/">Back to FitLife</a></p>');
  }

  const filePath = path.join(SITE, requested);
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end('Server error');
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log('FitLife web server (Node.js ' + process.version + ')');
  console.log('Serving files from ' + SITE);
  console.log(`Listening on http://localhost:${PORT}  (press Ctrl+C to stop)\n`);
});

// Shut down cleanly on Ctrl+C
process.on('SIGINT', () => {
  console.log('\nStopping server...');
  server.close(() => process.exit(0));
});
