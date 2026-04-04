import { useState, useEffect } from 'react';
import { useTelegram } from './hooks/useTelegram.js';
import { api } from './api/index.js';
import { Home } from './pages/Home.jsx';
import { Journal } from './pages/Journal.jsx';
import { Stats } from './pages/Stats.jsx';
import { CalendarPage } from './pages/CalendarPage.jsx';
import { More } from './pages/More.jsx';
import { AddMenu } from './components/AddMenu.jsx';
import styles from './App.module.css';

const TABS = [
  { id: 'home', label: 'Статистика', icon: '📊' },
  { id: 'journal', label: 'Дневник', icon: '📝' },
  { id: 'add', label: '', icon: '+' },
  { id: 'calendar', label: 'Календарь', icon: '📅' },
  { id: 'more', label: 'Ещё', icon: '✨' },
];

export function App() {
  const [tab, setTab] = useState('home');
  const [addOpen, setAddOpen] = useState(false);
  const [affirmation, setAffirmation] = useState(null);
  const [affShown, setAffShown] = useState(false);
  useTelegram();

  useEffect(() => {
    if (affShown) return;
    api.getAffirmations().then(({ items, show }) => {
      if (show && items.length > 0) {
        setAffirmation(items[Math.floor(Math.random() * items.length)].text);
      }
      setAffShown(true);
    }).catch(() => setAffShown(true));
  }, []);

  return (
    <div className={styles.app}>
      {affirmation && (
        <div className={styles.affOverlay} onClick={() => setAffirmation(null)}>
          <div className={styles.affCard} onClick={e => e.stopPropagation()}>
            <div className={styles.affIcon}>✨</div>
            <p className={styles.affLabel}>Аффирмация дня</p>
            <p className={styles.affText}>{affirmation}</p>
            <button className="btn-primary" onClick={() => setAffirmation(null)}>Начать день</button>
          </div>
        </div>
      )}

      <div className={styles.content}>
        {tab === 'home' && <Home onAdd={() => setAddOpen(true)} />}
        {tab === 'journal' && <Journal />}
        {tab === 'stats' && <Stats />}
        {tab === 'calendar' && <CalendarPage />}
        {tab === 'more' && <More />}
      </div>

      <nav className={styles.tabBar}>
        {TABS.map((t) => {
          if (t.id === 'add') return (
            <button key="add" className={styles.addBtn} onClick={() => setAddOpen(true)}>
              <span className={styles.addBtnIcon}>+</span>
            </button>
          );
          return (
            <button key={t.id} className={`${styles.tabItem} ${tab === t.id ? styles.active : ''}`} onClick={() => setTab(t.id)}>
              <span className={styles.tabIcon}>{t.icon}</span>
              <span className={styles.tabLabel}>{t.label}</span>
            </button>
          );
        })}
      </nav>

      <AddMenu open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
