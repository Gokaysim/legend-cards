/**
 * The main screens, in navigation order: the single list that both the router and the sidebar read.
 * Labels, icons and each screen's Cardmaker (`mascot`, a picture stem, or `null` for none) come from the legacy
 * design (v2.2.8). Paths are English slugs; labels are Turkish.
 */
export const SCREENS = [
  { id: 'hands', path: '/hands', label: 'Oyuncu elleri', icon: '♠', mascot: null },
  { id: 'shops', path: '/shops', label: 'Shops', icon: '🎁', mascot: 'cardmaker_keep' },
  {
    id: 'true-words',
    path: '/true-words',
    label: 'True Words',
    icon: '✦',
    mascot: 'cardmaker_true',
  },
  {
    id: 'custom-draft',
    path: '/custom-draft',
    label: 'Custom Card Draft',
    icon: '✧',
    mascot: 'cardmaker_custom',
  },
  {
    id: 'library',
    path: '/library',
    label: 'Kart kütüphanesi',
    icon: '▤',
    mascot: 'cardmaker_lib',
  },
  {
    id: 'cursed-deck',
    path: '/cursed-deck',
    label: 'Cursed Deck',
    icon: '☠',
    mascot: 'cardmaker_cursed',
  },
  { id: 'activity-log', path: '/log', label: 'İşlem Logu', icon: '☷', mascot: 'cardmaker_think' },
  { id: 'rules', path: '/rules', label: 'Kurallar', icon: '📖', mascot: 'cardmaker_wave' },
  { id: 'settings', path: '/settings', label: 'Veri / Yedek', icon: '⚙', mascot: 'cardmaker_peek' },
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
 * One player's hand on the "Oyuncu elleri" screen. It sits below the menu entry's path, so the menu keeps
 * "Oyuncu elleri" marked while a hand is open.
 */
export const HAND_ROUTE = `${screenById('hands').path}/:uid`

/** The URL of one player's hand. */
export function handPath(uid: string): string {
  return `${screenById('hands').path}/${encodeURIComponent(uid)}`
}

/**
 * The sub-screens of the Shops screen, in the order the Shops hub shows them. They are not menu
 * entries: their paths sit below `/shops`, so the menu keeps "Shops" marked while one is open.
 * `summary` and `speech` are v2.2.8's words: what the shop offers, and the Cardmaker's line about it in her speech
 * bubble (spec: cardmaker-speech).
 */
export const SHOP_SCREENS = [
  {
    id: 'pack-shop',
    path: '/shops/packs',
    label: 'Pack Shop',
    icon: '🎴',
    mascot: 'cardmaker_shop',
    summary: 'Spesifik bir set veya mekanikten 5 kart gör, birini seç.',
    speech: 'Yavrum benim kartlar ne ara böyle karaborsaya düşmüş? Ben el koydum dükkana artık.',
  },
  {
    id: 'elixir-shop',
    path: '/shops/elixirs',
    label: 'Elixir Shop',
    icon: '⚗',
    mascot: 'cardmaker_zaddir',
    summary: 'Kartların kendilerini değiştirmeyi sağlayan etkiler.',
    speech: 'Siz benim kartlara ne bulaştırdınız öyle? Şunlara bir de ben bakayım.',
  },
] as const

export type ShopScreen = (typeof SHOP_SCREENS)[number]
export type ShopScreenId = ShopScreen['id']

export function shopScreenById(id: ShopScreenId): ShopScreen {
  const screen = SHOP_SCREENS.find((candidate) => candidate.id === id)
  if (!screen) throw new Error(`Unknown shop screen: ${id}`)
  return screen
}

/**
 * The Pack Shop's URL. For the DM, `forUid` names the hand to open packs into (the hand screen's "🎁 Pack Shop"
 * link sets it); a player always opens into their own hand.
 */
export function packShopPath(forUid?: string): string {
  const path = shopScreenById('pack-shop').path
  return forUid === undefined ? path : `${path}?for=${encodeURIComponent(forUid)}`
}

/**
 * The True Words screen's URL. For the DM, `forUid` names the player to show and start drafts for (the hand's
 * "✦ True Word Draft" link sets it); a player always sees their own.
 */
export function trueWordsPath(forUid?: string): string {
  const path = screenById('true-words').path
  return forUid === undefined ? path : `${path}?for=${encodeURIComponent(forUid)}`
}

/** The search parameter of a hand's tab, and the values of its True Words and Notlar tabs. */
export const HAND_TAB_PARAM = 'tab'
export const TRUE_WORDS_TAB = 'true-words'
export const NOTES_TAB = 'notes'

/** A player's hand, opened on its True Words tab. */
export function handTrueWordsPath(uid: string): string {
  return `${handPath(uid)}?${HAND_TAB_PARAM}=${TRUE_WORDS_TAB}`
}
