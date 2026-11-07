/**
 * The main screens, in navigation order: the single list that both the router and the sidebar read.
 * Labels and icons come from the legacy design. Paths are English slugs; labels are Turkish.
 */
export const SCREENS = [
  { id: 'hands', path: '/hands', label: 'Oyuncu elleri', icon: '♠' },
  { id: 'shop', path: '/shop', label: 'Pack Shop', icon: '🎁' },
  { id: 'true-words', path: '/true-words', label: 'True Words', icon: '✦' },
  { id: 'library', path: '/library', label: 'Kart kütüphanesi', icon: '▤' },
  { id: 'cursed-deck', path: '/cursed-deck', label: 'Cursed Deck', icon: '☠' },
  { id: 'activity-log', path: '/log', label: 'İşlem Logu', icon: '☷' },
  { id: 'settings', path: '/settings', label: 'Veri / Yedek', icon: '⚙' },
] as const

export type Screen = (typeof SCREENS)[number]
export type ScreenId = Screen['id']

/** The screen a signed-in user lands on. */
export const DEFAULT_SCREEN_PATH = '/hands'

export function screenById(id: ScreenId): Screen {
  const screen = SCREENS.find((candidate) => candidate.id === id)
  if (!screen) throw new Error(`Unknown screen: ${id}`)
  return screen
}
