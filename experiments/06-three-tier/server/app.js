/* ===================================================
   FitLife — Application tier (Node.js + Express)
   Receives requests from the presentation tier, checks
   the input, and reads/writes the MySQL data tier.
   =================================================== */

const express = require('express');
const path    = require('path');

const INTENSITIES = ['Low', 'Medium', 'High'];

function createApp(pool) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // Wrap async route handlers so database errors become a clean 500 response
  const route = fn => (req, res) => fn(req, res).catch(err => {
    console.error('Database error:', err.message);
    res.status(500).json({ error: 'Database error' });
  });

  // ── Health: also proves the database connection works
  app.get('/api/health', route(async (req, res) => {
    const [[row]] = await pool.query('SELECT VERSION() AS version');
    res.json({ status: 'ok', database: 'MySQL ' + row.version });
  }));

  // ── Members
  app.get('/api/members', route(async (req, res) => {
    const [rows] = await pool.query('SELECT id, name, email, daily_goal FROM members ORDER BY name');
    res.json(rows);
  }));

  // ── Workouts (JOIN gives each workout its member's name)
  app.get('/api/workouts', route(async (req, res) => {
    const [rows] = await pool.query(
      `SELECT w.id, w.type, w.duration, w.calories, w.intensity,
              DATE_FORMAT(w.logged_on, '%Y-%m-%d') AS logged_on,
              m.name AS member
         FROM workouts w
         JOIN members m ON m.id = w.member_id
        ORDER BY w.logged_on DESC, w.id DESC`
    );
    res.json(rows);
  }));

  app.post('/api/workouts', route(async (req, res) => {
    const { memberId, type, duration, calories = 0, intensity = 'Medium' } = req.body || {};

    // Server-side validation: never trust the browser alone
    const errors = [];
    if (!Number.isInteger(Number(memberId)))                 errors.push('memberId is required');
    if (!type || !String(type).trim())                        errors.push('type is required');
    if (!(Number(duration) > 0))                              errors.push('duration must be greater than 0');
    if (!(Number(calories) >= 0))                             errors.push('calories cannot be negative');
    if (!INTENSITIES.includes(intensity))                     errors.push('intensity must be Low, Medium or High');
    if (errors.length) return res.status(400).json({ errors });

    const [[member]] = await pool.query('SELECT id FROM members WHERE id = ?', [memberId]);
    if (!member) return res.status(404).json({ errors: ['member not found'] });

    // Placeholders (?) keep user input out of the SQL text, preventing SQL injection
    const [result] = await pool.query(
      'INSERT INTO workouts (member_id, type, duration, calories, intensity, logged_on) VALUES (?, ?, ?, ?, ?, CURDATE())',
      [memberId, String(type).trim(), Number(duration), Number(calories), intensity]
    );
    res.status(201).json({ id: result.insertId });
  }));

  app.delete('/api/workouts/:id', route(async (req, res) => {
    const [result] = await pool.query('DELETE FROM workouts WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ errors: ['workout not found'] });
    res.status(204).end();
  }));

  // ── Stats: aggregation is done by MySQL, not in JavaScript
  app.get('/api/stats', route(async (req, res) => {
    const [[totals]] = await pool.query(
      'SELECT COUNT(*) AS workouts, COALESCE(SUM(duration),0) AS minutes, COALESCE(SUM(calories),0) AS calories FROM workouts'
    );
    const [byMember] = await pool.query(
      `SELECT m.name, COUNT(w.id) AS workouts, COALESCE(SUM(w.calories),0) AS calories, m.daily_goal
         FROM members m LEFT JOIN workouts w ON w.member_id = m.id
        GROUP BY m.id ORDER BY calories DESC`
    );
    res.json({ totals, byMember });
  }));

  return app;
}

module.exports = { createApp };
