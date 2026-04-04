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
  const parts = url.pathname.replace(/^\/api\/daytasks\/?/, '').split('/').filter(Boolean);
  const id = parts[0];
  const dateParam = url.searchParams.get('date');

  // GET /api/daytasks?date=2024-01-15
  if (req.method === 'GET') {
    const date = dateParam || new Date().toISOString().split('T')[0];
    const { rows } = await pool.query(
      `SELECT * FROM day_tasks WHERE user_id=$1 AND task_date=$2
       ORDER BY time_start ASC NULLS LAST, created_at ASC`,
      [user.id, date]
    );
    return res.json(rows);
  }

  // POST /api/daytasks
  if (req.method === 'POST' && !id) {
    const { title, task_date, time_start } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Title required' });
    const { rows } = await pool.query(
      `INSERT INTO day_tasks (user_id, title, task_date, time_start)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [user.id, title.trim(), task_date || new Date().toISOString().split('T')[0], time_start || null]
    );
    return res.status(201).json(rows[0]);
  }

  // PATCH /api/daytasks/:id — toggle done
  if (req.method === 'PATCH' && id) {
    const { is_done } = req.body;
    const { rows } = await pool.query(
      `UPDATE day_tasks SET is_done=$1 WHERE id=$2 AND user_id=$3 RETURNING *`,
      [is_done, id, user.id]
    );
    return res.json(rows[0]);
  }

  // DELETE /api/daytasks/:id
  if (req.method === 'DELETE' && id) {
    await pool.query(`DELETE FROM day_tasks WHERE id=$1 AND user_id=$2`, [id, user.id]);
    return res.json({ ok: true });
  }

  res.status(404).json({ error: 'Not found' });
};
