// The casino's frame: the room's light, the top bar (the sign, the games, the
// player), the last wins sliding by, the page, and a footer back to the rest
// of the site.
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { GAME_URL, portal } from '@/shared/config';
import { useI18n } from '@/shared/i18n';
import { Icon } from '@/shared/ui';
import { Backdrop } from './backdrop';
import { Ticker } from './ticker';
import { Toasts } from './toasts';
import { Nav, TopBar } from './topbar';

export function Shell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="shell">
      <Backdrop />
      <a className="skip" href="#main">
        {t.shell.skip}
      </a>
      <TopBar />
      <Ticker />
      <main id="main" className="main" tabIndex={-1}>
        {children}
      </main>
      <footer className="footer">
        <p className="footer__text">
          <Icon name="shield" /> {t.shell.footer}{' '}
          <Link to="/fair">{t.shell.nav.fair}</Link>
        </p>
        <nav className="footer__links" aria-label={t.shell.portal_hint}>
          <a href={portal('/')}>{t.shell.portal}</a>
          <a href={`${GAME_URL}/`}>{t.shell.play}</a>
          <a href={portal('/inventory')}>{t.shell.items}</a>
          <a href={portal('/trades')}>{t.shell.trades}</a>
        </nav>
      </footer>
      <Nav className="nav--bottom" />
      <Toasts />
    </div>
  );
}
