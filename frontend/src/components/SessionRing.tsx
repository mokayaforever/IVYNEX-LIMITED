import { useEffect, useRef, useState } from 'react';

const CIRCUMFERENCE = 2 * Math.PI * 70;

export function SessionRing({ expiresAt }: { expiresAt: string }) {
  const totalSecondsRef = useRef<number | null>(null);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const expiresAtMs = new Date(expiresAt).getTime();
    if (totalSecondsRef.current === null) {
      totalSecondsRef.current = Math.max(1, Math.round((expiresAtMs - Date.now()) / 1000));
    }

    const tick = () => {
      const secondsLeft = Math.max(0, Math.round((expiresAtMs - Date.now()) / 1000));
      setRemaining(secondsLeft);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const total = totalSecondsRef.current || 1;
  const fraction = Math.min(1, remaining / total);
  const offset = CIRCUMFERENCE * (1 - fraction);

  const h = String(Math.floor(remaining / 3600)).padStart(2, '0');
  const m = String(Math.floor((remaining % 3600) / 60)).padStart(2, '0');
  const s = String(remaining % 60).padStart(2, '0');

  return (
    <div className="ring-wrap">
      <svg className="ring" viewBox="0 0 160 160">
        <circle className="ring-track" cx="80" cy="80" r="70" />
        <circle
          className="ring-progress"
          cx="80"
          cy="80"
          r="70"
          style={{ strokeDasharray: CIRCUMFERENCE, strokeDashoffset: offset }}
        />
      </svg>
      <div className="ring-center">
        <div className="ring-time">{`${h}:${m}:${s}`}</div>
        <div className="ring-label">time remaining</div>
      </div>
    </div>
  );
}
