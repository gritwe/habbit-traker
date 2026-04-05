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

  if (req.method === 'GET') {
    const { rows: daily } = await pool.query(
      `SELECT completed_date::text AS date, COUNT(DISTINCT habit_id) AS completed
       FROM habit_logs WHERE user_id=$1 AND completed_date >= NOW()-INTERVAL '30 days'
       GROUP BY completed_date ORDER BY completed_date ASC`, [user.id]
    );
    const { rows: habits } = await pool.query(
      `SELECT h.id, h.name, h.icon, h.color,
         COUNT(l.id) AS total_completions
       FROM habits h LEFT JOIN habit_logs l ON l.habit_id=h.id AND l.user_id=h.user_id
       WHERE h.user_id=$1 AND h.is_active=TRUE
       GROUP BY h.id ORDER BY total_completions DESC`, [user.id]
    );
    const { rows: totals } = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM habits WHERE user_id=$1 AND is_active=TRUE) AS total_habits,
         (SELECT COUNT(*) FROM habit_logs WHERE user_id=$1) AS total_completions,
         (SELECT COUNT(*) FROM goals WHERE user_id=$1) AS total_goals,
         (SELECT COUNT(*) FROM goals WHERE user_id=$1 AND is_done=TRUE) AS done_goals,
         (SELECT COUNT(*) FROM affirmations WHERE user_id=$1) AS total_affirmations,
         (SELECT COUNT(*) FROM gratitude WHERE user_id=$1) AS total_gratitude`, [user.id]
    );
    const { rows: moods } = await pool.query(
      `SELECT entry_date::text AS date, mood FROM journal_entries
       WHERE user_id=$1 AND mood IS NOT NULL AND entry_date >= NOW()-INTERVAL '30 days'
       ORDER BY entry_date ASC`, [user.id]
    );
    return res.json({ daily, habits, totals: totals[0], moods });
  }

  res.status(404).json({ error: 'Not found' });
};
