// A coinflip's coin, drawn as a poker chip: Chips (blue) on one face, Mult
// (red) on the other, with a striped edge. `flip`: it is tossed, spins, and
// lands on the side the game landed on (at once with reduced motion);
// `spinning`: it spins in the air until the game is drawn.
import type { CasinoGame, Side } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { landed_side } from '../lib/games';

const EDGE = [-4, -3, -2, -1, 0, 1, 2, 3, 4];

export function Coin({ game, side: shown, flip = false, spinning = false, size = 'lg' }: {
  game?: CasinoGame;
  side?: Side;
  flip?: boolean;
  spinning?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}) {
  const { t } = useI18n();
  const landed = game ? landed_side(game) : null;
  const side = shown ?? landed ?? game?.side ?? 'chips';
  const cls = ['coin', `coin--${size}`, `coin--${side}`, flip && 'coin--flip', spinning && 'coin--spinning'].filter(Boolean).join(' ');
  return (
    <div className={cls} role="img" aria-label={landed ? t.result.landed(t.sides[side]) : t.sides[side]}>
      <div className="coin__toss" key={flip && game ? `${game.id}-flip` : side}>
        <div className="coin__body">
          {EDGE.map((z) => (
            <span key={z} className="coin__edge" style={{ transform: `translateZ(${z * 0.6}px)` }} />
          ))}
          <span className="coin__face coin__face--chips">
            <i className="coin__glyph" aria-hidden>+</i>
            <b>{t.sides.chips}</b>
          </span>
          <span className="coin__face coin__face--mult">
            <i className="coin__glyph" aria-hidden>×</i>
            <b>{t.sides.mult}</b>
          </span>
        </div>
      </div>
      <span className="coin__shadow" />
    </div>
  );
}
