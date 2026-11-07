/**
 * The main screens, in navigation order: the single list that both the router and the sidebar read.
 * Labels and icons come from the legacy design (v2.2.8). Paths are English slugs; labels are Turkish.
 */
export const SCREENS = [
  { id: 'hands', path: '/hands', label: 'Oyuncu elleri', icon: '♠' },
  { id: 'shops', path: '/shops', label: 'Shops', icon: '🎁' },
  { id: 'true-words', path: '/true-words', label: 'True Words', icon: '✦' },
  { id: 'custom-draft', path: '/custom-draft', label: 'Custom Card Draft', icon: '✧' },
  { id: 'library', path: '/library', label: 'Kart kütüphanesi', icon: '▤' },
  { id: 'cursed-deck', path: '/cursed-deck', label: 'Cursed Deck', icon: '☠' },
  { id: 'activity-log', path: '/log', label: 'İşlem Logu', icon: '☷' },
  { id: 'rules', path: '/rules', label: 'Kurallar', icon: '📖' },
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

/**
 * The sub-screens of the Shops screen, in the order the Shops hub shows them. They are not menu
 * entries: their paths sit below `/shops`, so the menu keeps "Shops" marked while one is open.
 */
export const SHOP_SCREENS = [
  {
    id: 'pack-shop',
    path: '/shops/packs',
    label: 'Pack Shop',
    icon: '🎴',
    summary: 'Spesifik bir set veya mekanikten 5 kart gör, birini seç.',
  },
  {
    id: 'elixir-shop',
    path: '/shops/elixirs',
    label: 'Elixir Shop',
    icon: '⚗',
    summary: 'Kartların kendilerini değiştirmeyi sağlayan etkiler.',
  },
] as const

export type ShopScreen = (typeof SHOP_SCREENS)[number]
export type ShopScreenId = ShopScreen['id']

export function shopScreenById(id: ShopScreenId): ShopScreen {
  const screen = SHOP_SCREENS.find((candidate) => candidate.id === id)
  if (!screen) throw new Error(`Unknown shop screen: ${id}`)
  return screen
}
