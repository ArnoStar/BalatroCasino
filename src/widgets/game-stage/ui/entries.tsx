// A game's entries: who put what in, worth how much, for what chance (and the
// colour that marks them on the pot).
import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { player_colours, side_of } from '@/entities/casino';
import { ItemRow } from '@/entities/item';
import type { CasinoGame } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { Avatar, Icon, Value } from '@/shared/ui';

export function Entries({ game, me, compact = false }: { game: CasinoGame; me?: string; compact?: boolean }) {
  const { t, f } = useI18n();
  const colours = player_colours(game);
  return (
    <ul className={`entries${compact ? ' entries--compact' : ''}`}>
      {game.entries.map((e, i) => {
        const side = side_of(game, i);
        const won = game.status === 'done' && game.winner === e.player;
        return (
          <li key={i} className={`entry${won ? ' entry--won' : ''}${e.player === me ? ' entry--you' : ''}`} style={{ '--c': colours[e.player], '--i': i } as CSSProperties}>
            <span className="entry__who">
              <Avatar name={e.player_name} player={e.player} size="sm" ring={colours[e.player]} />
              <Link className="entry__name" to={`/players/${encodeURIComponent(e.player)}`}>
                {e.player === me ? t.common.you : e.player_name ?? t.common.a_player}
              </Link>
              {side ? <span className={`side side--${side}`}>{t.sides[side]}</span> : null}
              {won ? (
                <span className="tag tag--gold">
                  <Icon name="crown" /> {t.history.won}
                </span>
              ) : null}
            </span>
            <span className="entry__numbers">
              <Value value={e.value} size="sm" />
              <span className="entry__chance">{f.percent(e.chance)}</span>
            </span>
            {!compact ? <ItemRow items={e.items} /> : null}
          </li>
        );
      })}
    </ul>
  );
}
