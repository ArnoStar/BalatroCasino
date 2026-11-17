import { useI18n } from '@/shared/i18n';

/** an amount of value (items are worth their odds), on a gold chip: "◉ 12,400" */
export function Value({ value, compact = false, size = 'md', className }: {
  value: number; compact?: boolean; size?: 'sm' | 'md' | 'lg'; className?: string;
}) {
  const { f, t } = useI18n();
  return (
    <span className={['value', `value--${size}`, className].filter(Boolean).join(' ')} title={`${t.common.value}: ${f.number(value)}`}>
      <span className="value__chip" aria-hidden />
      <span className="value__n">{compact ? f.compact(value) : f.number(value)}</span>
    </span>
  );
}
