import { useState, useEffect } from 'react';
import { api } from '../api/index.js';
import { useTelegram } from '../hooks/useTelegram.js';
import styles from './Journal.module.css';

const MOODS = [{v:1,e:'😞'},{v:2,e:'😕'},{v:3,e:'😐'},{v:4,e:'😊'},{v:5,e:'🤩'}];
const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const WD = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

function toStr(d) { return d.toISOString().split('T')[0]; }

// ── ПЛАН ДНЯ ─────────────────────────────────────────────
function PlanDay() {
  const today = toStr(new Date());
  const [mood, setMood] = useState(null);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [timedTasks, setTimedTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const { haptic } = useTelegram();

  useEffect(() => {
    api.getJournal(today).then(data => {
      if (data) { setMood(data.mood); setNote(data.note || ''); }
    }).catch(() => {});
    api.getDayTasks(today).then(all => {
      setTimedTasks(all.filter(t => t.time_start));
    }).catch(() => {});
  }, []);

  async function handleMood(v) {
    setMood(v);
    haptic?.impactOccurred('light');
    await api.saveJournal({ entry_date: today, mood: v, note });
  }

  async function saveNote() {
    setSaving(true);
    try {
      await api.saveJournal({ entry_date: today, mood, note });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  }

  async function addTimedTask() {
    if (!title.trim() || !time) return;
    setAddSaving(true);
    try {
      const t = await api.createDayTask({ title, task_date: today, time_start: time });
      setTimedTasks(ts => [...ts, t].sort((a,b) => a.time_start.localeCompare(b.time_start)));
      setTitle(''); setTime(''); setShowForm(false);
      haptic?.impactOccurred('light');
    } catch {}
    setAddSaving(false);
  }

  async function toggleTimedTask(id, done) {
    haptic?.impactOccurred('light');
    setTimedTasks(ts => ts.map(x => x.id === id ? {...x, is_done: done} : x));
    await api.toggleDayTask(id, done);
  }

  async function deleteTimedTask(id) {
    setTimedTasks(ts => ts.filter(x => x.id !== id));
    await api.deleteDayTask(id);
  }

  return (
    <div className={styles.scroll}>
      {/* Timed schedule */}
      <div className={`card ${styles.block}`}>
        <div className={styles.blockHeader}>
          <p className={styles.blockTitle}>📅 Расписание дня</p>
          <button className={styles.addRowBtn} onClick={() => setShowForm(v => !v)}>
            {showForm ? '✕' : '+ Добавить'}
          </button>
        </div>

        {/* Add form — full width, time on top, title below, then buttons */}
        {showForm && (
          <div className={styles.addFormFull}>
            <input
              className={styles.timeInputFull}
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              autoFocus
            />
            <input
              className={styles.inputFull}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Название задачи..."
              onKeyDown={e => e.key === 'Enter' && addTimedTask()}
            />
            <div className={styles.formBtns}>
              <button className={styles.cancelBtn} onClick={() => { setShowForm(false); setTitle(''); setTime(''); }}>Отмена</button>
              <button className={styles.saveBtnGreen} onClick={addTimedTask} disabled={!title.trim() || !time || addSaving}>
                {addSaving ? '...' : 'Добавить'}
              </button>
            </div>
          </div>
        )}

        {timedTasks.length === 0 && !showForm
          ? <p className={styles.emptyHint}>Добавь задачи со временем — нажми «+ Добавить»</p>
          : (
            <div className={styles.timeline}>
              {timedTasks.map(t => (
                <div key={t.id} className={styles.timelineItem}>
                  <div className={styles.timelineLeft}>
                    <span className={styles.timeTag}>{t.time_start.slice(0,5)}</span>
                    <div className={styles.timelineLine} />
                  </div>
                  <div className={`${styles.timelineCard} ${t.is_done ? styles.timelineCardDone : ''}`}>
                    <button className={`${styles.tlCheck} ${t.is_done ? styles.tlCheckOn : ''}`} onClick={() => toggleTimedTask(t.id, !t.is_done)}>
                      {t.is_done && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3L3.5 5.5L8 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </button>
                    <span className={`${styles.tlTitle} ${t.is_done ? styles.tlDone : ''}`}>{t.title}</span>
                    <button className={styles.tlDel} onClick={() => deleteTimedTask(t.id)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>

      {/* Mood — with gaps */}
      <div className={`card ${styles.block}`}>
        <p className={styles.blockTitle}>Как прошёл день?</p>
        <div className={styles.moodRow}>
          {MOODS.map(m => (
            <button key={m.v} className={`${styles.moodBtn} ${mood === m.v ? styles.moodSel : ''}`} onClick={() => handleMood(m.v)}>
              <span className={styles.moodEmoji}>{m.e}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Note */}
      <div className={`card ${styles.block}`}>
        <p className={styles.blockTitle}>Заметка дня</p>
        <textarea
          className={styles.noteArea}
          value={note}
          onChange={e => { setNote(e.target.value); setSaved(false); }}
          placeholder="Что запомнилось, мысли, события..."
          rows={4}
        />
        <button className={styles.saveNoteBtn} onClick={saveNote} disabled={saving}>
          {saved ? '✓ Сохранено' : saving ? 'Сохраняю...' : 'Сохранить'}
        </button>
      </div>

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
  const [taskCounts, setTaskCounts] = useState({}); // date -> count
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const { haptic } = useTelegram();

  // Load task counts for current month for calendar dots
  useEffect(() => {
    loadMonthCounts();
  }, [calYear, calMonth]);

  useEffect(() => { loadTasks(selDate); }, [selDate]);

  async function loadMonthCounts() {
    const monthStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}`;
    // We'll load all tasks for visible dates by fetching each day — 
    // instead, store counts locally when we toggle/add
    // For now fetch selected date only and update counts map
  }

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

  async function toggleTask(id, done) {
    haptic?.impactOccurred('light');
    setTasks(ts => ts.map(x => x.id === id ? {...x, is_done: done} : x));
    await api.toggleDayTask(id, done);
  }

  async function deleteTask(id) {
    const newTasks = tasks.filter(x => x.id !== id);
    setTasks(newTasks);
    setTaskCounts(prev => ({ ...prev, [selDate]: newTasks.length }));
    await api.deleteDayTask(id);
  }

  function prevMonth() { if(calMonth===0){setCalYear(y=>y-1);setCalMonth(11);}else setCalMonth(m=>m-1); }
  function nextMonth() { if(calMonth===11){setCalYear(y=>y+1);setCalMonth(0);}else setCalMonth(m=>m+1); }
  const firstDow = (new Date(calYear, calMonth, 1).getDay() + 6) % 7;
  const totalDays = new Date(calYear, calMonth + 1, 0).getDate();
  const cells = [...Array(firstDow).fill(null), ...Array.from({length: totalDays}, (_, i) => i + 1)];
  function ds(d) { return `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
  const isToday = d => d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
  const isSel = d => d && ds(d) === selDate;

  const done = tasks.filter(t => t.is_done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const selLabel = selDate === toStr(today)
    ? 'Сегодня'
    : new Date(selDate + 'T00:00:00').toLocaleDateString('ru-RU', {day:'numeric', month:'long'});

  return (
    <div className={styles.scroll}>
      {/* Mini calendar with task counts */}
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
                className={`${styles.calCell} ${!d?styles.calEmpty:''} ${isToday(d)?styles.calToday:''} ${isSel(d)?styles.calSel:''}`}
                onClick={() => d && setSelDate(ds(d))}>
                {d && (
                  <>
                    <span className={styles.calDayNum}>{d}</span>
                    {count > 0 && (
                      <span className={`${styles.calCount} ${isSel(d) ? styles.calCountSel : ''}`}>{count}</span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tasks list */}
      <div className={`card ${styles.block}`}>
        <div className={styles.taskHeader}>
          <div>
            <p className={styles.blockTitle}>{selLabel}</p>
            {tasks.length > 0 && <p className={styles.taskSub}>{done}/{tasks.length} · {pct}%</p>}
          </div>
          <button className={styles.addTaskChip} onClick={() => setShowForm(v => !v)}>
            {showForm ? '✕' : '+ Задача'}
          </button>
        </div>

        {tasks.length > 0 && (
          <div className={styles.miniBar}>
            <div className={styles.miniBarFill} style={{width:`${pct}%`}} />
          </div>
        )}

        {/* Full-width form */}
        {showForm && (
          <div className={styles.addFormFull}>
            <input
              className={styles.inputFull}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Название задачи..."
              autoFocus
              onKeyDown={e => e.key === 'Enter' && addTask()}
            />
            <div className={styles.formBtns}>
              <button className={styles.cancelBtn} onClick={() => { setShowForm(false); setTitle(''); }}>Отмена</button>
              <button className={styles.saveBtnGreen} onClick={addTask} disabled={!title.trim() || saving}>
                {saving ? '...' : 'Добавить'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className={styles.centered}><div className="spinner"/></div>
        ) : tasks.length === 0 && !showForm ? (
          <p className={styles.emptyHint}>Нет задач на этот день</p>
        ) : (
          tasks.map(t => (
            <div key={t.id} className={styles.taskRow}>
              <button className={`${styles.taskCheck} ${t.is_done ? styles.taskCheckOn : ''}`} onClick={() => toggleTask(t.id, !t.is_done)}>
                {t.is_done && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 3.5L3.5 6L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </button>
              <span className={`${styles.taskTitle} ${t.is_done ? styles.taskDone : ''}`}>{t.title}</span>
              <button className={styles.taskDel} onClick={() => deleteTask(t.id)}>✕</button>
            </div>
          ))
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
          <button className={`${styles.tabBtn} ${view==='plan'?styles.tabActive:''}`} onClick={()=>setView('plan')}>План дня</button>
          <button className={`${styles.tabBtn} ${view==='tasks'?styles.tabActive:''}`} onClick={()=>setView('tasks')}>Задачи</button>
        </div>
      </header>
      {view === 'plan' ? <PlanDay /> : <Tasks />}
    </div>
  );
}
