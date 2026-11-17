// The casino: players stake their items against each other's (coinflips,
// dice, the jackpot), live and provably fair. Served at /casino/ next to the
// portal and the game, with their session. See README.md.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/unbounded';
import { RouterProvider } from 'react-router';
import { CasinoProvider } from '@/entities/casino';
import { I18nProvider } from '@/shared/i18n';
import { router } from './router';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <CasinoProvider>
        <RouterProvider router={router} />
      </CasinoProvider>
    </I18nProvider>
  </StrictMode>,
);
