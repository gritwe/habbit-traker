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
  const parts = url.pathname.replace(/^\/api\/goals\/?/, '').split('/').filter(Boolean);
  const id = parts[0];

  if (req.method === 'GET') {
    const { rows } = await pool.query(
      `SELECT * FROM goals WHERE user_id=$1 ORDER BY is_done ASC, created_at DESC`, [user.id]
    );
    return res.json(rows);
  }

  if (req.method === 'POST' && !id) {
    const { title, description, deadline } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Title required' });
    const { rows } = await pool.query(
      `INSERT INTO goals (user_id, title, description, deadline) VALUES ($1,$2,$3,$4) RETURNING *`,
      [user.id, title.trim(), description || null, deadline || null]
    );
    return res.status(201).json(rows[0]);
  }

  // PATCH /api/goals/:id — toggle done
  if ((req.method === 'PATCH' || req.method === 'POST') && id) {
    const { is_done } = req.body;
    const { rows } = await pool.query(
      `UPDATE goals SET is_done=$1 WHERE id=$2 AND user_id=$3 RETURNING *`,
      [is_done, id, user.id]
    );
    return res.json(rows[0]);
  }

  if (req.method === 'DELETE' && id) {
    await pool.query(`DELETE FROM goals WHERE id=$1 AND user_id=$2`, [id, user.id]);
    return res.json({ ok: true });
  }

  res.status(404).json({ error: 'Not found' });
};
