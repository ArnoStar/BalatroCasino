// The lobby: the jackpot (its wheel, what is in it, when it is drawn), the
// three games and how many wait in each, challenges to the player, the games
// waiting for a player, today's best and the last draws.
import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { by_newest, chance_of, Coin, in_game, players_of, useCasino } from '@/entities/casino';
import { StakeDialog, type StakeMode } from '@/features/stake';
import { items_api, type CasinoGame } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { use_async, use_now } from '@/shared/lib';
import { Avatar, Button, CountUp, EmptyState, Icon, LinkButton, Panel, Value } from '@/shared/ui';
import { DuelCard } from '@/widgets/duel-card';
import { Countdown, Wheel } from '@/widgets/game-stage';

function PotCard({ onJoin }: { onJoin: () => void }) {
  const casino = useCasino();
  const { t, f } = useI18n();
  const now = use_now(250) + casino.offset;
  const pot = casino.pot;
  const me = casino.me?.id;
  const left = pot?.closes_at ? Date.parse(pot.closes_at) - now : null;
  const total = (casino.rules?.jackpot_seconds ?? 60) * 1000;
  return (
    <section className="pot-card" aria-labelledby="pot-title">
      <div className="pot-card__wheel">
        <Wheel game={pot} size="md">
          <span className="wheel__label">{t.lobby.in_pot}</span>
          <strong className="wheel__value">
            <CountUp value={pot?.value ?? 0} format={f.compact} />
          </strong>
        </Wheel>
      </div>
      <div className="pot-card__text">
        <p className="eyebrow">
          <Icon name="coins" /> {t.modes.jackpot.name}
        </p>
        <h2 id="pot-title" className="pot-card__title">
          {t.lobby.pot_title}
        </h2>
        {pot ? (
          <dl className="facts">
            <div>
              <dt>{t.jackpot.players}</dt>
              <dd>{players_of(pot).length}</dd>
            </div>
            <div>
              <dt>{t.jackpot.items}</dt>
              <dd>{pot.entries.reduce((n, e) => n + e.items.length, 0)}</dd>
            </div>
            {in_game(pot, me) ? (
              <div>
                <dt>{t.jackpot.your_chance}</dt>
                <dd className="gold">{f.percent(chance_of(pot, me))}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="muted">{t.lobby.pot_empty}</p>
        )}
        <div className="pot-card__clock">
          <Countdown left={left} total={total} size="sm" />
          <span className="muted">{left === null ? t.lobby.waiting_second : t.lobby.drawn_in}</span>
        </div>
        <div className="row">
          <Button onClick={onJoin} disabled={!casino.me?.can_trade || !casino.rules?.open} icon={<Icon name="coins" />}>
            {t.lobby.join_pot}
          </Button>
          <LinkButton to="/jackpot" tone="ghost" icon={<Icon name="eye" />}>
            {t.lobby.see_pot}
          </LinkButton>
        </div>
      </div>
    </section>
  );
}

function Tile({ mode, to, count, biggest }: { mode: 'coinflip' | 'dice' | 'jackpot'; to: string; count: string; biggest?: number }) {
  const { t, f } = useI18n();
  return (
    <Link to={to} className={`tile tile--${mode}`}>
      <span className="tile__art" aria-hidden>
        {mode === 'coinflip' ? <Coin side="chips" size="sm" spinning /> : mode === 'dice' ? <span className="tile__die" /> : <span className="tile__pot" />}
      </span>
      <span className="tile__name">{t.modes[mode].name}</span>
      <span className="tile__tag">{t.modes[mode].tagline}</span>
      <span className="tile__count">
        {count}
        {biggest ? <small> · {t.lobby.biggest_waiting(f.compact(biggest))}</small> : null}
      </span>
      <span className="tile__go" aria-hidden>
        <Icon name="arrow-right" />
      </span>
    </Link>
  );
}

function Today() {
  const { t, f } = useI18n();
  const board = use_async(() => items_api.leaderboard('day'), []);
  const b = board.data;
  if (!b) return null;
  if (!b.games) return <p className="muted">{t.lobby.today_none}</p>;
  return (
    <div className="today">
      <ol className="today__winners">
        {b.winners.slice(0, 3).map((r, i) => (
          <li key={r.player} style={{ '--i': i } as CSSProperties}>
            <span className={`medal medal--${i + 1}`}>{i + 1}</span>
            <Avatar name={r.name} player={r.player} size="sm" />
            <Link to={`/players/${encodeURIComponent(r.player)}`}>{r.name ?? t.common.a_player}</Link>
            <span className="win">+{f.compact(r.net)}</span>
          </li>
        ))}
      </ol>
      <dl className="today__facts">
        {b.biggest[0] ? (
          <div>
            <dt>{t.lobby.biggest_pot}</dt>
            <dd>
              <Link to={`/${b.biggest[0].game}`}>
                <Value value={b.biggest[0].value} compact />
              </Link>{' '}
              <span className="muted">{b.biggest[0].player_name ?? t.common.a_player}</span>
            </dd>
          </div>
        ) : null}
        {b.luckiest[0] ? (
          <div>
            <dt>{t.lobby.luckiest}</dt>
            <dd>
              <Link to={`/${b.luckiest[0].game}`}>{f.percent(b.luckiest[0].chance)}</Link>{' '}
              <span className="muted">{b.luckiest[0].player_name ?? t.common.a_player}</span>
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

export function LobbyPage() {
  const casino = useCasino();
  const { t, f, describe } = useI18n();
  const [stake, setStake] = useState<StakeMode | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const me = casino.me?.id;
  const duels = [...casino.coinflips, ...casino.dice, ...casino.resolved].sort(by_newest);
  const challenges = duels.filter((g) => g.status === 'open' && me && g.opponent === me);
  const others = duels.filter((g) => !challenges.includes(g)).slice(0, 6);
  const can_play = !!casino.me?.can_trade && !!casino.rules?.open;

  async function cancel(g: CasinoGame) {
    setBusy(g.id);
    setError(null);
    try {
      casino.apply(g.mode === 'coinflip' ? await items_api.cancel_coinflip(g.id) : await items_api.cancel_dice(g.id));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  }

  const biggest = (list: CasinoGame[]) => (list.length ? Math.max(...list.map((g) => g.value)) : undefined);
  return (
    <div className="stack-lg lobby">
      <section className="hero">
        <div className="hero__text">
          <p className="eyebrow">
            <Icon name="swords" /> {t.lobby.eyebrow}
          </p>
          <h1 className="hero__title">
            <span className="neon">{t.lobby.title}</span>
          </h1>
          <p className="hero__lead">{t.lobby.lead}</p>
          <div className="row">
            <Button size="lg" onClick={() => setStake({ kind: 'coinflip' })} disabled={!can_play} icon={<Icon name="sparkle" />}>
              {t.coinflip.create}
            </Button>
            <Button size="lg" tone="blue" onClick={() => setStake({ kind: 'dice' })} disabled={!can_play} icon={<Icon name="dice" />}>
              {t.dice.create}
            </Button>
          </div>
        </div>
        <PotCard onJoin={() => setStake({ kind: 'pot' })} />
      </section>

      <div className="tiles">
        <Tile mode="coinflip" to="/coinflip" count={t.lobby.waiting(casino.coinflips.length)} biggest={biggest(casino.coinflips)} />
        <Tile mode="dice" to="/dice" count={t.lobby.waiting(casino.dice.length)} biggest={biggest(casino.dice)} />
        <Tile mode="jackpot" to="/jackpot" count={casino.pot ? `${f.compact(casino.pot.value)} · ${t.common.players_n(players_of(casino.pot).length)}` : t.jackpot.empty} />
      </div>

      {challenges.length ? (
        <Panel title={t.lobby.challenges} icon="swords" tone="gold">
          <div className="board__grid">
            {challenges.map((g, i) => (
              <DuelCard key={g.id} game={g} me={me} index={i} onJoin={(game) => setStake({ kind: 'join', game })} />
            ))}
          </div>
        </Panel>
      ) : null}

      <div className="lobby__grid">
        <Panel
          title={t.lobby.open_games}
          icon="users"
          actions={
            <span className="row">
              <LinkButton to="/coinflip" tone="ghost" size="sm">
                {t.modes.coinflip.name}
              </LinkButton>
              <LinkButton to="/dice" tone="ghost" size="sm">
                {t.modes.dice.name}
              </LinkButton>
            </span>
          }
        >
          {error ? <p className="alert alert--error">{describe(error)}</p> : null}
          {others.length ? (
            <div className="board__grid board__grid--lobby">
              {others.map((g, i) => (
                <DuelCard key={g.id} game={g} me={me} index={i} busy={busy === g.id} onJoin={(game) => setStake({ kind: 'join', game })} onCancel={cancel} />
              ))}
            </div>
          ) : (
            <EmptyState icon="sparkles" title={t.lobby.open_none} />
          )}
        </Panel>
        <div className="stack">
          <Panel title={t.lobby.today} icon="trophy" actions={<LinkButton to="/leaderboard" tone="ghost" size="sm">{t.lobby.see_all}</LinkButton>}>
            <Today />
          </Panel>
          <Panel title={t.lobby.how_title} icon="shield">
            <ol className="how">
              {t.lobby.how.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ol>
            <Link to="/fair" className="more">
              {t.shell.nav.fair} <Icon name="arrow-right" />
            </Link>
          </Panel>
        </div>
      </div>
      {stake ? <StakeDialog mode={stake} onClose={() => setStake(null)} onDone={() => setStake(null)} /> : null}
    </div>
  );
}
