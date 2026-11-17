import { Coin } from '@/entities/casino';
import { useI18n } from '@/shared/i18n';
import { Icon, LinkButton } from '@/shared/ui';

export function NotFoundPage() {
  const { t } = useI18n();
  return (
    <section className="gate">
      <Coin side="mult" size="lg" spinning />
      <h1 className="gate__title">{t.not_found.title}</h1>
      <p className="gate__text">{t.not_found.text}</p>
      <LinkButton to="/" icon={<Icon name="home" />}>
        {t.not_found.back}
      </LinkButton>
    </section>
  );
}
