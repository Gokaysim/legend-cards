import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { CSS_BACK_SHAPE, CSS_BACK_TONES, type CssBackTone } from './cssBack'

/** The glyph in the middle of a back without a picture. */
export function CssBackGlyph({ tone }: { tone: CssBackTone }) {
  return (
    <span
      aria-hidden="true"
      className={cn('text-4xl', tone === 'cursed' ? 'text-cursed' : 'text-gold')}
    >
      {tone === 'cursed' ? '☠' : '✦'}
    </span>
  )
}

export type NeutralCardBackProps = {
  className?: string
  /** Drawn over the back, after its glyph: a label, or a light that crosses it. */
  children?: ReactNode
}

/**
 * The neutral back drawn without a picture, the one a random draw shows (spec: card-images, "Cardbacks that give
 * nothing away"), as decoration: the "Yakında" panel of an unbuilt screen shows it (design D7 of
 * `polish-cards-packs-and-mascots`). `FaceDownCard` draws the same look on its turnable back.
 */
export function NeutralCardBack({ className, children }: NeutralCardBackProps) {
  return (
    <div aria-hidden="true" className={cn(CSS_BACK_SHAPE, CSS_BACK_TONES.neutral, className)}>
      <CssBackGlyph tone="neutral" />
      {children}
    </div>
  )
}
