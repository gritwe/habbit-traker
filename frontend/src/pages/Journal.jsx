import { useState, useEffect } from 'react';
import { api } from '../api/index.js';
import { useTelegram } from '../hooks/useTelegram.js';
import styles from './Journal.module.css';

const EMOJIS = ['📌','⭐','🔥','💡','🎯','📞','🏃','💼','🎉','❤️','🧘','✈️'];
function toStr(d) { return d.toISOString().split('T')[0]; }
function fmtDate(s) {
  const d = new Date(s + 'T00:00:00');
  const today = toStr(new Date());
  if (s === today) return 'Сегодня';
  return d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
}

function TaskItem({ task, onToggle, onDelete }) {
  return (
    <div className={styles.taskRow}>
      <button className={`${styles.taskCheck} ${task.is_done ? styles.taskCheckOn : ''}`} onClick={() => onToggle(task.id, !task.is_done)}>
        {task.is_done && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 3.5L3.5 6L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </button>
      <div className={styles.taskInfo}>
        {task.time_start && <span className={styles.taskTime}>{task.time_start.slice(0,5)}</span>}
        <span className={`${styles.taskTitle} ${task.is_done ? styles.taskDone : ''}`}>{task.title}</span>
      </div>
      <button className={styles.taskDel} onClick={() => onDelete(task.id)}>✕</button>
    </div>
  );
}

export function Journal() {
  const { haptic } = useTelegram();
  const [view, setView] = useState('today'); // today | history
  const [date, setDate] = useState(toStr(new Date()));
  const [tasks, setTasks] = useState([]);
  const [gratitude, setGratitude] = useState([]);
  const [recentGratitude, setRecentGratitude] = useState([]);
  const [loading, setLoading] = useState(false);

  // Add task form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskTime, setTaskTime] = useState('');
  const [showTaskForm, setShowTaskForm] = useState(false);

  // Add gratitude form
  const [gratText, setGratText] = useState('');
  const [showGratForm, setShowGratForm] = useState(false);

  const isToday = date === toStr(new Date());

  useEffect(() => { loadDay(date); }, [date]);
  useEffect(() => { if (view === 'history') loadRecentGratitude(); }, [view]);

  async function loadDay(d) {
    setLoading(true);
    try {
      const [t, g] = await Promise.all([
        api.getDayTasks(d),
        api.getGratitude(),
      ]);
      setTasks(t);
      setGratitude(g.filter(x => x.entry_date?.startsWith(d)));
    } catch {}
    setLoading(false);
  }

  async function loadRecentGratitude() {
    try { setRecentGratitude(await api.getGratitude()); } catch {}
  }

  async function addTask() {
    if (!taskTitle.trim()) return;
    haptic?.impactOccurred('light');
    const task = await api.createDayTask({ title: taskTitle, task_date: date, time_start: taskTime || null });
    setTasks(t => [...t, task].sort((a,b) => (a.time_start||'99:99').localeCompare(b.time_start||'99:99')));
    setTaskTitle(''); setTaskTime(''); setShowTaskForm(false);
  }

  async function toggleTask(id, done) {
    haptic?.impactOccurred('light');
    setTasks(t => t.map(x => x.id === id ? { ...x, is_done: done } : x));
    await api.toggleDayTask(id, done);
  }

  async function deleteTask(id) {
    setTasks(t => t.filter(x => x.id !== id));
    await api.deleteDayTask(id);
  }

  async function addGratitude() {
    if (!gratText.trim()) return;
    haptic?.impactOccurred('light');
    const item = await api.createGratitude(gratText);
    setGratitude(g => [...g, item]);
    setGratText(''); setShowGratForm(false);
  }

  async function deleteGratitude(id) {
    setGratitude(g => g.filter(x => x.id !== id));
    await api.deleteGratitude(id);
  }

  function goDate(d) {
    const nd = new Date(date + 'T00:00:00'); nd.setDate(nd.getDate() + d);
    const s = toStr(nd);
    if (s > toStr(new Date())) return;
    setDate(s);
  }

  const doneTasks = tasks.filter(t => t.is_done).length;
  const taskPct = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={`${styles.tab} ${view==='today'?styles.tabActive:''}`} onClick={()=>setView('today')}>План дня</button>
        <button className={`${styles.tab} ${view==='history'?styles.tabActive:''}`} onClick={()=>setView('history')}>Благодарности</button>
      </header>

      {view === 'today' && (
        <div className={styles.scroll}>
          {/* Date nav */}
          <div className={styles.dateNav}>
            <button className={styles.navBtn} onClick={()=>goDate(-1)}>‹</button>
            <div className={styles.dateInfo}>
              <span className={styles.dateText}>{fmtDate(date)}</span>
              {!isToday && <button className={styles.todayBtn} onClick={()=>setDate(toStr(new Date()))}>Сегодня</button>}
            </div>
            <button className={styles.navBtn} onClick={()=>goDate(1)} disabled={isToday}>›</button>
          </div>

          {loading ? <div className={styles.centered}><div className="spinner"/></div> : <>

            {/* Tasks block */}
            <div className={`card ${styles.block}`}>
              <div className={styles.blockHeader}>
                <span className={styles.blockTitle}>📋 Задачи дня</span>
                {tasks.length > 0 && <span className={styles.pct}>{taskPct}%</span>}
              </div>

              {tasks.length > 0 && (
                <div className={styles.miniBar}>
                  <div className={styles.miniBarFill} style={{width:`${taskPct}%`}} />
                </div>
              )}

              {tasks.map(t => (
                <TaskItem key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} />
              ))}

              {showTaskForm ? (
                <div className={styles.addForm}>
                  <div className={styles.formRow}>
                    <input className={styles.input} value={taskTitle} onChange={e=>setTaskTitle(e.target.value)}
                      placeholder="Название задачи..." autoFocus onKeyDown={e=>e.key==='Enter'&&addTask()} />
                    <input className={styles.timeInput} type="time" value={taskTime} onChange={e=>setTaskTime(e.target.value)} />
                  </div>
                  <div className={styles.formBtns}>
                    <button className={styles.cancelBtn} onClick={()=>setShowTaskForm(false)}>Отмена</button>
                    <button className={styles.saveBtn} onClick={addTask} disabled={!taskTitle.trim()}>Добавить</button>
                  </div>
                </div>
              ) : (
                <button className={styles.addRowBtn} onClick={()=>setShowTaskForm(true)}>
                  <span className={styles.addRowIcon}>+</span> Добавить задачу
                </button>
              )}
            </div>

            {/* Gratitude block */}
            <div className={`card ${styles.block}`}>
              <div className={styles.blockHeader}>
                <span className={styles.blockTitle}>🙏 Благодарность</span>
              </div>

              {gratitude.map(g => (
                <div key={g.id} className={styles.gratRow}>
                  <p className={styles.gratText}>{g.text}</p>
                  <button className={styles.taskDel} onClick={()=>deleteGratitude(g.id)}>✕</button>
                </div>
              ))}

              {showGratForm ? (
                <div className={styles.addForm}>
                  <textarea className={styles.textarea} value={gratText} onChange={e=>setGratText(e.target.value)}
                    placeholder="Сегодня я благодарен за..." autoFocus rows={3} />
                  <div className={styles.formBtns}>
                    <button className={styles.cancelBtn} onClick={()=>setShowGratForm(false)}>Отмена</button>
                    <button className={styles.saveBtn} onClick={addGratitude} disabled={!gratText.trim()}>Добавить</button>
                  </div>
                </div>
              ) : (
                <button className={styles.addRowBtn} onClick={()=>setShowGratForm(true)}>
                  <span className={styles.addRowIcon}>+</span> Добавить благодарность
                </button>
              )}
            </div>

            <div style={{height:24}} />
          </>}
        </div>
      )}

      {view === 'history' && (
        <div className={styles.scroll}>
          {recentGratitude.length === 0 ? (
            <div className={styles.empty}>
              <p style={{fontSize:48}}>🙏</p>
              <p className={styles.emptyText}>Нет благодарностей</p>
              <p className={styles.emptyHint}>Добавь в плане дня</p>
            </div>
          ) : (
            recentGratitude.map(g => (
              <div key={g.id} className={`card ${styles.histCard}`}>
                <p className={styles.histDate}>{new Date(g.created_at).toLocaleDateString('ru-RU',{day:'numeric',month:'long'})}</p>
                <p className={styles.histText}>{g.text}</p>
              </div>
            ))
          )}
          <div style={{height:24}} />
        </div>
      )}
    </div>
  );
}
