import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './TimePicker.module.css';

const SIZE = 260;
const CENTER = SIZE / 2;
const OUTER_R = 100; // 12-24
const INNER_R = 68;  // 0-11

function numToStr(n) { return String(n).padStart(2, '0'); }

function polarToXY(angleDeg, r) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: CENTER + r * Math.cos(rad),
    y: CENTER + r * Math.sin(rad),
  };
}

function xyToAngle(x, y) {
  const dx = x - CENTER;
  const dy = y - CENTER;
  let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
  if (angle < 0) angle += 360;
  return angle;
}

function xyToHour(x, y) {
  const angle = xyToAngle(x, y);
  const dx = x - CENTER;
  const dy = y - CENTER;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const isInner = dist < (OUTER_R + INNER_R) / 2;
  const raw = Math.round(angle / 30) % 12;
  return isInner ? raw : raw + 12;
}

function xyToMinute(x, y) {
  const angle = xyToAngle(x, y);
  return Math.round(angle / 6) % 60;
}

export function TimePicker({ value, onChange, onConfirm }) {
  // value = "HH:MM" or ""
  const initH = value ? parseInt(value.split(':')[0]) : 8;
  const initM = value ? parseInt(value.split(':')[1]) : 0;

  const [mode, setMode] = useState('hour'); // hour | minute
  const [hour, setHour] = useState(initH);
  const [minute, setMinute] = useState(initM);
  const svgRef = useRef(null);
  const dragging = useRef(false);

  function getSVGCoords(e) {
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * SIZE,
      y: ((clientY - rect.top) / rect.height) * SIZE,
    };
  }

  function handlePointerDown(e) {
    dragging.current = true;
    handleMove(e);
  }

  function handleMove(e) {
    if (!dragging.current) return;
    e.preventDefault();
    const { x, y } = getSVGCoords(e);
    if (mode === 'hour') {
      setHour(xyToHour(x, y));
    } else {
      setMinute(xyToMinute(x, y));
    }
  }

  function handlePointerUp(e) {
    if (!dragging.current) return;
    dragging.current = false;
    if (mode === 'hour') {
      setMode('minute');
    }
  }

  useEffect(() => {
    const timeStr = `${numToStr(hour)}:${numToStr(minute)}`;
    onChange(timeStr);
  }, [hour, minute]);

  // Manual input
  const [manualInput, setManualInput] = useState(`${numToStr(hour)}:${numToStr(minute)}`);

  function handleManualChange(e) {
    const val = e.target.value;
    setManualInput(val);
    // Parse HH:MM
    const match = val.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const h = parseInt(match[1]);
      const m = parseInt(match[2]);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        setHour(h);
        setMinute(m);
      }
    }
  }

  // Sync manual input when clock changes
  useEffect(() => {
    setManualInput(`${numToStr(hour)}:${numToStr(minute)}`);
  }, [hour, minute]);

  // Hour markers
  const hourMarkers = [];
  // Outer ring: 12-23
  for (let h = 12; h <= 23; h++) {
    const angle = ((h - 12) / 12) * 360;
    const pos = polarToXY(angle, OUTER_R);
    const isSelected = mode === 'hour' && hour === h;
    hourMarkers.push({ h, pos, isSelected, isOuter: true });
  }
  // Inner ring: 0-11
  for (let h = 0; h <= 11; h++) {
    const angle = (h / 12) * 360;
    const pos = polarToXY(angle, INNER_R);
    const isSelected = mode === 'hour' && hour === h;
    hourMarkers.push({ h, pos, isSelected, isOuter: false });
  }

  // Minute markers: 0,5,10...55
  const minuteMarkers = [];
  for (let m = 0; m < 60; m += 5) {
    const angle = (m / 60) * 360;
    const pos = polarToXY(angle, OUTER_R);
    const isSelected = mode === 'minute' && minute === m;
    minuteMarkers.push({ m, pos, isSelected });
  }

  // Hand position
  let handAngle, handR, handEndPos;
  if (mode === 'hour') {
    handAngle = ((hour % 12) / 12) * 360;
    handR = hour >= 12 ? OUTER_R : INNER_R;
  } else {
    handAngle = (minute / 60) * 360;
    handR = OUTER_R;
  }
  handEndPos = polarToXY(handAngle, handR);

  return (
    <div className={styles.wrap}>


      {/* Manual keyboard input */}
      <input
        className={styles.manualInput}
        value={manualInput}
        onChange={handleManualChange}
        placeholder="чч:мм"
        maxLength={5}
        inputMode="numeric"
      />

      {/* Clock face */}
      <div className={styles.clockWrap}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className={styles.clock}
          onMouseDown={handlePointerDown}
          onMouseMove={handleMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handleMove}
          onTouchEnd={handlePointerUp}
        >
          {/* Background circle */}
          <circle cx={CENTER} cy={CENTER} r={CENTER - 4} fill="#f2f2f7" />

          {/* Hand line */}
          <line
            x1={CENTER} y1={CENTER}
            x2={handEndPos.x} y2={handEndPos.y}
            stroke="#34C759" strokeWidth="2" strokeLinecap="round"
          />
          {/* Center dot */}
          <circle cx={CENTER} cy={CENTER} r={4} fill="#34C759" />

          {mode === 'hour' ? (
            <>
              {hourMarkers.map(({ h, pos, isSelected, isOuter }) => (
                <g key={h}>
                  {isSelected && (
                    <circle cx={pos.x} cy={pos.y} r={isOuter ? 18 : 15} fill="#34C759" />
                  )}
                  <text
                    x={pos.x} y={pos.y}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize={isOuter ? 13 : 11}
                    fontWeight={isSelected ? '700' : '500'}
                    fill={isSelected ? 'white' : isOuter ? '#1c1c1e' : '#6d6d72'}
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                  >
                    {numToStr(h)}
                  </text>
                </g>
              ))}
            </>
          ) : (
            <>
              {minuteMarkers.map(({ m, pos, isSelected }) => (
                <g key={m}>
                  {isSelected && <circle cx={pos.x} cy={pos.y} r={18} fill="#34C759" />}
                  <text
                    x={pos.x} y={pos.y}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize={13} fontWeight={isSelected ? '700' : '500'}
                    fill={isSelected ? 'white' : '#1c1c1e'}
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                  >
                    {numToStr(m)}
                  </text>
                </g>
              ))}
              {/* Dots for non-5 minutes */}
              {Array.from({ length: 60 }, (_, i) => i).filter(i => i % 5 !== 0).map(m => {
                const angle = (m / 60) * 360;
                const pos = polarToXY(angle, OUTER_R);
                const isSel = minute === m;
                return (
                  <g key={`dot-${m}`}>
                    {isSel && <circle cx={pos.x} cy={pos.y} r={16} fill="#34C759" />}
                    <circle cx={pos.x} cy={pos.y} r={2.5} fill={isSel ? 'white' : '#aeaeb2'} style={{ pointerEvents: 'none' }} />
                  </g>
                );
              })}
            </>
          )}

          {/* Hand tip circle */}
          <circle cx={handEndPos.x} cy={handEndPos.y} r={mode === 'hour' ? 18 : 18} fill="none" stroke="#34C759" strokeWidth="2" />
        </svg>
      </div>

      {/* Mode label */}
      <p className={styles.modeLabel}>
        {mode === 'hour' ? 'Выбери час' : 'Выбери минуты'}
      </p>

      {/* Confirm button */}
      <button className={styles.confirmBtn} onClick={() => onConfirm(`${numToStr(hour)}:${numToStr(minute)}`)}>
        Готово — {numToStr(hour)}:{numToStr(minute)}
      </button>
    </div>
  );
}