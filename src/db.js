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
      expires_at TEXT,
      telegram_id TEXT
    )
  `, (err) => {
    if (err) console.error('[DB] Ошибка создания таблицы users:', err.message);
  });

  db.all("PRAGMA table_info(users);", (err, columns) => {
    if (err) return console.error('[DB] Ошибка PRAGMA:', err.message);
    const columnNames = columns.map(c => c.name);
    if (!columnNames.includes("telegram_id")) {
      db.run("ALTER TABLE users ADD COLUMN telegram_id TEXT", (err) => {
        if (err) console.error('[DB] Ошибка ALTER TABLE:', err.message);
        else console.log('[DB] Колонка telegram_id добавлена');
      });
    }
  });
});

module.exports = db;
