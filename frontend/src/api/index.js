const BASE = import.meta.env.VITE_API_URL || '/api';
function initData() { return window.Telegram?.WebApp?.initData || ''; }
async function req(path, opts = {}) {
  const r = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': initData(), ...opts.headers },
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || `HTTP ${r.status}`); }
  return r.json();
}
const j = (d) => JSON.stringify(d);

export const api = {
  getHabits: (date) => req(`/habits${date ? `?date=${date}` : ''}`),
  createHabit: (d) => req('/habits', { method: 'POST', body: j(d) }),
  deleteHabit: (id) => req(`/habits/${id}`, { method: 'DELETE' }),
  toggleHabit: (id, date) => req(`/habits/${id}/toggle`, { method: 'POST', body: j({ date }) }),

  getGoals: () => req('/goals'),
  createGoal: (d) => req('/goals', { method: 'POST', body: j(d) }),
  toggleGoal: (id, is_done) => req(`/goals/${id}`, { method: 'PATCH', body: j({ is_done }) }),
  deleteGoal: (id) => req(`/goals/${id}`, { method: 'DELETE' }),

  getAffirmations: () => req('/affirmations'),
  createAffirmation: (text) => req('/affirmations', { method: 'POST', body: j({ text }) }),
  deleteAffirmation: (id) => req(`/affirmations/${id}`, { method: 'DELETE' }),
  setShowAffirmations: (val) => req('/affirmations', { method: 'POST', body: j({ toggle_setting: val }) }),

  getGratitude: () => req('/gratitude'),
  createGratitude: (text) => req('/gratitude', { method: 'POST', body: j({ text }) }),
  deleteGratitude: (id) => req(`/gratitude/${id}`, { method: 'DELETE' }),

  getJournal: (date) => req(`/journal?date=${date}`),
  getJournalMonth: (month) => req(`/journal?month=${month}`),
  getJournalRecent: () => req('/journal'),
  saveJournal: (d) => req('/journal', { method: 'POST', body: j(d) }),

  getStats: () => req('/stats'),

  getDayTasks: (date) => req(`/daytasks?date=${date}`),
  createDayTask: (d) => req('/daytasks', { method: 'POST', body: j(d) }),
  toggleDayTask: (id, is_done) => req(`/daytasks/${id}`, { method: 'PATCH', body: j({ is_done }) }),
  deleteDayTask: (id) => req(`/daytasks/${id}`, { method: 'DELETE' }),

  getEvents: (month) => req(`/events?month=${month}`),
  getEventsByDate: (date) => req(`/events?date=${date}`),
  createEvent: (d) => req('/events', { method: 'POST', body: j(d) }),
  deleteEvent: (id) => req(`/events/${id}`, { method: 'DELETE' }),
};
