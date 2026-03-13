const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'employees.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    department TEXT NOT NULL,
    role TEXT NOT NULL,
    hire_date TEXT NOT NULL,
    created_at TEXT,
    updated_at TEXT
  )
`);

module.exports = db;
