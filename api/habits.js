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
  const parts = url.pathname.replace(/^\/api\/habits\/?/, '').split('/').filter(Boolean);
  const id = parts[0];
  const action = parts[1];

  // POST /api/habits/:id/toggle
  if (req.method === 'POST' && id && action === 'toggle') {
    // Accept date from body, fallback to today in user's timezone
    const bodyDate = req.body?.date;
    const today = bodyDate || new Date().toISOString().split('T')[0];
    const ex = await pool.query(
      `SELECT id FROM habit_logs WHERE habit_id=$1 AND completed_date=$2`, [id, today]
    );
    if (ex.rows.length > 0) {
      await pool.query(`DELETE FROM habit_logs WHERE habit_id=$1 AND completed_date=$2`, [id, today]);
      return res.json({ completed: false });
    } else {
      await pool.query(
        `INSERT INTO habit_logs (habit_id, user_id, completed_date) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [id, user.id, today]
      );
      return res.json({ completed: true });
    }
  }

  // DELETE /api/habits/:id
  if (req.method === 'DELETE' && id) {
    await pool.query(`UPDATE habits SET is_active=FALSE WHERE id=$1 AND user_id=$2`, [id, user.id]);
    return res.json({ ok: true });
  }

  // GET /api/habits — with real consecutive streak
  if (req.method === 'GET') {
    const dateParam = url.searchParams.get('date');
    const today = dateParam || new Date().toISOString().split('T')[0];
    const { rows: habits } = await pool.query(
      `SELECT h.id, h.name, h.icon, h.color,
        COALESCE((SELECT TRUE FROM habit_logs l WHERE l.habit_id=h.id AND l.completed_date=$2),FALSE) AS completed_today
       FROM habits h WHERE h.user_id=$1 AND h.is_active=TRUE ORDER BY h.created_at ASC`,
      [user.id, today]
    );

    // Calculate real consecutive streak for each habit
    for (const habit of habits) {
      const { rows: logs } = await pool.query(
        `SELECT completed_date::text FROM habit_logs
         WHERE habit_id=$1 ORDER BY completed_date DESC`,
        [habit.id]
      );

      const dates = new Set(logs.map(r => r.completed_date));
      let streak = 0;
      const cur = new Date(today);

      // If not done today, start checking from yesterday
      if (!habit.completed_today) {
        cur.setDate(cur.getDate() - 1);
      }

      while (true) {
        const ds = cur.toISOString().split('T')[0];
        if (dates.has(ds)) {
          streak++;
          cur.setDate(cur.getDate() - 1);
        } else {
          break;
        }
      }

      habit.streak = streak;
    }

    return res.json(habits);
  }

  // POST /api/habits
  if (req.method === 'POST' && !id) {
    const { name, icon = '🎯', color = '#E8F8ED' } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
    const { rows } = await pool.query(
      `INSERT INTO habits (user_id, name, icon, color) VALUES ($1,$2,$3,$4) RETURNING *`,
      [user.id, name.trim(), icon, color]
    );
    return res.status(201).json({ ...rows[0], completed_today: false, streak: 0 });
  }

  res.status(404).json({ error: 'Not found' });
};
