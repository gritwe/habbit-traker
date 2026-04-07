import { useState } from 'react';
import { api } from '../api/index.js';
import styles from './AddMenu.module.css';

const EMOJIS = ['🎯','🧘','💧','📚','🏃','💪','🥗','🧠','✍️','🌿','☀️','🎵','😴','🚴','🧹','❤️'];
const COLORS = ['#E8F8ED','#E8F0FE','#FFF3E0','#FCE4EC','#E3F2FD','#F3E5F5','#FFF8E1','#E0F7FA'];

function HabitForm({ onDone, onClose }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    await api.createHabit({ name, icon, color });
    onDone();
  }

  return (
    <div className={styles.form}>
      <input className={styles.input} value={name} onChange={e => setName(e.target.value)} placeholder="Название привычки..." spellCheck={true} lang="ru" autoFocus maxLength={50} onKeyDown={e => e.key === 'Enter' && save()} />
      <p className={styles.label}>Иконка</p>
      <div className={styles.emojiGrid}>
        {EMOJIS.map(e => <button key={e} className={`${styles.emojiBtn} ${icon===e?styles.sel:''}`} onClick={() => setIcon(e)}>{e}</button>)}
      </div>
      <p className={styles.label}>Цвет</p>
      <div className={styles.colorRow}>
        {COLORS.map(c => <button key={c} className={`${styles.colorDot} ${color===c?styles.colorSel:''}`} style={{background:c}} onClick={() => setColor(c)} />)}
      </div>
      <button className="btn-primary" onClick={save} disabled={!name.trim()||saving}>{saving?'Сохраняю...':'Добавить привычку'}</button>
    </div>
  );
}

function GoalForm({ onDone }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    await api.createGoal({ title, description: desc, deadline: deadline || null });
    onDone();
  }

  return (
    <div className={styles.form}>
      <input className={styles.input} value={title} onChange={e => setTitle(e.target.value)} placeholder="Название цели..." spellCheck={true} lang="ru" autoFocus maxLength={80} />
      <textarea className={styles.textarea} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Описание (необязательно)..." rows={3} />
      <p className={styles.label}>Дедлайн (необязательно)</p>
      <input className={styles.input} type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
      <button className="btn-primary" onClick={save} disabled={!title.trim()||saving}>{saving?'Сохраняю...':'Добавить цель'}</button>
    </div>
  );
}

function AffirmationForm({ onDone }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!text.trim()) return;
    setSaving(true);
    await api.createAffirmation(text);
    onDone();
  }

  return (
    <div className={styles.form}>
      <textarea className={styles.textarea} value={text} onChange={e => setText(e.target.value)} spellCheck={true} lang="ru" placeholder="Я уверен в себе и своих силах..." autoFocus rows={4} />
      <p className={styles.hint}>Аффирмации будут показываться при входе в приложение случайно</p>
      <button className="btn-primary" onClick={save} disabled={!text.trim()||saving}>{saving?'Сохраняю...':'Добавить аффирмацию'}</button>
    </div>
  );
}

function GratitudeForm({ onDone }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!text.trim()) return;
    setSaving(true);
    await api.createGratitude(text);
    onDone();
  }

  return (
    <div className={styles.form}>
      <textarea className={styles.textarea} value={text} onChange={e => setText(e.target.value)} spellCheck={true} lang="ru" placeholder="Сегодня я благодарен за..." autoFocus rows={4} />
      <button className="btn-primary" onClick={save} disabled={!text.trim()||saving}>{saving?'Сохраняю...':'Добавить'}</button>
    </div>
  );
}

const MENU_ITEMS = [
  { id: 'habit', icon: '✅', label: 'Привычка', color: '#E8F8ED', textColor: '#248A3D' },
  { id: 'goal', icon: '🎯', label: 'Цель', color: '#E8F0FE', textColor: '#5C35CC' },
  { id: 'affirmation', icon: '✨', label: 'Аффирмация', color: '#FFF3E0', textColor: '#C45E00' },
  { id: 'gratitude', icon: '🙏', label: 'Благодарность', color: '#FCE4EC', textColor: '#B5264A' },
];

export function AddMenu({ open, onClose }) {
  const [active, setActive] = useState(null);

  function handleDone() {
    setActive(null);
    onClose(true); // true = something was added, trigger refresh
  }

  function handleClose() {
    setActive(null);
    onClose(false); // false = just closed, no refresh needed
  }

  return (
    <>
      <div className={`${styles.overlay} ${open?styles.overlayOpen:''}`} onClick={handleClose} />
      <div className={`${styles.sheet} ${open?styles.sheetOpen:''}`}>
        <div className={styles.handle} />
        {!active ? (
          <>
            <p className={styles.sheetTitle}>Что добавить?</p>
            <div className={styles.menuGrid}>
              {MENU_ITEMS.map(m => (
                <button key={m.id} className={styles.menuItem} style={{background:m.color}} onClick={() => setActive(m.id)}>
                  <span className={styles.menuIcon}>{m.icon}</span>
                  <span className={styles.menuLabel} style={{color:m.textColor}}>{m.label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className={styles.formHeader}>
              <button className={styles.backBtn} onClick={() => setActive(null)}>‹ Назад</button>
              <p className={styles.sheetTitle}>{MENU_ITEMS.find(m=>m.id===active)?.label}</p>
            </div>
            {active === 'habit' && <HabitForm onDone={handleDone} onClose={handleClose} />}
            {active === 'goal' && <GoalForm onDone={handleDone} />}
            {active === 'affirmation' && <AffirmationForm onDone={handleDone} />}
            {active === 'gratitude' && <GratitudeForm onDone={handleDone} />}
          </>
        )}
      </div>
    </>
  );
}
