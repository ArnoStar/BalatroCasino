// /jackpot: the pot as a wheel, its countdown and what is in it. When it is
// drawn, the wheel spins here for everyone and stops on the winner; the next
// pot opens with the next items.
import { useState } from 'react';
import { Link } from 'react-router';
import { chance_of, in_game, PotBar, players_of, stake_of, useCasino, useCasinoNews } from '@/entities/casino';
import { StakeDialog, type StakeMode } from '@/features/stake';
import { items_api, type CasinoGame } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { reveal_delay, sound, use_now } from '@/shared/lib';
import { Alert, Avatar, Button, Confetti, CountUp, EmptyState, Icon, PageHeader, Panel, Value } from '@/shared/ui';
import { Countdown, Entries, SPIN_MS, Wheel } from '@/widgets/game-stage';

const HOLD_MS = 6000; // the drawn pot stays on the wheel this long after it stops

export function JackpotPage() {
  const casino = useCasino();
  const { t, f, describe } = useI18n();
  const now = use_now(250) + casino.offset;
  const [stake, setStake] = useState<StakeMode | null>(null);
  const [drawn, setDrawn] = useState<CasinoGame | null>(null);
  const [stopped, setStopped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const me = casino.me?.id;

  useCasinoNews(({ game, known }) => {
    if (game.mode === 'jackpot' && game.status === 'done' && known) {
      setStopped(false);
      setDrawn(game);
      setTimeout(() => setDrawn((d) => (d?.id === game.id ? null : d)), reveal_delay(SPIN_MS) + HOLD_MS);
    }
  });

  const pot = casino.pot;
  const shown = drawn ?? pot;
  const left = pot?.closes_at ? Date.parse(pot.closes_at) - now : null;
  const total = (casino.rules?.jackpot_seconds ?? 60) * 1000;
  const mine = pot ? in_game(pot, me) : false;
  const alone = !!pot && mine && players_of(pot).length === 1;
  const can_play = !!casino.me?.can_trade && !!casino.rules?.open;
  const last = casino.recent.filter((g) => g.mode === 'jackpot' && g.status === 'done' && g.id !== drawn?.id).slice(0, 8);
  const drawn_won = drawn && stopped ? drawn.winner === me : false;

  async function leave() {
    setBusy(true);
    setError(null);
    try {
      casino.apply(await items_api.leave_jackpot());
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  let hub;
  if (drawn) {
    hub = stopped ? (
      <span className="wheel__winner">
        <Avatar name={drawn.winner_name} player={drawn.winner} size="lg" />
        <strong>{drawn.winner === me ? t.common.you : drawn.winner_name ?? t.common.a_player}</strong>
        <Value value={drawn.value} compact />
      </span>
    ) : (
      <>
        <span className="wheel__label">{t.jackpot.drawing}</span>
        <Value value={drawn.value} size="lg" compact />
      </>
    );
  } else if (pot) {
    hub = (
      <>
        <span className="wheel__label">{t.jackpot.in_pot}</span>
        <strong className="wheel__value">
          <CountUp value={pot.value} format={f.number} />
        </strong>
        <Countdown left={left} total={total} size="sm" />
      </>
    );
  } else {
    hub = (
      <>
        <span className="wheel__label">{t.jackpot.empty}</span>
        <Icon name="coins" className="wheel__idle" />
      </>
    );
  }

  return (
    <div className="stack-lg jackpot">
      <PageHeader
        eyebrow={t.modes.jackpot.tagline}
        icon="coins"
        title={<span className="neon neon--gold">{t.jackpot.title}</span>}
        lead={t.jackpot.lead(f.seconds(casino.rules?.jackpot_seconds ?? 60))}
      />
      <section className={`jackpot__stage${drawn ? ' jackpot__stage--drawn' : ''}`}>
        {drawn && stopped && drawn_won ? <Confetti /> : null}
        <Wheel
          game={shown}
          spin={!!drawn}
          onStop={() => {
            setStopped(true);
            if (drawn && in_game(drawn, me)) sound.play(drawn.winner === me ? 'win' : 'lose');
          }}
        >
          {hub}
        </Wheel>
        <div className="jackpot__side">
          {drawn && stopped ? (
            <div className={`jackpot__result ${drawn_won ? 'win' : in_game(drawn, me) ? 'loss' : ''}`} aria-live="polite">
              <p className="jackpot__result-title">
                {drawn_won ? t.toasts.pot_win : t.toasts.pot_lose(drawn.winner_name ?? t.common.a_player)}
              </p>
              <p className="muted">
                {t.jackpot.takes(
                  drawn.winner === me ? t.common.you : drawn.winner_name ?? t.common.a_player,
                  f.number(drawn.value),
                  f.percent(chance_of(drawn, drawn.winner ?? undefined)),
                )}
              </p>
              <Link to={`/${drawn.id}`}>
                <Icon name="shield" /> {t.result.check}
              </Link>
            </div>
          ) : null}
          {pot && !drawn ? (
            <dl className="facts facts--big">
              <div>
                <dt>{t.jackpot.players}</dt>
                <dd>
                  {players_of(pot).length} <small>/ {casino.rules?.jackpot_max_players ?? 10}</small>
                </dd>
              </div>
              <div>
                <dt>{t.jackpot.items}</dt>
                <dd>
                  {pot.entries.reduce((n, e) => n + e.items.length, 0)} <small>/ {casino.rules?.jackpot_max_items ?? 50}</small>
                </dd>
              </div>
              <div>
                <dt>{t.jackpot.your_chance}</dt>
                <dd className={mine ? 'gold' : 'muted'}>{mine ? f.percent(chance_of(pot, me)) : '—'}</dd>
              </div>
              {mine ? (
                <div>
                  <dt>{t.stake.you_stake}</dt>
                  <dd>
                    <Value value={stake_of(pot, me)} />
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}
          {!pot && !drawn ? <p className="muted">{t.jackpot.empty_hint}</p> : null}
          <div className="row">
            <Button size="lg" onClick={() => setStake({ kind: 'pot' })} disabled={!can_play} icon={<Icon name="coins" />}>
              {mine ? t.jackpot.put_more : t.jackpot.put_in}
            </Button>
            {alone ? (
              <Button tone="grey" busy={busy} onClick={leave} icon={<Icon name="refresh" />}>
                {t.jackpot.take_back}
              </Button>
            ) : null}
          </div>
          {alone ? <p className="muted small">{t.jackpot.alone}</p> : null}
          {error ? <Alert>{describe(error)}</Alert> : null}
        </div>
      </section>

      {shown && shown.entries.length ? (
        <Panel title={t.jackpot.entries} icon="users" tone="gold">
          <PotBar game={shown} />
          <Entries game={shown} me={me} />
        </Panel>
      ) : null}

      <Panel title={t.jackpot.last} icon="history">
        {last.length ? (
          <ul className="recent">
            {last.map((g) => (
              <li key={g.id}>
                <Link to={`/${g.id}`} className="recent__game">
                  <Avatar name={g.winner_name} player={g.winner} size="sm" />
                  <span className="recent__who">
                    <strong>{g.winner === me ? t.common.you : g.winner_name ?? t.common.a_player}</strong>
                    <span className="muted">
                      {f.percent(chance_of(g, g.winner ?? undefined))} · {t.common.players_n(players_of(g).length)} · {f.ago(g.updated_at)}
                    </span>
                  </span>
                  <PotBar game={g} />
                  <Value value={g.value} size="sm" compact />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="coins" title={t.history.none} />
        )}
      </Panel>
      {stake ? <StakeDialog mode={stake} onClose={() => setStake(null)} onDone={() => setStake(null)} /> : null}
    </div>
  );
}
