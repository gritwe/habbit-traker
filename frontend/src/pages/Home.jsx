import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/index.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { useSwipe } from '../hooks/useSwipe.js';
import styles from './Home.module.css';

const MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

function toStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function fmtDate(s) {
  const d = new Date(s + 'T00:00:00');
  const today = toStr(new Date());
  const yesterday = toStr(new Date(Date.now() - 86400000));
  if (s === today) return 'Сегодня';
  if (s === yesterday) return 'Вчера';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function streakLabel(streak) {
  const n = Number(streak);
  if (n === 0) return 'Начните серию сегодня';
  if (n === 1) return '1-дневная серия 🔥';
  const last = n % 10;
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 19) return `${n}-дневная серия 🔥`;
  if (last === 1) return `${n}-дневная серия 🔥`;
  if (last >= 2 && last <= 4) return `${n}-дневная серия 🔥`;
  return `${n}-дневная серия 🔥`;
}

export function Home() {
  const { haptic } = useTelegram();
  const [tab, setTab] = useState('stats'); // stats | goals
  const [date, setDate] = useState(toStr(new Date()));
  const [habits, setHabits] = useState([]);
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [affirmations, setAffirmations] = useState([]);
  const [gratitude, setGratitude] = useState([]);
  const [loading, setLoading] = useState(true);
  const [habitsCollapsed, setHabitsCollapsed] = useState(false);

  const swipe = useSwipe(
    () => goDate(1),
    () => goDate(-1),
  );

  const isToday = date === toStr(new Date());

  const load = useCallback(async (d) => {
    setLoading(true);
    try {
      const [h, g, t, aff, grat] = await Promise.all([
        api.getHabits(),
        api.getGoals(),
        api.getDayTasks(d),
        api.getAffirmations(),
        api.getGratitude(),
      ]);
      setHabits(h);
      setGoals(g);
      setTasks(t);
      setAffirmations(aff.items || []);
      setGratitude(grat);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(date); }, [date]);

  async function handleToggleHabit(id) {
    haptic?.impactOccurred('light');
    setHabits(h => h.map(x => x.id === id ? { ...x, completed_today: !x.completed_today } : x));
    try { await api.toggleHabit(id); } catch { load(date); }
  }

  async function handleToggleGoal(id, done) {
    haptic?.impactOccurred('light');
    setGoals(g => g.map(x => x.id === id ? { ...x, is_done: done } : x));
    try { await api.toggleGoal(id, done); } catch { load(date); }
  }

  function goDate(delta) {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    const next = toStr(d);
    if (next > toStr(new Date())) return;
    setDate(next);
  }

  // Time-based content
  const hour = new Date().getHours();
  const isDaytime = hour >= 6 && hour < 18;
  const randomAff = affirmations.length > 0 ? affirmations[Math.floor(Math.random() * affirmations.length)] : null;
  const randomGrat = gratitude.length > 0 ? gratitude[Math.floor(Math.random() * gratitude.length)] : null;
  const timeContent = isDaytime ? randomAff : randomGrat;
  const timeLabel = isDaytime ? '✨ Аффирмация' : '🙏 Благодарность';

  const completedHabits = habits.filter(h => h.completed_today).length;
  const habitPct = habits.length ? Math.round((completedHabits / habits.length) * 100) : 0;

  const doneTasks = tasks.filter(t => t.is_done).length;
  const taskPct = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;

  const activeGoals = goals.filter(g => !g.is_done);
  const doneGoals = goals.filter(g => g.is_done);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.tabs}>
          <button className={`${styles.tabBtn} ${tab === 'stats' ? styles.tabActive : ''}`} onClick={() => setTab('stats')}>Статистика</button>
          <button className={`${styles.tabBtn} ${tab === 'goals' ? styles.tabActive : ''}`} onClick={() => setTab('goals')}>Цели</button>
        </div>
      </header>

      {/* Day switcher */}
      <div className={styles.dateSwitcher}>
        <button className={styles.dateNav} onClick={() => goDate(-1)}>‹</button>
        <div className={styles.dateCenter}>
          <span className={styles.dateLabel}>{fmtDate(date)}</span>
          {!isToday && (
            <button className={styles.todayBtn} onClick={() => setDate(toStr(new Date()))}>Сегодня</button>
          )}
        </div>
        <div className={styles.dateRight}>
          <input
            type="date"
            className={styles.datePickerHidden}
            max={toStr(new Date())}
            value={date}
            onChange={e => e.target.value && setDate(e.target.value)}
            id="home-date-picker"
          />
          <label htmlFor="home-date-picker" className={styles.calIcon}>📆</label>
          <button className={styles.dateNav} onClick={() => goDate(1)} disabled={isToday}>›</button>
        </div>
      </div>

      {loading ? (
        <div className={styles.centered}><div className="spinner" /></div>
      ) : (
        <div className={styles.scroll} {...swipe}>

          {tab === 'stats' && <>
            {/* Habits block */}
            <div className={`card ${styles.block}`}>
              <div className={styles.blockHeader}>
                <span className={styles.blockTitle}>✅ Привычки</span>
                <div className={styles.blockRight}>
                  <span className={styles.pctBadge}>{completedHabits}/{habits.length}</span>
                  <button className={styles.collapseBtn} onClick={() => setHabitsCollapsed(v => !v)}>
                    {habitsCollapsed ? 'Показать' : 'Скрыть'}
                  </button>
                </div>
              </div>
              <div className={styles.progressWrap}>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${habitPct}%` }} />
                </div>
                <span className={styles.progressPct}>{habitPct}%</span>
              </div>

              {!habitsCollapsed && (
                <div className={styles.list}>
                  {habits.length === 0 ? (
                    <p className={styles.emptyHint}>Добавь привычки через +</p>
                  ) : habits.map(h => (
                    <button key={h.id} className={styles.habitRow} onClick={() => handleToggleHabit(h.id)}>
                      <div className={`${styles.check} ${h.completed_today ? styles.checkOn : ''}`}>
                        {h.completed_today && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 3.5L3.5 6L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <div className={styles.habitIcon} style={{ background: h.color }}>{h.icon}</div>
                      <div className={styles.habitInfo}>
                        <span className={styles.habitName}>{h.name}</span>
                        <span className={styles.habitStreak}>{streakLabel(h.streak)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Day tasks bar */}
            <div className={`card ${styles.block}`}>
              <div className={styles.blockHeader}>
                <span className={styles.blockTitle}>📋 Задачи дня</span>
                <span className={styles.pctBadge}>{doneTasks}/{tasks.length}</span>
              </div>
              <div className={styles.progressWrap}>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${taskPct}%`, background: '#007AFF' }} />
                </div>
                <span className={styles.progressPct}>{taskPct}%</span>
              </div>
              {tasks.length === 0 && (
                <p className={styles.emptyHint}>Добавь задачи в Дневнике</p>
              )}
            </div>

            {/* Time-based block */}
            {timeContent && (
              <div className={`card ${styles.timeBlock}`}>
                <span className={styles.timeLabel}>{timeLabel}</span>
                <p className={styles.timeText}>
                  {isDaytime ? `"${timeContent.text}"` : timeContent.text}
                </p>
              </div>
            )}
          </>}

          {tab === 'goals' && <>
            {activeGoals.length === 0 && doneGoals.length === 0 ? (
              <div className={styles.empty}>
                <p style={{ fontSize: 48 }}>🎯</p>
                <p className={styles.emptyText}>Нет целей</p>
                <p className={styles.emptyHint}>Добавь цели в разделе Ещё</p>
              </div>
            ) : (
              <>
                {activeGoals.map(g => {
                  const hasDeadline = g.deadline;
                  let deadlinePct = 0;
                  let daysLeft = null;
                  if (hasDeadline) {
                    const created = new Date(g.created_at);
                    const deadline = new Date(g.deadline);
                    const now = new Date();
                    const total = deadline - created;
                    const passed = now - created;
                    deadlinePct = Math.min(100, Math.max(0, Math.round((passed / total) * 100)));
                    daysLeft = Math.max(0, Math.ceil((deadline - now) / 86400000));
                  }
                  return (
                    <div key={g.id} className={`card ${styles.goalCard}`}>
                      <div className={styles.goalTop}>
                        <button className={styles.goalCheck} onClick={() => handleToggleGoal(g.id, true)}>
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 3.5L3.5 6L9 1" stroke="var(--text-hint)" strokeWidth="2" strokeLinecap="round"/></svg>
                        </button>
                        <div className={styles.goalInfo}>
                          <p className={styles.goalTitle}>{g.title}</p>
                          {g.description && <p className={styles.goalDesc}>{g.description}</p>}
                        </div>
                        {hasDeadline && daysLeft !== null && (
                          <span className={`${styles.deadlineBadge} ${daysLeft <= 3 ? styles.urgent : ''}`}>
                            {daysLeft === 0 ? 'Сегодня!' : `${daysLeft}д`}
                          </span>
                        )}
                      </div>
                      {hasDeadline && (
                        <>
                          <div className={styles.progressWrap} style={{ marginTop: 10 }}>
                            <div className={styles.progressBar}>
                              <div className={styles.progressFill} style={{ width: `${deadlinePct}%`, background: daysLeft <= 3 ? '#FF3B30' : '#AF52DE' }} />
                            </div>
                            <span className={styles.progressPct}>{deadlinePct}%</span>
                          </div>
                          {g.deadline && <p className={styles.deadlineDate}>до {new Date(g.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</p>}
                        </>
                      )}
                    </div>
                  );
                })}

                {doneGoals.length > 0 && (
                  <>
                    <p className={styles.doneLabel}>Выполнено</p>
                    {doneGoals.map(g => (
                      <div key={g.id} className={`card ${styles.goalCard} ${styles.goalDoneCard}`}>
                        <div className={styles.goalTop}>
                          <button className={styles.goalCheckDone} onClick={() => handleToggleGoal(g.id, false)}>
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 3.5L3.5 6L9 1" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                          </button>
                          <p className={styles.goalTitleDone}>{g.title}</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </>}

          <div style={{ height: 24 }} />
        </div>
      )}
    </div>
  );
}
