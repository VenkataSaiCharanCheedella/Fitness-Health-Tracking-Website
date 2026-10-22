/* ===================================================
   Experiment 10 — Deployment of microservices
   Starts every service as its own Node.js process,
   waits until each one reports healthy, prints a
   status table, and restarts a service if it crashes.
   (For containers, use docker-compose.yml instead.)
   Run:  node deploy.js
   =================================================== */

const { spawn } = require('child_process');
const path = require('path');

const DEPLOYMENT = [
  { name: 'user-service',    file: 'services/user-service.js',    port: 4001 },
  { name: 'workout-service', file: 'services/workout-service.js', port: 4002 },
  { name: 'stats-service',   file: 'services/stats-service.js',   port: 4003 },
  { name: 'gateway',         file: 'gateway/gateway.js',          port: 4000 }
];
const MAX_RESTARTS = 3;
const running = new Map();
let stopping = false;

function start(svc) {
  const child = spawn(process.execPath, [path.join(__dirname, svc.file)], {
    env: { ...process.env, PORT: String(svc.port) },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.on('data', d => process.stdout.write(d));
  child.stderr.on('data', d => process.stderr.write(d));

  child.on('exit', (code) => {
    running.delete(svc.name);
    if (stopping) return;
    svc.restarts = (svc.restarts || 0) + 1;
    if (svc.restarts > MAX_RESTARTS) {
      console.error(`[deploy] ${svc.name} crashed too many times, giving up`);
      return;
    }
    console.warn(`[deploy] ${svc.name} exited (code ${code}), restarting (${svc.restarts}/${MAX_RESTARTS})...`);
    setTimeout(() => start(svc), 1000);
  });

  running.set(svc.name, child);
  return child;
}

async function waitHealthy(svc, timeoutMs = 10000) {
  const url = svc.name === 'gateway' ? `http://localhost:${svc.port}/api/status` : `http://localhost:${svc.port}/health`;
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try {
      const r = await fetch(url);
      if (r.ok) return true;
    } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

(async () => {
  console.log('[deploy] Deploying FitLife microservices...\n');

  const results = [];
  for (const svc of DEPLOYMENT) {
    const child = start(svc);
    const t0 = Date.now();
    const ok = await waitHealthy(svc);
    results.push({ service: svc.name, port: svc.port, pid: child.pid, status: ok ? 'HEALTHY' : 'FAILED', startup: (Date.now() - t0) + ' ms' });
  }

  console.log('\n[deploy] Deployment summary');
  console.table(results);

  if (results.every(r => r.status === 'HEALTHY')) {
    console.log('[deploy] All services are running.');
    console.log('[deploy] App:    http://localhost:4000');
    console.log('[deploy] Status: http://localhost:4000/status.html\n');
  } else {
    console.error('[deploy] Some services failed to start.');
  }
})();

function shutdown() {
  stopping = true;
  console.log('\n[deploy] Stopping all services...');
  for (const child of running.values()) child.kill('SIGTERM');
  setTimeout(() => process.exit(0), 500);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
