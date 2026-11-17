// /leaderboard: the casino's best over a day, a week or ever: the most value
// won from other players (the first three on a podium), the most staked, the
// biggest pots and the least likely wins.
import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { useCasino } from '@/entities/casino';
import { items_api, type Period, type Rank, type Win } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { use_async } from '@/shared/lib';
import { Alert, Avatar, CountUp, EmptyState, Icon, PageHeader, Panel, Segmented, Spinner, Value } from '@/shared/ui';

function Podium({ ranks, me }: { ranks: Rank[]; me?: string }) {
  const { t, f } = useI18n();
  const order = [ranks[1], ranks[0], ranks[2]].filter(Boolean);
  return (
    <ol className="podium" aria-label={t.leaderboard.winners}>
      {order.map((r) => {
        const place = ranks.indexOf(r) + 1;
        return (
          <li key={r.player} className={`podium__place podium__place--${place}${r.player === me ? ' is-you' : ''}`} style={{ '--i': place } as CSSProperties}>
            {place === 1 ? <Icon name="crown" className="podium__crown" /> : null}
            <Avatar name={r.name} player={r.player} size="lg" />
            <Link className="podium__name" to={`/players/${encodeURIComponent(r.player)}`}>
              {r.player === me ? t.common.you : r.name ?? t.common.a_player}
            </Link>
            <span className="podium__net">+{f.compact(r.net)}</span>
            <span className="podium__step">{place}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Ranks({ ranks, value, me }: { ranks: Rank[]; value: 'net' | 'staked'; me?: string }) {
  const { t, f } = useI18n();
  return (
    <table className="table table--board">
      <thead>
        <tr>
          <th scope="col" className="num">{t.leaderboard.rank}</th>
          <th scope="col">{t.leaderboard.player}</th>
          <th scope="col" className="num">{value === 'net' ? t.leaderboard.net : t.leaderboard.staked}</th>
          <th scope="col" className="num">{t.leaderboard.wins}</th>
        </tr>
      </thead>
      <tbody>
        {ranks.map((r, i) => (
          <tr key={r.player} className={r.player === me ? 'is-you' : undefined}>
            <td className="num">
              <span className={i < 3 ? `medal medal--${i + 1}` : 'rank'}>{i + 1}</span>
            </td>
            <th scope="row">
              <span className="who">
                <Avatar name={r.name} player={r.player} size="sm" />
                <Link to={`/players/${encodeURIComponent(r.player)}`}>{r.player === me ? t.common.you : r.name ?? t.common.a_player}</Link>
              </span>
            </th>
            <td className="num">{value === 'net' ? <span className="win">+{f.number(r.net)}</span> : <Value value={r.staked} size="sm" />}</td>
            <td className="num">
              {f.number(r.wins)} / {f.number(r.games)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Wins({ wins, by, me }: { wins: Win[]; by: 'value' | 'chance'; me?: string }) {
  const { t, f } = useI18n();
  return (
    <ol className="wins">
      {wins.map((w, i) => (
        <li key={w.game} style={{ '--i': i } as CSSProperties}>
          <Link to={`/${w.game}`} className="wins__row">
            <span className="wins__n">{i + 1}</span>
            <Avatar name={w.player_name} player={w.player} size="sm" />
            <span className="wins__who">
              <strong>{w.player === me ? t.common.you : w.player_name ?? t.common.a_player}</strong>
              <span className="muted">
                <Icon name={w.mode === 'jackpot' ? 'coins' : w.mode === 'dice' ? 'dice' : 'sparkle'} /> {t.modes[w.mode].name} · {f.ago(w.at)}
              </span>
            </span>
            {by === 'chance' ? <span className="wins__chance">{f.percent(w.chance)}</span> : null}
            <Value value={w.value} size="sm" compact />
          </Link>
        </li>
      ))}
    </ol>
  );
}

export function LeaderboardPage() {
  const { t, f, describe } = useI18n();
  const me = useCasino().me?.id;
  const [period, setPeriod] = useState<Period>('week');
  const board = use_async(() => items_api.leaderboard(period), [period]);
  const b = board.data;
  return (
    <div className="stack-lg">
      <PageHeader
        eyebrow={t.shell.brand}
        icon="trophy"
        title={<span className="neon neon--gold">{t.leaderboard.title}</span>}
        lead={t.leaderboard.lead}
        actions={
          <Segmented
            label={t.leaderboard.period}
            value={period}
            onChange={setPeriod}
            options={[
              ['day', t.leaderboard.day],
              ['week', t.leaderboard.week],
              ['all', t.leaderboard.all],
            ]}
          />
        }
      />
      {board.loading && !b ? <Spinner /> : null}
      {board.error ? <Alert>{describe(board.error)}</Alert> : null}
      {b ? (
        <div className={`stack-lg${board.loading ? ' refreshing' : ''}`}>
          <div className="stat-tiles">
            <div className="stat-tile">
              <span className="stat-tile__label">{t.leaderboard.games}</span>
              <strong className="stat-tile__value">
                <CountUp value={b.games} format={f.number} />
              </strong>
            </div>
            <div className="stat-tile stat-tile--gold">
              <span className="stat-tile__label">{t.leaderboard.value}</span>
              <strong className="stat-tile__value">
                <CountUp value={b.value} format={f.compact} />
              </strong>
            </div>
            <div className="stat-tile">
              <span className="stat-tile__label">{t.leaderboard.players}</span>
              <strong className="stat-tile__value">
                <CountUp value={b.players} format={f.number} />
              </strong>
            </div>
          </div>
          {!b.games ? (
            <EmptyState icon="trophy" title={t.leaderboard.none} />
          ) : (
            <>
              {b.winners.length ? <Podium ranks={b.winners.slice(0, 3)} me={me} /> : null}
              <div className="grid-2">
                <Panel title={t.leaderboard.winners} icon="trend-up">
                  <p className="muted small">{t.leaderboard.winners_hint}</p>
                  {b.winners.length ? <Ranks ranks={b.winners} value="net" me={me} /> : <p className="muted">{t.leaderboard.none}</p>}
                </Panel>
                <Panel title={t.leaderboard.stakers} icon="flame">
                  <p className="muted small">{t.leaderboard.stakers_hint}</p>
                  <Ranks ranks={b.stakers} value="staked" me={me} />
                </Panel>
                <Panel title={t.leaderboard.biggest} icon="gem" tone="gold">
                  <Wins wins={b.biggest} by="value" me={me} />
                </Panel>
                <Panel title={t.leaderboard.luckiest} icon="sparkles">
                  <p className="muted small">{t.leaderboard.luckiest_hint}</p>
                  <Wins wins={b.luckiest} by="chance" me={me} />
                </Panel>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
