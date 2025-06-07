// Инициализация SQLite

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.resolve(__dirname, '../data/database.sqlite'));

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER UNIQUE,
      character_name TEXT,
      access_token TEXT,
      refresh_token TEXT,
      expires_at TEXT
    )
  `);
});

module.exports = db;
