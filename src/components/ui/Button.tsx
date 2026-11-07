import type { ButtonHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

export type ButtonVariant = 'secondary' | 'primary' | 'ghost' | 'danger'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}

const variantClasses: Record<ButtonVariant, string> = {
  secondary: 'border-control-line bg-control text-ink hover:bg-pane-raised',
  primary: 'border-primary-line bg-primary text-on-primary hover:brightness-110',
  ghost: 'border-transparent bg-transparent text-ink hover:bg-pane-raised',
  danger: 'border-danger-line bg-control text-danger-ink hover:bg-pane-raised',
}

/** The app's button. Defaults to `type="button"` so it never submits a form by accident. */
export function Button({
  variant = 'secondary',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  )
}
