import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { testPictureUrl } from '@/test/artFixtures'
import { ONLY_FROM_DM, testCard } from '@/test/cardFixtures'
import { ready, testProfile } from '@/test/fixtures'
import { stubPhoneWidth } from '@/test/media'
import { renderApp } from '@/test/renderApp'
import { TEST_SETS, testSetByCode } from '@/test/setFixtures'

import type { SetActions } from './setsContext'

const dm = testProfile({ role: 'dm', displayName: 'Dana' })
const player = testProfile()

/** Kesqer: 2 active cards, a draft and an active DM-only card. */
const CARDS = [
  testCard('K One', { setCode: 'Kesqer' }),
  testCard('K Two', { setCode: 'Kesqer' }),
  testCard('K Draft', { setCode: 'Kesqer', status: 'draft' }),
  testCard('K Secret', { setCode: 'Kesqer', ...ONLY_FROM_DM }),
  testCard('Nigh', { setCode: 'The End Is Nigh' }),
]

function renderSets({
  viewer = dm,
  actions,
  sets = TEST_SETS,
}: { viewer?: typeof dm; actions?: Partial<SetActions>; sets?: typeof TEST_SETS } = {}) {
  return renderApp({
    path: '/sets',
    users: { currentProfile: ready(viewer), profiles: ready([viewer]) },
    cards: { cards: ready(CARDS) },
    sets: { sets: ready([...sets]), actions },
  })
}

const main = () => within(screen.getByRole('main'))
const rowOf = (name: string) => {
  const header = main().getByRole('rowheader', { name: new RegExp(`^${name}`) })
  const row = header.closest('tr')
  if (!row) throw new Error(`No row for ${name}`)
  return within(row)
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('the Setler screen', () => {
  it("lists the sets in the stored order, with the DM's controls", () => {
    renderSets()

    expect(main().getByRole('heading', { level: 1, name: 'Setler' })).toBeInTheDocument()
    expect(main().getByRole('button', { name: '+ Set ekle' })).toBeInTheDocument()
    const names = main()
      .getAllByRole('rowheader')
      .map((header) => header.firstElementChild?.textContent)
    expect(names).toHaveLength(12)
    expect(names[0]).toBe('The End is Nigh')
    expect(names.at(-1)).toBe('Pandemonium')
    expect(
      rowOf('Ragnarök: Nordhallr').getByText('code: Nordhallr · alias: ragnarok, ragnarök'),
    ).toBeInTheDocument()
    expect(rowOf('Pandemonium').getByText('Tek paket + Cursed')).toBeInTheDocument()
    expect(rowOf('The End is Nigh').getByRole('button', { name: /yukarı taşı/ })).toBeDisabled()
    expect(rowOf('The End is Nigh').getByRole('button', { name: /aşağı taşı/ })).toBeEnabled()
    expect(rowOf('Pandemonium').getByRole('button', { name: /aşağı taşı/ })).toBeDisabled()
    expect(rowOf('Kesqerian Nights').getByRole('button', { name: /düzenle/ })).toBeInTheDocument()
  })

  it('shows a player the sets without any control', () => {
    renderSets({ viewer: player })

    expect(main().queryByRole('button', { name: '+ Set ekle' })).toBeNull()
    expect(main().queryByRole('button', { name: /taşı|düzenle/ })).toBeNull()
    expect(main().getAllByRole('rowheader')).toHaveLength(12)
  })

  it("counts every card of a set for the DM, and a player's visible ones for a player", () => {
    const { unmount } = renderSets()
    expect(rowOf('Kesqerian Nights').getAllByRole('cell').at(-2)).toHaveTextContent('4')
    expect(rowOf('The End is Nigh').getAllByRole('cell').at(-2)).toHaveTextContent('1')
    unmount()

    renderSets({ viewer: player })
    expect(rowOf('Kesqerian Nights').getAllByRole('cell').at(-1)).toHaveTextContent('2')
  })

  it("shows a set's cardback, or the neutral back without one", () => {
    renderSets({
      sets: TEST_SETS.map((set) =>
        set.code === 'Kesqer' ? { ...set, cardback: 'sets/kesqer/0123456789.webp' } : set,
      ),
    })

    expect(
      rowOf('Kesqerian Nights').getByRole('img', { name: 'Kesqerian Nights cardback' }),
    ).toHaveAttribute('src', testPictureUrl('sets/kesqer/0123456789.webp'))
    expect(rowOf('Ballad of Ulagal').queryByRole('img')).toBeNull()
  })

  it('moves a set up past the set before it', async () => {
    const moveSet = vi.fn<SetActions['moveSet']>(() => Promise.resolve())
    renderSets({ actions: { moveSet } })

    await userEvent
      .setup()
      .click(rowOf('Ballad of Ulagal').getByRole('button', { name: /yukarı taşı/ }))

    expect(moveSet).toHaveBeenCalledWith({
      set: testSetByCode('Ulagal'),
      neighbour: testSetByCode('Havenholm'),
      direction: 'up',
      by: expect.any(String) as string,
    })
  })

  it('says a move needs a connection, and moves nothing offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const moveSet = vi.fn<SetActions['moveSet']>(() => Promise.resolve())
    renderSets({ actions: { moveSet } })

    await userEvent
      .setup()
      .click(rowOf('Ballad of Ulagal').getByRole('button', { name: /yukarı taşı/ }))

    expect(moveSet).not.toHaveBeenCalled()
    expect(main().getByRole('alert')).toHaveTextContent(/internet bağlantısı gerekiyor/)
  })

  it("keeps the DM's hidden İşlemler heading inside the table's scrolling area, so the page never scrolls sideways", () => {
    renderSets()

    expect(main().getByRole('columnheader', { name: 'İşlemler' }).firstElementChild).toHaveClass(
      'sr-only',
    )
    expect(main().getByRole('table').parentElement).toHaveClass('relative', 'overflow-x-auto')
  })

  it('shows each set as a card at phone width, with its controls under it', () => {
    stubPhoneWidth()
    renderSets()

    expect(main().queryByRole('table')).toBeNull()
    const cards = within(main().getByRole('list', { name: 'Setler' })).getAllByRole('listitem')
    expect(cards).toHaveLength(12)
    expect(cards[4]).toHaveTextContent('Kesqerian Nights')
    expect(cards[4]).toHaveTextContent('4 kart')
    expect(
      within(cards[4] as HTMLElement).getByRole('button', { name: /düzenle/ }),
    ).toBeInTheDocument()
  })
})

describe("the set names' links", () => {
  it("opens a set's statistics from its name", async () => {
    const { router } = renderSets({ viewer: player })

    await userEvent
      .setup()
      .click(rowOf('Kesqerian Nights').getByRole('link', { name: 'Kesqerian Nights' }))

    expect(router.state.location.pathname).toBe('/sets/kesqer')
    expect(screen.getByRole('heading', { level: 1, name: 'Kesqerian Nights' })).toBeInTheDocument()
  })

  it("opens a set's statistics from its name at phone width", async () => {
    stubPhoneWidth()
    const { router } = renderSets()

    const cards = within(main().getByRole('list', { name: 'Setler' })).getAllByRole('listitem')
    await userEvent
      .setup()
      .click(within(cards[4] as HTMLElement).getByRole('link', { name: 'Kesqerian Nights' }))

    expect(router.state.location.pathname).toBe('/sets/kesqer')
  })
})
