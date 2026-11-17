// The pot as a bar: each entry's part (its value, in order) in its player's
// colour and, once drawn, the point where the roll fell.
import type { CasinoGame } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { player_colours, roll_at } from '../lib/games';

export function PotBar({ game }: { game: CasinoGame }) {
  const { t, f } = useI18n();
  const colours = player_colours(game);
  const at = roll_at(game);
  const label = game.entries.map((e) => `${e.player_name ?? t.common.a_player} ${f.percent(e.chance)}`).join(', ');
  return (
    <div className="pot-bar" role="img" aria-label={label}>
      <div className="pot-bar__track">
        {game.entries.map((e, i) => (
          <span
            key={i}
            className="pot-bar__part"
            style={{ width: `${(100 * e.value) / (game.value || 1)}%`, background: colours[e.player] }}
            title={`${e.player_name ?? t.common.a_player}: ${f.number(e.value)} (${f.percent(e.chance)})`}
          />
        ))}
      </div>
      {at !== null ? <span className="pot-bar__roll" style={{ left: `${at * 100}%` }} aria-hidden /> : null}
    </div>
  );
}
