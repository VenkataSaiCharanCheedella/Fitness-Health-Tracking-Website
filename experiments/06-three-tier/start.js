/* ===================================================
   Starts the three-tier FitLife app.

   - With DB_HOST set: connects to your own MySQL server
     (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME).
   - Without it: starts a temporary local MySQL 8.4 server
     using mysql-memory-server, so the demo runs anywhere.
   =================================================== */

const fs     = require('fs');
const path   = require('path');
const mysql  = require('mysql2/promise');
const { createApp } = require('./server/app');

const PORT = process.env.PORT || 3100;

async function getDatabaseConfig() {
  if (process.env.DB_HOST) {
    return {
      config: {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'fitlife'
      },
      stop: async () => {}
    };
  }

  const { createDB } = require('mysql-memory-server');
  console.log('Starting a local MySQL 8.4 server...');
  const db = await createDB({ version: '8.4.x', dbName: 'fitlife', logLevel: 'ERROR' });
  return {
    config: { host: '127.0.0.1', port: db.port, user: db.username, database: db.dbName },
    stop: () => db.stop()
  };
}

(async () => {
  const { config, stop } = await getDatabaseConfig();

  // Create tables and sample data
  const setup = await mysql.createConnection({ ...config, multipleStatements: true });
  const [[{ n }]] = await setup.query(
    "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'members'"
  );
  if (!n) await setup.query(fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8'));
  await setup.end();

  const pool = mysql.createPool({ ...config, connectionLimit: 10 });
  const [[{ version }]] = await pool.query('SELECT VERSION() AS version');
  console.log(`Data tier:         MySQL ${version} on ${config.host}:${config.port} (database "${config.database}")`);

  const server = createApp(pool).listen(PORT, () => {
    console.log(`Application tier:  Express API on http://localhost:${PORT}/api`);
    console.log(`Presentation tier: open http://localhost:${PORT} in the browser\n`);
  });

  const shutdown = async () => {
    console.log('\nShutting down...');
    server.close();
    await pool.end();
    await stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})().catch(err => {
  console.error('Could not start:', err.message);
  process.exit(1);
});
