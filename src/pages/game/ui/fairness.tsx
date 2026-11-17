// The check of a game's draw, in the browser, step by step: the server
// seed's hash against the one shown from the start, the HMAC of the game's id
// and the seeds, its first 13 hex digits, the roll, and the part holding it.
import { useState, type ReactNode } from 'react';
import type { CasinoGame } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { compute_draw, ROLL_DIGITS, type Draw } from '@/shared/lib';
import { Alert, Button, Icon, Panel } from '@/shared/ui';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="fair__row">
      <dt>{label}</dt>
      <dd className="mono">{children}</dd>
    </div>
  );
}

function Check({ ok, children }: { ok: boolean; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <li className={ok ? 'checks__ok' : 'checks__bad'}>
      <Icon name={ok ? 'check-circle' : 'x-circle'} />
      <span>
        {children}
        <span className="visually-hidden">: {ok ? t.fair.yes : t.fair.no}</span>
      </span>
    </li>
  );
}

export function Fairness({ game }: { game: CasinoGame }) {
  const { t, f } = useI18n();
  const [draw, setDraw] = useState<Draw | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!game.server_seed) return;
    setBusy(true);
    setError(null);
    try {
      setDraw(await compute_draw(game.server_seed, game.id, game.entries.map((e) => e.seed), game.entries.map((e) => e.value)));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  const winner_index = game.entries.findIndex((e) => e.player === game.winner);
  const checks = draw
    ? {
        hash: draw.hash === game.seed_hash,
        value: draw.value === game.value,
        roll: draw.roll === game.roll,
        winner: draw.winner >= 0 && game.entries[draw.winner]?.player === game.winner,
      }
    : null;
  const ok = checks ? Object.values(checks).every(Boolean) : false;
  return (
    <Panel
      title={t.fair.title}
      icon="shield"
      actions={
        game.status === 'done' ? (
          <Button busy={busy} onClick={run} icon={<Icon name="shield" />}>
            {t.fair.run}
          </Button>
        ) : null
      }
    >
      <p className="muted">{t.fair.lead}</p>
      <dl className="fair">
        <Row label={t.fair.game}>{game.id}</Row>
        <Row label={t.fair.hash}>{game.seed_hash}</Row>
        <Row label={t.fair.server_seed}>{game.server_seed ?? t.fair.secret}</Row>
        {game.entries.map((e, i) => (
          <Row key={i} label={t.fair.seed_of(f.number(i + 1), e.player_name ?? t.common.a_player, f.number(e.low), f.number(e.high))}>
            {e.seed}
          </Row>
        ))}
        {draw ? (
          <>
            <Row label={t.fair.message}>{draw.message}</Row>
            <Row label={t.fair.digest}>
              <mark>{draw.digest.slice(0, ROLL_DIGITS)}</mark>
              {draw.digest.slice(ROLL_DIGITS)}
            </Row>
          </>
        ) : null}
        {game.roll !== null ? <Row label={t.game.roll}>{t.fair.roll(f.number(game.roll), f.number(game.value))}</Row> : null}
      </dl>
      {error ? <Alert>{String(error)}</Alert> : null}
      {checks && draw ? (
        <>
          <ul className="checks">
            <Check ok={checks.hash}>{t.fair.checks.hash}</Check>
            <Check ok={checks.value}>{t.fair.checks.value}</Check>
            <Check ok={checks.roll}>{t.fair.checks.roll(f.number(draw.roll))}</Check>
            <Check ok={checks.winner && winner_index >= 0}>{t.fair.checks.winner}</Check>
          </ul>
          <Alert tone={ok ? 'success' : 'error'}>{ok ? t.fair.ok : t.fair.bad}</Alert>
        </>
      ) : null}
    </Panel>
  );
}
