import { useRef } from 'react';

export function useSwipe(onSwipeLeft, onSwipeRight, threshold = 50) {
  const startX = useRef(null);
  const startY = useRef(null);

  function onTouchStart(e) {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }

  function onTouchEnd(e) {
    if (startX.current === null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    const dy = e.changedTouches[0].clientY - startY.current;
    // Only trigger if horizontal swipe is dominant
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
      if (dx < 0) onSwipeLeft();   // swipe left → next day
      else onSwipeRight();          // swipe right → prev day
    }
    startX.current = null;
    startY.current = null;
  }

  return { onTouchStart, onTouchEnd };
}
