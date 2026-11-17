import { useI18n } from '@/shared/i18n';

/** the time left before a draw, as a ring that empties (`left` null: not counting yet) */
export function Countdown({ left, total, size = 'md' }: { left: number | null; total: number; size?: 'sm' | 'md' }) {
  const { f, t } = useI18n();
  const r = 30;
  const c = 2 * Math.PI * r;
  const part = left === null ? 1 : Math.max(0, Math.min(1, left / total));
  const soon = left !== null && left < 10_000;
  return (
    <div className={`countdown countdown--${size}${soon ? ' countdown--soon' : ''}${left === null ? ' countdown--idle' : ''}`}>
      <svg viewBox="0 0 72 72" aria-hidden>
        <circle className="countdown__track" cx="36" cy="36" r={r} />
        <circle className="countdown__fill" cx="36" cy="36" r={r} strokeDasharray={`${part * c} ${c}`} />
      </svg>
      <span className="countdown__text" role={left !== null && left > 0 ? 'timer' : undefined} aria-label={left !== null && left > 0 ? t.jackpot.drawn_in : undefined}>
        {left === null ? '∞' : left > 0 ? f.clock(left) : '…'}
      </span>
    </div>
  );
}
