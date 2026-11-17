import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Timestamp } from 'firebase/firestore'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { testHiddenRoll, testRoll } from '@/test/diceFixtures'
import { ready, testProfile, testUser } from '@/test/fixtures'
import { renderApp, type RenderAppOptions } from '@/test/renderApp'

import { resetDeviceSettingsMemory } from './deviceSettings'
import type { DiceActions } from './diceContext'
import { emptyCounts } from './formula'

const ME = testProfile()
const BORA = testProfile({ id: 'bora', displayName: 'Bora' })
const CEM = testProfile({ id: 'cem', displayName: 'Cem' })
const DM = testProfile({ id: 'dm-1', displayName: 'Dana', role: 'dm' })
const PROFILES = ready([ME, BORA, CEM, DM])

function renderDice(options: RenderAppOptions = {}) {
  return renderApp({ path: '/dice', users: { profiles: PROFILES }, ...options })
}

const form = () => screen.getByRole('form', { name: 'Zar at' })
const dieButton = (type: string) => within(form()).getByRole('button', { name: `${type} ekle` })
const formula = () => within(form()).getByRole('status', { name: 'Formül' })
const channel = () => screen.getByRole('list', { name: 'Atışlar' })
const strip = () => screen.getByTestId('dice-strip')

beforeEach(() => {
  window.localStorage.clear()
  resetDeviceSettingsMemory()
})

describe('the Zarlar screen', () => {
  it('shows the strip with "Zar stili", the form below it, and the Kanal tab with the newest roll at the bottom', () => {
    renderDice({
      dice: {
        rolls: [
          testRoll({ by: 'cem', content: { note: 'Ateş topu' } }),
          testRoll({ by: 'bora', content: { note: 'Kapıyı kırmak' } }),
        ],
      },
    })

    const entries = within(channel()).getAllByRole('listitem', { name: /atışı$/ })
    expect(entries.map((entry) => entry.getAttribute('aria-label'))).toEqual([
      'Cem atışı',
      'Bora atışı',
    ])
    expect(strip()).toHaveTextContent('Son atış: Bora')
    expect(within(strip()).getByRole('button', { name: 'Zar stili' })).toBeInTheDocument()
    expect(form()).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Kanal' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'İnisiyatif' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
  })

  it('keeps the dice settings off the screen until "Zar stili" is selected', () => {
    renderDice()
    expect(screen.queryByRole('heading', { name: 'Zar stilin' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Bu cihazda' })).not.toBeInTheDocument()
  })

  it('stacks the strip, the form and the tabs in that order, and puts the tabs first on a wide window', () => {
    renderDice()
    const tray = screen.getByRole('region', { name: 'Zar tablası' })
    const tabs = screen.getByRole('region', { name: 'Kanal ve inisiyatif' })
    expect(tray.compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(tray.contains(strip())).toBe(true)
    expect(strip().compareDocumentPosition(form()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(tabs).toHaveClass('lg:order-first')
  })

  it('opens the İnisiyatif tab, keeps it in the URL, and opens it again from the URL', async () => {
    const user = userEvent.setup()
    const { router, unmount } = renderDice()
    await user.click(screen.getByRole('tab', { name: 'İnisiyatif' }))
    expect(router.state.location.search).toBe('?tab=inisiyatif')
    expect(screen.queryByRole('list', { name: 'Atışlar' })).not.toBeInTheDocument()
    unmount()

    renderApp({ path: '/dice?tab=inisiyatif', users: { profiles: PROFILES } })
    expect(screen.getByRole('tab', { name: 'İnisiyatif' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('tab', { name: 'Kanal' }))
    expect(screen.getByRole('list', { name: 'Atışlar' })).toBeInTheDocument()
  })
})

describe('building a roll', () => {
  it('mixes dice and a fixed number in the formula', async () => {
    const user = userEvent.setup()
    renderDice()

    await user.click(dieButton('d20'))
    await user.click(dieButton('d6'))
    await user.click(dieButton('d6'))
    await user.type(within(form()).getByLabelText('Sabit sayı'), '3')

    expect(formula()).toHaveTextContent('1d20 + 2d6 + 3')
  })

  it('takes the fixed number as a sum, shows it as written, and rolls with its total', async () => {
    const user = userEvent.setup()
    const roll = vi.fn<DiceActions['roll']>(() => Promise.resolve(testRoll()))
    renderDice({ dice: { actions: { roll } } })

    await user.click(dieButton('d20'))
    await user.type(within(form()).getByLabelText('Sabit sayı'), '5+10-4')
    expect(within(form()).getByLabelText('Sabit sayı')).toHaveValue('5+10-4')
    expect(formula()).toHaveTextContent('1d20 + 5 + 10 − 4')
    await user.click(within(form()).getByRole('button', { name: 'At' }))

    expect(roll).toHaveBeenCalledWith(
      expect.objectContaining({ modifier: 11, modifierSum: '5+10-4' }),
    )
  })

  it('refuses a fixed number that is not a sum of whole numbers', async () => {
    const user = userEvent.setup()
    renderDice()

    await user.click(dieButton('d20'))
    const field = within(form()).getByLabelText('Sabit sayı')
    await user.type(field, '4+')

    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(field).toHaveAccessibleDescription(/örneğin 4\+4-5/)
    expect(within(form()).getByRole('button', { name: 'At' })).toBeDisabled()

    await user.type(field, '1')
    expect(field).toHaveAttribute('aria-invalid', 'false')
    expect(field).not.toHaveAccessibleDescription()
    expect(within(form()).getByRole('button', { name: 'At' })).toBeEnabled()
  })

  it('refuses a sum outside −99 to +99 instead of clamping it', async () => {
    const user = userEvent.setup()
    renderDice()

    await user.click(dieButton('d20'))
    const field = within(form()).getByLabelText('Sabit sayı')
    await user.type(field, '90+20')

    expect(field).toHaveValue('90+20')
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(within(form()).getByRole('button', { name: 'At' })).toBeDisabled()
  })

  it('takes a die away', async () => {
    const user = userEvent.setup()
    renderDice()
    await user.click(dieButton('d6'))
    await user.click(dieButton('d6'))
    await user.click(within(form()).getByRole('button', { name: 'd6 çıkar' }))
    expect(formula()).toHaveTextContent('1d6')
  })

  it('disables "At" without dice', () => {
    renderDice()
    expect(within(form()).getByRole('button', { name: 'At' })).toBeDisabled()
  })

  it('keeps the first 80 characters of a long note', async () => {
    const user = userEvent.setup()
    renderDice()
    const note = within(form()).getByLabelText('Not')
    await user.type(note, 'x'.repeat(100))
    expect(note).toHaveValue('x'.repeat(80))
  })

  it('disables every die and says so with twelve d6', async () => {
    const user = userEvent.setup()
    renderDice()
    for (let index = 0; index < 12; index += 1) await user.click(dieButton('d6'))

    for (const type of ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']) {
      expect(dieButton(type)).toBeDisabled()
    }
    expect(within(form()).getByText('En fazla 12 zar')).toBeInTheDocument()
  })

  it('disables only the d100 with eleven physical dice', async () => {
    const user = userEvent.setup()
    renderDice()
    for (let index = 0; index < 11; index += 1) await user.click(dieButton('d6'))

    expect(dieButton('d100')).toBeDisabled()
    for (const type of ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'])
      expect(dieButton(type)).toBeEnabled()
  })

  it('offers Avantaj and Dezavantaj only for a single d20', async () => {
    const user = userEvent.setup()
    renderDice()
    const advantage = () => within(form()).getByRole('button', { name: 'Avantaj' })
    const disadvantage = () => within(form()).getByRole('button', { name: 'Dezavantaj' })
    expect(advantage()).toBeDisabled()

    await user.click(dieButton('d20'))
    expect(advantage()).toBeEnabled()
    expect(disadvantage()).toBeEnabled()

    await user.click(dieButton('d6'))
    expect(advantage()).toBeDisabled()
    expect(disadvantage()).toBeDisabled()
  })

  it('rolls with advantage, the fixed number and the note', async () => {
    const user = userEvent.setup()
    const roll = vi.fn<DiceActions['roll']>(() => Promise.resolve(testRoll()))
    renderDice({ dice: { actions: { roll } } })

    await user.click(dieButton('d20'))
    await user.click(within(form()).getByRole('button', { name: 'Avantaj' }))
    await user.type(within(form()).getByLabelText('Sabit sayı'), '5')
    await user.type(within(form()).getByLabelText('Not'), 'Okçuya saldırı')
    await user.click(within(form()).getByRole('button', { name: 'At' }))

    expect(roll).toHaveBeenCalledWith({
      counts: { ...emptyCounts(), d20: 1 },
      mode: 'advantage',
      modifier: 5,
      modifierSum: null,
      note: 'Okçuya saldırı',
      hidden: false,
    })
  })

  it('offers "Gizli" to the DM only', async () => {
    const user = userEvent.setup()
    const roll = vi.fn<DiceActions['roll']>(() => Promise.resolve(testRoll()))
    renderDice({
      users: { currentProfile: ready(DM), profiles: PROFILES },
      dice: { actions: { roll } },
    })

    await user.click(dieButton('d20'))
    await user.click(within(form()).getByRole('checkbox', { name: 'Gizli' }))
    await user.click(within(form()).getByRole('button', { name: 'At' }))
    expect(roll).toHaveBeenCalledWith(expect.objectContaining({ hidden: true }))
  })

  it('shows no "Gizli" to a player', () => {
    renderDice()
    expect(within(form()).queryByRole('checkbox', { name: 'Gizli' })).not.toBeInTheDocument()
  })
})

describe('the channel', () => {
  it('shows who rolled, the note, the formula, each die and the total', () => {
    renderDice({
      dice: {
        rolls: [
          testRoll({
            by: 'bora',
            at: Timestamp.fromDate(new Date(2026, 10, 15, 21, 5)),
            content: { note: 'Goblin’e saldırı' },
          }),
        ],
      },
    })
    const entry = within(channel()).getByRole('listitem', { name: 'Bora atışı' })
    expect(entry).toHaveTextContent('21:05')
    expect(entry).toHaveTextContent('Goblin’e saldırı')
    expect(entry).toHaveTextContent('1d20 + 2d6 + 3')
    expect(
      within(entry)
        .getAllByRole('listitem')
        .map((die) => die.textContent),
    ).toEqual(['d20: 17', 'd6: 4', 'd6: 2'])
    expect(entry).toHaveTextContent('Toplam: 26')
  })

  it('shows a roll that arrives at the bottom, without a reload', () => {
    const first = testRoll({ by: 'cem' })
    const view = renderDice({ dice: { rolls: [first] } })
    view.setDice({ rolls: [first, testRoll({ by: 'bora', content: { note: 'Yeni' } })] })

    const entries = within(channel()).getAllByRole('listitem', { name: /atışı$/ })
    expect(entries.at(-1)).toHaveAccessibleName('Bora atışı')
    expect(entries.at(-1)).toHaveTextContent('Yeni')
  })

  it('asks for older rolls with "Daha eski atışlar"', async () => {
    const user = userEvent.setup()
    const loadOlder = vi.fn()
    renderDice({ dice: { rolls: [testRoll()], hasOlder: true, actions: { loadOlder } } })

    await user.click(screen.getByRole('button', { name: 'Daha eski atışlar' }))
    expect(loadOlder).toHaveBeenCalled()
  })

  it('marks a natural 20 kept with advantage, and the die it drops', () => {
    renderDice({
      dice: {
        rolls: [
          testRoll({
            by: 'bora',
            dice: [
              ['d20', 20],
              ['d20', 8],
            ],
            content: { mode: 'advantage', modifier: 5 },
          }),
        ],
      },
    })
    const entry = within(channel()).getByRole('listitem', { name: 'Bora atışı' })
    expect(entry).toHaveTextContent('1d20 + 5 · avantaj')
    expect(within(entry).getByText('Nat 20')).toBeInTheDocument()
    expect(within(entry).getByText('(sayılmadı)').closest('li')).toHaveTextContent('8')
    expect(entry).toHaveTextContent('Toplam: 25')
  })

  it('shows the fixed number as written, and totals its sum', () => {
    renderDice({
      dice: {
        rolls: [
          testRoll({
            by: 'bora',
            dice: [['d20', 12]],
            content: { modifier: 11, modifierSum: '5+10-4' },
          }),
          testRoll({ by: 'cem', dice: [['d20', 12]], content: { modifier: 3 } }),
        ],
      },
    })
    const bora = within(channel()).getByRole('listitem', { name: 'Bora atışı' })
    expect(bora).toHaveTextContent('1d20 + 5 + 10 − 4')
    expect(bora).toHaveTextContent('+5 +10 −4')
    expect(bora).toHaveTextContent('Toplam: 23')
    const cem = within(channel()).getByRole('listitem', { name: 'Cem atışı' })
    expect(cem).toHaveTextContent('1d20 + 3')
    expect(cem).toHaveTextContent('Toplam: 15')
  })

  it('keeps its screen-reader text inside its own scroll box, so the page does not scroll with it', () => {
    renderDice({ dice: { rolls: [testRoll()] } })
    // jsdom has no layout: the box must be positioned, or its entries' sr-only spans make the whole page scroll.
    expect(channel().parentElement).toHaveClass('relative', 'overflow-y-auto')
  })

  it('marks a roll waiting to be sent, as offline', () => {
    renderDice({ dice: { rolls: [testRoll({ by: testUser.uid, at: null })] } })
    expect(within(channel()).getByRole('listitem', { name: 'Gökay atışı' })).toHaveTextContent(
      'gönderiliyor',
    )
  })
})

describe("the DM's hidden roll", () => {
  it('shows to a player as "DM gizli zar attı", without dice, note or total', () => {
    renderDice({ dice: { rolls: [testHiddenRoll()] } })
    const entry = within(channel()).getByRole('listitem', { name: 'Dana atışı' })
    expect(entry).toHaveTextContent('DM gizli zar attı')
    expect(entry).not.toHaveTextContent('Toplam')
    expect(within(entry).queryByRole('button', { name: 'Tekrar izle' })).not.toBeInTheDocument()
    expect(strip()).toHaveTextContent('Henüz zar atılmadı.')
  })

  it('shows to the DM in full, marked hidden', () => {
    renderDice({
      users: { currentProfile: ready(DM), profiles: PROFILES },
      dice: { rolls: [testRoll({ by: 'dm-1', hidden: true, dice: [['d20', 14]] })] },
    })
    const entry = within(channel()).getByRole('listitem', { name: 'Dana atışı' })
    expect(entry).toHaveTextContent('Gizli')
    expect(entry).toHaveTextContent('Toplam: 17')
  })
})

describe('the strip', () => {
  it('plays a roll from "At" at once, before it reaches the other devices', async () => {
    const user = userEvent.setup()
    renderDice({ dice: { rolls: [testRoll({ by: 'cem' })] } })
    expect(strip()).toHaveTextContent('Son atış: Cem')

    await user.click(dieButton('d8'))
    await user.click(within(form()).getByRole('button', { name: 'At' }))

    expect(await within(strip()).findByText('Son atış:')).toHaveTextContent('Gökay')
    expect(within(strip()).getByRole('list', { name: 'Zarlar' })).toHaveTextContent('d8: 1')
  })

  it('plays a newer roll in place of the one playing', () => {
    const ayla = testRoll({ by: 'cem', dice: [['d4', 3]] })
    const bora = testRoll({ by: 'bora', dice: [['d12', 9]] })
    const view = renderDice({ dice: { rolls: [ayla], fresh: null } })
    view.setDice({ rolls: [ayla], fresh: ayla })
    expect(strip()).toHaveTextContent('Son atış: Cem')
    view.setDice({ rolls: [ayla, bora], fresh: bora })
    expect(strip()).toHaveTextContent('Son atış: Bora')
    expect(within(strip()).getByRole('list', { name: 'Zarlar' })).toHaveTextContent('d12: 9')
  })

  it('empties when the DM resets the channel, also after a roll played in it', () => {
    const cem = testRoll({ by: 'cem', dice: [['d4', 3]] })
    const view = renderDice({ dice: { rolls: [cem], fresh: null } })
    view.setDice({ rolls: [cem], fresh: cem })
    expect(strip()).toHaveTextContent('Son atış: Cem')

    view.setDice({ rolls: [], fresh: cem })

    expect(strip()).toHaveTextContent('Henüz zar atılmadı.')
    expect(strip()).not.toHaveTextContent('Son atış')
    expect(within(channel()).queryAllByRole('listitem', { name: /atışı$/ })).toHaveLength(0)
  })

  it('keeps playing a roll made here that the channel does not hold yet', async () => {
    const user = userEvent.setup()
    renderDice({ dice: { rolls: [] } })
    await user.click(dieButton('d8'))
    await user.click(within(form()).getByRole('button', { name: 'At' }))
    expect(await within(strip()).findByText('Son atış:')).toHaveTextContent('Gökay')
  })

  it('plays a roll again with "Tekrar izle", writing nothing', async () => {
    const user = userEvent.setup()
    const roll = vi.fn<DiceActions['roll']>()
    const fireball = testRoll({
      by: 'cem',
      dice: Array.from({ length: 8 }, (_, index) => ['d6', (index % 6) + 1] as ['d6', number]),
      content: { modifier: 0 },
    })
    renderDice({ dice: { rolls: [fireball, testRoll({ by: 'bora' })], actions: { roll } } })
    expect(strip()).toHaveTextContent('Son atış: Bora')

    const entry = within(channel()).getByRole('listitem', { name: 'Cem atışı' })
    await user.click(within(entry).getByRole('button', { name: 'Tekrar izle' }))

    expect(strip()).toHaveTextContent('Son atış: Cem')
    expect(within(strip()).getAllByRole('listitem')).toHaveLength(8)
    expect(roll).not.toHaveBeenCalled()
  })
})

describe('the dice settings dialog', () => {
  const openSettings = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(within(strip()).getByRole('button', { name: 'Zar stili' }))
    return screen.getByRole('dialog', { name: 'Zar ayarları' })
  }

  it("marks the user's style, saves a new one and closes", async () => {
    const user = userEvent.setup()
    const setDiceStyle = vi.fn<DiceActions['setDiceStyle']>(() => Promise.resolve())
    renderDice({
      users: { currentProfile: ready(testProfile({ diceStyle: 'iron' })), profiles: PROFILES },
      dice: { actions: { setDiceStyle } },
    })
    const dialog = await openSettings(user)
    const styles = within(dialog).getAllByRole('button', { pressed: false })
    expect(styles).toHaveLength(7)
    expect(within(dialog).getByRole('button', { name: 'Iron' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await user.click(within(dialog).getByRole('button', { name: 'Walnut' }))
    expect(setDiceStyle).toHaveBeenCalledWith('walnut')
    expect(screen.queryByRole('dialog', { name: 'Zar ayarları' })).not.toBeInTheDocument()
  })

  it('shows rolls and stays silent by default, keeps a change on the device, and closes with "Kapat"', async () => {
    const user = userEvent.setup()
    renderDice()
    const dialog = await openSettings(user)
    const show = within(dialog).getByRole('checkbox', { name: 'Atışları göster' })
    const sound = within(dialog).getByRole('checkbox', { name: 'Zar sesi' })
    expect(show).toBeChecked()
    expect(sound).not.toBeChecked()

    await user.click(show)
    expect(window.localStorage.getItem('lcm.dice.show')).toBe('0')
    await user.click(within(dialog).getByRole('button', { name: /Kapat/ }))
    expect(screen.queryByRole('dialog', { name: 'Zar ayarları' })).not.toBeInTheDocument()
  })

  it('closes with Escape', async () => {
    const user = userEvent.setup()
    renderDice()
    const dialog = (await openSettings(user)) as HTMLDialogElement
    act(() => dialog.close())
    expect(screen.queryByRole('dialog', { name: 'Zar ayarları' })).not.toBeInTheDocument()
  })
})
