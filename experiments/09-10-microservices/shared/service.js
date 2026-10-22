/* ===================================================
   Tiny helper shared by every microservice:
   routing, JSON responses, body parsing, request
   logging and a standard /health endpoint.
   Uses only built-in Node.js modules.
   =================================================== */

const http = require('http');

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(status === 204 ? '' : JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve(null); }
    });
  });
}

/**
 * routes: [[method, '/path/:param', handler], ...]
 * handler(ctx) returns { status, body } (or a Promise of it)
 */
function createService({ name, port, routes }) {
  const started = Date.now();
  let requests = 0;

  // Turn '/users/:id' into a regular expression with named groups
  const compiled = routes.map(([method, pattern, handler]) => ({
    method,
    handler,
    regex: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '/?$')
  }));

  const server = http.createServer(async (req, res) => {
    requests++;
    const t0 = Date.now();
    res.on('finish', () => console.log(`[${name}] ${req.method} ${req.url} -> ${res.statusCode} (${Date.now() - t0} ms)`));

    const url = new URL(req.url, 'http://localhost');

    if (url.pathname === '/health') {
      return sendJson(res, 200, {
        service: name, status: 'up', port: Number(port), pid: process.pid,
        uptimeSeconds: Math.round((Date.now() - started) / 1000), requestsServed: requests
      });
    }

    for (const r of compiled) {
      const match = url.pathname.match(r.regex);
      if (!match || r.method !== req.method) continue;

      const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readBody(req) : {};
      if (body === null) return sendJson(res, 400, { error: 'Body must be valid JSON' });

      try {
        const { status = 200, body: out } = await r.handler({ params: match.groups || {}, query: url.searchParams, body });
        return sendJson(res, status, out);
      } catch (err) {
        console.error(`[${name}] error:`, err.message);
        return sendJson(res, err.status || 500, { error: err.publicMessage || 'Internal error' });
      }
    }

    sendJson(res, 404, { error: 'Not found' });
  });

  server.listen(port, () => console.log(`[${name}] listening on port ${port} (pid ${process.pid})`));
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
  return server;
}

// Call another service; turns network failures into a clear 503 error
async function callService(baseUrl, path, options = {}) {
  let res;
  try {
    res = await fetch(baseUrl + path, { headers: { 'Content-Type': 'application/json' }, ...options });
  } catch {
    const err = new Error('Service unavailable: ' + baseUrl);
    err.status = 503;
    err.publicMessage = 'A required service is unavailable, please try again';
    throw err;
  }
  const data = res.status === 204 ? null : await res.json();
  return { status: res.status, data };
}

module.exports = { createService, callService };
