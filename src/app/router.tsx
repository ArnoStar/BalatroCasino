import { createBrowserRouter, Navigate, Outlet, ScrollRestoration, useSearchParams } from 'react-router';
import { CoinflipPage } from '@/pages/coinflip';
import { DicePage } from '@/pages/dice';
import { FairPage } from '@/pages/fair';
import { GamePage } from '@/pages/game';
import { HistoryPage } from '@/pages/history';
import { JackpotPage } from '@/pages/jackpot';
import { LeaderboardPage } from '@/pages/leaderboard';
import { LobbyPage } from '@/pages/lobby';
import { NotFoundPage } from '@/pages/not-found';
import { PlayerPage } from '@/pages/player';
import { UpgradePage } from '@/pages/upgrade';
import { Gate, Shell } from '@/widgets/shell';
import { ResultHost } from './result-host';

function Layout() {
  return (
    <Shell>
      <Outlet />
      <ResultHost />
      <ScrollRestoration />
    </Shell>
  );
}

function Gated() {
  return (
    <Gate>
      <Outlet />
    </Gate>
  );
}

/** the lobby; the portal's old casino links (?tab=coinflip|jackpot|history) go to their page */
function Index() {
  const [params] = useSearchParams();
  const tab = params.get('tab');
  if (tab === 'coinflip' || tab === 'jackpot' || tab === 'history') return <Navigate to={`/${tab}`} replace />;
  return <LobbyPage />;
}

// the casino is served at /casino/ (vite.config.ts's base): its paths here are under it
export const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        // (the check of any draw needs no account)
        { path: 'fair', element: <FairPage /> },
        {
          element: <Gated />,
          children: [
            { index: true, element: <Index /> },
            { path: 'coinflip', element: <CoinflipPage /> },
            { path: 'dice', element: <DicePage /> },
            { path: 'jackpot', element: <JackpotPage /> },
            { path: 'upgrade', element: <UpgradePage /> },
            { path: 'leaderboard', element: <LeaderboardPage /> },
            { path: 'history', element: <HistoryPage /> },
            { path: 'players/:id', element: <PlayerPage /> },
            { path: 'me', element: <PlayerPage /> },
            // a game: /casino/<id> (the portal's links to games are these)
            { path: ':id', element: <GamePage /> },
          ],
        },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  { basename: '/casino' },
);
