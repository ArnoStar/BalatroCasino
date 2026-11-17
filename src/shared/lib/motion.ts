import { useEffect, useState } from 'react';

/** the player asked for less movement: animations stand still, results show at once */
export const reduced_motion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** how long a reveal waits for its animation (0 with reduced motion) */
export const reveal_delay = (ms: number) => (reduced_motion() ? 0 : ms);

/** the time (ms), updated every `every` ms */
export function use_now(every: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(timer);
  }, [every]);
  return now;
}

/** true once `ms` have passed since `key` changed (at once with reduced motion) */
export function use_revealed(key: string, ms: number): boolean {
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => {
    const delay = reveal_delay(ms);
    if (!delay) {
      setShown(key);
      return;
    }
    const timer = setTimeout(() => setShown(key), delay);
    return () => clearTimeout(timer);
  }, [key, ms]);
  return shown === key;
}
