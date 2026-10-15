const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const path = require('path');
const { init, db } = require('./db');

init();

const app = express();
app.use(helmet());
app.use(bodyParser.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'replace-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true }
}));

app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/submit', (req, res) => {
  try {
    const { transport, fuelType = null, distance, groupSize = 1, perCapita, totalEmissions, timestamp } = req.body || {};
    if (typeof transport !== 'string' || typeof distance !== 'number' || isNaN(distance) || typeof perCapita !== 'number' || isNaN(perCapita)) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const stmt = db.prepare(`
      INSERT INTO submissions (transport, fuelType, distance, groupSize, perCapita, totalEmissions, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(transport, fuelType, distance, groupSize, perCapita, totalEmissions, timestamp || new Date().toISOString());
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

    const row = db.prepare('SELECT id, password_hash FROM admins WHERE username = ?').get(username);
    if (!row) return res.status(401).json({ error: 'Unauthorized' });

    const match = await bcrypt.compare(password, row.password_hash);
    if (!match) return res.status(401).json({ error: 'Unauthorized' });

    req.session.admin = { id: row.id, username };
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/submissions', (req, res) => {
  if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
  const rows = db.prepare('SELECT * FROM submissions ORDER BY id DESC LIMIT 1000').all();
  res.json({ rows });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
