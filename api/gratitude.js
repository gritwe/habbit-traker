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
  const parts = url.pathname.replace(/^\/api\/gratitude\/?/, '').split('/').filter(Boolean);
  const id = parts[0];

  if (req.method === 'GET') {
    const { rows } = await pool.query(
      `SELECT * FROM gratitude WHERE user_id=$1 ORDER BY entry_date DESC, created_at DESC LIMIT 50`,
      [user.id]
    );
    return res.json(rows);
  }

  if (req.method === 'POST' && !id) {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Text required' });
    const { rows } = await pool.query(
      `INSERT INTO gratitude (user_id, text) VALUES ($1,$2) RETURNING *`,
      [user.id, text.trim()]
    );
    return res.status(201).json(rows[0]);
  }

  if (req.method === 'DELETE' && id) {
    await pool.query(`DELETE FROM gratitude WHERE id=$1 AND user_id=$2`, [id, user.id]);
    return res.json({ ok: true });
  }

  res.status(404).json({ error: 'Not found' });
};
