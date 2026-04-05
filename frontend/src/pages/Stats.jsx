import { useState, useEffect } from 'react';
import { api } from '../api/index.js';
import styles from './Stats.module.css';

const MOOD = {1:'😞',2:'😕',3:'😐',4:'😊',5:'🤩'};

export function Stats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getStats().then(setStats).catch(()=>{}).finally(()=>setLoading(false)); }, []);

  if (loading) return <div className={styles.centered}><div className="spinner" /></div>;
  if (!stats) return <div className={styles.centered}><p>Нет данных</p></div>;

  const t = stats.totals || {};
  const avgMood = stats.moods.length ? (stats.moods.reduce((s,m)=>s+m.mood,0)/stats.moods.length).toFixed(1) : null;

  const today = new Date();
  const days = [];
  for (let i=29;i>=0;i--) {
    const d = new Date(today); d.setDate(d.getDate()-i);
    const ds = d.toISOString().split('T')[0];
    const found = stats.daily.find(r=>r.date===ds);
    const total = Number(t.total_habits||0);
    const comp = found ? Number(found.completed) : 0;
    days.push({ds, pct: total>0?comp/total:0});
  }

  function heatColor(p) {
    if (p===0) return '#f0f0f0';
    if (p<0.33) return '#c8e6c9';
    if (p<0.66) return '#66bb6a';
    if (p<1) return '#43a047';
    return '#2e7d32';
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}><h1 className={styles.title}>Статистика</h1></header>
      <div className={styles.scroll}>

        <div className={styles.cards}>
          <div className={styles.card}><span className={styles.cv}>{t.total_habits||0}</span><span className={styles.cl}>Привычек</span></div>
          <div className={styles.card}><span className={styles.cv}>{t.total_completions||0}</span><span className={styles.cl}>Выполнений</span></div>
          <div className={styles.card}><span className={styles.cv}>{avgMood?`${avgMood}${MOOD[Math.round(avgMood)]}`:'—'}</span><span className={styles.cl}>Настроение</span></div>
          <div className={styles.card}><span className={styles.cv}>{t.total_goals||0}</span><span className={styles.cl}>Целей</span></div>
          <div className={styles.card}><span className={styles.cv}>{t.done_goals||0}</span><span className={styles.cl}>Выполнено</span></div>
          <div className={styles.card}><span className={styles.cv}>{t.total_gratitude||0}</span><span className={styles.cl}>Благодарностей</span></div>
        </div>

        <div className="card" style={{margin:'0 14px 12px',padding:'14px 16px'}}>
          <p className={styles.secTitle}>🔥 Активность 30 дней</p>
          <div className={styles.heatmap}>
            {days.map(d=><div key={d.ds} className={styles.cell} style={{background:heatColor(d.pct)}} title={d.ds} />)}
          </div>
        </div>

        {stats.habits.length > 0 && (
          <div className="card" style={{margin:'0 14px 12px',overflow:'hidden'}}>
            <p className={styles.secTitle} style={{padding:'14px 16px 0'}}>🏆 Привычки</p>
            {stats.habits.map((h,i)=>{
              const max = Number(stats.habits[0]?.total_completions||1);
              return (
                <div key={h.id} className={styles.hRow}>
                  <span className={styles.hRank}>#{i+1}</span>
                  <div className={styles.hIcon} style={{background:h.color}}>{h.icon}</div>
                  <div className={styles.hInfo}>
                    <div className={styles.hName}>{h.name}</div>
                    <div className={styles.hBar}><div className={styles.hFill} style={{width:`${max>0?(Number(h.total_completions)/max)*100:0}%`}} /></div>
                  </div>
                  <span className={styles.hCount}>{h.total_completions}×</span>
                </div>
              );
            })}
          </div>
        )}

        {stats.moods.length > 0 && (
          <div className="card" style={{margin:'0 14px 12px',padding:'14px 16px'}}>
            <p className={styles.secTitle}>😊 Настроение</p>
            <div className={styles.mChart}>
              {stats.moods.slice(-14).map((m,i)=>(
                <div key={i} className={styles.mBar}>
                  <div className={styles.mFill} style={{height:`${(m.mood/5)*60}px`}} />
                  <span style={{fontSize:12}}>{MOOD[m.mood]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{height:24}} />
      </div>
    </div>
  );
}
