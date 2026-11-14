import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { testCard } from '@/test/cardFixtures'
import { ready, testProfile } from '@/test/fixtures'
import { renderApp } from '@/test/renderApp'
import { TEST_SETS, testSet, testSetByCode } from '@/test/setFixtures'

import { SetChangedError } from './errors'
import type { CardSet } from './schema'
import type { SetActions } from './setsContext'

const dm = testProfile({ role: 'dm', displayName: 'Dana' })

function setup({
  actions,
  sets = TEST_SETS,
  openPackId = null,
  cards = [testCard('K One', { setCode: 'Kesqer' })],
}: {
  actions?: Partial<SetActions>
  sets?: readonly CardSet[]
  openPackId?: string | null
  cards?: ReturnType<typeof testCard>[]
} = {}) {
  const view = renderApp({
    path: '/sets',
    users: { currentProfile: ready(dm), profiles: ready([dm]) },
    cards: { cards: ready(cards) },
    sets: { sets: ready([...sets]), actions },
    table: { openPackId },
  })
  return { ...view, user: userEvent.setup() }
}

const main = () => within(screen.getByRole('main'))
const dialog = () => within(screen.getByRole('dialog'))
const field = (name: string) => dialog().getByLabelText(name)
const edit = (user: ReturnType<typeof userEvent.setup>, name: string) =>
  user.click(main().getByRole('button', { name: `${name}: düzenle` }))

afterEach(() => {
  vi.restoreAllMocks()
})

describe('adding a set', () => {
  it('adds a set with its code, name, aliases and layout', async () => {
    const addSet = vi.fn<SetActions['addSet']>(() => Promise.resolve('zaddir'))
    const { user } = setup({ actions: { addSet } })

    await user.click(main().getByRole('button', { name: '+ Set ekle' }))
    expect(dialog().getByRole('radio', { name: 'Standart / Premium / Cursed' })).toBeChecked()
    await user.type(field('Code'), 'Zaddir')
    await user.type(field('Ad'), 'Tower of Zaddir')
    await user.type(field("Alias'lar"), 'zaddirs, the tower')
    await user.click(dialog().getByRole('radio', { name: /Tek paket \+ Cursed/ }))
    await user.click(dialog().getByRole('button', { name: 'Kaydet' }))

    expect(addSet).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'Zaddir',
        fields: {
          name: 'Tower of Zaddir',
          aliases: ['zaddirs', 'the tower'],
          packLayout: 'pandemonium',
        },
        cardback: { kind: 'keep' },
        mascot: { kind: 'keep' },
      }),
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('refuses a code that exists, and Blessed', async () => {
    const addSet = vi.fn<SetActions['addSet']>(() => Promise.resolve('x'))
    const { user } = setup({ actions: { addSet } })

    await user.click(main().getByRole('button', { name: '+ Set ekle' }))
    await user.type(field('Code'), 'kesqer')
    await user.type(field('Ad'), 'Another')
    expect(dialog().getByText('Bu kodla bir set zaten var.')).toBeInTheDocument()
    expect(dialog().getByRole('button', { name: 'Kaydet' })).toBeDisabled()

    await user.clear(field('Code'))
    await user.type(field('Code'), 'Blessed')
    expect(dialog().getByText('“Blessed” bir set değil: başka bir kod seç.')).toBeInTheDocument()
    expect(addSet).not.toHaveBeenCalled()
  })

  it('offers a cardback and a Cardmaker picture', async () => {
    const { user } = setup()
    await user.click(main().getByRole('button', { name: '+ Set ekle' }))

    for (const title of ['Cardback', 'Cardmaker']) {
      const section = within(dialog().getByRole('region', { name: title }))
      expect(section.getByRole('button', { name: 'Resim seç' })).toBeInTheDocument()
      expect(section.getByText('Resim yok')).toBeInTheDocument()
    }
  })
})

describe('editing a set', () => {
  it('shows the code fixed, and saves a new name', async () => {
    const saveSet = vi.fn<SetActions['saveSet']>(() => Promise.resolve())
    const { user } = setup({ actions: { saveSet } })

    await edit(user, 'Ballad of Ulagal')
    expect(field('Code')).toHaveValue('Ulagal')
    expect(field('Code')).toHaveAttribute('readonly')
    await user.clear(field('Ad'))
    await user.type(field('Ad'), 'The Ballad of Ulagal')
    await user.click(dialog().getByRole('button', { name: 'Kaydet' }))

    expect(saveSet).toHaveBeenCalledWith(
      expect.objectContaining({
        set: testSetByCode('Ulagal'),
        fields: { name: 'The Ballad of Ulagal', aliases: [], packLayout: 'standard' },
      }),
    )
  })

  it("keeps a set's own spellings, and refuses another set's", async () => {
    const { user } = setup()

    await edit(user, 'Ragnarök: Nordhallr')
    expect(field("Alias'lar")).toHaveValue('ragnarok, ragnarök')
    expect(dialog().getByRole('button', { name: 'Kaydet' })).toBeEnabled()
    await user.type(field("Alias'lar"), ', Kesqer')
    expect(dialog().getByText('Başka bir set bu yazımı kullanıyor: Kesqer.')).toBeInTheDocument()
  })

  it('reloads a set that changed on another device, and says so', async () => {
    const saveSet = vi.fn<SetActions['saveSet']>(() => Promise.reject(new SetChangedError()))
    const ulagal = testSetByCode('Ulagal')
    const { user, setSets } = setup({ actions: { saveSet } })

    await edit(user, 'Ballad of Ulagal')
    await user.clear(field('Ad'))
    await user.type(field('Ad'), 'Mine')
    setSets({
      sets: ready(
        TEST_SETS.map((set) => (set.id === ulagal.id ? { ...set, name: 'Theirs' } : set)),
      ),
      actions: { saveSet },
    })
    await user.click(dialog().getByRole('button', { name: 'Kaydet' }))

    expect(dialog().getByRole('alert')).toHaveTextContent(/başka bir yerde değişti/)
    expect(field('Ad')).toHaveValue('Theirs')
  })

  it('waits for an open pack to change the layout, and still renames', async () => {
    const { user } = setup({ openPackId: 'p-open' })

    await edit(user, 'Ballad of Ulagal')
    expect(dialog().getByText(/paket düzeni değişikliği ve silme/)).toBeInTheDocument()
    await user.click(dialog().getByRole('radio', { name: /Tek paket \+ Cursed/ }))
    expect(dialog().getByRole('button', { name: 'Kaydet' })).toBeDisabled()
    await user.click(dialog().getByRole('radio', { name: 'Standart / Premium / Cursed' }))
    await user.type(field('Ad'), '!')
    expect(dialog().getByRole('button', { name: 'Kaydet' })).toBeEnabled()
  })
})

describe('deleting a set', () => {
  it('refuses a set that cards use, and says how many', async () => {
    const { user } = setup({
      cards: [
        testCard('K One', { setCode: 'Kesqer' }),
        testCard('K Draft', { setCode: 'Kesqer', status: 'draft' }),
      ],
    })

    await edit(user, 'Kesqerian Nights')
    expect(dialog().getByRole('button', { name: 'Sil' })).toBeDisabled()
    expect(dialog().getByText('2 kart bu seti kullanıyor.')).toBeInTheDocument()
  })

  it('deletes an unused set after a confirmation', async () => {
    const deleteSet = vi.fn<SetActions['deleteSet']>(() => Promise.resolve())
    const zaddir = testSet('Zaddir', 'Tower of Zaddir', 13)
    const { user } = setup({ actions: { deleteSet }, sets: [...TEST_SETS, zaddir] })

    await edit(user, 'Tower of Zaddir')
    await user.click(dialog().getByRole('button', { name: 'Sil' }))
    const confirm = within(screen.getByRole('dialog', { name: 'Seti sil' }))
    expect(deleteSet).not.toHaveBeenCalled()
    await user.click(confirm.getByRole('button', { name: 'Sil' }))

    expect(deleteSet).toHaveBeenCalledWith(expect.objectContaining({ set: zaddir, cardCount: 0 }))
  })

  it('waits for an open pack', async () => {
    const zaddir = testSet('Zaddir', 'Tower of Zaddir', 13)
    const { user } = setup({ sets: [...TEST_SETS, zaddir], openPackId: 'p-open' })

    await edit(user, 'Tower of Zaddir')
    expect(dialog().getByRole('button', { name: 'Sil' })).toBeDisabled()
  })
})
