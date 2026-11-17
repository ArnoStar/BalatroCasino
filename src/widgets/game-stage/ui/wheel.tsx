// The jackpot's wheel: the pot as a ring, each entry's part in its player's
// colour (their picture on the part when it is wide enough), a pointer at the
// top. When the pot is drawn the wheel spins and stops with the roll under the
// pointer: driven frame by frame, so that each part passing the pointer ticks.
// With reduced motion it stands on the roll at once.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { player_colours, roll_at } from '@/entities/casino';
import type { CasinoGame } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { reduced_motion, sound } from '@/shared/lib';
import { Avatar } from '@/shared/ui';

export const SPIN_MS = 7200;
const TURNS = 6;
const R = 100; // the ring's outer radius in the SVG's units
const WIDTH = 30; // the ring's width

const ease = (t: number) => 1 - (1 - t) ** 4.2;

function arc(a0: number, a1: number, r: number, w: number): string {
  // angles in turns, clockwise from the top
  const p = (a: number, rad: number) => [Math.sin(a * 2 * Math.PI) * rad, -Math.cos(a * 2 * Math.PI) * rad];
  if (a1 - a0 >= 0.9999) {
    return `M 0 ${-r} A ${r} ${r} 0 1 1 0 ${r} A ${r} ${r} 0 1 1 0 ${-r} Z M 0 ${-(r - w)} A ${r - w} ${r - w} 0 1 0 0 ${r - w} A ${r - w} ${r - w} 0 1 0 0 ${-(r - w)} Z`;
  }
  const large = a1 - a0 > 0.5 ? 1 : 0;
  const [x0, y0] = p(a0, r);
  const [x1, y1] = p(a1, r);
  const [x2, y2] = p(a1, r - w);
  const [x3, y3] = p(a0, r - w);
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${r - w} ${r - w} 0 ${large} 0 ${x3} ${y3} Z`;
}

/** `game`: the pot (or the drawn one); `spin`: turn to its roll (once per game); `children`: the hub's content */
export function Wheel({ game, spin = false, onStop, size = 'lg', children }: {
  game: CasinoGame | null;
  spin?: boolean;
  onStop?: () => void;
  size?: 'sm' | 'md' | 'lg';
  children?: ReactNode;
}) {
  const { t, f } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const [turn, setTurn] = useState(0); // where the wheel rests (turns)
  const [spinning, setSpinning] = useState(false);
  const stop = useRef(onStop);
  stop.current = onStop;

  const entries = game?.entries ?? [];
  const total = game?.value || 1;
  const colours = game ? player_colours(game) : {};
  const edges: number[] = [];
  let acc = 0;
  const parts = entries.map((e) => {
    const a0 = acc / total;
    acc += e.value;
    const a1 = acc / total;
    edges.push(a0);
    return { e, a0, a1 };
  });

  const at = game && spin ? roll_at(game) : null;
  const spin_key = game && spin && at !== null ? game.id : null;
  useEffect(() => {
    if (!spin_key || at === null) return;
    const el = ref.current;
    const target = TURNS + (1 - at); // the roll's point ends under the pointer
    if (!el || reduced_motion()) {
      setTurn(target % 1);
      stop.current?.();
      return;
    }
    setSpinning(true);
    const start = performance.now();
    let frame = 0;
    let last_edge = -1;
    let last_tick = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / SPIN_MS);
      const rot = target * ease(p);
      el.style.setProperty('--turn', `${rot}turn`);
      // the part under the pointer: the one holding 1 - rot (mod 1)
      const under = (1 - (rot % 1) + 1) % 1;
      let edge = 0;
      for (let i = 0; i < edges.length; i++) if (edges[i] <= under) edge = i;
      if (edge !== last_edge && edges.length > 1 && now - last_tick > 45) {
        sound.play('tick');
        last_tick = now;
      }
      last_edge = edge;
      if (p < 1) frame = requestAnimationFrame(step);
      else {
        setTurn(target % 1);
        setSpinning(false);
        sound.play('land');
        stop.current?.();
      }
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [spin_key]); // (one spin per drawn game)

  // a new pot: the wheel rests at the top again
  useEffect(() => {
    if (!spin) {
      setTurn(0);
      ref.current?.style.removeProperty('--turn');
    }
  }, [spin, game?.id]);

  const label = game ? t.jackpot.wheel(f.number(game.value)) : t.jackpot.empty;
  return (
    <div className={`wheel wheel--${size}${spinning ? ' wheel--spinning' : ''}${game?.status === 'done' && !spinning ? ' wheel--drawn' : ''}`} role="img" aria-label={label}>
      <div className="wheel__glow" aria-hidden />
      <div className="wheel__disc" ref={ref} style={{ '--rest': `${turn}turn` } as CSSProperties} aria-hidden>
        <svg viewBox={`${-R - 6} ${-R - 6} ${2 * R + 12} ${2 * R + 12}`} className="wheel__svg">
          <circle r={R + 3} className="wheel__rim" />
          {parts.length ? (
            parts.map(({ e, a0, a1 }, i) => (
              <path key={i} d={arc(a0, a1, R, WIDTH)} fill={colours[e.player]} className={`wheel__part${game?.winner === e.player && game.status === 'done' && !spinning ? ' wheel__part--won' : ''}`} />
            ))
          ) : (
            <path d={arc(0, 1, R, WIDTH)} className="wheel__empty" />
          )}
          {parts.length > 1 ? parts.map(({ a0 }, i) => <line key={i} x1="0" y1={-R} x2="0" y2={-R + WIDTH} className="wheel__edge" transform={`rotate(${a0 * 360})`} />) : null}
          {Array.from({ length: 60 }, (_, i) => (
            <line key={`d${i}`} x1="0" y1={-R + WIDTH + 3} x2="0" y2={-R + WIDTH + (i % 5 === 0 ? 9 : 6)} className="wheel__dot" transform={`rotate(${i * 6})`} />
          ))}
        </svg>
        {size !== 'sm'
          ? parts.map(({ e, a0, a1 }, i) =>
              a1 - a0 > 0.06 ? (
                <span key={i} className="wheel__face" style={{ '--a': `${((a0 + a1) / 2) * 360}deg` } as CSSProperties}>
                  <Avatar name={e.player_name} player={e.player} size="sm" ring={colours[e.player]} />
                </span>
              ) : null,
            )
          : null}
      </div>
      <span className="wheel__pointer" aria-hidden />
      <div className="wheel__hub">{children}</div>
    </div>
  );
}
