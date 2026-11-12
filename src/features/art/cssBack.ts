/** The look of a back drawn without a cardback picture: neutral (also a set's, without its picture) or Cursed. */
export type CssBackTone = 'neutral' | 'cursed'

/** The card shape of a back without a picture, as the picture's: at any width, a card's 563/788 proportions. */
export const CSS_BACK_SHAPE =
  'flex aspect-[563/788] flex-col items-center justify-center gap-3 rounded-xl border-2 bg-linear-to-br p-3'

/** Each tone's frame and surface. */
export const CSS_BACK_TONES: Record<CssBackTone, string> = {
  neutral: 'border-gold from-control via-pane-raised to-primary',
  cursed: 'border-cursed from-control via-pane-raised to-cursed/40',
}
