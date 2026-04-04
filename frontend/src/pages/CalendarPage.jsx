import { useState, useEffect } from 'react';
import { api } from '../api/index.js';
import styles from './CalendarPage.module.css';

const MOOD={1:'😞',2:'😕',3:'😐',4:'😊',5:'🤩'};
const WD=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const MONTHS=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const EMOJIS=['📌','⭐','🔥','💡','🎯','📞','🏃','💼','🎉','❤️','🧘','✈️','🎂','🏥','🛒'];

export function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [journalEntries, setJournalEntries] = useState([]);
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newEmoji, setNewEmoji] = useState('📌');
  const [saving, setSaving] = useState(false);

  const monthStr = `${year}-${String(month+1).padStart(2,'0')}`;

  useEffect(() => {
    api.getJournalMonth(monthStr).then(setJournalEntries).catch(()=>setJournalEntries([]));
    api.getEvents(monthStr).then(setEvents).catch(()=>setEvents([]));
  }, [year, month]);

  function prev(){if(month===0){setYear(y=>y-1);setMonth(11);}else setMonth(m=>m-1);}
  function next(){if(month===11){setYear(y=>y+1);setMonth(0);}else setMonth(m=>m+1);}

  const firstDow=(new Date(year,month,1).getDay()+6)%7;
  const totalDays=new Date(year,month+1,0).getDate();
  const cells=[...Array(firstDow).fill(null),...Array.from({length:totalDays},(_,i)=>i+1)];

  function ds(d){return`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
  function getJEntry(d){if(!d)return null;const s=ds(d);return journalEntries.find(e=>e.entry_date?.startsWith(s))||null;}
  function getDayEvents(d){if(!d)return[];const s=ds(d);return events.filter(e=>e.event_date?.startsWith(s));}
  const isToday=d=>d===today.getDate()&&month===today.getMonth()&&year===today.getFullYear();

  const selJEntry = selected ? getJEntry(selected) : null;
  const selEvents = selected ? getDayEvents(selected) : [];
  const selDate = selected ? ds(selected) : null;

  async function addEvent(){
    if(!newTitle.trim()||!selDate) return;
    setSaving(true);
    try{
      const ev = await api.createEvent({title:newTitle,event_date:selDate,description:newDesc,emoji:newEmoji});
      setEvents(e=>[...e,ev]);
      setNewTitle('');setNewDesc('');setNewEmoji('📌');setShowAddEvent(false);
    }catch{}
    setSaving(false);
  }

  async function deleteEvent(id){
    setEvents(e=>e.filter(x=>x.id!==id));
    await api.deleteEvent(id);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.nav} onClick={prev}>‹</button>
        <h1 className={styles.title}>{MONTHS[month]} {year}</h1>
        <button className={styles.nav} onClick={next}>›</button>
      </header>

      <div className={styles.scroll}>
        <div className={styles.wd}>{WD.map(d=><span key={d} className={styles.wdl}>{d}</span>)}</div>
        <div className={styles.grid}>
          {cells.map((d,i)=>{
            const je=getJEntry(d);
            const evs=getDayEvents(d);
            return(
              <button key={i} className={`${styles.cell} ${!d?styles.empty:''} ${isToday(d)?styles.today:''} ${selected===d?styles.sel:''} ${(je||evs.length>0)?styles.has:''}`}
                onClick={()=>d&&setSelected(selected===d?null:d)} disabled={!d}>
                {d&&<>
                  <span className={styles.dn}>{d}</span>
                  {je?.mood&&<span className={styles.cm}>{MOOD[je.mood]}</span>}
                  {evs.length>0&&<div className={styles.evDots}>{evs.slice(0,2).map(e=><span key={e.id} className={styles.evDot}>{e.emoji}</span>)}</div>}
                  {!je?.mood&&evs.length===0&&je&&<div className={styles.dot}/>}
                </>}
              </button>
            );
          })}
        </div>

        {selected&&(
          <div className={`card ${styles.detail}`}>
            <div className={styles.dTop}>
              <span className={styles.dDate}>{selected} {MONTHS[month]}</span>
              <div className={styles.dTopRight}>
                {selJEntry?.mood&&<span>{MOOD[selJEntry.mood]}</span>}
                <button className={styles.addEvBtn} onClick={()=>setShowAddEvent(v=>!v)}>
                  {showAddEvent?'✕':'+ Событие'}
                </button>
              </div>
            </div>

            {showAddEvent&&(
              <div className={styles.addEvForm}>
                <div className={styles.emojiRow}>
                  {EMOJIS.map(e=><button key={e} className={`${styles.emojiBt} ${newEmoji===e?styles.emojiSel:''}`} onClick={()=>setNewEmoji(e)}>{e}</button>)}
                </div>
                <input className={styles.evInput} value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Название события..." autoFocus onKeyDown={e=>e.key==='Enter'&&addEvent()}/>
                <textarea className={styles.evTa} value={newDesc} onChange={e=>setNewDesc(e.target.value)} placeholder="Описание (необязательно)..." rows={2}/>
                <div className={styles.evBtns}>
                  <button className={styles.cancelBtn} onClick={()=>setShowAddEvent(false)}>Отмена</button>
                  <button className={styles.saveBtn} onClick={addEvent} disabled={!newTitle.trim()||saving}>{saving?'...':'Сохранить'}</button>
                </div>
              </div>
            )}

            {selEvents.length>0&&(
              <div className={styles.evList}>
                {selEvents.map(e=>(
                  <div key={e.id} className={styles.evRow}>
                    <span className={styles.evEmoji}>{e.emoji}</span>
                    <div className={styles.evInfo}>
                      <p className={styles.evTitle}>{e.title}</p>
                      {e.description&&<p className={styles.evDesc}>{e.description}</p>}
                    </div>
                    <button className={styles.evDel} onClick={()=>deleteEvent(e.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {selJEntry?(
              <>
                {selJEntry.note&&<div className={styles.dSec}><b>💭</b><p>{selJEntry.note}</p></div>}
                {selJEntry.gratitude_text&&<div className={styles.dSec}><b>🙏</b><p>{selJEntry.gratitude_text}</p></div>}
                {!selJEntry.note&&!selJEntry.gratitude_text&&selEvents.length===0&&<p className={styles.dEmpty}>Только настроение</p>}
              </>
            ):(selEvents.length===0&&<p className={styles.dEmpty}>Нет записей. Добавь событие!</p>)}
          </div>
        )}

        <div style={{height:24}}/>
      </div>
    </div>
  );
}
