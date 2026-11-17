import type { ReactNode } from 'react';
import { useI18n } from '@/shared/i18n';
import { Icon, type IconName } from './icons';

/** a block of the page: a title (with an icon and actions on its right), then its content */
export function Panel({ title, icon, actions, tone, className, id, children }: {
  title?: ReactNode;
  icon?: IconName;
  actions?: ReactNode;
  /** gold: money on the table (the pot); felt: a game table */
  tone?: 'gold' | 'felt';
  className?: string;
  id?: string;
  children: ReactNode;
}) {
  const cls = ['panel', tone && `panel--${tone}`, className].filter(Boolean).join(' ');
  return (
    <section className={cls} id={id}>
      {title || actions ? (
        <header className="panel__head">
          {title ? (
            <h2 className="panel__title">
              {icon ? <Icon name={icon} className="panel__icon" /> : null}
              <span>{title}</span>
            </h2>
          ) : null}
          {actions ? <div className="panel__actions">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

/** the top of a page: what it is (the eyebrow), its title, a line about it, and its main actions */
export function PageHeader({ eyebrow, title, lead, icon, actions, children }: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  icon?: IconName;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="page-header__text">
        {eyebrow ? (
          <p className="eyebrow">
            {icon ? <Icon name={icon} /> : null}
            {eyebrow}
          </p>
        ) : null}
        <h1 className="page-title">{title}</h1>
        {lead ? <p className="page-header__lead">{lead}</p> : null}
        {children}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  );
}

const ALERT_ICONS: Record<'error' | 'info' | 'success', IconName> = { error: 'alert', info: 'info', success: 'check-circle' };

export function Alert({ tone = 'error', children }: { tone?: 'error' | 'info' | 'success'; children: ReactNode }) {
  return (
    <p className={`alert alert--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon name={ALERT_ICONS[tone]} className="alert__icon" />
      <span>{children}</span>
    </p>
  );
}

/** waiting for the casino: three chips stacking */
export function Spinner({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="loading" role="status">
      <span className="loading__chips" aria-hidden>
        <i />
        <i />
        <i />
      </span>
      <span>{label ?? t.common.loading}</span>
    </div>
  );
}

/** nothing to show yet: what would be here, and how to get it */
export function EmptyState({ icon = 'sparkles', title, children, action }: {
  icon?: IconName; title: ReactNode; children?: ReactNode; action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty__icon" aria-hidden>
        <Icon name={icon} />
      </span>
      <p className="empty__title">{title}</p>
      {children ? <div className="empty__text">{children}</div> : null}
      {action ? <div className="empty__action">{action}</div> : null}
    </div>
  );
}
