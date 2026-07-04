import type { Package } from '../types';

function ArcsIcon({ tierIndex, total }: { tierIndex: number; total: number }) {
  const radii = [8, 15, 22];
  const arcsToShow = Math.min(3, Math.max(1, Math.ceil(((tierIndex + 1) / total) * 3)));

  return (
    <svg className="pkg-arcs" viewBox="0 0 46 46">
      <defs>
        <linearGradient id={`pg-${tierIndex}`} x1="0" y1="0" x2="46" y2="46">
          <stop stopColor="#00C2A8" />
          <stop offset="1" stopColor="#FFB020" />
        </linearGradient>
      </defs>
      <circle cx="23" cy="23" r="2.4" fill="var(--gold)" />
      {radii.map((r, i) => {
        const active = i < arcsToShow;
        return (
          <path
            key={r}
            d={`M ${23 - r} 23 A ${r} ${r} 0 0 1 ${23 + r} 23`}
            stroke={active ? `url(#pg-${tierIndex})` : 'var(--border-strong)'}
            strokeWidth={3.2}
            strokeLinecap="round"
            fill="none"
            opacity={active ? 1 : 0.5}
          />
        );
      })}
    </svg>
  );
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const hrs = mins / 60;
  if (hrs === 24) return 'Full day access';
  return `${hrs} hour${hrs > 1 ? 's' : ''} access`;
}

export function PackageCard({
  pkg,
  index,
  total,
  selected,
  onSelect,
}: {
  pkg: Package;
  index: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" className={`pkg-card${selected ? ' selected' : ''}`} onClick={onSelect}>
      <ArcsIcon tierIndex={index} total={total} />
      <div className="pkg-info">
        <div className="pkg-name">{pkg.name}</div>
        <div className="pkg-sub">{formatDuration(pkg.durationMins)} · unlimited data</div>
      </div>
      <div className="pkg-price">
        <span className="cur">KSh</span>
        {pkg.price}
      </div>
    </button>
  );
}
