import type { Card } from '@/features/cards/schema'
import type { CardSet } from '@/features/sets/schema'

/**
 * The main screens, in navigation order: the single list that both the router and the sidebar read.
 * Labels, icons and each screen's Cardmaker (`mascot`, a picture stem, or `null` for none) come from the legacy
 * design (v2.2.8). Paths are English slugs; labels are Turkish.
 */
export const SCREENS = [
  { id: 'hands', path: '/hands', label: 'Oyuncu elleri', icon: '♠', mascot: null },
  { id: 'shops', path: '/shops', label: 'Shops', icon: '🎁', mascot: 'cardmaker_keep' },
  {
    id: 'custom-draft',
    path: '/custom-draft',
    label: 'Custom Card Draft',
    icon: '✧',
    mascot: 'cardmaker_custom',
  },
  // The Kütüphane shows its open tab's Cardmaker (LIBRARY_TABS); this one is the default tab's.
  { id: 'library', path: '/library', label: 'Kütüphane', icon: '▤', mascot: 'cardmaker_lib' },
  { id: 'sets', path: '/sets', label: 'Setler', icon: '◈', mascot: null },
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
 * The tabs of the Kütüphane (spec: card-library, "The Kütüphane screen and its tabs"), in order, with each tab's value
 * of `LIBRARY_TAB_PARAM` and its Cardmaker. The Kartlar tab has no value: it is the default, as on the hand screen.
 */
export const LIBRARY_TABS = [
  { id: 'cards', value: null, label: '♠ Kartlar', mascot: 'cardmaker_lib' },
  { id: 'cursed', value: 'cursed', label: '☠ Cursed', mascot: 'cardmaker_cursed' },
  { id: 'true-words', value: 'true-words', label: '✦ True Words', mascot: 'cardmaker_true' },
] as const

export type LibraryTabEntry = (typeof LIBRARY_TABS)[number]
export type LibraryTab = LibraryTabEntry['id']

/** The search parameter of the Kütüphane's open tab. */
export const LIBRARY_TAB_PARAM = 'tab'

/** The search parameter of the player the DM chose on the True Words tab. */
export const LIBRARY_FOR_PARAM = 'for'

export function libraryTabById(id: LibraryTab): LibraryTabEntry {
  const tab = LIBRARY_TABS.find((candidate) => candidate.id === id)
  if (!tab) throw new Error(`Unknown library tab: ${id}`)
  return tab
}

/** The tab a URL value opens: no value, or one no tab has, opens Kartlar. */
export function libraryTabOf(value: string | null): LibraryTab {
  return LIBRARY_TABS.find((tab) => tab.value !== null && tab.value === value)?.id ?? 'cards'
}

/**
 * The URL of a tab of the Kütüphane. On the True Words tab, `forUid` names the player the DM shows and starts drafts
 * for (the hand's "✦ True Word Draft" link sets it); a player always sees their own.
 */
export function libraryPath(tab: LibraryTab = 'cards', forUid?: string): string {
  const params = new URLSearchParams()
  const value = libraryTabById(tab).value
  if (value !== null) params.set(LIBRARY_TAB_PARAM, value)
  if (forUid !== undefined) params.set(LIBRARY_FOR_PARAM, forUid)
  const search = params.toString()
  return search === '' ? screenById('library').path : `${screenById('library').path}?${search}`
}

/**
 * A card's Kart geçmişi (spec: card-stats), below the Kütüphane's path whatever the card's kind, so the menu keeps the
 * Kütüphane marked.
 */
export const CARD_HISTORY_ROUTE = `${screenById('library').path}/:cardId`

/** The URL of a card's Kart geçmişi. */
export function cardHistoryPath(card: Pick<Card, 'id'>): string {
  return `${screenById('library').path}/${encodeURIComponent(card.id)}`
}

/** A set's Set istatistikleri (spec: card-stats), below the Setler screen's path, which the menu keeps marked. */
export const SET_STATS_ROUTE = `${screenById('sets').path}/:setId`

/** The URL of a set's Set istatistikleri, by the set's document ID. */
export function setStatsPath(set: Pick<CardSet, 'id'>): string {
  return `${screenById('sets').path}/${encodeURIComponent(set.id)}`
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
 * The search parameter of a hand's tab, and the values of its True Words tab, its Karakterler tab and the DM's own DM
 * notu tab. Any other value, such as the former Notlar tab's `notes`, opens the Kartlar tab.
 */
export const HAND_TAB_PARAM = 'tab'
export const TRUE_WORDS_TAB = 'true-words'
export const CHARACTERS_TAB = 'characters'
export const DM_NOTE_TAB = 'dm-note'

/** A player's hand, opened on its True Words tab. */
export function handTrueWordsPath(uid: string): string {
  return `${handPath(uid)}?${HAND_TAB_PARAM}=${TRUE_WORDS_TAB}`
}
