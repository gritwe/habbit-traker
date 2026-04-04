import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/index.js';
import { useTelegram } from '../hooks/useTelegram.js';
import styles from './Home.module.css';

const MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const MOOD_EMOJI = {1:'😞',2:'😕',3:'😐',4:'😊',5:'🤩'};

function toStr(d) { return d.toISOString().split('T')[0]; }
function fmtDate(s) {
  const d = new Date(s + 'T00:00:00');
  const today = toStr(new Date());
  const yesterday = toStr(new Date(Date.now() - 86400000));
  if (s === today) return 'Сегодня';
  if (s === yesterday) return 'Вчера';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function Home({ onAdd }) {
  const { haptic } = useTelegram();
  const [date, setDate] = useState(toStr(new Date()));
  const [habits, setHabits] = useState([]);
  const [goals, setGoals] = useState([]);
  const [journal, setJournal] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (d) => {
    setLoading(true);
    try {
      const [h, g, j] = await Promise.all([
        api.getHabits(),
        api.getGoals(),
        api.getJournal(d),
      ]);
      setHabits(h);
      setGoals(g);
      setJournal(j);
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

  const isToday = date === toStr(new Date());

  const completedHabits = habits.filter(h => h.completed_today).length;
  const totalHabits = habits.length;
  const habitPct = totalHabits ? Math.round((completedHabits / totalHabits) * 100) : 0;

  const activeGoals = goals.filter(g => !g.is_done);
  const doneGoals = goals.filter(g => g.is_done);
  const goalPct = goals.length ? Math.round((doneGoals.length / goals.length) * 100) : 0;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Статистика</h1>
        <button className={styles.addBtn} onClick={onAdd}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <line x1="7" y1="1" x2="7" y2="13" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="1" y1="7" x2="13" y2="7" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </button>
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
        <button className={styles.dateNav} onClick={() => goDate(1)} disabled={isToday}>›</button>
      </div>

      {loading ? (
        <div className={styles.centered}><div className="spinner" /></div>
      ) : (
        <div className={styles.scroll}>

          {/* Mood from journal */}
          {journal?.mood && (
            <div className={`card ${styles.moodCard}`}>
              <span className={styles.moodEmoji}>{MOOD_EMOJI[journal.mood]}</span>
              <span className={styles.moodText}>Настроение дня</span>
            </div>
          )}

          {/* Habits block */}
          <div className={`card ${styles.block}`}>
            <div className={styles.blockHeader}>
              <span className={styles.blockTitle}>✅ Привычки</span>
              <span className={styles.blockBadge} style={{ background: habitPct === 100 ? 'var(--green-light)' : 'var(--bg)', color: habitPct === 100 ? 'var(--green-dark)' : 'var(--text-muted)' }}>
                {completedHabits}/{totalHabits}
              </span>
            </div>
            <div className={styles.progressWrap}>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${habitPct}%` }} />
              </div>
              <span className={styles.progressPct}>{habitPct}%</span>
            </div>
            {habits.length === 0 ? (
              <p className={styles.emptyHint}>Добавь первую привычку через +</p>
            ) : (
              <div className={styles.list}>
                {habits.map(h => (
                  <button key={h.id} className={styles.row} onClick={() => handleToggleHabit(h.id)}>
                    <div className={`${styles.check} ${h.completed_today ? styles.checkOn : ''}`}>
                      {h.completed_today && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 3.5L3.5 6L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <div className={styles.habitIcon} style={{ background: h.color }}>{h.icon}</div>
                    <span className={styles.rowName}>{h.name}</span>
                    {Number(h.streak) > 1 && <span className={styles.streak}>🔥{h.streak}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Goals block */}
          <div className={`card ${styles.block}`}>
            <div className={styles.blockHeader}>
              <span className={styles.blockTitle}>🎯 Цели</span>
              <span className={styles.blockBadge} style={{ background: goalPct === 100 && goals.length > 0 ? 'var(--green-light)' : 'var(--bg)', color: goalPct === 100 && goals.length > 0 ? 'var(--green-dark)' : 'var(--text-muted)' }}>
                {doneGoals.length}/{goals.length}
              </span>
            </div>
            {goals.length > 0 && (
              <div className={styles.progressWrap}>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${goalPct}%`, background: 'var(--purple, #AF52DE)' }} />
                </div>
                <span className={styles.progressPct}>{goalPct}%</span>
              </div>
            )}
            {goals.length === 0 ? (
              <p className={styles.emptyHint}>Добавь первую цель через +</p>
            ) : (
              <div className={styles.list}>
                {[...activeGoals, ...doneGoals].map(g => (
                  <button key={g.id} className={styles.row} onClick={() => handleToggleGoal(g.id, !g.is_done)}>
                    <div className={`${styles.check} ${g.is_done ? styles.checkOn : ''}`} style={g.is_done ? {background:'var(--purple,#AF52DE)',borderColor:'var(--purple,#AF52DE)'} : {}}>
                      {g.is_done && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 3.5L3.5 6L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span className={`${styles.rowName} ${g.is_done ? styles.done : ''}`}>{g.title}</span>
                    {g.deadline && <span className={styles.deadline}>{new Date(g.deadline).toLocaleDateString('ru-RU',{day:'numeric',month:'short'})}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Note from journal */}
          {journal?.note && (
            <div className={`card ${styles.block}`}>
              <span className={styles.blockTitle}>💭 Заметка</span>
              <p className={styles.noteText}>{journal.note}</p>
            </div>
          )}

          <div style={{ height: 24 }} />
        </div>
      )}
    </div>
  );
}
