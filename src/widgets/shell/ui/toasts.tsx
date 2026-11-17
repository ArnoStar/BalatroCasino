// News that can't wait, in a corner: a challenge to the player, and the pot
// they are in about to be drawn. (A game of theirs that ends opens its own
// stage: app/result-host.)
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { in_game, useCasino, useCasinoNews } from '@/entities/casino';
import { useI18n } from '@/shared/i18n';
import { sound } from '@/shared/lib';
import { Avatar, Icon } from '@/shared/ui';

interface Toast {
  id: string;
  text: string;
  icon: 'swords' | 'clock';
  player?: { id: string; name: string | null };
  to?: string;
}

const LIFE_MS = 7000;

export function Toasts() {
  const { t } = useI18n();
  const casino = useCasino();
  const navigate = useNavigate();
  const here = useLocation();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seen = useRef(new Set<string>());

  const push = (toast: Toast) => {
    if (seen.current.has(toast.id)) return;
    seen.current.add(toast.id);
    setToasts((list) => [...list.slice(-3), toast]);
    sound.play('notify');
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== toast.id)), LIFE_MS);
  };

  const me = casino.me?.id;
  useCasinoNews(({ game }) => {
    if (game.status === 'open' && me && game.opponent === me && !in_game(game, me)) {
      const first = game.entries[0];
      push({
        id: `challenge-${game.id}`,
        text: t.toasts.challenged(first?.player_name ?? t.common.a_player, t.modes[game.mode].name),
        icon: 'swords',
        player: first ? { id: first.player, name: first.player_name } : undefined,
        to: `/${game.mode}`,
      });
    }
  });

  // the pot the player is in: a word 10 seconds before it is drawn (unless they watch it)
  const pot = casino.pot;
  const closes = pot?.closes_at && in_game(pot, me) ? Date.parse(pot.closes_at) : null;
  useEffect(() => {
    if (!closes || !pot || here.pathname === '/jackpot') return;
    const wait = closes - casino.server_now() - 10_000;
    if (wait < 0) return;
    const timer = setTimeout(() => push({ id: `soon-${pot.id}`, text: t.toasts.pot_soon, icon: 'clock', to: '/jackpot' }), wait);
    return () => clearTimeout(timer);
  }, [closes, pot?.id, here.pathname]); // (one word per pot: `seen` keeps it from coming twice)

  if (!toasts.length) return null;
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast">
          {toast.player ? <Avatar name={toast.player.name} player={toast.player.id} size="sm" /> : <Icon name={toast.icon} className="toast__icon" />}
          <span className="toast__text">{toast.text}</span>
          {toast.to ? (
            <button
              type="button"
              className="btn btn--gold btn--sm"
              onClick={() => {
                setToasts((list) => list.filter((x) => x.id !== toast.id));
                navigate(toast.to!);
              }}
            >
              {t.toasts.see}
            </button>
          ) : null}
          <button type="button" className="icon-button icon-button--sm" aria-label={t.toasts.dismiss} onClick={() => setToasts((list) => list.filter((x) => x.id !== toast.id))}>
            <Icon name="close" />
          </button>
        </div>
      ))}
    </div>
  );
}
