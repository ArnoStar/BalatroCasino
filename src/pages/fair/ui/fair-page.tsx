// /fair: how a draw is made and why nobody can steer it, the player's own
// seed (theirs to choose), and a check of any draw from its numbers alone:
// nothing here asks the casino.
import { useState, type CSSProperties, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useI18n } from '@/shared/i18n';
import { compute_draw, my_seed, new_seed, ROLL_DIGITS, SEED_PATTERN, set_my_seed, type Draw } from '@/shared/lib';
import { Alert, Button, Icon, PageHeader, Panel } from '@/shared/ui';

function SeedForm() {
  const { t } = useI18n();
  const [seed, setSeed] = useState(() => my_seed());
  const [saved, setSaved] = useState(false);
  const valid = SEED_PATTERN.test(seed);
  function save(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    set_my_seed(seed);
    setSaved(true);
  }
  return (
    <form className="seed-form" onSubmit={save}>
      <div className="field">
        <label htmlFor="my-seed">{t.fairness.seed_label}</label>
        <input id="my-seed" className="mono" value={seed} maxLength={64} spellCheck={false} autoComplete="off" onChange={(e) => { setSeed(e.target.value); setSaved(false); }} aria-invalid={!valid} />
        {!valid ? <span className="field__error">{t.fairness.seed_bad}</span> : null}
      </div>
      <div className="row">
        <Button type="submit" disabled={!valid} icon={<Icon name="check" />}>
          {t.fairness.seed_save}
        </Button>
        <Button tone="grey" onClick={() => { setSeed(new_seed()); setSaved(false); }} icon={<Icon name="refresh" />}>
          {t.fairness.seed_new}
        </Button>
      </div>
      {saved ? <Alert tone="success">{t.fairness.seed_saved}</Alert> : null}
    </form>
  );
}

function Verifier() {
  const { t, f } = useI18n();
  const [game_id, setGameId] = useState('');
  const [server_seed, setServerSeed] = useState('');
  const [seeds, setSeeds] = useState('');
  const [values, setValues] = useState('');
  const [draw, setDraw] = useState<Draw | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

  async function run(e: FormEvent) {
    e.preventDefault();
    const s = lines(seeds);
    const v = lines(values).map((x) => Number(x.replace(/[\s,_]/g, '')));
    if (!s.length || s.length !== v.length || v.some((x) => !Number.isInteger(x) || x <= 0)) {
      setProblem(t.fairness.mismatch);
      setDraw(null);
      return;
    }
    setProblem(null);
    setDraw(await compute_draw(server_seed.trim(), game_id.trim(), s, v));
  }
  return (
    <form className="verifier" onSubmit={run}>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="v-game">{t.fairness.game_id}</label>
          <input id="v-game" className="mono" value={game_id} onChange={(e) => setGameId(e.target.value)} required spellCheck={false} />
        </div>
        <div className="field">
          <label htmlFor="v-server">{t.fairness.server_seed}</label>
          <input id="v-server" className="mono" value={server_seed} onChange={(e) => setServerSeed(e.target.value)} required spellCheck={false} />
        </div>
        <div className="field">
          <label htmlFor="v-seeds">{t.fairness.seeds}</label>
          <textarea id="v-seeds" className="mono" rows={4} value={seeds} onChange={(e) => setSeeds(e.target.value)} required spellCheck={false} />
        </div>
        <div className="field">
          <label htmlFor="v-values">{t.fairness.values}</label>
          <textarea id="v-values" className="mono" rows={4} value={values} onChange={(e) => setValues(e.target.value)} required spellCheck={false} />
        </div>
      </div>
      <div className="row">
        <Button type="submit" icon={<Icon name="shield" />}>
          {t.fairness.compute}
        </Button>
      </div>
      {problem ? <Alert>{problem}</Alert> : null}
      {draw ? (
        <dl className="fair">
          <div className="fair__row">
            <dt>{t.fairness.hash}</dt>
            <dd className="mono">{draw.hash}</dd>
          </div>
          <div className="fair__row">
            <dt>{t.fair.message}</dt>
            <dd className="mono">{draw.message}</dd>
          </div>
          <div className="fair__row">
            <dt>{t.fair.digest}</dt>
            <dd className="mono">
              <mark>{draw.digest.slice(0, ROLL_DIGITS)}</mark>
              {draw.digest.slice(ROLL_DIGITS)}
            </dd>
          </div>
          <div className="fair__row">
            <dt>{t.fairness.roll}</dt>
            <dd className="mono">{t.fair.roll(f.number(draw.roll), f.number(draw.value))}</dd>
          </div>
          <div className="fair__row">
            <dt>{t.history.winner}</dt>
            <dd>
              <strong className="gold">{draw.winner >= 0 ? t.fairness.winner(f.number(draw.winner + 1)) : t.fairness.no_winner}</strong>
            </dd>
          </div>
        </dl>
      ) : null}
    </form>
  );
}

export function FairPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [id, setId] = useState('');
  return (
    <div className="stack-lg">
      <PageHeader eyebrow={t.fairness.eyebrow} icon="shield" title={<span className="neon neon--soft">{t.fairness.title}</span>} lead={t.fairness.lead} />
      <ol className="steps">
        {t.fairness.steps.map((s, i) => (
          <li key={i} className="step" style={{ '--i': i } as CSSProperties}>
            <span className="step__n">{i + 1}</span>
            <strong className="step__title">{s.title}</strong>
            <p className="step__text">{s.text}</p>
          </li>
        ))}
      </ol>
      <div className="grid-2">
        <Panel title={t.fairness.seed_title} icon="key">
          <p className="muted">{t.fairness.seed_lead}</p>
          <SeedForm />
        </Panel>
        <Panel title={t.fairness.open_game} icon="search">
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              if (id.trim()) navigate(`/${encodeURIComponent(id.trim())}`);
            }}
          >
            <label className="visually-hidden" htmlFor="open-game">
              {t.fairness.game_id}
            </label>
            <input id="open-game" className="input mono" value={id} onChange={(e) => setId(e.target.value)} placeholder={t.fairness.game_id} spellCheck={false} />
            <Button type="submit" tone="grey">
              {t.fairness.open}
            </Button>
          </form>
        </Panel>
      </div>
      <Panel title={t.fairness.verify_title} icon="hash">
        <p className="muted">{t.fairness.verify_lead}</p>
        <Verifier />
      </Panel>
    </div>
  );
}
