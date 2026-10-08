import { useEffect, useRef } from 'react';

/** Reports a violation when the tab is hidden/minimised, the window loses focus,
 *  or fullscreen is exited (where supported). Events within 1s count once. */
export default function useTabGuard(enabled, onViolation) {
  const cb = useRef(onViolation);
  cb.current = onViolation;
  useEffect(() => {
    if (!enabled) return;
    let last = 0;
    const fire = () => { const now = Date.now(); if (now - last > 1000) { last = now; cb.current(); } };
    const onVis = () => document.hidden && fire();
    const onFs = () => !document.fullscreenElement && fire();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', fire);
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', fire);
      document.removeEventListener('fullscreenchange', onFs);
    };
  }, [enabled]);
}
