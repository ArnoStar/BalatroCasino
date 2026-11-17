// /:id: a casino game: its players and their items, how it was drawn (played
// again on demand), and the check of its draw. An open one follows the live
// stream.
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { chance_of, PotBar, useCasino, useCasinoNews } from '@/entities/casino';
import { items_api, type CasinoGame } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { use_async } from '@/shared/lib';
import { Alert, Avatar, Button, Icon, PageHeader, Panel, Spinner, Value } from '@/shared/ui';
import { DuelStage, Entries, Wheel } from '@/widgets/game-stage';
import { Fairness } from './fairness';

export function GamePage() {
  const { id = '' } = useParams();
  const { t, f, describe } = useI18n();
  const casino = useCasino();
  const loaded = use_async(() => items_api.game(id), [id]);
  const [live, setLive] = useState<CasinoGame | null>(null);
  const [replay, setReplay] = useState(0);
  useCasinoNews(({ game }) => {
    if (game.id === id) setLive(game);
  });

  if (loaded.loading && !loaded.data) return <Spinner />;
  if (loaded.error) {
    return (
      <Panel title={t.game.back} icon="dice">
        <Alert>{describe(loaded.error)}</Alert>
        <Link to="/">
          <Icon name="arrow-left" /> {t.not_found.back}
        </Link>
      </Panel>
    );
  }
  const g = live && loaded.data && live.updated_at >= loaded.data.updated_at ? live : loaded.data!;
  const me = casino.me?.id;
  const status_tone = g.status === 'open' ? 'live' : g.status === 'done' ? 'won' : 'lost';
  return (
    <div className="stack-lg game-page">
      <PageHeader
        eyebrow={
          <Link to={`/${g.mode}`} className="back">
            <Icon name="chevron-left" /> {t.modes[g.mode].name}
          </Link>
        }
        title={
          <>
            {t.modes[g.mode].name}{' '}
            <span className={`status status--${status_tone}`}>
              <Icon name={g.status === 'open' ? 'dot' : g.status === 'done' ? 'check-circle' : 'x-circle'} />
              {t.status[g.status]}
            </span>
          </>
        }
        actions={
          g.status === 'done' ? (
            <Button tone="grey" onClick={() => setReplay((n) => n + 1)} icon={<Icon name="refresh" />}>
              {t.game.replay}
            </Button>
          ) : g.status === 'open' ? (
            <Button tone="grey" busy={loaded.loading} onClick={loaded.reload} icon={<Icon name="refresh" />}>
              {t.game.refresh}
            </Button>
          ) : null
        }
      />
      <section className="game-page__stage" key={replay}>
        {g.mode === 'jackpot' ? (
          <Wheel game={g} spin={g.status === 'done'} size="md">
            {g.winner ? (
              <span className="wheel__winner">
                <Avatar name={g.winner_name} player={g.winner} size="md" />
                <strong>{g.winner === me ? t.common.you : g.winner_name ?? t.common.a_player}</strong>
                <span className="muted">{f.percent(chance_of(g, g.winner))}</span>
              </span>
            ) : (
              <>
                <span className="wheel__label">{t.game.pot}</span>
                <Value value={g.value} size="lg" compact />
              </>
            )}
          </Wheel>
        ) : (
          <DuelStage game={g} play={g.status === 'done' && replay > 0} me={me} />
        )}
      </section>
      <Panel>
        <dl className="facts facts--line">
          <div>
            <dt>{t.game.started}</dt>
            <dd>{f.datetime(g.created_at)}</dd>
          </div>
          {g.status !== 'open' ? (
            <div>
              <dt>{g.status === 'done' ? t.game.drawn : t.game.taken_back}</dt>
              <dd>{f.datetime(g.updated_at)}</dd>
            </div>
          ) : null}
          {g.status === 'open' && g.closes_at ? (
            <div>
              <dt>{t.game.drawn_at}</dt>
              <dd>{f.datetime(g.closes_at)}</dd>
            </div>
          ) : null}
          <div>
            <dt>{t.game.pot}</dt>
            <dd>
              <Value value={g.value} />
            </dd>
          </div>
          {g.mode === 'dice' && g.chance ? (
            <div>
              <dt>{t.game.chance_asked}</dt>
              <dd>{f.percent(g.chance)}</dd>
            </div>
          ) : null}
          {g.opponent ? (
            <div>
              <dt>{t.game.challenge}</dt>
              <dd>{g.opponent === me ? t.common.you : g.opponent_name ?? t.common.a_player}</dd>
            </div>
          ) : null}
          {g.winner ? (
            <div>
              <dt>{t.game.winner}</dt>
              <dd className="who">
                <Avatar name={g.winner_name} player={g.winner} size="xs" />
                <Link to={`/players/${encodeURIComponent(g.winner)}`}>{g.winner === me ? t.common.you : g.winner_name ?? t.common.a_player}</Link>
              </dd>
            </div>
          ) : null}
        </dl>
      </Panel>
      <Panel title={t.game.entries} icon="users">
        <PotBar game={g} />
        <Entries game={g} me={me} />
      </Panel>
      <Fairness game={g} />
    </div>
  );
}
