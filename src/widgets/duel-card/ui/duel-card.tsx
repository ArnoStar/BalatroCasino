// An open coinflip or dice game, as a table seat: the player who started it,
// their side or chance, their items and what it takes to match them, and the
// empty seat (or the player challenged). When someone takes it on, the card
// plays the flip or the roll where it stands, for everyone watching.
import { useEffect, useRef, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { asked, can_join, Coin, DiceTrack, in_game, payout, player_colours, side_of } from '@/entities/casino';
import { ItemRow } from '@/entities/item';
import type { CasinoGame } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { sound, use_revealed } from '@/shared/lib';
import { Avatar, Button, Icon, Value } from '@/shared/ui';

const PLAY_MS = 2600;

export function DuelCard({ game, me, onJoin, onCancel, busy = false, index = 0 }: {
  game: CasinoGame;
  me?: string;
  onJoin?: (game: CasinoGame) => void;
  onCancel?: (game: CasinoGame) => void;
  busy?: boolean;
  index?: number;
}) {
  const { t, f } = useI18n();
  const first = game.entries[0];
  const second = game.entries[1];
  const open = game.status === 'open';
  const done = game.status === 'done';
  const mine = in_game(game, me);
  const for_me = !!me && game.opponent === me;
  const shown = use_revealed(`${game.id}-${game.status}`, done ? PLAY_MS : 0);
  const colours = player_colours(game);
  const chance = asked(game);
  const sounded = useRef(false);
  useEffect(() => {
    if (done && !sounded.current && !mine) {
      sounded.current = true;
      sound.play(game.mode === 'coinflip' ? 'flip' : 'roll');
    }
  }, [done, mine, game.mode]);

  const seat = (i: 0 | 1) => {
    const e = i === 0 ? first : second;
    const side = side_of(game, i);
    const won = done && shown && e && game.winner === e.player;
    const lost = done && shown && e && game.winner !== e.player;
    if (!e) {
      const challenged = game.opponent;
      return (
        <div className={`card-seat card-seat--empty${challenged ? ' card-seat--challenged' : ''}`}>
          {challenged ? (
            <Avatar name={game.opponent_name} player={challenged} size="lg" />
          ) : (
            <span className="card-seat__open" aria-hidden>
              ?
            </span>
          )}
          <span className="card-seat__name">{challenged ? (for_me ? t.common.you : game.opponent_name ?? t.common.a_player) : t.duel.open_seat}</span>
          {side ? <span className={`side side--${side}`}>{t.sides[side]}</span> : null}
          {game.mode === 'dice' ? <span className="card-seat__chance">{f.percent(100 - chance)}</span> : null}
        </div>
      );
    }
    return (
      <div className={`card-seat${won ? ' card-seat--won' : ''}${lost ? ' card-seat--lost' : ''}`} style={{ '--c': colours[e.player] } as CSSProperties}>
        <Avatar name={e.player_name} player={e.player} size="lg" ring={colours[e.player]} />
        <Link className="card-seat__name" to={`/players/${encodeURIComponent(e.player)}`}>
          {e.player === me ? t.common.you : e.player_name ?? t.common.a_player}
        </Link>
        {side ? <span className={`side side--${side}`}>{t.sides[side]}</span> : null}
        {game.mode === 'dice' ? <span className="card-seat__chance">{f.percent(i === 0 && second ? e.chance : i === 0 ? chance : e.chance)}</span> : null}
        {won ? (
          <span className="card-seat__crown" aria-hidden>
            <Icon name="crown" />
          </span>
        ) : null}
      </div>
    );
  };

  const cls = [
    'duel-card', `duel-card--${game.mode}`, `duel-card--${game.status}`, mine && 'duel-card--mine', for_me && open && 'duel-card--for-me',
    done && shown && 'duel-card--landed',
  ].filter(Boolean).join(' ');
  return (
    <article className={cls} style={{ '--i': Math.min(index, 12) } as CSSProperties} aria-label={`${t.modes[game.mode].name}, ${first?.player_name ?? t.common.a_player}`}>
      <header className="duel-card__head">
        <span className="duel-card__mode">
          <Icon name={game.mode === 'coinflip' ? 'sparkle' : 'dice'} /> {t.modes[game.mode].name}
        </span>
        {game.opponent && open ? (
          <span className={`tag ${for_me ? 'tag--gold' : 'tag--violet'}`}>
            <Icon name="swords" /> {for_me ? t.duel.for_you : t.duel.challenge_to(game.opponent_name ?? t.common.a_player)}
          </span>
        ) : null}
        <Value value={game.value} />
      </header>
      <div className="duel-card__table">
        {seat(0)}
        <div className="duel-card__middle">
          {game.mode === 'coinflip' ? (
            <Coin game={done ? game : undefined} side={done ? undefined : game.side ?? 'chips'} flip={done} size="md" />
          ) : (
            <div className="duel-card__dice">
              <span className="duel-card__ask">{done ? '' : f.percent(chance)}</span>
              <DiceTrack game={done ? game : undefined} chance={chance} roll={done} size="sm" />
              <span className="duel-card__pays">{t.duel.pays(f.times(payout(chance)))}</span>
            </div>
          )}
          <span className="duel-card__vs" aria-hidden>
            {t.duel.vs}
          </span>
        </div>
        {seat(1)}
      </div>
      {first ? <ItemRow items={first.items} /> : null}
      <footer className="duel-card__foot">
        {open ? (
          <span className="duel-card__need muted">{t.duel.match_with(f.number(game.join_min ?? 0), f.number(game.join_max ?? 0))}</span>
        ) : done ? (
          <span className={`duel-card__result${shown && game.winner === me ? ' win' : ''}`} aria-live="polite">
            {shown ? (game.winner === me ? t.duel.you_win : t.duel.wins(game.winner_name ?? t.common.a_player)) : game.mode === 'coinflip' ? t.duel.flipping : t.duel.rolling}
          </span>
        ) : (
          <span className="duel-card__result muted">{t.duel.taken_back}</span>
        )}
        {open && mine && onCancel ? (
          <Button size="sm" tone="grey" busy={busy} onClick={() => onCancel(game)} icon={<Icon name="refresh" />}>
            {t.duel.take_back}
          </Button>
        ) : null}
        {open && !mine && onJoin ? (
          <Button size="sm" tone={for_me ? 'gold' : 'green'} disabled={!can_join(game, me)} onClick={() => onJoin(game)} icon={<Icon name="zap" />}>
            {game.mode === 'coinflip' ? t.duel.join_coinflip : t.duel.join_dice}
          </Button>
        ) : null}
        {!open ? (
          <Link className="duel-card__check" to={`/${game.id}`}>
            <Icon name="shield" /> {t.common.details}
          </Link>
        ) : null}
      </footer>
    </article>
  );
}
