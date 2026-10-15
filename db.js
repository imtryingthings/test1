const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');

const db = new Database('submissions.db');

function init() {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transport TEXT,
      fuelType TEXT,
      distance REAL,
      groupSize INTEGER,
      perCapita REAL,
      totalEmissions REAL,
      timestamp TEXT
    );
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password_hash TEXT
    );
  `).run();

  // Seed admin from environment variables if provided (Option A)
  try {
    const username = process.env.ADMIN_USER;
    const password = process.env.ADMIN_PASSWORD;
    if (username && password) {
      const row = db.prepare('SELECT id FROM admins WHERE username = ?').get(username);
      if (!row) {
        const hash = bcrypt.hashSync(password, 12);
        db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(username, hash);
        console.log('Seeded admin user:', username);
      }
    }
  } catch (err) {
    console.error('Failed to seed admin:', err);
  }
}

module.exports = { db, init };
