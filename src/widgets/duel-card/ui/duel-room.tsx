// A duel's room (the coinflips' or the dice games'): what the game is, a new
// one, the games waiting (with those that just ended where they stood), and
// the last ones drawn. `?challenge=<id>&name=` opens a new one for that
// player (a rematch); `?new` opens a new one.
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Coin, DiceTrack, by_newest, useCasino } from '@/entities/casino';
import { StakeDialog, type StakeMode } from '@/features/stake';
import { items_api, type CasinoGame } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { Alert, Avatar, Button, Icon, PageHeader, Panel, Value } from '@/shared/ui';
import { DuelBoard } from './duel-board';

export function DuelRoom({ mode }: { mode: 'coinflip' | 'dice' }) {
  const casino = useCasino();
  const { t, f, describe } = useI18n();
  const [params, setParams] = useSearchParams();
  const [stake, setStake] = useState<StakeMode | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const me = casino.me?.id;
  const can_play = !!casino.me?.can_trade && !!casino.rules?.open;

  // a rematch, or "start one" from elsewhere
  useEffect(() => {
    const challenge = params.get('challenge');
    if (challenge && can_play) setStake({ kind: mode, opponent: { id: challenge, name: params.get('name') || null } });
    else if (params.has('new') && can_play) setStake({ kind: mode });
    if (challenge || params.has('new')) setParams({}, { replace: true });
  }, [params, can_play, mode, setParams]);

  const open = mode === 'coinflip' ? casino.coinflips : casino.dice;
  const games = [...open, ...casino.resolved.filter((g) => g.mode === mode)].sort(by_newest);
  const recent = casino.recent.filter((g) => g.mode === mode && g.status === 'done').slice(0, 8);
  const rules = casino.rules;

  async function cancel(g: CasinoGame) {
    setBusy(g.id);
    setError(null);
    try {
      casino.apply(mode === 'coinflip' ? await items_api.cancel_coinflip(g.id) : await items_api.cancel_dice(g.id));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  }

  const create = (
    <Button size="lg" onClick={() => setStake({ kind: mode })} disabled={!can_play} icon={<Icon name={mode === 'coinflip' ? 'sparkle' : 'dice'} />}>
      {mode === 'coinflip' ? t.coinflip.create : t.dice.create}
    </Button>
  );
  return (
    <div className={`stack-lg room room--${mode}`}>
      <PageHeader
        eyebrow={t.modes[mode].tagline}
        icon={mode === 'coinflip' ? 'sparkle' : 'dice'}
        title={<span className="neon neon--soft">{mode === 'coinflip' ? t.coinflip.title : t.dice.title}</span>}
        lead={
          mode === 'coinflip'
            ? t.coinflip.lead(f.percent(rules?.coinflip_margin ?? 10))
            : t.dice.lead(f.percent(rules?.dice_min_chance ?? 5), f.percent(rules?.dice_max_chance ?? 95))
        }
        actions={create}
      />
      {error ? <Alert>{describe(error)}</Alert> : null}
      <DuelBoard
        games={games}
        me={me}
        busy={busy}
        onJoin={(game) => setStake({ kind: 'join', game })}
        onCancel={cancel}
        empty={mode === 'coinflip' ? { title: t.coinflip.none, text: t.coinflip.none_hint } : { title: t.dice.none, text: t.dice.none_hint }}
        action={create}
      />
      {recent.length ? (
        <Panel title={mode === 'coinflip' ? t.coinflip.recent : t.dice.recent} icon="history">
          <ul className="recent">
            {recent.map((g) => (
              <li key={g.id}>
                <Link to={`/${g.id}`} className="recent__game">
                  <Avatar name={g.winner_name} player={g.winner} size="sm" />
                  <span className="recent__who">
                    <strong>{g.winner === me ? t.common.you : g.winner_name ?? t.common.a_player}</strong>
                    <span className="muted">{f.ago(g.updated_at)}</span>
                  </span>
                  {mode === 'coinflip' ? <Coin game={g} size="xs" /> : <DiceTrack game={g} size="sm" />}
                  <Value value={g.value} size="sm" compact />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
      {stake ? <StakeDialog mode={stake} onClose={() => setStake(null)} onDone={() => setStake(null)} /> : null}
    </div>
  );
}
