/** The tabs of the Zarlar screen's left column (spec: dice-rolls, "The Zarlar screen"). */
export const DICE_TABS = [
  { id: 'channel', label: 'Kanal', value: null },
  { id: 'initiative', label: 'İnisiyatif', value: 'inisiyatif' },
] as const

export type DiceTab = (typeof DICE_TABS)[number]['id']

/** The URL parameter that keeps the open tab. Kanal, the default, has none. */
export const DICE_TAB_PARAM = 'tab'

/** The Zarlar screen on its İnisiyatif tab. */
export const INITIATIVE_PATH = '/dice?tab=inisiyatif'

/** The tab a URL parameter names; anything else is Kanal. */
export function diceTabOf(value: string | null): DiceTab {
  return DICE_TABS.find((tab) => tab.value !== null && tab.value === value)?.id ?? 'channel'
}

/** The URL parameter's value for a tab, or `null` for Kanal. */
export function diceTabValue(tab: DiceTab): string | null {
  return DICE_TABS.find((candidate) => candidate.id === tab)?.value ?? null
}
