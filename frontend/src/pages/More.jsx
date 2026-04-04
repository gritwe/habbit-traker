import { useState, useEffect } from 'react';
import { api } from '../api/index.js';
import { useTelegram } from '../hooks/useTelegram.js';
import styles from './More.module.css';

export function More() {
  const { user } = useTelegram();
  const [section, setSection] = useState(null); // goals | affirmations | gratitude
  const [goals, setGoals] = useState([]);
  const [affirmations, setAffirmations] = useState([]);
  const [showAff, setShowAff] = useState(true);
  const [gratitude, setGratitude] = useState([]);
  const [loading, setLoading] = useState(false);

  async function loadGoals() { setLoading(true); try { setGoals(await api.getGoals()); } catch {} setLoading(false); }
  async function loadAff() { setLoading(true); try { const {items,show} = await api.getAffirmations(); setAffirmations(items); setShowAff(show); } catch {} setLoading(false); }
  async function loadGrat() { setLoading(true); try { setGratitude(await api.getGratitude()); } catch {} setLoading(false); }

  useEffect(() => {
    if (section === 'goals') loadGoals();
    if (section === 'affirmations') loadAff();
    if (section === 'gratitude') loadGrat();
  }, [section]);

  async function deleteGoal(id) { setGoals(g=>g.filter(x=>x.id!==id)); await api.deleteGoal(id); }
  async function toggleGoal(id, done) { setGoals(g=>g.map(x=>x.id===id?{...x,is_done:done}:x)); await api.toggleGoal(id,done); }
  async function deleteAff(id) { setAffirmations(a=>a.filter(x=>x.id!==id)); await api.deleteAffirmation(id); }
  async function toggleShowAff(val) { setShowAff(val); await api.setShowAffirmations(val); }
  async function deleteGrat(id) { setGratitude(g=>g.filter(x=>x.id!==id)); await api.deleteGratitude(id); }

  const initials = user ? (user.first_name?.[0]||'')+(user.last_name?.[0]||'') : '?';

  if (section === 'goals') return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.back} onClick={()=>setSection(null)}>‹</button>
        <h1 className={styles.title}>Цели</h1>
        <div style={{width:40}} />
      </header>
      <div className={styles.scroll}>
        {loading ? <div className={styles.centered}><div className="spinner" /></div> :
          goals.length === 0 ? <div className={styles.empty}><p>🎯</p><p>Нет целей</p><p className={styles.hint}>Добавь цель через кнопку +</p></div> :
          goals.map(g => (
            <div key={g.id} className={`card ${styles.goalCard}`}>
              <button className={`${styles.gCheck} ${g.is_done?styles.gDone:''}`} onClick={()=>toggleGoal(g.id,!g.is_done)}>
                {g.is_done && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 3.5L3.5 6L9 1" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>}
              </button>
              <div className={styles.gInfo}>
                <p className={`${styles.gTitle} ${g.is_done?styles.gDoneText:''}`}>{g.title}</p>
                {g.description && <p className={styles.gDesc}>{g.description}</p>}
                {g.deadline && <p className={styles.gDeadline}>📅 до {new Date(g.deadline).toLocaleDateString('ru-RU')}</p>}
              </div>
              <button className={styles.del} onClick={()=>deleteGoal(g.id)}>✕</button>
            </div>
          ))
        }
        <div style={{height:24}} />
      </div>
    </div>
  );

  if (section === 'affirmations') return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.back} onClick={()=>setSection(null)}>‹</button>
        <h1 className={styles.title}>Аффирмации</h1>
        <div style={{width:40}} />
      </header>
      <div className={styles.scroll}>
        <div className={`card ${styles.settingRow}`}>
          <div><p className={styles.setTitle}>Показывать при входе</p><p className={styles.setDesc}>Случайная аффирмация при открытии</p></div>
          <button className={`${styles.toggle} ${showAff?styles.toggleOn:''}`} onClick={()=>toggleShowAff(!showAff)}>
            <div className={styles.toggleThumb} />
          </button>
        </div>
        {loading ? <div className={styles.centered}><div className="spinner" /></div> :
          affirmations.length === 0 ? <div className={styles.empty}><p>✨</p><p>Нет аффирмаций</p><p className={styles.hint}>Добавь через кнопку +</p></div> :
          affirmations.map(a => (
            <div key={a.id} className={`card ${styles.textCard}`}>
              <p className={styles.textBody}>"{a.text}"</p>
              <button className={styles.del} onClick={()=>deleteAff(a.id)}>✕</button>
            </div>
          ))
        }
        <div style={{height:24}} />
      </div>
    </div>
  );

  if (section === 'gratitude') return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.back} onClick={()=>setSection(null)}>‹</button>
        <h1 className={styles.title}>Благодарности</h1>
        <div style={{width:40}} />
      </header>
      <div className={styles.scroll}>
        {loading ? <div className={styles.centered}><div className="spinner" /></div> :
          gratitude.length === 0 ? <div className={styles.empty}><p>🙏</p><p>Нет записей</p><p className={styles.hint}>Добавь через кнопку +</p></div> :
          gratitude.map(g => (
            <div key={g.id} className={`card ${styles.textCard}`}>
              <p className={styles.textBody}>{g.text}</p>
              <p className={styles.textDate}>{new Date(g.created_at).toLocaleDateString('ru-RU')}</p>
              <button className={styles.del} onClick={()=>deleteGrat(g.id)}>✕</button>
            </div>
          ))
        }
        <div style={{height:24}} />
      </div>
    </div>
  );

  // Main menu
  return (
    <div className={styles.page}>
      <div className={styles.scroll}>
        <div className={`card ${styles.profile}`}>
          <div className={styles.avatar}>{initials}</div>
          <div>
            <p className={styles.uname}>{user?`${user.first_name} ${user.last_name||''}`.trim():'Пользователь'}</p>
            {user?.username && <p className={styles.uhandle}>@{user.username}</p>}
          </div>
        </div>

        <p className={styles.secLabel}>Мои данные</p>
        <div className="card" style={{margin:'0 14px 14px',overflow:'hidden'}}>
          {[
            {id:'goals',icon:'🎯',title:'Цели',sub:'Глобальные цели'},
            {id:'affirmations',icon:'✨',title:'Аффирмации',sub:'Позитивные установки'},
            {id:'gratitude',icon:'🙏',title:'Благодарности',sub:'Журнал благодарности'},
          ].map((item,i)=>(
            <button key={item.id} className={`${styles.menuRow} ${i>0?styles.bordered:''}`} onClick={()=>setSection(item.id)}>
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
        <div style={{height:24}} />
      </div>
    </div>
  );
}
