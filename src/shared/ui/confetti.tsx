import type { CSSProperties } from 'react';

const COLOURS = ['#ffc53d', '#4c9dff', '#ff5c7a', '#2fe0a0', '#9b7bff', '#ff9f43', '#fff6d6'];

/** falling pieces of colour and a few chips (decoration; still with reduced motion: motion.css hides it) */
export function Confetti({ count = 48 }: { count?: number }) {
  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <i
          key={i}
          className={i % 7 === 0 ? 'confetti__chip' : undefined}
          style={
            {
              '--x': `${(i * 37) % 100}%`,
              '--d': `${(i % 8) * 0.09}s`,
              '--t': `${2.1 + (i % 5) * 0.38}s`,
              '--r': `${(i * 53) % 360}deg`,
              '--drift': `${((i * 29) % 60) - 30}px`,
              '--c': COLOURS[i % COLOURS.length],
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
