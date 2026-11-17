// What a page needs first: a signed-in player (the casino plays the items of
// their account), and the casino reachable. Players without a first win may
// watch; the stake buttons say why they can't play yet.
import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { Coin, useCasino } from '@/entities/casino';
import { portal } from '@/shared/config';
import { useI18n } from '@/shared/i18n';
import { Alert, Button, Icon, Spinner } from '@/shared/ui';

export function Gate({ children }: { children: ReactNode }) {
  const casino = useCasino();
  const { t, describe } = useI18n();
  const here = useLocation();
  if (casino.status === 'loading') return <Spinner />;
  if (casino.status === 'signed-out') {
    const next = `/casino${here.pathname === '/' ? '/' : here.pathname}${here.search}`;
    return (
      <section className="gate">
        <Coin side="mult" size="lg" />
        <h1 className="gate__title">{t.gate.signed_out_title}</h1>
        <p className="gate__text">{t.gate.signed_out_text}</p>
        <div className="gate__actions">
          <a className="btn btn--gold btn--lg" href={portal(`/login?${new URLSearchParams({ next })}`)}>
            <Icon name="login" />
            {t.gate.sign_in}
          </a>
          <a className="btn btn--grey btn--lg" href={portal(`/register?${new URLSearchParams({ next })}`)}>
            <Icon name="user-plus" />
            {t.gate.register}
          </a>
        </div>
      </section>
    );
  }
  if (casino.status === 'error') {
    return (
      <section className="gate">
        <h1 className="gate__title">{t.gate.unreachable}</h1>
        <Alert>{describe(casino.error)}</Alert>
        <Button onClick={casino.reload} icon={<Icon name="refresh" />}>
          {t.common.retry}
        </Button>
      </section>
    );
  }
  return (
    <>
      {casino.rules && !casino.rules.open ? <Alert tone="info">{t.gate.closed}</Alert> : null}
      {casino.me && !casino.me.can_trade ? (
        <div className="notice">
          <Icon name="lock" />
          <div>
            <strong>{t.gate.locked_title}</strong>
            <p>{t.gate.locked_text}</p>
          </div>
        </div>
      ) : null}
      {children}
    </>
  );
}
