// Staking items: a new coinflip (a side), a new dice game (a chance), taking
// on a duel (items worth what it asks: "Fill it for me" finds some), or the
// pot. The item service decides; this shows what it will ask before asking.
import { useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { Link } from 'react-router';
import { asked, Coin, join_range, payout, useCasino } from '@/entities/casino';
import { items_api, type CasinoGame, type Side } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { my_seed, sound } from '@/shared/lib';
import { Alert, Avatar, Button, Icon, Modal, Value } from '@/shared/ui';
import { fill } from '../model/fill';
import { ItemPicker } from './item-picker';
import { OpponentPicker, type Opponent } from './opponent-picker';

export type StakeMode =
  | { kind: 'coinflip'; opponent?: Opponent | null }
  | { kind: 'dice'; opponent?: Opponent | null }
  | { kind: 'join'; game: CasinoGame }
  | { kind: 'pot' };

/** the dialog, open while shown; `onDone`: the game as the service answered (the stake is in) */
export function StakeDialog({ mode, onClose, onDone }: { mode: StakeMode; onClose: () => void; onDone: (game: CasinoGame) => void }) {
  const { t, f, describe } = useI18n();
  const casino = useCasino();
  const rules = casino.rules;
  const me = casino.me;
  const [picked, setPicked] = useState<string[]>([]);
  const [side, setSide] = useState<Side>('chips');
  const [chance, setChance] = useState(25);
  const [opponent, setOpponent] = useState<Opponent | null>(mode.kind === 'coinflip' || mode.kind === 'dice' ? mode.opponent ?? null : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [no_fit, setNoFit] = useState(false);
  const seed = useMemo(() => my_seed(), []);

  const max = rules?.max_items ?? 10;
  const margin = rules?.coinflip_margin ?? 10;
  const by_id = new Map(casino.stakable.map((i) => [i.id, i]));
  const value = picked.reduce((sum, id) => sum + (by_id.get(id)?.odds ?? 0), 0);
  const held = casino.items.length - casino.stakable.length;
  // when the first item in its trade hold is free (staked ones come back with their game)
  const next_free = casino.items.filter((i) => !i.tradable && !i.staked).map((i) => i.tradable_at).sort()[0] ?? null;

  // what the other side must be worth, or what this side must be
  const game = mode.kind === 'join' ? mode.game : null;
  const need = game ? ([game.join_min ?? 0, game.join_max ?? 0] as const) : null;
  const fits = need ? value >= need[0] && value <= need[1] : value > 0;
  const their_range = mode.kind === 'dice' && value ? join_range(value, chance, margin) : mode.kind === 'coinflip' && value ? join_range(value, 50, margin) : null;
  const pot = casino.pot;
  const in_pot = pot && me ? pot.entries.filter((e) => e.player === me.id).reduce((s, e) => s + e.value, 0) : 0;
  const pot_chance = mode.kind === 'pot' && value ? (100 * (in_pot + value)) / ((pot?.value ?? 0) + value) : null;
  const join_chance = game && value ? (100 * value) / (game.value + value) : null;

  const title =
    mode.kind === 'coinflip' ? t.stake.new_coinflip
    : mode.kind === 'dice' ? t.stake.new_dice
    : mode.kind === 'pot' ? t.stake.pot
    : mode.game.mode === 'coinflip' ? t.stake.join_coinflip(mode.game.entries[0]?.player_name ?? t.common.a_player)
    : t.stake.join_dice(mode.game.entries[0]?.player_name ?? t.common.a_player);

  function auto_fill() {
    if (!need) return;
    const found = fill(casino.stakable.map((i) => ({ id: i.id, value: i.odds })), need[0], need[1], max);
    setNoFit(!found);
    if (found) {
      setPicked(found);
      sound.play('chip');
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!fits || busy) return;
    setBusy(true);
    setError(null);
    try {
      const bet = { items: picked, seed };
      const g =
        mode.kind === 'coinflip' ? await items_api.create_coinflip({ ...bet, side, opponent: opponent?.id ?? null })
        : mode.kind === 'dice' ? await items_api.create_dice({ ...bet, chance, opponent: opponent?.id ?? null })
        : mode.kind === 'pot' ? await items_api.join_jackpot(bet)
        : mode.game.mode === 'coinflip' ? await items_api.join_coinflip(mode.game.id, bet)
        : await items_api.join_dice(mode.game.id, bet);
      sound.play('chip');
      casino.apply(g);
      onDone(g);
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  const submit_label =
    mode.kind === 'pot' ? t.stake.put_in
    : mode.kind === 'join' ? (mode.game.mode === 'coinflip' ? t.stake.flip : t.stake.roll)
    : t.stake.create(picked.length);

  return (
    <Modal title={title} onClose={onClose} className="stake">
      <form className="stake__grid" onSubmit={submit}>
        <div className="stake__side">
          {mode.kind === 'coinflip' ? (
            <fieldset className="sides">
              <legend>{t.stake.side}</legend>
              {(['chips', 'mult'] as const).map((s) => (
                <label key={s} className={`side-pick side-pick--${s}${side === s ? ' side-pick--on' : ''}`}>
                  <input type="radio" name="side" value={s} checked={side === s} onChange={() => { setSide(s); sound.play('click'); }} className="visually-hidden" />
                  <Coin side={s} size="md" />
                  <span>{t.sides[s]}</span>
                </label>
              ))}
            </fieldset>
          ) : null}

          {mode.kind === 'dice' ? (
            <div className="odds">
              <label className="odds__label" htmlFor="dice-chance">
                {t.stake.chance}
                <strong>{f.percent(chance)}</strong>
              </label>
              <input
                id="dice-chance"
                className="odds__range"
                type="range"
                min={rules?.dice_min_chance ?? 5}
                max={rules?.dice_max_chance ?? 95}
                step={1}
                value={chance}
                onChange={(e) => setChance(Number(e.target.value))}
                style={{ '--at': `${chance}%` } as CSSProperties}
              />
              <div className="odds__ends" aria-hidden>
                <span>{t.stake.long_shot}</span>
                <span>{t.stake.safe_bet}</span>
              </div>
              <div className="odds__bar" aria-hidden style={{ '--at': `${chance}%` } as CSSProperties}>
                <span className="odds__mine">{t.stake.your_part}</span>
                <span className="odds__theirs">{t.stake.their_part}</span>
              </div>
              <dl className="odds__facts">
                <div>
                  <dt>{t.stake.if_you_win}</dt>
                  <dd className="gold">×{f.times(payout(chance))}</dd>
                </div>
                <div>
                  <dt>{t.stake.they_stake}</dt>
                  <dd>{their_range ? `${f.number(their_range[0])} – ${f.number(their_range[1])}` : '—'}</dd>
                </div>
              </dl>
              <p className="muted small">{t.stake.chance_hint}</p>
            </div>
          ) : null}

          {game ? (
            <div className="against">
              <Avatar name={game.entries[0]?.player_name} player={game.entries[0]?.player} size="md" />
              <div>
                <strong>{game.entries[0]?.player_name ?? t.common.a_player}</strong>
                <span className="muted">
                  {game.mode === 'dice'
                    ? `${t.duel.asks(f.percent(asked(game)))} · ${t.duel.pays(f.times(payout(asked(game))))}`
                    : game.side ? t.sides[game.side] : null}
                </span>
              </div>
              <Value value={game.value} />
            </div>
          ) : null}

          {mode.kind === 'pot' && pot ? (
            <div className="against">
              <span className="against__icon" aria-hidden>
                <Icon name="coins" />
              </span>
              <div>
                <strong>{t.jackpot.in_pot}</strong>
                <span className="muted">{t.common.players_n(new Set(pot.entries.map((e) => e.player)).size)}</span>
              </div>
              <Value value={pot.value} />
            </div>
          ) : null}

          {(mode.kind === 'coinflip' || mode.kind === 'dice') && me ? <OpponentPicker value={opponent} onChange={setOpponent} me={me.id} /> : null}

          <div className="stake__sum" aria-live="polite">
            <div className="stake__line">
              <span>{t.stake.you_stake}</span>
              <Value value={value} size="lg" />
            </div>
            {need ? <Meter value={value} low={need[0]} high={need[1]} /> : null}
            {need ? (
              <div className="stake__line">
                <span>{t.stake.needed}</span>
                <span>
                  {f.number(need[0])} – {f.number(need[1])}
                </span>
              </div>
            ) : null}
            {mode.kind === 'coinflip' && their_range ? (
              <div className="stake__line">
                <span>{t.stake.they_stake}</span>
                <span>
                  {f.number(their_range[0])} – {f.number(their_range[1])}
                </span>
              </div>
            ) : null}
            {join_chance !== null ? (
              <div className="stake__line">
                <span>{t.stake.chance}</span>
                <strong className="gold">{f.percent(join_chance)}</strong>
              </div>
            ) : null}
            {pot_chance !== null ? (
              <div className="stake__line">
                <span>{t.stake.chance_then('')}</span>
                <strong className="gold">{f.percent(pot_chance)}</strong>
              </div>
            ) : null}
          </div>

          <p className="stake__seed muted small">
            <Icon name="shield" /> {t.stake.seed}: <code>{seed}</code> ·{' '}
            <Link to="/fair" onClick={onClose}>
              {t.stake.change_seed}
            </Link>
          </p>
          {rules ? <p className="muted small">{t.stake.hold(rules.trade_hold_days, f.days(rules.trade_hold_days))}</p> : null}
          {error ? <Alert>{describe(error)}</Alert> : null}
          <Button type="submit" size="lg" wide tone={mode.kind === 'join' ? 'green' : 'gold'} busy={busy} disabled={!fits || !casino.rules?.open} icon={<Icon name={mode.kind === 'pot' ? 'coins' : mode.kind === 'join' ? 'zap' : 'sparkle'} />}>
            {submit_label}
          </Button>
        </div>

        <div className="stake__items">
          <div className="stake__items-head">
            <h3>{t.stake.your_items}</h3>
            <span className="muted small">{t.stake.pick(max)}</span>
            <span className="stake__items-tools">
              {need ? (
                <Button size="sm" tone="grey" onClick={auto_fill} icon={<Icon name="wand" />}>
                  {t.stake.fill}
                </Button>
              ) : null}
              {picked.length ? (
                <Button size="sm" tone="ghost" onClick={() => setPicked([])}>
                  {t.stake.clear}
                </Button>
              ) : null}
            </span>
          </div>
          {no_fit ? <Alert tone="info">{t.stake.fill_none}</Alert> : null}
          <ItemPicker items={casino.stakable} held={held} next_free={next_free} picked={picked} onChange={(p) => { setPicked(p); setNoFit(false); sound.play('tick'); }} max={max} />
        </div>
      </form>
    </Modal>
  );
}

/** where the picked value stands against the range asked: the window lit, a marker for the value */
function Meter({ value, low, high }: { value: number; low: number; high: number }) {
  const { t } = useI18n();
  const top = Math.max(high * 1.3, value * 1.05, 1);
  const state = value < low ? 'low' : value > high ? 'high' : 'ok';
  return (
    <div className={`meter meter--${state}`}>
      <div className="meter__track" aria-hidden>
        <span className="meter__window" style={{ left: `${(100 * low) / top}%`, width: `${(100 * (high - low)) / top}%` }} />
        <span className="meter__fill" style={{ width: `${Math.min(100, (100 * value) / top)}%` }} />
      </div>
      <span className="meter__state">
        <Icon name={state === 'ok' ? 'check-circle' : 'alert'} /> {state === 'ok' ? t.stake.fits : state === 'low' ? t.stake.too_low : t.stake.too_high}
      </span>
    </div>
  );
}
