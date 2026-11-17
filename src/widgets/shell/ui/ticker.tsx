// The last wins, sliding by under the top bar (still, and scrollable, with
// reduced motion): who won, how much, at what chance, in which game.
import { Link } from 'react-router';
import { useCasino } from '@/entities/casino';
import type { CasinoGame } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { Avatar, Icon } from '@/shared/ui';

function Win({ g }: { g: CasinoGame }) {
  const { t, f } = useI18n();
  const chance = g.entries.filter((e) => e.player === g.winner).reduce((s, e) => s + e.chance, 0);
  return (
    <Link to={`/${g.id}`} className={`win-tick win-tick--${g.mode}`}>
      <Icon name={g.mode === 'jackpot' ? 'coins' : g.mode === 'dice' ? 'dice' : 'sparkle'} />
      <Avatar name={g.winner_name} player={g.winner} size="xs" />
      <span className="win-tick__name">{g.winner_name ?? t.common.a_player}</span>
      <span className="win-tick__value">+{f.compact(g.value)}</span>
      <span className="win-tick__chance">{f.percent(chance)}</span>
    </Link>
  );
}

export function Ticker() {
  const { recent, status } = useCasino();
  const { t } = useI18n();
  if (status !== 'ready') return null;
  const wins = recent.filter((g) => g.status === 'done').slice(0, 16);
  return (
    <div className="ticker" aria-label={t.shell.ticker}>
      <span className="ticker__label">
        <Icon name="radio" /> {t.shell.live}
      </span>
      <div className="ticker__view">
        {wins.length ? (
          <div className={`ticker__track${wins.length > 3 ? ' ticker__track--run' : ''}`} style={{ animationDuration: `${Math.max(30, wins.length * 6)}s` }}>
            <div className="ticker__set">
              {wins.map((g) => (
                <Win key={g.id} g={g} />
              ))}
            </div>
            {wins.length > 3 ? (
              <div className="ticker__set" aria-hidden inert>
                {wins.map((g) => (
                  <Win key={g.id} g={g} />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <span className="ticker__empty">{t.shell.ticker_empty}</span>
        )}
      </div>
    </div>
  );
}
