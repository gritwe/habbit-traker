const { Pool } = require('pg');

let pool;
let initialized = false;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

async function initDB() {
  if (initialized) return getPool();
  const p = getPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT PRIMARY KEY,
      username TEXT,
      first_name TEXT,
      show_affirmations BOOLEAN DEFAULT TRUE
    );
    CREATE TABLE IF NOT EXISTS habits (
      id SERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '🎯',
      color TEXT DEFAULT '#E8F8ED',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS habit_logs (
      id SERIAL PRIMARY KEY,
      habit_id INTEGER REFERENCES habits(id) ON DELETE CASCADE,
      user_id BIGINT,
      completed_date DATE NOT NULL,
      UNIQUE(habit_id, completed_date)
    );
    CREATE TABLE IF NOT EXISTS goals (
      id SERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      deadline DATE,
      is_done BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS affirmations (
      id SERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS gratitude (
      id SERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      entry_date DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS day_tasks (
      id SERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
      task_date DATE NOT NULL,
      title TEXT NOT NULL,
      time_start TIME,
      is_done BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS calendar_events (
      id SERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
      event_date DATE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      emoji TEXT DEFAULT '📌',
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS journal_entries (
      id SERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
      entry_date DATE NOT NULL,
      mood INTEGER CHECK (mood BETWEEN 1 AND 5),
      note TEXT,
      gratitude_text TEXT,
      tags TEXT[],
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, entry_date)
    );
  `);
  initialized = true;
  return p;
}

function getUser(req) {
  const initData = req.headers['x-telegram-init-data'] || '';
  const params = new URLSearchParams(initData);
  const userStr = params.get('user');
  if (!userStr) return null;
  try { return JSON.parse(userStr); } catch { return null; }
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
}

module.exports = { initDB, getUser, cors };
