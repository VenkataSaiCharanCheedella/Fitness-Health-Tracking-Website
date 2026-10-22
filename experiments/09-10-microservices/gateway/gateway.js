/* ===================================================
   API Gateway — the single entry point. Port 4000
   /api/users*    -> user-service
   /api/workouts* -> workout-service
   /api/stats     -> stats-service
   /api/status    -> health of every service
   Also serves the web pages in ./public
   =================================================== */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4000;
const SERVICES = {
  'user-service':    process.env.USER_SERVICE_URL    || 'http://localhost:4001',
  'workout-service': process.env.WORKOUT_SERVICE_URL || 'http://localhost:4002',
  'stats-service':   process.env.STATS_SERVICE_URL   || 'http://localhost:4003'
};
const ROUTES = [
  ['/api/users',    'user-service'],
  ['/api/workouts', 'workout-service'],
  ['/api/stats',    'stats-service']
];
const PUBLIC = path.join(__dirname, 'public');
const started = Date.now();

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

async function checkHealth(name, url) {
  const t0 = Date.now();
  try {
    const r = await fetch(url + '/health', { signal: AbortSignal.timeout(1500) });
    return { name, url, ...(await r.json()), responseMs: Date.now() - t0 };
  } catch {
    return { name, url, status: 'down', responseMs: null };
  }
}

async function proxy(req, res, target) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try {
    const upstream = await fetch(target + req.url.replace(/^\/api/, ''), {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: chunks.length ? Buffer.concat(chunks) : undefined
    });
    res.writeHead(upstream.status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    sendJson(res, 503, { error: 'Service unavailable' });
  }
}

const server = http.createServer(async (req, res) => {
  const t0 = Date.now();
  res.on('finish', () => console.log(`[gateway] ${req.method} ${req.url} -> ${res.statusCode} (${Date.now() - t0} ms)`));
  const { pathname } = new URL(req.url, 'http://localhost');

  if (pathname === '/api/status') {
    const services = await Promise.all(Object.entries(SERVICES).map(([n, u]) => checkHealth(n, u)));
    return sendJson(res, 200, {
      gateway: { status: 'up', port: Number(PORT), pid: process.pid, uptimeSeconds: Math.round((Date.now() - started) / 1000) },
      services,
      checkedAt: new Date().toISOString()
    });
  }

  const route = ROUTES.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + '/'));
  if (route) return proxy(req, res, SERVICES[route[1]]);

  // Static pages
  const file = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (!/^[\w-]+\.(html|css|js)$/.test(file)) return sendJson(res, 404, { error: 'Not found' });
  fs.readFile(path.join(PUBLIC, file), (err, data) => {
    if (err) return sendJson(res, 404, { error: 'Not found' });
    const type = { html: 'text/html', css: 'text/css', js: 'text/javascript' }[file.split('.').pop()];
    res.writeHead(200, { 'Content-Type': type + '; charset=utf-8' });
    res.end(data);
  });
});

server.listen(PORT, () => console.log(`[gateway] listening on port ${PORT} (pid ${process.pid})`));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
