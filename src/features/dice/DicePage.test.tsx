import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Timestamp } from 'firebase/firestore'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { testHiddenRoll, testRoll } from '@/test/diceFixtures'
import { ready, testProfile, testUser } from '@/test/fixtures'
import { renderApp, type RenderAppOptions } from '@/test/renderApp'

import { resetDeviceSettingsMemory } from './deviceSettings'
import type { DiceActions } from './diceContext'
import { emptyCounts, type RolledDie } from './formula'

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
const formula = () => within(form()).getByRole('textbox', { name: 'Formül' })
const rollButton = () => within(form()).getByRole('button', { name: 'At' })
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
  it('mixes dice and a fixed number typed at the end of the formula', async () => {
    const user = userEvent.setup()
    renderDice()

    await user.click(dieButton('d20'))
    await user.click(dieButton('d6'))
    await user.click(dieButton('d6'))
    expect(formula()).toHaveValue('1d20 + 2d6')
    await user.type(formula(), ' + 3')

    expect(formula()).toHaveValue('1d20 + 2d6 + 3')
  })

  it('sets a count typed on a chip, and takes a die type away with its "×"', async () => {
    const user = userEvent.setup()
    renderDice()

    await user.click(dieButton('d6'))
    const count = within(form()).getByRole('textbox', { name: 'd6 sayısı' })
    await user.clear(count)
    await user.type(count, '40')
    expect(formula()).toHaveValue('40d6')

    await user.clear(formula())
    await user.type(formula(), '1d20+40d6+5')
    await user.click(within(form()).getByRole('button', { name: 'd6 çıkar' }))
    expect(formula()).toHaveValue('1d20 + 5')
  })

  it('takes the die type away when its chip is left empty', async () => {
    const user = userEvent.setup()
    renderDice()
    await user.type(formula(), '2d6+1d8')
    await user.clear(within(form()).getByRole('textbox', { name: 'd6 sayısı' }))
    await user.tab()
    expect(formula()).toHaveValue('1d8')
  })

  it('disables "At" without dice, and with only a fixed number', async () => {
    const user = userEvent.setup()
    renderDice()
    expect(rollButton()).toBeDisabled()
    await user.type(formula(), '5')
    expect(formula()).toHaveAttribute('aria-invalid', 'false')
    expect(rollButton()).toBeDisabled()
  })

  it('adds a selected die to the last part (spec: "A die control with parts")', async () => {
    const user = userEvent.setup()
    renderDice()
    await user.type(formula(), '1d20 + 5; 1d6')
    await user.click(dieButton('d6'))
    expect(formula()).toHaveValue('1d20 + 5; 2d6')
  })

  it('shows the chips of the last part, labelled "Son parça" (spec: "The chips with parts")', async () => {
    const user = userEvent.setup()
    renderDice()
    await user.type(formula(), '1d20 + 5; 2d6 + 3')
    expect(within(form()).getByText('Son parça')).toBeInTheDocument()
    expect(within(form()).getByRole('textbox', { name: 'd6 sayısı' })).toHaveValue('2')
    expect(within(form()).queryByRole('textbox', { name: 'd20 sayısı' })).not.toBeInTheDocument()

    await user.click(within(form()).getByRole('button', { name: 'd6 çıkar' }))
    expect(formula()).toHaveValue('1d20 + 5; 3')
  })

  it('caps a chip on the last part by the dice of the other parts', async () => {
    const user = userEvent.setup()
    renderDice()
    await user.type(formula(), '40d6; 1d8')
    const count = within(form()).getByRole('textbox', { name: 'd8 sayısı' })
    await user.clear(count)
    await user.type(count, '30')
    expect(formula()).toHaveValue('40d6; 20d8')
  })

  it('shows no "Son parça" with one part', async () => {
    const user = userEvent.setup()
    renderDice()
    await user.type(formula(), '1d20 + 2d6')
    expect(within(form()).queryByText('Son parça')).not.toBeInTheDocument()
  })

  it('keeps the first 80 characters of a long note', async () => {
    const user = userEvent.setup()
    renderDice()
    const note = within(form()).getByLabelText('Not')
    await user.type(note, 'x'.repeat(100))
    expect(note).toHaveValue('x'.repeat(80))
  })
})

describe('a typed formula', () => {
  it('rolls a typed big roll with its fixed number', async () => {
    const user = userEvent.setup()
    const roll = vi.fn<DiceActions['roll']>(() => Promise.resolve(testRoll()))
    renderDice({ dice: { actions: { roll } } })

    await user.type(formula(), '40d6+5')
    await user.click(rollButton())

    expect(roll).toHaveBeenCalledWith(
      expect.objectContaining({
        parts: [{ counts: { ...emptyCounts(), d6: 40 }, modifier: 5, modifierSum: null }],
      }),
    )
  })

  it('writes the canonical formula when the field is left', async () => {
    const user = userEvent.setup()
    renderDice()
    const leave = async (text: string) => {
      await user.clear(formula())
      await user.type(formula(), text)
      await user.tab()
      return formula()
    }

    expect(await leave('2d6+3d6')).toHaveValue('5d6')
    expect(await leave('D20+4')).toHaveValue('1d20 + 4')
    expect(await leave('d%')).toHaveValue('1d100')
    expect(await leave('5+2d6+d20')).toHaveValue('1d20 + 2d6 + 5')
    expect(await leave('5+1d20+3')).toHaveValue('1d20 + 5 + 3')
    expect(await leave(' -2 - 3 + 1d6 ')).toHaveValue('1d6 − 2 − 3')
    expect(await leave('1d20+5+10-4')).toHaveValue('1d20 + 5 + 10 − 4')
  })

  it('keeps the text as typed while the user types', async () => {
    const user = userEvent.setup()
    renderDice()
    await user.type(formula(), '2d6+')
    expect(formula()).toHaveValue('2d6+')
  })

  it('rewrites the formula when a die is selected after typing', async () => {
    const user = userEvent.setup()
    renderDice()
    await user.type(formula(), '2d6+5')
    await user.click(dieButton('d20'))
    expect(formula()).toHaveValue('1d20 + 2d6 + 5')
  })

  it('takes the fixed number as a sum, and rolls with its total and the numbers as written', async () => {
    const user = userEvent.setup()
    const roll = vi.fn<DiceActions['roll']>(() => Promise.resolve(testRoll()))
    renderDice({ dice: { actions: { roll } } })

    await user.type(formula(), '1d20+5+10-4')
    await user.click(rollButton())

    expect(roll).toHaveBeenCalledWith(
      expect.objectContaining({
        parts: [expect.objectContaining({ modifier: 11, modifierSum: '5+10-4' })],
      }),
    )
  })

  it('writes parts in canonical form, each on its own (spec: "Parts in canonical form")', async () => {
    const user = userEvent.setup()
    renderDice()
    const leave = async (text: string) => {
      await user.clear(formula())
      await user.type(formula(), text)
      await user.tab()
      return formula()
    }
    expect(await leave('d20+5;d4+9+d20')).toHaveValue('1d20 + 5; 1d20 + 1d4 + 9')
    expect(await leave('2d6; 3d6')).toHaveValue('2d6; 3d6')
  })

  it('ignores a trailing ";", and drops it when the field is left', async () => {
    const user = userEvent.setup()
    renderDice()
    await user.type(formula(), 'd20+5;')
    expect(formula()).toHaveAttribute('aria-invalid', 'false')
    expect(rollButton()).toBeEnabled()
    await user.tab()
    expect(formula()).toHaveValue('1d20 + 5')
  })

  it('rolls an attack and its damage as one roll of two parts (spec: "An attack and its damage")', async () => {
    const user = userEvent.setup()
    const roll = vi.fn<DiceActions['roll']>(() => Promise.resolve(testRoll()))
    renderDice({ dice: { actions: { roll } } })

    await user.type(formula(), 'd20+5;d4+9+d20')
    await user.click(rollButton())

    expect(roll).toHaveBeenCalledTimes(1)
    expect(roll).toHaveBeenCalledWith(
      expect.objectContaining({
        parts: [
          { counts: { ...emptyCounts(), d20: 1 }, modifier: 5, modifierSum: null },
          { counts: { ...emptyCounts(), d20: 1, d4: 1 }, modifier: 9, modifierSum: null },
        ],
        mode: 'normal',
      }),
    )
  })
})

describe('an invalid formula', () => {
  it('marks a sum left open, explains it, and disables "At" until it is fixed', async () => {
    const user = userEvent.setup()
    renderDice()

    await user.type(formula(), '1d20+4+')
    expect(formula()).toHaveAttribute('aria-invalid', 'true')
    expect(formula()).toHaveAccessibleDescription(/örneğin 1d20\+4\+4-5/)
    expect(rollButton()).toBeDisabled()

    await user.type(formula(), '1')
    expect(formula()).toHaveAttribute('aria-invalid', 'false')
    expect(formula()).not.toHaveAccessibleDescription()
    expect(rollButton()).toBeEnabled()
  })

  it('refuses what is not a formula, and a sum out of range, keeping the text', async () => {
    const user = userEvent.setup()
    renderDice()
    for (const text of ['1d20+4*2', '2d7', '-1d4', '2d20kh1', '1d20+90+20']) {
      await user.clear(formula())
      await user.type(formula(), text)
      expect(formula(), text).toHaveValue(text)
      expect(formula(), text).toHaveAttribute('aria-invalid', 'true')
      expect(rollButton()).toBeDisabled()
    }
  })

  it('says "En fazla 60 zar" for too many dice', async () => {
    const user = userEvent.setup()
    renderDice()
    for (const text of ['61d6', '31d100']) {
      await user.clear(formula())
      await user.type(formula(), text)
      expect(formula()).toHaveAttribute('aria-invalid', 'true')
      expect(formula()).toHaveAccessibleDescription('En fazla 60 zar')
      expect(rollButton()).toBeDisabled()
    }
  })

  it('says "En fazla 60 zar" for too many dice across parts', async () => {
    const user = userEvent.setup()
    renderDice()
    await user.type(formula(), '40d6; 21d6')
    expect(formula()).toHaveAttribute('aria-invalid', 'true')
    expect(formula()).toHaveAccessibleDescription('En fazla 60 zar')
    expect(rollButton()).toBeDisabled()
  })

  it('says "En fazla 4 parça" for a fifth part (spec: "Too many parts")', async () => {
    const user = userEvent.setup()
    renderDice()
    await user.type(formula(), 'd20; d20; d20; d20; d20')
    expect(formula()).toHaveAttribute('aria-invalid', 'true')
    expect(formula()).toHaveAccessibleDescription('En fazla 4 parça')
    expect(rollButton()).toBeDisabled()
  })

  it('refuses an empty part in the middle and a part without a die, with the hint about ";"', async () => {
    const user = userEvent.setup()
    renderDice()
    for (const text of ['d20;;d6', 'd20+5; 5']) {
      await user.clear(formula())
      await user.type(formula(), text)
      expect(formula(), text).toHaveAttribute('aria-invalid', 'true')
      expect(formula(), text).toHaveAccessibleDescription(/; ile ayır: örneğin 1d20\+5; 2d6\+3/)
      expect(rollButton()).toBeDisabled()
    }
  })

  it('checks each part\'s numbers on their own (spec: "Each part\'s own range")', async () => {
    const user = userEvent.setup()
    renderDice()
    await user.type(formula(), 'd20+90; d6+90')
    expect(formula()).toHaveAttribute('aria-invalid', 'false')
    expect(rollButton()).toBeEnabled()
  })

  it('keeps the controls on the last valid formula and disabled while the text is invalid', async () => {
    const user = userEvent.setup()
    renderDice()
    await user.type(formula(), '2d6+')
    expect(dieButton('d20')).toBeDisabled()
    expect(within(form()).getByRole('textbox', { name: 'd6 sayısı' })).toHaveValue('2')
    expect(within(form()).getByRole('button', { name: 'd6 çıkar' })).toBeDisabled()
  })
})

describe('at most sixty dice', () => {
  it('keeps every die enabled with twelve d6', async () => {
    const user = userEvent.setup()
    renderDice()
    await user.type(formula(), '12d6')
    for (const type of ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']) {
      expect(dieButton(type)).toBeEnabled()
    }
    expect(within(form()).queryByText('En fazla 60 zar')).not.toBeInTheDocument()
  })

  it('disables every die and says so with sixty d6', async () => {
    const user = userEvent.setup()
    renderDice()
    await user.type(formula(), '59d6')
    await user.click(dieButton('d6'))

    expect(formula()).toHaveValue('60d6')
    for (const type of ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']) {
      expect(dieButton(type)).toBeDisabled()
    }
    expect(within(form()).getByText('En fazla 60 zar')).toBeInTheDocument()
  })

  it('disables only the d100 with fifty-nine physical dice', async () => {
    const user = userEvent.setup()
    renderDice()
    await user.type(formula(), '59d6')

    expect(dieButton('d100')).toBeDisabled()
    for (const type of ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'])
      expect(dieButton(type)).toBeEnabled()
  })

  it('caps a count typed on a chip to what fits', async () => {
    const user = userEvent.setup()
    renderDice()
    await user.click(dieButton('d20'))
    await user.click(dieButton('d6'))
    const count = within(form()).getByRole('textbox', { name: 'd6 sayısı' })
    await user.clear(count)
    await user.type(count, '70')

    expect(formula()).toHaveValue('1d20 + 59d6')
    await user.tab()
    expect(count).toHaveValue('59')
  })
})

describe('advantage, disadvantage and Gizli', () => {
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

    await user.type(formula(), 'd20+5')
    await user.click(within(form()).getByRole('button', { name: 'Avantaj' }))
    await user.type(within(form()).getByLabelText('Not'), 'Okçuya saldırı')
    await user.click(within(form()).getByRole('button', { name: 'At' }))

    expect(roll).toHaveBeenCalledWith({
      parts: [{ counts: { ...emptyCounts(), d20: 1 }, modifier: 5, modifierSum: null }],
      mode: 'advantage',
      note: 'Okçuya saldırı',
      hidden: false,
    })
  })

  it('disables Avantaj and Dezavantaj with a d20 in each part (spec: "A d20 in each part")', async () => {
    const user = userEvent.setup()
    renderDice()
    await user.type(formula(), '1d20 + 5; 1d20 + 3')
    expect(within(form()).getByRole('button', { name: 'Avantaj' })).toBeDisabled()
    expect(within(form()).getByRole('button', { name: 'Dezavantaj' })).toBeDisabled()
  })

  it('rolls normally when a part is added after choosing Avantaj', async () => {
    const user = userEvent.setup()
    const roll = vi.fn<DiceActions['roll']>(() => Promise.resolve(testRoll()))
    renderDice({ dice: { actions: { roll } } })

    await user.type(formula(), 'd20+5')
    await user.click(within(form()).getByRole('button', { name: 'Avantaj' }))
    await user.type(formula(), '; 2d6')
    await user.click(rollButton())

    expect(roll).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'normal',
        parts: [
          expect.objectContaining({ counts: { ...emptyCounts(), d20: 1 } }),
          expect.objectContaining({ counts: { ...emptyCounts(), d6: 2 } }),
        ],
      }),
    )
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

  /** Gives the channel's box a layout, which jsdom lacks: its heights, and a scroll position the test can read. */
  function layOut(box: HTMLElement, sizes: { scrollHeight: number; clientHeight: number }) {
    let top = 0
    Object.defineProperty(box, 'clientHeight', { configurable: true, value: sizes.clientHeight })
    Object.defineProperty(box, 'scrollHeight', {
      configurable: true,
      get: () => sizes.scrollHeight,
    })
    Object.defineProperty(box, 'scrollTop', {
      configurable: true,
      get: () => top,
      set: (value: number) => {
        top = value
      },
    })
    return {
      scrollTo(value: number) {
        top = value
        act(() => {
          box.dispatchEvent(new Event('scroll'))
        })
      },
      get top() {
        return top
      },
    }
  }

  const fifty = Array.from({ length: 50 }, (_, index) =>
    testRoll({ id: `roll-${index}`, by: index % 2 === 0 ? 'cem' : 'bora' }),
  )

  it('keeps to the newest roll at its end, also when a full channel drops its oldest roll', () => {
    const view = renderDice({ dice: { rolls: fifty } })
    const sizes = { scrollHeight: 5000, clientHeight: 400 }
    const box = layOut(channel().parentElement as HTMLElement, sizes)
    box.scrollTo(4600)

    sizes.scrollHeight = 5100
    view.setDice({ rolls: [...fifty.slice(1), testRoll({ id: 'roll-50', by: 'bora' })] })

    expect(box.top).toBe(5100)
  })

  it('stays where the user was reading when a roll arrives', () => {
    const view = renderDice({ dice: { rolls: fifty } })
    const sizes = { scrollHeight: 5000, clientHeight: 400 }
    const box = layOut(channel().parentElement as HTMLElement, sizes)
    box.scrollTo(1200)

    sizes.scrollHeight = 5100
    view.setDice({ rolls: [...fifty.slice(1), testRoll({ id: 'roll-50', by: 'bora' })] })

    expect(box.top).toBe(1200)
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

  it('shows a roll in parts as one entry with a line for each part (spec: dice-rolls, "A roll in parts")', () => {
    renderDice({
      dice: {
        rolls: [
          testRoll({
            by: 'cem',
            dice: [
              ['d20', 12],
              ['d6', 4],
              ['d6', 6],
            ],
            content: {
              modifier: 0,
              parts: [
                { start: 0, count: 1, modifier: 5, modifierSum: null },
                { start: 1, count: 2, modifier: 3, modifierSum: null },
              ],
            },
          }),
        ],
      },
    })
    const entry = within(channel()).getByRole('listitem', { name: 'Cem atışı' })
    const parts = within(entry).getAllByTestId('roll-part')
    expect(parts).toHaveLength(2)
    expect(parts[0]).toHaveTextContent('1d20 + 5')
    expect(parts[0]).toHaveTextContent('Toplam: 17')
    expect(parts[1]).toHaveTextContent('2d6 + 3')
    expect(parts[1]).toHaveTextContent('Toplam: 13')
  })

  it("marks only the part whose d20 is natural, and borders that part's line", () => {
    renderDice({
      dice: {
        rolls: [
          testRoll({
            by: 'bora',
            dice: [
              ['d20', 20],
              ['d20', 20],
              ['d4', 3],
            ],
            content: {
              modifier: 0,
              parts: [
                { start: 0, count: 1, modifier: 5, modifierSum: null },
                { start: 1, count: 2, modifier: 9, modifierSum: null },
              ],
            },
          }),
        ],
      },
    })
    const entry = within(channel()).getByRole('listitem', { name: 'Bora atışı' })
    const [first, second] = within(entry).getAllByTestId('roll-part')
    expect(within(first as HTMLElement).getByText('Nat 20')).toBeInTheDocument()
    expect(first).toHaveClass('border-gold')
    expect(second).not.toHaveTextContent('Nat 20')
    expect(second).not.toHaveClass('border-gold')
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

  it('shows a hidden roll in parts to the DM with both parts, and to a player as "DM gizli zar attı"', () => {
    const content = {
      modifier: 0,
      parts: [
        { start: 0, count: 1, modifier: 5, modifierSum: null },
        { start: 1, count: 2, modifier: 0, modifierSum: null },
      ],
    }
    const dice: [RolledDie['t'], number][] = [
      ['d20', 14],
      ['d6', 2],
      ['d6', 5],
    ]
    const view = renderDice({
      users: { currentProfile: ready(DM), profiles: PROFILES },
      dice: { rolls: [testRoll({ by: 'dm-1', hidden: true, dice, content })] },
    })
    const entry = within(channel()).getByRole('listitem', { name: 'Dana atışı' })
    expect(entry).toHaveTextContent('Gizli')
    expect(
      within(entry)
        .getAllByTestId('roll-part')
        .map((part) => part.textContent),
    ).toEqual([expect.stringContaining('Toplam: 19'), expect.stringContaining('Toplam: 7')])
    view.unmount()

    renderDice({ dice: { rolls: [testHiddenRoll()] } })
    expect(within(channel()).getByRole('listitem', { name: 'Dana atışı' })).toHaveTextContent(
      'DM gizli zar attı',
    )
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

  it('lists "Zarları 3D göster" last under "Bu cihazda", on by default, and keeps it off on the device', async () => {
    const user = userEvent.setup()
    renderDice()
    const dialog = await openSettings(user)
    const settings = within(
      within(dialog).getByRole('region', { name: 'Bu cihazda' }),
    ).getAllByRole('checkbox')
    expect(settings.map((box) => box.closest('label')?.textContent)).toEqual([
      'Atışları göster',
      'Zar sesi',
      'Nat 20 / Nat 1 sesi',
      'Zarları 3D göster',
    ])
    const show3d = within(dialog).getByRole('checkbox', { name: 'Zarları 3D göster' })
    expect(show3d).toBeChecked()

    await user.click(show3d)
    expect(show3d).not.toBeChecked()
    expect(window.localStorage.getItem('lcm.dice.3d')).toBe('0')
  })

  it('plays the natural sounds by default, and keeps them off on the device', async () => {
    const user = userEvent.setup()
    renderDice()
    const dialog = await openSettings(user)
    const natural = within(dialog).getByRole('checkbox', { name: 'Nat 20 / Nat 1 sesi' })
    expect(natural).toBeChecked()

    await user.click(natural)
    expect(natural).not.toBeChecked()
    expect(window.localStorage.getItem('lcm.dice.natural')).toBe('0')
  })

  it('closes with Escape', async () => {
    const user = userEvent.setup()
    renderDice()
    const dialog = (await openSettings(user)) as HTMLDialogElement
    act(() => dialog.close())
    expect(screen.queryByRole('dialog', { name: 'Zar ayarları' })).not.toBeInTheDocument()
  })
})
