import React, { useEffect, useRef, useState } from 'react';
import { loadingTracker } from '../services/db';

/**
 * Thin blue progress bar fixed to the top of the window.
 * Shows automatically while any API request is in flight (see loadingTracker in services/db),
 * or when `active` is forced on (e.g. while the session is being restored).
 */
export const TopLoadingBar: React.FC<{ active?: boolean }> = ({ active = false }) => {
  const [busy, setBusy] = useState<boolean>(loadingTracker.isBusy());
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => loadingTracker.subscribe(setBusy), []);

  const running = busy || active;

  useEffect(() => {
    if (timer.current) window.clearInterval(timer.current);

    if (running) {
      setVisible(true);
      setProgress(p => (p > 0 && p < 90 ? p : 8));
      // creep towards 90% while waiting; never reaches 100% until done
      timer.current = window.setInterval(() => {
        setProgress(p => (p >= 90 ? p : p + Math.max(0.5, (90 - p) * 0.08)));
      }, 200);
    } else {
      setProgress(100);
      timer.current = window.setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 350) as unknown as number;
    }
    return () => {
      if (timer.current) {
        window.clearInterval(timer.current);
        window.clearTimeout(timer.current);
      }
    };
  }, [running]);

  return (
    <div
      aria-hidden={!visible}
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      className="fixed top-0 left-0 right-0 h-[3px] z-[100] pointer-events-none"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 300ms ease' }}
    >
      <div
        className="h-full bg-gradient-to-r from-blue-400 via-blue-600 to-blue-800 shadow-[0_0_8px_rgba(37,99,235,0.7)]"
        style={{ width: `${progress}%`, transition: 'width 200ms ease-out' }}
      />
    </div>
  );
};
