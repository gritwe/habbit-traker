import { useState, useEffect } from 'react';
import { api } from '../api/index.js';
import { useTelegram } from '../hooks/useTelegram.js';
import styles from './More.module.css';

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

function Goals({ onBack }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getGoals().then(setGoals).catch(() => {}).finally(() => setLoading(false)); }, []);

  async function toggle(id, done) {
    setGoals(g => g.map(x => x.id === id ? { ...x, is_done: done } : x));
    await api.toggleGoal(id, done);
  }
  async function del(id) {
    setGoals(g => g.filter(x => x.id !== id));
    await api.deleteGoal(id);
  }

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
            <button className={styles.delBtn} onClick={() => del(g.id)}>🗑</button>
          </div>
        ))
      }
      <div style={{ height: 24 }} />
    </Section>
  );
}

function Affirmations({ onBack }) {
  const [items, setItems] = useState([]);
  const [showAff, setShowAff] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAffirmations().then(({ items, show }) => { setItems(items); setShowAff(show); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function del(id) { setItems(a => a.filter(x => x.id !== id)); await api.deleteAffirmation(id); }
  async function toggleShow(val) { setShowAff(val); await api.setShowAffirmations(val); }

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
            <button className={styles.delBtn} onClick={() => del(a.id)}>🗑</button>
          </div>
        ))
      }
      <div style={{ height: 24 }} />
    </Section>
  );
}

function Gratitude({ onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.getGratitude().then(setItems).catch(() => {}).finally(() => setLoading(false)); }, []);

  async function del(id) { setItems(g => g.filter(x => x.id !== id)); await api.deleteGratitude(id); }
  async function add() {
    if (!text.trim()) return;
    setSaving(true);
    try { const item = await api.createGratitude(text); setItems(g => [item, ...g]); setText(''); setShowForm(false); } catch {}
    setSaving(false);
  }

  return (
    <Section title="Благодарности" onBack={onBack}>
      <button className={styles.addBanner} onClick={() => setShowForm(v => !v)}>
        {showForm ? '✕ Отмена' : '+ Добавить благодарность'}
      </button>
      {showForm && (
        <div className={`card ${styles.addForm}`}>
          <textarea className={styles.textarea} value={text} onChange={e => setText(e.target.value)}
            placeholder="Сегодня я благодарен за..." autoFocus rows={3} />
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
            <button className={styles.delBtn} onClick={() => del(g.id)}>🗑</button>
          </div>
        ))
      }
      <div style={{ height: 24 }} />
    </Section>
  );
}

function Habits({ onBack }) {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getHabits().then(setHabits).catch(() => {}).finally(() => setLoading(false)); }, []);

  async function del(id) { setHabits(h => h.filter(x => x.id !== id)); await api.deleteHabit(id); }

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
            <button className={styles.delBtn} onClick={() => del(h.id)}>🗑</button>
          </div>
        ))
      }
      <div style={{ height: 24 }} />
    </Section>
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
            { id: 'habits', icon: '✅', title: 'Привычки', sub: 'Управление и удаление' },
            { id: 'goals', icon: '🎯', title: 'Цели', sub: 'Глобальные цели' },
            { id: 'affirmations', icon: '✨', title: 'Аффирмации', sub: 'Позитивные установки' },
            { id: 'gratitude', icon: '🙏', title: 'Благодарности', sub: 'Журнал благодарности' },
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

        <p className={styles.version}>Трекер привычек</p>
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}
