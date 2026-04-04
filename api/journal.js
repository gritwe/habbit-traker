const { initDB, getUser, cors } = require('./_db');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const pool = await initDB();
  const tgUser = getUser(req);
  const user = tgUser || { id: 1, username: 'test', first_name: 'Test' };

  await pool.query(
    `INSERT INTO users (id, username, first_name) VALUES ($1,$2,$3)
     ON CONFLICT (id) DO UPDATE SET username=$2, first_name=$3`,
    [user.id, user.username || '', user.first_name || '']
  );

  const url = new URL(req.url, `http://${req.headers.host}`);
  const dateParam = url.searchParams.get('date');
  const monthParam = url.searchParams.get('month');

  if (req.method === 'GET') {
    if (monthParam) {
      const { rows } = await pool.query(
        `SELECT entry_date, mood, note FROM journal_entries
         WHERE user_id=$1 AND to_char(entry_date,'YYYY-MM')=$2 ORDER BY entry_date ASC`,
        [user.id, monthParam]
      );
      return res.json(rows);
    }
    if (dateParam) {
      const { rows } = await pool.query(
        `SELECT * FROM journal_entries WHERE user_id=$1 AND entry_date=$2`, [user.id, dateParam]
      );
      return res.json(rows[0] || null);
    }
    const { rows } = await pool.query(
      `SELECT * FROM journal_entries WHERE user_id=$1 ORDER BY entry_date DESC LIMIT 30`, [user.id]
    );
    return res.json(rows);
  }

  if (req.method === 'POST') {
    const { entry_date, mood, note, morning, afternoon, evening, gratitude, goals_text, tags } = req.body;
    if (!entry_date) return res.status(400).json({ error: 'entry_date required' });
    const { rows } = await pool.query(
      `INSERT INTO journal_entries (user_id, entry_date, mood, note, morning, afternoon, evening, gratitude, goals_text, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (user_id, entry_date) DO UPDATE SET
         mood=EXCLUDED.mood, note=EXCLUDED.note, morning=EXCLUDED.morning,
         afternoon=EXCLUDED.afternoon, evening=EXCLUDED.evening,
         gratitude=EXCLUDED.gratitude, goals_text=EXCLUDED.goals_text,
         tags=EXCLUDED.tags, updated_at=NOW()
       RETURNING *`,
      [user.id, entry_date, mood||null, note||null, morning||null, afternoon||null, evening||null, gratitude||null, goals_text||null, tags||[]]
    );
    return res.json(rows[0]);
  }

  res.status(404).json({ error: 'Not found' });
};
