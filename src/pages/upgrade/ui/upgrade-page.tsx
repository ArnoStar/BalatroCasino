// /upgrade: one item put in against the house, aiming at an item worth so many
// times more. The chance (95% over the multiplier), the prize's range and the
// likeliest prizes come from the item service (a preview); the dial shows the
// chance as an arc, and the needle spins to the roll. Provably fair: the next
// server seed's hash is shown before, and the roll is checked in the browser
// after (the casino's roll on a million).
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useCasino } from '@/entities/casino';
import { ItemArt, ItemThumb, useItemName } from '@/entities/item';
import { ItemPicker } from '@/features/stake';
import { items_api, type Item, type Prize, type Upgrade, type UpgradePreview } from '@/shared/api';
import { portal } from '@/shared/config';
import { useI18n } from '@/shared/i18n';
import { compute_draw, my_seed, reveal_delay, SEED_PATTERN, set_my_seed, sound } from '@/shared/lib';
import { Alert, Avatar, Button, EmptyState, Icon, PageHeader, Panel, Value } from '@/shared/ui';

const PRESETS = [1.5, 2, 3, 5, 10, 25, 100];
const SPIN_MS = 3600;

// the slider is logarithmic: 0 ... 1000 steps from x1 to x100
const to_step = (m: number, max: number) => Math.round((Math.log(m) / Math.log(max)) * 1000);
const to_multiplier = (step: number, max: number) => Math.round(Math.exp((step / 1000) * Math.log(max)) * 100) / 100;

/** a prize drawn as an item (no condition yet: its range is shown beside it) */
const prize_item = (p: Prize): Item => ({
  ...p, id: `${p.key}:${p.edition}`, stake: null, serial: 0, minted: 0, odds: 0, owner: '', owner_name: null, source: '',
  found_at: '', acquired_at: '', tradable_at: '', tradable: false, staked: null, condition: undefined as unknown as number,
  grade: '', value: p.mint_value,
});

export function UpgradePage() {
  const casino = useCasino();
  const { t, f, describe } = useI18n();
  const name = useItemName();
  const rules = casino.rules;
  const max = rules?.upgrade_max_multiplier ?? 100;
  const [picked, setPicked] = useState<string[]>([]);
  const [multiplier, setMultiplier] = useState(2);
  const [preview, setPreview] = useState<UpgradePreview | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [seed, setSeed] = useState(my_seed());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Upgrade | null>(null);
  const [landed, setLanded] = useState(false);
  const [checked, setChecked] = useState<boolean | null>(null);
  const [turns, setTurns] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  const can_play = !!casino.me?.can_trade && !!rules?.open;

  const item = useMemo(() => casino.stakable.find((i) => i.id === picked[0]) ?? null, [casino.stakable, picked]);
  const chance = (rules?.upgrade_edge ?? 95) / multiplier;
  const held = casino.items.length - casino.stakable.length;

  useEffect(() => {
    void items_api.upgrade_seed().then((s) => setHash(s.seed_hash), () => undefined);
  }, []);

  // the preview follows the item and the multiplier (once they stop changing)
  useEffect(() => {
    if (!item) {
      setPreview(null);
      return;
    }
    let live = true;
    const id = window.setTimeout(() => {
      items_api.upgrade_preview(item.id, multiplier).then((p) => live && setPreview(p), (e: unknown) => live && setError(e));
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(id);
    };
  }, [item, multiplier]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function upgrade() {
    if (!item) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setLanded(false);
    setChecked(null);
    try {
      const up = await items_api.upgrade(item.id, multiplier, seed);
      sound.play('roll');
      setResult(up);
      setTurns((n) => n + 4);
      casino.apply_upgrade(up);
      setPicked([]);
      timer.current = window.setTimeout(() => {
        setLanded(true);
        sound.play(up.won ? 'win' : 'lose');
        casino.reload_items();
        casino.reload();
      }, reveal_delay(SPIN_MS));
      // what anyone can check: the server seed committed to, and the roll
      const draw = await compute_draw(up.server_seed, up.id, [up.seed], [1_000_000]);
      setChecked(draw.hash === up.seed_hash && (hash === null || hash === up.seed_hash) && draw.roll === up.roll && up.won === up.roll < up.chance_ppm);
      void items_api.upgrade_seed().then((s) => setHash(s.seed_hash), () => undefined);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  const shown_chance = result ? result.chance : chance;
  const needle = result ? turns * 360 + (result.roll / 1_000_000) * 360 : turns * 360;
  return (
    <div className="stack-lg room room--upgrade">
      <PageHeader
        eyebrow={t.upgrade.eyebrow}
        icon="zap"
        title={<span className="neon neon--soft">{t.upgrade.title}</span>}
        lead={t.upgrade.lead(f.percent(rules?.upgrade_edge ?? 95), f.percent(rules?.upgrade_margin ?? 5))}
      />
      {error ? <Alert>{describe(error)}</Alert> : null}
      <section className="upgrade">
        <Panel title={t.upgrade.your_item} icon="cards" className="upgrade__pick">
          {item ? (
            <div className="upgrade__chosen">
              <ItemArt item={item} scale={1.6} />
              <div>
                <strong>{name(item)}</strong>
                <Value value={item.value} />
                <Button size="sm" tone="ghost" onClick={() => setPicked([])} icon={<Icon name="close" />}>
                  {t.common.cancel}
                </Button>
              </div>
            </div>
          ) : null}
          <ItemPicker items={casino.stakable} held={held} picked={picked} onChange={(p) => { setPicked(p.slice(-1)); sound.play('tick'); }} max={1} />
        </Panel>

        <div className="upgrade__dial-col">
          <div
            className={`dial${result && landed ? (result.won ? ' dial--won' : ' dial--lost') : ''}`}
            style={{ '--chance': `${Math.min(100, shown_chance)}%`, '--needle': `${needle}deg`, '--spin': `${reveal_delay(SPIN_MS)}ms` } as CSSProperties}
          >
            <div className="dial__ring" aria-hidden />
            <div className="dial__needle" aria-hidden />
            <div className="dial__center">
              {result && landed ? (
                result.won && result.prize ? (
                  <ItemArt item={result.prize} scale={1.25} />
                ) : (
                  <Icon name="flame" className="dial__gone" />
                )
              ) : item ? (
                <ItemArt item={item} scale={1.1} />
              ) : null}
              <span className="dial__chance">{f.percent2(shown_chance)}</span>
              <span className="dial__label">{t.upgrade.chance}</span>
            </div>
          </div>
          <div aria-live="polite" className="upgrade__outcome">
            {result && landed ? (
              <>
                <strong className={result.won ? 'win' : 'loss'}>{result.won ? t.upgrade.won : t.upgrade.lost}</strong>
                <span className="muted">{result.won ? t.upgrade.won_text(f.number(result.prize_value ?? 0)) : t.upgrade.lost_text}</span>
                {result.won && result.prize ? (
                  <a className="btn btn--ghost btn--sm" href={portal(`/item/${encodeURIComponent(result.prize.id)}`)}>
                    {t.upgrade.see}
                  </a>
                ) : null}
              </>
            ) : result ? (
              <strong>{t.upgrade.rolling}</strong>
            ) : (
              <span className="muted">{t.upgrade.warn}</span>
            )}
          </div>
          <Button size="lg" tone="gold" wide busy={busy} disabled={!can_play || !item || !preview?.possible || (!!result && !landed)} onClick={upgrade} icon={<Icon name="zap" />}>
            {result && landed ? t.upgrade.again : t.upgrade.go}
          </Button>
        </div>

        <Panel title={t.upgrade.aim} icon="target" className="upgrade__aim">
          <div className="upgrade__multiplier">
            <strong>{t.upgrade.times(f.times(multiplier))}</strong>
            <input
              type="range"
              min={0}
              max={1000}
              value={to_step(multiplier, max)}
              onChange={(e) => setMultiplier(Math.max(rules?.upgrade_min_multiplier ?? 1, to_multiplier(Number(e.target.value), max)))}
              aria-label={t.upgrade.aim}
            />
            <div className="upgrade__presets">
              {PRESETS.filter((m) => m <= max).map((m) => (
                <button key={m} type="button" className={`chip${m === multiplier ? ' chip--on' : ''}`} onClick={() => setMultiplier(m)}>
                  {t.upgrade.times(Number.isInteger(m) ? f.number(m) : f.times(m))}
                </button>
              ))}
            </div>
          </div>
          <dl className="upgrade__numbers">
            <div>
              <dt>{t.upgrade.chance}</dt>
              <dd>{f.percent2(chance)}</dd>
            </div>
            <div>
              <dt>{t.upgrade.target}</dt>
              <dd>
                {preview ? (
                  <>
                    <Value value={preview.low} size="sm" /> – <Value value={preview.high} size="sm" />
                  </>
                ) : item ? (
                  <Value value={Math.round(item.value * multiplier)} size="sm" />
                ) : (
                  '—'
                )}
              </dd>
            </div>
          </dl>
          {preview && !preview.possible ? <Alert tone="error">{t.upgrade.impossible}</Alert> : null}
          {preview?.possible ? (
            <>
              <p className="muted">{t.upgrade.prizes(preview.prizes)}</p>
              <ul className="upgrade__prizes">
                {preview.examples.map((p) => (
                  <li key={`${p.key}:${p.edition}`} title={`${name(p)} · ${f.percent2(p.share)}`}>
                    <ItemArt item={prize_item(p)} scale={0.62} />
                    <small>{f.percent2(p.share)}</small>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </Panel>
      </section>

      <Panel title={t.upgrade.fair_title} icon="shield">
        <dl className="upgrade__fair">
          <div>
            <dt>{t.upgrade.next_hash}</dt>
            <dd className="mono">{hash ?? '…'}</dd>
          </div>
          <div>
            <dt>{t.upgrade.your_seed}</dt>
            <dd>
              <input
                className="input mono"
                value={seed}
                onChange={(e) => {
                  setSeed(e.target.value);
                  if (SEED_PATTERN.test(e.target.value)) set_my_seed(e.target.value);
                }}
                aria-label={t.upgrade.your_seed}
              />
            </dd>
          </div>
          {result ? (
            <div>
              <dt>{t.upgrade.roll(f.number(result.roll))}</dt>
              <dd>
                {t.upgrade.under(f.number(result.chance_ppm))} · <span className="mono">{result.server_seed}</span>{' '}
                {checked === null ? null : checked ? <span className="win">✓ {t.upgrade.checked}</span> : <span className="loss">{t.upgrade.unchecked}</span>}
              </dd>
            </div>
          ) : null}
        </dl>
      </Panel>

      <Panel title={t.upgrade.recent} icon="history">
        {casino.upgrades.length ? (
          <ul className="upgrade-list">
            {casino.upgrades.slice(0, 12).map((u) => (
              <li key={u.id} className={u.won ? 'is-won' : 'is-lost'}>
                <Avatar name={u.player_name} player={u.player} size="sm" />
                <span className="upgrade-list__who">{u.player_name ?? t.common.a_player}</span>
                {u.item ? <ItemThumb item={u.item} scale={0.45} /> : null}
                <Icon name={u.won ? 'zap' : 'flame'} />
                {u.prize ? <ItemThumb item={u.prize} scale={0.45} /> : <span className="loss">—</span>}
                <span className="muted">
                  {t.upgrade.times(f.times(u.multiplier))} · {f.percent2(u.chance)}
                </span>
                <Value value={u.won ? u.prize_value ?? 0 : u.item_value} size="sm" />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="zap" title={t.upgrade.recent_none} />
        )}
      </Panel>
    </div>
  );
}
