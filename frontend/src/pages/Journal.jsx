import { useState, useEffect, useRef } from 'react';
import { api } from '../api/index.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { useSwipe } from '../hooks/useSwipe.js';
import { TimePicker } from '../components/TimePicker.jsx';
import styles from './Journal.module.css';

const MOODS = [
  { v: 1, e: '😞', label: '1' },
  { v: 2, e: '😕', label: '2' },
  { v: 3, e: '😐', label: '3' },
  { v: 4, e: '😊', label: '4' },
  { v: 5, e: '🤩', label: '5' },
];

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const WD = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const MONTHS_SHORT = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

function toStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fmtDateShort(s) {
  const d = new Date(s + 'T00:00:00');
  const today = toStr(new Date());
  const yesterday = toStr(new Date(Date.now() - 86400000));
  if (s === today) return 'Сегодня';
  if (s === yesterday) return 'Вчера';
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

// ── ПЛАН ДНЯ ─────────────────────────────────────────────
function PlanDay() {
  const todayStr = toStr(new Date());
  const [date, setDate] = useState(todayStr);
  const [loading, setLoading] = useState(true);
  const [mood, setMood] = useState(null);
  const [note, setNote] = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const [draftNote, setDraftNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [timedTasks, setTimedTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskTime, setTaskTime] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const { haptic } = useTelegram();

  // Load all data before showing page
  async function loadAll(d) {
    setLoading(true);
    setMood(null); setNote(''); setTimedTasks([]);
    setEditingNote(false); setSaved(false);
    try {
      const [journal, tasks] = await Promise.all([
        api.getJournal(d),
        api.getDayTasks(d),
      ]);
      if (journal) {
        const m = journal.mood ? Number(journal.mood) : null;
        const n = journal.note || '';
        setMood(m);
        setNote(n);
      }
      setTimedTasks((tasks || []).filter(t => t.time_start));
    } catch {}
    setLoading(false);
  }

  useEffect(() => { loadAll(date); }, [date]);

  function goDate(delta) {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    const next = toStr(d);
    if (next > todayStr) return;
    setDate(next);
    setShowForm(false);
  }

  const isToday = date === todayStr;

  async function handleMood(v) {
    // Save mood as integer directly
    const newMood = v;
    setMood(newMood);
    haptic?.impactOccurred('light');
    try {
      await api.saveJournal({ entry_date: date, mood: newMood, note });
    } catch {}
  }

  function startEditNote() {
    setDraftNote(note);
    setEditingNote(true);
  }

  async function saveNote() {
    setSaving(true);
    try {
      await api.saveJournal({ entry_date: date, mood, note: draftNote });
      setNote(draftNote);
      setEditingNote(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  }

  function cancelEdit() {
    setDraftNote('');
    setEditingNote(false);
  }

  async function deleteNote() {
    setSaving(true);
    try {
      await api.saveJournal({ entry_date: date, mood, note: '' });
      setNote('');
      setEditingNote(false);
    } catch {}
    setSaving(false);
  }

  async function addTimedTask() {
    if (!taskTitle.trim() || !taskTime) return;
    setAddSaving(true);
    try {
      const t = await api.createDayTask({ title: taskTitle, task_date: date, time_start: taskTime });
      setTimedTasks(ts => [...ts, t].sort((a, b) => a.time_start.localeCompare(b.time_start)));
      setTaskTitle(''); setTaskTime(''); setShowForm(false);
      haptic?.impactOccurred('light');
    } catch {}
    setAddSaving(false);
  }

  async function toggleTimedTask(id, done) {
    haptic?.impactOccurred('light');
    setTimedTasks(ts => ts.map(x => x.id === id ? { ...x, is_done: done } : x));
    await api.toggleDayTask(id, done);
  }

  async function deleteTimedTask(id) {
    setTimedTasks(ts => ts.filter(x => x.id !== id));
    await api.deleteDayTask(id);
  }

  const swipe = useSwipe(() => goDate(1), () => goDate(-1));

  return (
    <div className={styles.scroll} {...swipe}>
      {/* Date nav */}
      <div className={styles.dateNav}>
        <button className={styles.dateNavBtn} onClick={() => goDate(-1)}>‹</button>
        <div className={styles.dateNavCenter}>
          <span className={styles.dateNavLabel}>{fmtDateShort(date)}</span>
          {!isToday && (
            <button className={styles.todayChip} onClick={() => setDate(todayStr)}>Сегодня</button>
          )}
        </div>
        <div className={styles.dateNavRight}>
          <input type="date" className={styles.datePickerHidden} max={todayStr} value={date}
            onChange={e => { if (e.target.value) { setDate(e.target.value); setShowForm(false); } }}
            id="plan-date-picker" />
          <label htmlFor="plan-date-picker" className={styles.calIcon}>📆</label>
          <button className={styles.dateNavBtn} onClick={() => goDate(1)} disabled={isToday}>›</button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingWrap}><div className="spinner" /></div>
      ) : (
        <>
          {/* Timed schedule */}
          <div className={`card ${styles.block}`}>
            <div className={styles.blockHeader}>
              <p className={styles.blockTitle}>📅 Расписание дня</p>
              <button className={styles.addRowBtn} onClick={() => setShowForm(v => !v)}>
                {showForm ? '✕' : '+ Добавить'}
              </button>
            </div>

            {showForm && (
              <div className={styles.addFormFull}>
                <button className={styles.timePickerBtn} onClick={() => setShowTimePicker(true)}>
                  {taskTime ? `🕐 ${taskTime}` : '🕐 Выбрать время'}
                </button>
                {showTimePicker && (
                  <div className={styles.timePickerModal}>
                    <TimePicker value={taskTime || '08:00'} onChange={() => {}}
                      onConfirm={t => { setTaskTime(t); setShowTimePicker(false); }} />
                    <button className={styles.cancelBtn} style={{ marginTop: 8, width: '100%' }}
                      onClick={() => setShowTimePicker(false)}>Отмена</button>
                  </div>
                )}
                <input className={styles.inputFull} value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  placeholder="Название задачи..." spellCheck lang="ru"
                  onKeyDown={e => e.key === 'Enter' && addTimedTask()} />
                <div className={styles.formBtns}>
                  <button className={styles.cancelBtn} onClick={() => { setShowForm(false); setTaskTitle(''); setTaskTime(''); }}>Отмена</button>
                  <button className={styles.saveBtnGreen} onClick={addTimedTask}
                    disabled={!taskTitle.trim() || !taskTime || addSaving}>
                    {addSaving ? '...' : 'Добавить'}
                  </button>
                </div>
              </div>
            )}

            {timedTasks.length === 0 && !showForm ? (
              <p className={styles.emptyHint}>Нажми «+ Добавить» чтобы создать задачу</p>
            ) : (
              <div className={styles.timeline}>
                {timedTasks.map((t, i) => {
                  const isLast = i === timedTasks.length - 1;
                  return (
                    <div key={t.id} className={styles.timelineItem}>
                      <div className={styles.timelineLeft}>
                        <span className={styles.timeTag}>{t.time_start.slice(0, 5)}</span>
                        {!isLast && <div className={styles.timelineLine} />}
                      </div>
                      <div className={`${styles.timelineCard} ${t.is_done ? styles.timelineCardDone : ''}`}>
                        <button className={`${styles.tlCheck} ${t.is_done ? styles.tlCheckOn : ''}`}
                          onClick={() => toggleTimedTask(t.id, !t.is_done)}>
                          {t.is_done && <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                            <path d="M1 3L3.5 5.5L8 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </button>
                        <span className={`${styles.tlTitle} ${t.is_done ? styles.tlDone : ''}`}>{t.title}</span>
                        <button className={styles.tlDel} onClick={() => deleteTimedTask(t.id)}>✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Mood */}
          <div className={`card ${styles.block}`}>
            <p className={styles.blockTitle}>Как прошёл день?</p>
            <div className={styles.moodRow}>
              {MOODS.map(m => (
                <button key={m.v}
                  className={`${styles.moodBtn} ${mood === m.v ? styles.moodSel : ''}`}
                  onClick={() => handleMood(m.v)}>
                  <span className={styles.moodEmoji}>{m.e}</span>
                  <span className={styles.moodNum}>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div className={`card ${styles.block}`}>
            <div className={styles.blockHeader}>
              <p className={styles.blockTitle}>Заметка дня</p>
              {!editingNote && (
                <div className={styles.noteActions}>
                  <button className={styles.editNoteBtn} onClick={startEditNote}>
                    {note ? 'Изменить' : 'Добавить'}
                  </button>
                  {note && (
                    <button className={styles.deleteNoteBtn} onClick={deleteNote}>Удалить</button>
                  )}
                </div>
              )}
            </div>

            {editingNote ? (
              <>
                <textarea
                  className={styles.noteArea}
                  value={draftNote}
                  onChange={e => setDraftNote(e.target.value)}
                  placeholder="Что запомнилось, мысли, события..."
                  rows={5}
                  spellCheck lang="ru"
                  autoFocus
                />
                <div className={styles.formBtns} style={{ marginTop: 10 }}>
                  <button className={styles.cancelBtn} onClick={cancelEdit}>Отмена</button>
                  <button className={styles.saveBtnGreen} onClick={saveNote} disabled={saving}>
                    {saving ? 'Сохраняю...' : saved ? '✓ Сохранено' : 'Сохранить'}
                  </button>
                </div>
              </>
            ) : note ? (
              <p className={styles.noteText}>{note}</p>
            ) : (
              <p className={styles.emptyHint}>Нет заметки на этот день</p>
            )}
          </div>
        </>
      )}

      <div style={{ height: 24 }} />
    </div>
  );
}

// ── ЗАДАЧИ ───────────────────────────────────────────────
function Tasks() {
  const today = new Date();
  const [selDate, setSelDate] = useState(toStr(today));
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [tasks, setTasks] = useState([]);
  const [taskCounts, setTaskCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const { haptic } = useTelegram();

  useEffect(() => { loadTasks(selDate); }, [selDate]);

  async function loadTasks(d) {
    setLoading(true);
    try {
      const all = await api.getDayTasks(d);
      const simple = all.filter(t => !t.time_start);
      setTasks(simple);
      setTaskCounts(prev => ({ ...prev, [d]: simple.length }));
    } catch { setTasks([]); }
    setLoading(false);
  }

  async function addTask() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const t = await api.createDayTask({ title, task_date: selDate, time_start: null });
      const newTasks = [...tasks, t];
      setTasks(newTasks);
      setTaskCounts(prev => ({ ...prev, [selDate]: newTasks.length }));
      setTitle(''); setShowForm(false);
      haptic?.impactOccurred('light');
    } catch {}
    setSaving(false);
  }

  async function deleteTask(id) {
    const newTasks = tasks.filter(x => x.id !== id);
    setTasks(newTasks);
    setTaskCounts(prev => ({ ...prev, [selDate]: newTasks.length }));
    await api.deleteDayTask(id);
  }

  function prevMonth() { if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); } else setCalMonth(m => m - 1); }
  function nextMonth() { if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); } else setCalMonth(m => m + 1); }
  const firstDow = (new Date(calYear, calMonth, 1).getDay() + 6) % 7;
  const totalDays = new Date(calYear, calMonth + 1, 0).getDate();
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)];
  function ds(d) { return `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }
  const isToday = d => d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
  const isSel = d => d && ds(d) === selDate;

  const selLabel = selDate === toStr(today) ? 'Сегодня'
    : new Date(selDate + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

  return (
    <div className={styles.scroll}>
      <div className={`card ${styles.calBlock}`}>
        <div className={styles.calHeader}>
          <button className={styles.calNav} onClick={prevMonth}>‹</button>
          <span className={styles.calTitle}>{MONTHS[calMonth]} {calYear}</span>
          <button className={styles.calNav} onClick={nextMonth}>›</button>
        </div>
        <div className={styles.calWd}>{WD.map(d => <span key={d} className={styles.calWdl}>{d}</span>)}</div>
        <div className={styles.calGrid}>
          {cells.map((d, i) => {
            const dateStr = d ? ds(d) : null;
            const count = dateStr ? (taskCounts[dateStr] || 0) : 0;
            return (
              <button key={i} disabled={!d}
                className={`${styles.calCell} ${!d ? styles.calEmpty : ''} ${isToday(d) ? styles.calToday : ''} ${isSel(d) ? styles.calSel : ''}`}
                onClick={() => d && setSelDate(ds(d))}>
                {d && (
                  <>
                    <span className={styles.calDayNum}>{d}</span>
                    {count > 0 && <span className={`${styles.calCount} ${isSel(d) ? styles.calCountSel : ''}`}>{count}</span>}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`card ${styles.block}`}>
        <div className={styles.taskHeader}>
          <p className={styles.blockTitle}>{selLabel}</p>
          <button className={styles.addTaskChip} onClick={() => setShowForm(v => !v)}>
            {showForm ? '✕' : '+ Задача'}
          </button>
        </div>

        {showForm && (
          <div className={styles.addFormFull}>
            <input className={styles.inputFull} value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Название задачи..." autoFocus spellCheck lang="ru"
              onKeyDown={e => e.key === 'Enter' && addTask()} />
            <div className={styles.formBtns}>
              <button className={styles.cancelBtn} onClick={() => { setShowForm(false); setTitle(''); }}>Отмена</button>
              <button className={styles.saveBtnGreen} onClick={addTask} disabled={!title.trim() || saving}>
                {saving ? '...' : 'Добавить'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className={styles.centered}><div className="spinner" /></div>
        ) : tasks.length === 0 && !showForm ? (
          <p className={styles.emptyHint}>Нет задач на этот день</p>
        ) : (
          <div className={styles.simpleTaskList}>
            {tasks.map(t => (
              <div key={t.id} className={styles.simpleTaskRow}>
                <span className={styles.simpleBullet}>•</span>
                <span className={styles.simpleTaskTitle}>{t.title}</span>
                <button className={styles.taskDel} onClick={() => deleteTask(t.id)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ height: 24 }} />
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────
export function Journal() {
  const [view, setView] = useState('plan');
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.tabs}>
          <button className={`${styles.tabBtn} ${view === 'plan' ? styles.tabActive : ''}`} onClick={() => setView('plan')}>План дня</button>
          <button className={`${styles.tabBtn} ${view === 'tasks' ? styles.tabActive : ''}`} onClick={() => setView('tasks')}>Задачи</button>
        </div>
      </header>
      {view === 'plan' ? <PlanDay /> : <Tasks />}
    </div>
  );
}
