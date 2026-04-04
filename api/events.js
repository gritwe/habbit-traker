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
  const parts = url.pathname.replace(/^\/api\/events\/?/, '').split('/').filter(Boolean);
  const id = parts[0];
  const monthParam = url.searchParams.get('month');
  const dateParam = url.searchParams.get('date');

  if (req.method === 'GET') {
    if (monthParam) {
      const { rows } = await pool.query(
        `SELECT * FROM calendar_events WHERE user_id=$1 AND to_char(event_date,'YYYY-MM')=$2
         ORDER BY event_date ASC, created_at ASC`,
        [user.id, monthParam]
      );
      return res.json(rows);
    }
    if (dateParam) {
      const { rows } = await pool.query(
        `SELECT * FROM calendar_events WHERE user_id=$1 AND event_date=$2 ORDER BY created_at ASC`,
        [user.id, dateParam]
      );
      return res.json(rows);
    }
    const { rows } = await pool.query(
      `SELECT * FROM calendar_events WHERE user_id=$1 ORDER BY event_date DESC LIMIT 50`,
      [user.id]
    );
    return res.json(rows);
  }

  if (req.method === 'POST' && !id) {
    const { title, event_date, description, emoji } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Title required' });
    const { rows } = await pool.query(
      `INSERT INTO calendar_events (user_id, title, event_date, description, emoji)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [user.id, title.trim(), event_date, description || null, emoji || '📌']
    );
    return res.status(201).json(rows[0]);
  }

  if (req.method === 'DELETE' && id) {
    await pool.query(`DELETE FROM calendar_events WHERE id=$1 AND user_id=$2`, [id, user.id]);
    return res.json({ ok: true });
  }

  res.status(404).json({ error: 'Not found' });
};
