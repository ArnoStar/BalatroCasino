// Games that are over, the last first, a page at a time: a player's or
// everyone's, of one game or all (the history, a player's casino page).
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { chance_of, in_game, players_of, useCasino } from '@/entities/casino';
import { items_api, type CasinoGame, type GameMode } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { Alert, Avatar, Button, EmptyState, Icon, Spinner, Value } from '@/shared/ui';

const PAGE = 25;

export function GameList({ player, mode }: { player?: string; mode?: GameMode }) {
  const { t, f, describe } = useI18n();
  const me = useCasino().me?.id;
  const [games, setGames] = useState<CasinoGame[] | null>(null);
  const [more, setMore] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function load(before?: string) {
    setBusy(true);
    setError(null);
    try {
      const page = await items_api.games({ player, mode, limit: PAGE, before });
      setGames((list) => (before ? [...(list ?? []), ...page] : page));
      setMore(page.length === PAGE);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    setGames(null);
    void load();
  }, [player, mode]); // (a new list for another player or game)

  if (!games && busy) return <Spinner />;
  return (
    <>
      {error ? <Alert>{describe(error)}</Alert> : null}
      {games?.length === 0 ? <EmptyState icon="history" title={t.history.none} /> : null}
      {games?.length ? (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">{t.history.when}</th>
                <th scope="col">{t.history.mode}</th>
                <th scope="col" className="num">{t.common.players}</th>
                <th scope="col" className="num">{t.common.pot}</th>
                <th scope="col">{t.history.winner}</th>
                <th scope="col" className="num">{t.common.chance}</th>
                {me ? <th scope="col">{t.history.result}</th> : null}
                <th scope="col">
                  <span className="visually-hidden">{t.common.details}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => {
                const was_in = in_game(g, me);
                const won = g.winner === me;
                return (
                  <tr key={g.id}>
                    <td>
                      <time dateTime={g.updated_at} title={f.datetime(g.updated_at)}>
                        {f.ago(g.updated_at)}
                      </time>
                    </td>
                    <td>
                      <span className="game-mode">
                        <Icon name={g.mode === 'jackpot' ? 'coins' : g.mode === 'dice' ? 'dice' : 'sparkle'} />
                        {t.modes[g.mode].name}
                      </span>
                    </td>
                    <td className="num">{players_of(g).length}</td>
                    <td className="num">
                      <Value value={g.value} size="sm" compact />
                    </td>
                    <td>
                      <span className="who">
                        <Avatar name={g.winner_name} player={g.winner} size="xs" />
                        <Link to={`/players/${encodeURIComponent(g.winner ?? '')}`}>{won ? t.common.you : g.winner_name ?? t.common.a_player}</Link>
                      </span>
                    </td>
                    <td className="num">{f.percent(chance_of(g, g.winner ?? undefined))}</td>
                    {me ? (
                      <td>{was_in ? <span className={`tag ${won ? 'tag--green' : 'tag--red'}`}>{won ? t.history.won : t.history.lost}</span> : null}</td>
                    ) : null}
                    <td>
                      <Link to={`/${g.id}`}>{t.common.details}</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      {games?.length && more ? (
        <div className="row row--center">
          <Button tone="grey" busy={busy} onClick={() => load(games[games.length - 1].updated_at)}>
            {t.common.load_more}
          </Button>
        </div>
      ) : null}
    </>
  );
}
