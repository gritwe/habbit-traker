import { useState, useEffect } from 'react';
import { api } from '../api/index.js';
import { useTelegram } from '../hooks/useTelegram.js';
import styles from './More.module.css';

// ── SHARED ────────────────────────────────────────────────
function Section({ title, onBack, children }) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.back} onClick={onBack}>‹</button>
        <h1 className={styles.title}>{title}</h1>
        <div style={{ width: 40 }} />
      </header>
      <div className={styles.scroll}>{children}</div>
    </div>
  );
}

function Empty({ icon, text, hint }) {
  return (
    <div className={styles.empty}>
      <p style={{ fontSize: 48 }}>{icon}</p>
      <p className={styles.emptyText}>{text}</p>
      {hint && <p className={styles.emptyHint}>{hint}</p>}
    </div>
  );
}

// ── GOALS ─────────────────────────────────────────────────
function Goals({ onBack }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // goal object being edited
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDeadline, setEditDeadline] = useState('');

  useEffect(() => {
    api.getGoals().then(setGoals).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function startEdit(g) {
    setEditing(g);
    setEditTitle(g.title);
    setEditDesc(g.description || '');
    setEditDeadline(g.deadline ? g.deadline.split('T')[0] : '');
  }

  async function saveEdit() {
    if (!editTitle.trim()) return;
    // Use createGoal as upsert — delete old and create new to keep it simple
    await api.deleteGoal(editing.id);
    const newG = await api.createGoal({ title: editTitle, description: editDesc, deadline: editDeadline || null });
    setGoals(g => [...g.filter(x => x.id !== editing.id), newG]);
    setEditing(null);
  }

  async function toggle(id, done) {
    setGoals(g => g.map(x => x.id === id ? { ...x, is_done: done } : x));
    await api.toggleGoal(id, done);
  }

  async function del(id) {
    setGoals(g => g.filter(x => x.id !== id));
    await api.deleteGoal(id);
  }

  if (editing) return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => setEditing(null)}>‹</button>
        <h1 className={styles.title}>Редактировать цель</h1>
        <div style={{ width: 40 }} />
      </header>
      <div className={styles.scroll}>
        <div className={`card ${styles.editBlock}`}>
          <p className={styles.editLabel}>Название</p>
          <input className={styles.editInput} value={editTitle} onChange={e => setEditTitle(e.target.value)} autoFocus />
          <p className={styles.editLabel}>Описание</p>
          <textarea className={styles.editTa} value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Необязательно..." rows={3} />
          <p className={styles.editLabel}>Дедлайн</p>
          <input className={styles.editInput} type="date" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} />
          <button className={styles.saveBtnGreen} onClick={saveEdit} disabled={!editTitle.trim()} style={{ marginTop: 16 }}>Сохранить</button>
        </div>
        <div style={{ height: 24 }} />
      </div>
    </div>
  );

  return (
    <Section title="Цели" onBack={onBack}>
      {loading ? <div className={styles.centered}><div className="spinner" /></div> :
        goals.length === 0 ? <Empty icon="🎯" text="Нет целей" hint="Добавь через кнопку +" /> :
        goals.map(g => (
          <div key={g.id} className={`card ${styles.itemCard}`}>
            <button className={`${styles.check} ${g.is_done ? styles.checkOn : ''}`} onClick={() => toggle(g.id, !g.is_done)}>
              {g.is_done && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 3.5L3.5 6L9 1" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>}
            </button>
            <div className={styles.itemInfo}>
              <p className={`${styles.itemTitle} ${g.is_done ? styles.itemDone : ''}`}>{g.title}</p>
              {g.description && <p className={styles.itemSub}>{g.description}</p>}
              {g.deadline && <p className={styles.itemMeta}>📅 до {new Date(g.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</p>}
            </div>
            <div className={styles.itemActions}>
              <button className={styles.editBtn} onClick={() => startEdit(g)}>✏️</button>
              <button className={styles.delBtn} onClick={() => del(g.id)}>🗑</button>
            </div>
          </div>
        ))
      }
      <div style={{ height: 24 }} />
    </Section>
  );
}

// ── AFFIRMATIONS ──────────────────────────────────────────
function Affirmations({ onBack }) {
  const [items, setItems] = useState([]);
  const [showAff, setShowAff] = useState(true);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    api.getAffirmations().then(({ items, show }) => {
      setItems(items); setShowAff(show);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function startEdit(a) { setEditing(a); setEditText(a.text); }

  async function saveEdit() {
    if (!editText.trim()) return;
    await api.deleteAffirmation(editing.id);
    const newA = await api.createAffirmation(editText);
    setItems(a => [...a.filter(x => x.id !== editing.id), newA]);
    setEditing(null);
  }

  async function del(id) { setItems(a => a.filter(x => x.id !== id)); await api.deleteAffirmation(id); }
  async function toggleShow(val) { setShowAff(val); await api.setShowAffirmations(val); }

  if (editing) return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => setEditing(null)}>‹</button>
        <h1 className={styles.title}>Редактировать</h1>
        <div style={{ width: 40 }} />
      </header>
      <div className={styles.scroll}>
        <div className={`card ${styles.editBlock}`}>
          <p className={styles.editLabel}>Аффирмация</p>
          <textarea className={styles.editTa} value={editText} onChange={e => setEditText(e.target.value)} autoFocus rows={4} />
          <button className={styles.saveBtnGreen} onClick={saveEdit} disabled={!editText.trim()} style={{ marginTop: 16 }}>Сохранить</button>
        </div>
        <div style={{ height: 24 }} />
      </div>
    </div>
  );

  return (
    <Section title="Аффирмации" onBack={onBack}>
      <div className={`card ${styles.settingRow}`}>
        <div>
          <p className={styles.setTitle}>Показывать при входе</p>
          <p className={styles.setDesc}>Случайная аффирмация при открытии</p>
        </div>
        <button className={`${styles.toggle} ${showAff ? styles.toggleOn : ''}`} onClick={() => toggleShow(!showAff)}>
          <div className={styles.toggleThumb} />
        </button>
      </div>
      {loading ? <div className={styles.centered}><div className="spinner" /></div> :
        items.length === 0 ? <Empty icon="✨" text="Нет аффирмаций" hint="Добавь через кнопку +" /> :
        items.map(a => (
          <div key={a.id} className={`card ${styles.textCard}`}>
            <p className={styles.textBody}>"{a.text}"</p>
            <div className={styles.itemActions}>
              <button className={styles.editBtn} onClick={() => startEdit(a)}>✏️</button>
              <button className={styles.delBtn} onClick={() => del(a.id)}>🗑</button>
            </div>
          </div>
        ))
      }
      <div style={{ height: 24 }} />
    </Section>
  );
}

// ── GRATITUDE ─────────────────────────────────────────────
function Gratitude({ onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    api.getGratitude().then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function add() {
    if (!text.trim()) return;
    setSaving(true);
    try { const item = await api.createGratitude(text); setItems(g => [item, ...g]); setText(''); setShowForm(false); } catch {}
    setSaving(false);
  }

  function startEdit(g) { setEditing(g); setEditText(g.text); }

  async function saveEdit() {
    if (!editText.trim()) return;
    await api.deleteGratitude(editing.id);
    const newG = await api.createGratitude(editText);
    setItems(g => [newG, ...g.filter(x => x.id !== editing.id)]);
    setEditing(null);
  }

  async function del(id) { setItems(g => g.filter(x => x.id !== id)); await api.deleteGratitude(id); }

  if (editing) return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => setEditing(null)}>‹</button>
        <h1 className={styles.title}>Редактировать</h1>
        <div style={{ width: 40 }} />
      </header>
      <div className={styles.scroll}>
        <div className={`card ${styles.editBlock}`}>
          <p className={styles.editLabel}>Благодарность</p>
          <textarea className={styles.editTa} value={editText} onChange={e => setEditText(e.target.value)} autoFocus rows={4} />
          <button className={styles.saveBtnGreen} onClick={saveEdit} disabled={!editText.trim()} style={{ marginTop: 16 }}>Сохранить</button>
        </div>
        <div style={{ height: 24 }} />
      </div>
    </div>
  );

  return (
    <Section title="Благодарности" onBack={onBack}>
      <button className={styles.addBanner} onClick={() => setShowForm(v => !v)}>
        {showForm ? '✕ Отмена' : '+ Добавить благодарность'}
      </button>
      {showForm && (
        <div className={`card ${styles.addForm}`}>
          <textarea className={styles.editTa} value={text} onChange={e => setText(e.target.value)} placeholder="Сегодня я благодарен за..." autoFocus rows={3} />
          <button className={styles.saveBtnGreen} onClick={add} disabled={!text.trim() || saving}>
            {saving ? 'Сохраняю...' : 'Добавить'}
          </button>
        </div>
      )}
      {loading ? <div className={styles.centered}><div className="spinner" /></div> :
        items.length === 0 ? <Empty icon="🙏" text="Нет благодарностей" hint="Добавь первую выше" /> :
        items.map(g => (
          <div key={g.id} className={`card ${styles.textCard}`}>
            <div className={styles.textInfo}>
              <p className={styles.textBody}>{g.text}</p>
              <p className={styles.textDate}>{new Date(g.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</p>
            </div>
            <div className={styles.itemActions}>
              <button className={styles.editBtn} onClick={() => startEdit(g)}>✏️</button>
              <button className={styles.delBtn} onClick={() => del(g.id)}>🗑</button>
            </div>
          </div>
        ))
      }
      <div style={{ height: 24 }} />
    </Section>
  );
}

// ── HABITS ────────────────────────────────────────────────
const EMOJIS = ['🎯','🧘','💧','📚','🏃','💪','🥗','🧠','✍️','🌿','☀️','🎵','😴','🚴','🧹','❤️'];
const COLORS = ['#E8F8ED','#E8F0FE','#FFF3E0','#FCE4EC','#E3F2FD','#F3E5F5','#FFF8E1','#E0F7FA'];

function Habits({ onBack }) {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('🎯');
  const [editColor, setEditColor] = useState(COLORS[0]);

  useEffect(() => {
    api.getHabits().then(setHabits).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function startEdit(h) {
    setEditing(h);
    setEditName(h.name);
    setEditIcon(h.icon);
    setEditColor(h.color);
  }

  async function saveEdit() {
    if (!editName.trim()) return;
    await api.deleteHabit(editing.id);
    const newH = await api.createHabit({ name: editName, icon: editIcon, color: editColor });
    setHabits(h => [...h.filter(x => x.id !== editing.id), { ...newH, streak: editing.streak }]);
    setEditing(null);
  }

  async function del(id) {
    setHabits(h => h.filter(x => x.id !== id));
    await api.deleteHabit(id);
  }

  if (editing) return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => setEditing(null)}>‹</button>
        <h1 className={styles.title}>Редактировать привычку</h1>
        <div style={{ width: 40 }} />
      </header>
      <div className={styles.scroll}>
        <div className={`card ${styles.editBlock}`}>
          <p className={styles.editLabel}>Название</p>
          <input className={styles.editInput} value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
          <p className={styles.editLabel}>Иконка</p>
          <div className={styles.emojiGrid}>
            {EMOJIS.map(e => (
              <button key={e} className={`${styles.emojiBtn} ${editIcon===e?styles.emojiSel:''}`} onClick={() => setEditIcon(e)}>{e}</button>
            ))}
          </div>
          <p className={styles.editLabel}>Цвет</p>
          <div className={styles.colorRow}>
            {COLORS.map(c => (
              <button key={c} className={`${styles.colorDot} ${editColor===c?styles.colorSel:''}`} style={{background:c}} onClick={() => setEditColor(c)} />
            ))}
          </div>
          <button className={styles.saveBtnGreen} onClick={saveEdit} disabled={!editName.trim()} style={{ marginTop: 16 }}>Сохранить</button>
        </div>
        <div style={{ height: 24 }} />
      </div>
    </div>
  );

  return (
    <Section title="Привычки" onBack={onBack}>
      {loading ? <div className={styles.centered}><div className="spinner" /></div> :
        habits.length === 0 ? <Empty icon="✅" text="Нет привычек" hint="Добавь через кнопку +" /> :
        habits.map(h => (
          <div key={h.id} className={`card ${styles.itemCard}`}>
            <div className={styles.habitIcon} style={{ background: h.color }}>{h.icon}</div>
            <div className={styles.itemInfo}>
              <p className={styles.itemTitle}>{h.name}</p>
              <p className={styles.itemSub}>{Number(h.streak) > 0 ? `🔥 ${h.streak}-дневная серия` : 'Нет серии'}</p>
            </div>
            <div className={styles.itemActions}>
              <button className={styles.editBtn} onClick={() => startEdit(h)}>✏️</button>
              <button className={styles.delBtn} onClick={() => del(h.id)}>🗑</button>
            </div>
          </div>
        ))
      }
      <div style={{ height: 24 }} />
    </Section>
  );
}

// ── MAIN ─────────────────────────────────────────────────
export function More() {
  const { user } = useTelegram();
  const [section, setSection] = useState(null);

  if (section === 'goals') return <Goals onBack={() => setSection(null)} />;
  if (section === 'affirmations') return <Affirmations onBack={() => setSection(null)} />;
  if (section === 'gratitude') return <Gratitude onBack={() => setSection(null)} />;
  if (section === 'habits') return <Habits onBack={() => setSection(null)} />;

  const initials = user ? (user.first_name?.[0] || '') + (user.last_name?.[0] || '') : '?';

  return (
    <div className={styles.page}>
      <div className={styles.scroll}>
        <div className={`card ${styles.profile}`}>
          <div className={styles.avatar}>{initials}</div>
          <div>
            <p className={styles.uname}>{user ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Пользователь'}</p>
            {user?.username && <p className={styles.uhandle}>@{user.username}</p>}
          </div>
        </div>

        <p className={styles.secLabel}>Управление</p>
        <div className="card" style={{ margin: '0 14px 14px', overflow: 'hidden' }}>
          {[
            { id: 'habits', icon: '✅', title: 'Привычки', sub: 'Редактировать и удалять' },
            { id: 'goals', icon: '🎯', title: 'Цели', sub: 'Редактировать и удалять' },
            { id: 'affirmations', icon: '✨', title: 'Аффирмации', sub: 'Редактировать и удалять' },
            { id: 'gratitude', icon: '🙏', title: 'Благодарности', sub: 'Редактировать и удалять' },
          ].map((item, i) => (
            <button key={item.id} className={`${styles.menuRow} ${i > 0 ? styles.bordered : ''}`} onClick={() => setSection(item.id)}>
              <span className={styles.menuIcon}>{item.icon}</span>
              <div className={styles.menuInfo}>
                <span className={styles.menuTitle}>{item.title}</span>
                <span className={styles.menuSub}>{item.sub}</span>
              </div>
              <span className={styles.chevron}>›</span>
            </button>
          ))}
        </div>

        <p className={styles.version}>Трекер привычек v2.0</p>
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}
