import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';

/** gold: the main action (money on the table); blue: Chips; red: Mult, or a loss; green: a gain, joining; grey: the quiet one; ghost: no fill */
export type Tone = 'gold' | 'blue' | 'red' | 'green' | 'grey' | 'ghost';
export type Size = 'sm' | 'md' | 'lg';

interface Look {
  tone?: Tone;
  size?: Size;
  wide?: boolean;
  /** an icon before the text (replaced by the spinner while busy) */
  icon?: ReactNode;
}

const classes = ({ tone = 'gold', size = 'md', wide = false }: Look, className?: string) =>
  ['btn', `btn--${tone}`, `btn--${size}`, wide && 'btn--wide', className].filter(Boolean).join(' ');

interface ButtonProps extends Look, ButtonHTMLAttributes<HTMLButtonElement> {
  busy?: boolean;
}

export function Button({ tone, size, wide, icon, busy = false, className, children, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button className={classes({ tone, size, wide }, className)} disabled={disabled || busy} aria-busy={busy || undefined} type={type} {...rest}>
      {busy ? <span className="spinner" aria-hidden /> : icon}
      {children}
    </button>
  );
}

export function LinkButton({ tone, size, wide, icon, className, children, ...rest }: Look & LinkProps & { children: ReactNode }) {
  return (
    <Link className={classes({ tone, size, wide }, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

/** a link out of the casino (the portal, the game: another app, a full page load) */
export function AnchorButton({ tone, size, wide, icon, href, className, children }: Look & {
  href: string; className?: string; children: ReactNode;
}) {
  return (
    <a className={classes({ tone, size, wide }, className)} href={href}>
      {icon}
      {children}
    </a>
  );
}
