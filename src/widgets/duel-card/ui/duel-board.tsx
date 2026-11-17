// The duels of one game (coinflips, or dice games) waiting, with those that
// just ended where they stood: which to show (all, those the player can
// join, challenges, theirs) and in what order (newest, biggest).
import { useState, type ReactNode } from 'react';
import { can_join, in_game } from '@/entities/casino';
import type { CasinoGame } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { EmptyState, Segmented } from '@/shared/ui';
import { DuelCard } from './duel-card';

type Show = 'all' | 'joinable' | 'challenges' | 'mine';
type Order = 'newest' | 'biggest';

export function DuelBoard({ games, me, onJoin, onCancel, busy, empty, action }: {
  games: CasinoGame[];
  me?: string;
  onJoin: (game: CasinoGame) => void;
  onCancel: (game: CasinoGame) => void;
  busy: string | null;
  empty: { title: string; text: string };
  action?: ReactNode;
}) {
  const { t } = useI18n();
  const [show, setShow] = useState<Show>('all');
  const [order, setOrder] = useState<Order>('newest');
  const keep: Record<Show, (g: CasinoGame) => boolean> = {
    all: () => true,
    joinable: (g) => g.status !== 'open' || can_join(g, me),
    challenges: (g) => !!g.opponent,
    mine: (g) => in_game(g, me),
  };
  const list = games
    .filter(keep[show])
    .sort((a, b) => (order === 'biggest' ? b.value - a.value : b.created_at.localeCompare(a.created_at)) || a.id.localeCompare(b.id));
  return (
    <div className="board">
      <div className="board__tools">
        <Segmented
          label={t.filters.label}
          value={show}
          onChange={setShow}
          options={[
            ['all', t.filters.all],
            ['joinable', t.filters.joinable],
            ['challenges', t.filters.challenges],
            ['mine', t.filters.mine],
          ]}
        />
        <Segmented
          label={t.filters.sort}
          value={order}
          onChange={setOrder}
          options={[
            ['newest', t.filters.newest],
            ['biggest', t.filters.biggest],
          ]}
        />
      </div>
      {list.length ? (
        <div className="board__grid">
          {list.map((g, i) => (
            <DuelCard key={g.id} game={g} me={me} onJoin={onJoin} onCancel={onCancel} busy={busy === g.id} index={i} />
          ))}
        </div>
      ) : (
        <EmptyState icon={games.length ? 'search' : 'sparkles'} title={empty.title} action={action}>
          {empty.text}
        </EmptyState>
      )}
    </div>
  );
}
