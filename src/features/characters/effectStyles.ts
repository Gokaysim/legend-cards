import type { PillTone } from '@/components/ui/Pill'

import type { EffectKind } from './effectRows'

/**
 * Each effect kind's look (spec: visual-effects, "Effect colors"; design D5 of redesign-hand-dashboard): the row's
 * border and glow, its name's ink, the tone of its mark, and what a screen reader hears before a Cursed or Blessed
 * card's name, so the kind never rests on color alone.
 */
export const EFFECT_STYLES: Record<
  EffectKind,
  { box: string; name: string; tone?: PillTone; prefix?: string }
> = {
  cursed: {
    box: 'border-glow-cursed/75 shadow-glow-effect-cursed',
    name: 'text-cursed-soft',
    tone: 'cursed',
    prefix: 'Cursed: ',
  },
  blessed: {
    box: 'border-glow-blessed/75 shadow-glow-effect-blessed',
    name: 'text-blessed',
    tone: 'blessed',
    prefix: 'Blessed: ',
  },
  word: {
    box: 'border-glow-word/75 shadow-glow-effect-word',
    name: 'text-true-word',
    tone: 'true-word',
  },
  card: { box: 'border-glow-active/60 shadow-glow-effect-card', name: 'text-green' },
  custom: { box: 'border-glow-custom/75 shadow-glow-effect-custom', name: 'text-custom-ink' },
}
