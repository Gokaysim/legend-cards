import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

/** A small stroked icon in the text color, as decoration beside a control's text label (design D5). */
function Icon({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-4 shrink-0', className)}
    >
      {children}
    </svg>
  )
}

/** "Kullan". */
export function BoltIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
    </Icon>
  )
}

/** The active switch. */
export function PowerIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M12 3v9" />
      <path d="M18.4 6.6a9 9 0 1 1-12.8 0" />
    </Icon>
  )
}

/** "Başkasına ver". */
export function ArrowIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M4 12h15" />
      <path d="M13 6l6 6-6 6" />
    </Icon>
  )
}

/** "At", and taking a word back. */
export function BinIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7l1 13h10l1-13" />
    </Icon>
  )
}

/** Who holds or knows it. */
export function PersonIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </Icon>
  )
}

/** A card's history ("geçmiş"): a clock. */
export function ClockIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Icon>
  )
}

/** Everyone is shown: an open eye. */
export function EyeIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  )
}

/** Some are hidden: a crossed-out eye. */
export function EyeOffIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.4 3.3" />
      <path d="M6.6 6.6C3.7 8.5 2 12 2 12s3.5 7 10 7a9.8 9.8 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="M3 3l18 18" />
    </Icon>
  )
}
