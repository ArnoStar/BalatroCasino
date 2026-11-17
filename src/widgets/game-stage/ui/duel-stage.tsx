// A duel, big: the two players face to face and, between them, the coin (a
// coinflip) or the roll (a dice game). `play`: the game was just drawn: toss
// the coin, run the roll; the winner's side lights up once it has landed.
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Coin, DiceTrack, player_colours, roll_at, side_of } from '@/entities/casino';
import type { CasinoGame } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { reduced_motion, sound, use_revealed } from '@/shared/lib';
import { Avatar, Value } from '@/shared/ui';

export const FLIP_MS = 2600;
export const ROLL_MS = 2600;

/** the roll as a percent of the pot, counted up to where it fell (ticking as it slows) */
function RollNumber({ game, play }: { game: CasinoGame; play: boolean }) {
  const { f } = useI18n();
  const at = (roll_at(game) ?? 0) * 100;
  const [shown, setShown] = useState(play && !reduced_motion() ? 0 : at);
  useEffect(() => {
    if (!play || reduced_motion()) {
      setShown(at);
      return;
    }
    const start = performance.now();
    let frame = 0;
    let last = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / ROLL_MS);
      const eased = 1 - (1 - p) ** 3;
      // a wild spin first, settling on the roll
      const wobble = (1 - eased) * 100 * Math.abs(Math.sin(p * 31));
      const v = Math.min(99.99, Math.max(0, at * eased + wobble * (1 - p)));
      setShown(v);
      if (now - last > 40 + 160 * eased) {
        sound.play('tick');
        last = now;
      }
      if (p < 1) frame = requestAnimationFrame(step);
      else setShown(at);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [game.id, play, at]);
  return <span className="roll-number">{f.number(Math.floor(shown * 100) / 100)}</span>;
}

export function DuelStage({ game, play = false, me }: { game: CasinoGame; play?: boolean; me?: string }) {
  const { t, f } = useI18n();
  const done = game.status === 'done';
  const shown = use_revealed(`${game.id}-${play}`, play && done ? (game.mode === 'coinflip' ? FLIP_MS : ROLL_MS) : 0);
  const landed = done && shown;
  const colours = player_colours(game);
  const played = useRef(false);
  useEffect(() => {
    if (play && done && !played.current) {
      played.current = true;
      sound.play(game.mode === 'coinflip' ? 'flip' : 'roll');
    }
  }, [play, done, game.mode]);

  const seat = (i: number) => {
    const e = game.entries[i];
    const side = side_of(game, i);
    const won = landed && e && game.winner === e.player;
    const lost = landed && e && game.winner !== e.player;
    const cls = ['seat', i === 0 ? 'seat--left' : 'seat--right', won && 'seat--won', lost && 'seat--lost', !e && 'seat--empty'].filter(Boolean).join(' ');
    return (
      <div className={cls} style={e ? ({ '--c': colours[e.player] } as CSSProperties) : undefined}>
        {e ? (
          <>
            <Avatar name={e.player_name} player={e.player} size="xl" ring={colours[e.player]} />
            <strong className="seat__name">{e.player === me ? t.common.you : e.player_name ?? t.common.a_player}</strong>
            <span className="seat__what">
              {side ? <span className={`side side--${side}`}>{t.sides[side]}</span> : null}
              {game.mode === 'dice' ? <span className="seat__chance">{f.percent(e.chance)}</span> : null}
            </span>
            <Value value={e.value} />
          </>
        ) : (
          <>
            <span className="seat__open" aria-hidden>?</span>
            <strong className="seat__name">{t.duel.open_seat}</strong>
          </>
        )}
      </div>
    );
  };

  return (
    <div className={`duel-stage duel-stage--${game.mode}${landed ? ' duel-stage--landed' : ''}`}>
      {seat(0)}
      <div className="duel-stage__middle">
        {game.mode === 'coinflip' ? (
          <Coin game={done ? game : undefined} side={done ? undefined : game.side ?? 'chips'} flip={play && done} spinning={!done && game.entries.length > 1} size="xl" />
        ) : (
          <div className="dice-stage">
            {done ? <RollNumber game={game} play={play} /> : <span className="roll-number roll-number--idle">{f.percent(game.chance ?? 50)}</span>}
            <DiceTrack game={game} chance={game.chance ?? 50} roll={play && done} size="lg" />
          </div>
        )}
        <span className="duel-stage__vs" aria-hidden>
          {t.duel.vs}
        </span>
      </div>
      {seat(1)}
    </div>
  );
}
