// /players/:id (and /me): a player in the casino: games, wins, the value they
// staked, took from others and lost, by game, their biggest and luckiest
// wins, and their games.
import { Link, useParams } from 'react-router';
import { useCasino } from '@/entities/casino';
import { items_api, type Win } from '@/shared/api';
import { portal } from '@/shared/config';
import { useI18n } from '@/shared/i18n';
import { use_async } from '@/shared/lib';
import { Alert, Avatar, CountUp, Icon, LinkButton, Panel, Spinner, Value } from '@/shared/ui';
import { GameList } from '@/widgets/game-list';

function BestWin({ title, win, show }: { title: string; win: Win | null; show: 'value' | 'chance' }) {
  const { t, f } = useI18n();
  return (
    <div className="best">
      <span className="best__label">{title}</span>
      {win ? (
        <Link to={`/${win.game}`} className="best__win">
          <strong>{show === 'value' ? <Value value={win.value} size="lg" compact /> : f.percent(win.chance)}</strong>
          <span className="muted">
            {t.modes[win.mode].name} · {show === 'value' ? f.percent(win.chance) : f.compact(win.value)} · {f.ago(win.at)}
          </span>
        </Link>
      ) : (
        <span className="muted">{t.player.none_yet}</span>
      )}
    </div>
  );
}

export function PlayerPage() {
  const params = useParams();
  const casino = useCasino();
  const { t, f, describe } = useI18n();
  const id = params.id === 'me' || !params.id ? casino.me?.id ?? '' : params.id;
  const stats = use_async(() => (id ? items_api.stats(id) : Promise.resolve(null)), [id]);
  const you = id === casino.me?.id;
  if (stats.loading && !stats.data) return <Spinner />;
  if (stats.error) return <Alert>{describe(stats.error)}</Alert>;
  const s = stats.data;
  if (!s) return null;
  const rate = s.games ? (100 * s.wins) / s.games : 0;
  return (
    <div className="stack-lg">
      <section className="profile">
        <Avatar name={s.name} player={s.player} size="xl" />
        <div className="profile__text">
          <p className="eyebrow">
            <Icon name="user" /> {t.player.eyebrow}
          </p>
          <h1 className="page-title">{you ? t.player.yours : t.player.theirs(s.name ?? t.common.a_player)}</h1>
          <div className="row">
            <a className="btn btn--ghost btn--sm" href={portal(`/players/${encodeURIComponent(s.player)}`)}>
              <Icon name="external" /> {you ? t.player.my_profile : t.player.profile}
            </a>
            {!you && casino.me?.can_trade ? (
              <LinkButton to={`/coinflip?challenge=${encodeURIComponent(s.player)}&name=${encodeURIComponent(s.name ?? '')}`} tone="blue" size="sm" icon={<Icon name="swords" />}>
                {t.player.challenge}
              </LinkButton>
            ) : null}
          </div>
        </div>
      </section>
      <div className="stat-tiles stat-tiles--5">
        <div className="stat-tile">
          <span className="stat-tile__label">{t.player.games}</span>
          <strong className="stat-tile__value">
            <CountUp value={s.games} format={f.number} />
          </strong>
        </div>
        <div className="stat-tile">
          <span className="stat-tile__label">{t.player.wins}</span>
          <strong className="stat-tile__value">
            <CountUp value={s.wins} format={f.number} />
          </strong>
          <span className="stat-tile__sub">
            {t.player.win_rate}: {f.percent(rate)}
          </span>
        </div>
        <div className={`stat-tile ${s.net >= 0 ? 'stat-tile--green' : 'stat-tile--red'}`}>
          <span className="stat-tile__label">{t.player.net}</span>
          <strong className="stat-tile__value">
            {s.net > 0 ? '+' : ''}
            <CountUp value={s.net} format={f.compact} />
          </strong>
        </div>
        <div className="stat-tile stat-tile--gold">
          <span className="stat-tile__label">{t.player.staked}</span>
          <strong className="stat-tile__value">
            <CountUp value={s.staked} format={f.compact} />
          </strong>
        </div>
        <div className="stat-tile">
          <span className="stat-tile__label">{t.player.won}</span>
          <strong className="stat-tile__value win">+{f.compact(s.won)}</strong>
          <span className="stat-tile__sub">
            {t.player.lost}: −{f.compact(s.lost)}
          </span>
        </div>
      </div>
      <div className="grid-2">
        <Panel title={t.player.by_mode} icon="chart">
          <ul className="modes">
            {(['coinflip', 'dice', 'jackpot'] as const).map((m) => {
              const n = s.modes[m] ?? { games: 0, wins: 0 };
              const share = n.games ? (100 * n.wins) / n.games : 0;
              return (
                <li key={m} className={`modes__row modes__row--${m}`}>
                  <span className="modes__name">
                    <Icon name={m === 'jackpot' ? 'coins' : m === 'dice' ? 'dice' : 'sparkle'} /> {t.modes[m].name}
                  </span>
                  <span className="modes__bar" aria-hidden>
                    <span style={{ width: `${share}%` }} />
                  </span>
                  <span className="modes__n">
                    {f.number(n.wins)} / {f.number(n.games)}
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>
        <Panel title={t.player.biggest} icon="gem" tone="gold">
          <div className="bests">
            <BestWin title={t.player.biggest} win={s.biggest} show="value" />
            <BestWin title={t.player.luckiest} win={s.luckiest} show="chance" />
          </div>
        </Panel>
      </div>
      <Panel title={t.player.recent} icon="history">
        <GameList player={s.player} />
      </Panel>
    </div>
  );
}
