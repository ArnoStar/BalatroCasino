// A game of the player's that is drawn, wherever they are in the casino,
// opens its stage (the coin, the dice, the wheel) and says who wins; one at a
// time, in the order they come. The jackpot's page shows its own draw.
import { useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { in_game, useCasino, useCasinoNews } from '@/entities/casino';
import type { CasinoGame } from '@/shared/api';
import { ResultDialog } from '@/widgets/game-stage';

export function ResultHost() {
  const casino = useCasino();
  const here = useLocation();
  const path = useRef(here.pathname);
  path.current = here.pathname;
  const [queue, setQueue] = useState<CasinoGame[]>([]);
  const seen = useRef(new Set<string>());
  const me = casino.me?.id;

  useCasinoNews(({ game }) => {
    if (game.status !== 'done' || !me || !in_game(game, me) || seen.current.has(game.id)) return;
    seen.current.add(game.id);
    if (game.mode === 'jackpot' && path.current === '/jackpot') return;
    setQueue((q) => [...q, game]);
  });

  const current = queue[0];
  if (!current || !me) return null;
  return <ResultDialog key={current.id} game={current} me={me} onClose={() => setQueue((q) => q.slice(1))} />;
}
