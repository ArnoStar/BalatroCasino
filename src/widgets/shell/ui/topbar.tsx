import { Link, NavLink, useLocation } from 'react-router';
import { useCasino } from '@/entities/casino';
import { GAME_URL, portal } from '@/shared/config';
import { LANGUAGES, useI18n, type Lang } from '@/shared/i18n';
import { sound, useMuted } from '@/shared/lib';
import { Avatar, Icon, type IconName } from '@/shared/ui';
import { Notifications } from './notifications';

type NavKey = 'lobby' | 'coinflip' | 'dice' | 'jackpot' | 'upgrade' | 'leaderboard' | 'history' | 'fair';
/** shown as icons only on narrower screens */
const MINOR: NavKey[] = ['leaderboard', 'history', 'fair'];
const NAV: [NavKey, string, IconName][] = [
  ['lobby', '/', 'home'],
  ['coinflip', '/coinflip', 'sparkle'],
  ['dice', '/dice', 'dice'],
  ['jackpot', '/jackpot', 'coins'],
  ['upgrade', '/upgrade', 'zap'],
  ['leaderboard', '/leaderboard', 'trophy'],
  ['history', '/history', 'history'],
  ['fair', '/fair', 'shield'],
];

/** the casino's sign: "Balatro" small over a neon "Casino" */
function Brand() {
  const { t } = useI18n();
  return (
    <Link to="/" className="brand" aria-label={`${t.shell.brand_top} ${t.shell.brand}`}>
      <span className="brand__chip" aria-hidden />
      <span className="brand__text" aria-hidden>
        <span className="brand__top">{t.shell.brand_top}</span>
        <span className="brand__sign">{t.shell.brand}</span>
      </span>
    </Link>
  );
}

function Badge({ k }: { k: NavKey }) {
  const casino = useCasino();
  const { f } = useI18n();
  if (k === 'coinflip' && casino.coinflips.length) return <span className="nav__badge">{casino.coinflips.length}</span>;
  if (k === 'dice' && casino.dice.length) return <span className="nav__badge">{casino.dice.length}</span>;
  if (k === 'jackpot' && casino.pot) {
    return <span className={`nav__badge nav__badge--gold${casino.pot.closes_at ? ' nav__badge--hot' : ''}`}>{f.compact(casino.pot.value)}</span>;
  }
  return null;
}

export function Nav({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <nav className={['nav', className].filter(Boolean).join(' ')} aria-label={t.shell.nav_label}>
      {NAV.map(([k, to, icon]) => (
        <NavLink key={k} to={to} end={to === '/'} className={`nav__link${MINOR.includes(k) ? ' nav__link--minor' : ''}`} title={t.shell.nav[k]}>
          <Icon name={icon} />
          <span className="nav__text">{t.shell.nav[k]}</span>
          <Badge k={k} />
        </NavLink>
      ))}
    </nav>
  );
}

function LiveDot() {
  const { live, status } = useCasino();
  const { t } = useI18n();
  if (status !== 'ready') return null;
  const label = live === 'live' ? t.shell.live : live === 'connecting' ? t.shell.connecting : t.shell.offline;
  return (
    <span className={`live live--${live}`} role="status" title={label}>
      <span className="live__dot" aria-hidden />
      <span className="live__text">{label}</span>
    </span>
  );
}

export function SoundToggle() {
  const muted = useMuted();
  const { t } = useI18n();
  return (
    <button type="button" className="icon-button" onClick={() => sound.set_muted(!muted)} aria-label={muted ? t.shell.sound_off : t.shell.sound_on} title={muted ? t.shell.sound_off : t.shell.sound_on} aria-pressed={!muted}>
      <Icon name={muted ? 'volume-off' : 'volume'} />
    </button>
  );
}

export function LanguageSelect() {
  const { t, lang, set_lang } = useI18n();
  return (
    <label className="lang" title={t.shell.language}>
      <Icon name="globe" />
      <span className="visually-hidden">{t.shell.language}</span>
      <select value={lang} onChange={(e) => set_lang(e.target.value as Lang)}>
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} lang={l.code}>
            {l.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function Account() {
  const casino = useCasino();
  const { t, f } = useI18n();
  const here = useLocation();
  if (casino.status === 'signed-out') {
    const next = `/casino${here.pathname === '/' ? '/' : here.pathname}${here.search}`;
    return (
      <a className="btn btn--gold btn--sm" href={portal(`/login?${new URLSearchParams({ next })}`)}>
        <Icon name="login" />
        {t.shell.sign_in}
      </a>
    );
  }
  if (!casino.me) return null;
  return (
    <>
      <a className="ready" href={portal('/inventory')} title={t.shell.ready_hint}>
        <span className="ready__label">{t.shell.ready}</span>
        <span className="ready__value">
          <span className="value__chip" aria-hidden />
          {f.compact(casino.ready_value)}
        </span>
      </a>
      <a className="ready ready--coins" href={portal('/shop')} title={t.shell.coins_hint}>
        <span className="ready__label">{t.shell.coins}</span>
        <span className="ready__value">
          <span className="value__chip" aria-hidden />
          {f.compact(casino.me.coins ?? 0)}
        </span>
      </a>
      <a className="me" href={portal('/account')} title={t.shell.account}>
        <Avatar name={casino.me.name} player={casino.me.id} size="sm" />
        <span className="visually-hidden">{t.shell.account}</span>
      </a>
    </>
  );
}

export function TopBar() {
  const { t } = useI18n();
  return (
    <header className="topbar">
      <div className="topbar__row">
        <Brand />
        <Nav className="nav--top" />
        <div className="topbar__end">
          <LiveDot />
          <Notifications />
          <Account />
          <SoundToggle />
          <LanguageSelect />
          <a className="icon-button topbar__play" href={`${GAME_URL}/`} title={t.shell.play} aria-label={t.shell.play}>
            <Icon name="play" />
          </a>
        </div>
      </div>
    </header>
  );
}
