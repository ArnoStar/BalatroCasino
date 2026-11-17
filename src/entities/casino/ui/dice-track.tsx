// A dice game's line: the pot from 0 to 100%, the first player's part (gold,
// the chance they chose) and the second's, and once rolled, where the roll
// fell. `roll`: slide the marker there (from the start, as the roll comes in).
import type { CSSProperties } from 'react';
import type { CasinoGame } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { roll_at } from '../lib/games';

export function DiceTrack({ game, chance, roll = false, size = 'md' }: { game?: CasinoGame; chance?: number; roll?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const { f } = useI18n();
  // the first player's real part (their share of the pot), else the chance asked
  const first = game && game.value && game.entries.length > 1 ? (100 * (game.entries[0]?.value ?? 0)) / game.value : game?.chance ?? chance ?? 50;
  const at = game ? roll_at(game) : null;
  const won = at !== null ? (at * 100 < first ? 'first' : 'second') : null;
  return (
    <div
      className={`track track--${size}${roll && at !== null ? ' track--roll' : ''}${won ? ` track--won-${won}` : ''}`}
      style={{ '--first': `${first}%`, '--at': `${(at ?? 0) * 100}%` } as CSSProperties}
      role="img"
      aria-label={at !== null ? `${f.percent(first)} · ${f.percent(at * 100)}` : f.percent(first)}
    >
      <span className="track__first" />
      <span className="track__second" />
      <span className="track__cut" />
      {at !== null ? (
        <span className="track__marker">
          <span className="track__value">{f.number(Math.round(at * 10000) / 100)}</span>
        </span>
      ) : null}
    </div>
  );
}
