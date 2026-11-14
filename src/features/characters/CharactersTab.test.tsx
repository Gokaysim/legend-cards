import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PreparedPicture } from '@/features/definitions/picture'
import type * as PictureModule from '@/features/definitions/picture'
import { testCharacter } from '@/test/characterFixtures'
import { ready, testProfile, testUser } from '@/test/fixtures'
import { stubWideWindow } from '@/test/media'
import { renderApp } from '@/test/renderApp'
import type { TestCharacters } from '@/test/TestCharactersProvider'

import type { CharacterActions } from './charactersContext'
import type { Character } from './schema'

// jsdom has no canvas: the form's photo preparation is a fake here, and object URLs are made up.
const preparePicture = vi.hoisted(() =>
  vi.fn<(file: Blob, ...rest: unknown[]) => Promise<PreparedPicture>>(),
)
vi.mock('@/features/definitions/picture', async (importOriginal) => ({
  ...(await importOriginal<typeof PictureModule>()),
  preparePicture,
}))

const PREPARED: PreparedPicture = {
  blob: new Blob(['webp'], { type: 'image/webp' }),
  hash: 'abcdef0123',
  width: 600,
  height: 800,
}

/** The signed-in user is Ayla, a player, unless a test signs in as the DM. */
const ayla = testProfile({ id: testUser.uid, displayName: 'Ayla' })
const bora = testProfile({ id: 'bora', displayName: 'Bora' })
const dm = testProfile({ id: testUser.uid, displayName: 'Dana', role: 'dm' })

const thorin = testCharacter('Thorin', ayla.id, { addedAtMillis: 1000, withPhoto: true })
const kuzgun = testCharacter('Kuzgun', ayla.id, { addedAtMillis: 2000 })
const old = testCharacter('Old', ayla.id, { addedAtMillis: 500, archived: true })
const elara = testCharacter('Elara', 'bora', { addedAtMillis: 1500 })

const main = () => within(screen.getByRole('main'))
const tiles = () =>
  within(main().getByRole('list', { name: 'Karakterler' }))
    .queryAllByRole('button')
    .map((tile) => tile.lastElementChild?.textContent)

beforeEach(() => {
  preparePicture.mockResolvedValue(PREPARED)
  Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function setup({
  hand = ayla.id,
  asDm = false,
  characters = [thorin, kuzgun, old, elara],
  actions = {},
}: {
  hand?: string
  asDm?: boolean
  characters?: Character[]
  actions?: Partial<CharacterActions>
} = {}) {
  const fakes: CharacterActions = {
    addCharacter: vi.fn(() => Promise.resolve('NewCharacter01234567')),
    saveCharacter: vi.fn(() => Promise.resolve()),
    setCharacterArchived: vi.fn(() => Promise.resolve()),
    addEffect: vi.fn(() => Promise.resolve()),
    removeEffect: vi.fn(() => Promise.resolve()),
    ...actions,
  }
  const me = asDm ? dm : ayla
  const data = (list: Character[]): TestCharacters => ({ characters: ready(list), actions: fakes })
  const view = renderApp({
    path: `/hands/${hand}?tab=characters`,
    users: { currentProfile: ready(me), profiles: ready([me, bora]) },
    characters: data(characters),
  })
  return { ...view, fakes, setList: (list: Character[]) => view.setCharacters(data(list)) }
}

describe('the Karakterler tab', () => {
  it('opens from its URL, as after a reload, headed with whose characters they are', () => {
    setup()

    expect(main().getByRole('tab', { name: '🧝 Karakterler' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(main().getByRole('heading', { name: 'Ayla — Karakterler' })).toBeInTheDocument()
    expect(main().getByRole('region', { name: 'Oyuncu notu' })).toBeInTheDocument()
  })

  it('keeps the tab in the URL', async () => {
    const user = userEvent.setup()
    const { router } = renderApp({
      path: `/hands/${ayla.id}`,
      users: { currentProfile: ready(ayla), profiles: ready([ayla]) },
    })

    await user.click(main().getByRole('tab', { name: '🧝 Karakterler' }))

    expect(router.state.location.search).toBe('?tab=characters')
  })

  it("shows the hand's active characters in the order added, and Karakter ekle for their owner", () => {
    setup()

    expect(tiles()).toEqual(['Thorin', 'Kuzgun', 'Karakter ekle'])
  })

  it("shows another player's characters without Karakter ekle", () => {
    setup({ hand: 'bora' })

    expect(main().getByRole('heading', { name: 'Bora — Karakterler' })).toBeInTheDocument()
    expect(tiles()).toEqual(['Elara'])
  })

  it("lets the DM add on a player's hand", () => {
    setup({ hand: 'bora', asDm: true })

    expect(tiles()).toEqual(['Elara', 'Karakter ekle'])
  })

  it('says so when the hand has no characters', () => {
    setup({ hand: 'bora', characters: [thorin] })

    expect(main().getByText('Henüz karakter yok.')).toBeInTheDocument()
  })

  it('shows a character added on another device without a reload', () => {
    const { setList } = setup({ hand: 'bora' })

    setList([elara, testCharacter('Lyra', 'bora', { addedAtMillis: 9000 })])

    expect(tiles()).toEqual(['Elara', 'Lyra'])
  })

  it("shows the photo, or the name's first letter when the photo cannot be loaded", () => {
    setup()
    const list = within(main().getByRole('list', { name: 'Karakterler' }))

    const thorinTile = list.getByRole('button', { name: 'Thorin' })
    const photo = thorinTile.querySelector('img')
    expect(photo).toHaveAttribute('src', `/stored/${thorin.picture}`)
    expect(within(list.getByRole('button', { name: 'Kuzgun' })).getByText('K')).toBeInTheDocument()

    fireEvent.error(photo as HTMLImageElement)

    expect(thorinTile.querySelector('img')).toBeNull()
    expect(within(thorinTile).getByText('T')).toBeInTheDocument()
  })

  it('lists the archived characters, collapsed, with Geri al for the owner', async () => {
    const user = userEvent.setup()
    const { fakes } = setup()

    const archived = main().getByText('Arşivlenen karakterler (1)')
    await user.click(archived)
    await user.click(main().getByRole('button', { name: 'Geri al' }))

    expect(fakes.setCharacterArchived).toHaveBeenCalledWith(old.id, false)
  })

  it('shows no archived list when nothing is archived, and no Geri al for another player', () => {
    setup({ characters: [thorin] })
    expect(main().queryByText(/Arşivlenen karakterler/)).not.toBeInTheDocument()
  })

  it("offers no Geri al on another player's archived characters", () => {
    setup({ hand: 'bora', characters: [testCharacter('Gone', 'bora', { archived: true })] })

    expect(main().getByText('Arşivlenen karakterler (1)')).toBeInTheDocument()
    expect(main().queryByRole('button', { name: 'Geri al' })).not.toBeInTheDocument()
  })
})

describe('the details of a character', () => {
  it('show in the Seçili Karakter panel on a wide window, with the tile marked', async () => {
    stubWideWindow()
    const user = userEvent.setup()
    setup()
    const panel = () => within(main().getByRole('region', { name: 'Seçili Karakter' }))

    expect(panel().getByText('Bir karakter seç')).toBeInTheDocument()

    await user.click(main().getByRole('button', { name: 'Thorin' }))

    expect(main().getByRole('button', { name: 'Thorin' })).toHaveAttribute('aria-pressed', 'true')
    expect(panel().getByText('Sahibi: Ayla')).toBeInTheDocument()
    expect(panel().getByRole('button', { name: '✎ Düzenle' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('open in a dialog on a narrow window', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(main().getByRole('button', { name: 'Kuzgun' }))

    const dialog = within(screen.getByRole('dialog', { name: 'Kuzgun' }))
    expect(dialog.getByText('Sahibi: Ayla')).toBeInTheDocument()
    expect(main().queryByRole('region', { name: 'Seçili Karakter' })).not.toBeInTheDocument()
  })

  it('offer no editing controls to another player', async () => {
    stubWideWindow()
    const user = userEvent.setup()
    setup({ hand: 'bora' })

    await user.click(main().getByRole('button', { name: 'Elara' }))

    const panel = within(main().getByRole('region', { name: 'Seçili Karakter' }))
    expect(panel.getByText('Sahibi: Bora')).toBeInTheDocument()
    expect(panel.queryByRole('button', { name: '✎ Düzenle' })).not.toBeInTheDocument()
    expect(panel.queryByRole('button', { name: 'Arşivle' })).not.toBeInTheDocument()
  })

  it('archive the character and close', async () => {
    stubWideWindow()
    const user = userEvent.setup()
    const { fakes } = setup()

    await user.click(main().getByRole('button', { name: 'Thorin' }))
    await user.click(main().getByRole('button', { name: 'Arşivle' }))

    expect(fakes.setCharacterArchived).toHaveBeenCalledWith(thorin.id, true)
    expect(
      within(main().getByRole('region', { name: 'Seçili Karakter' })).getByText('Bir karakter seç'),
    ).toBeInTheDocument()
  })
})

describe('the character form', () => {
  const dialog = () => within(screen.getByRole('dialog'))
  const photoInput = () => dialog().getByLabelText('Karakter fotoğrafı dosyası')
  const pngFile = () => new File(['png'], 'thorin.png', { type: 'image/png' })

  it('asks for a name', async () => {
    const user = userEvent.setup()
    const { fakes } = setup()

    await user.click(main().getByRole('button', { name: 'Karakter ekle' }))
    await user.type(dialog().getByLabelText('Ad'), '   ')
    await user.click(dialog().getByRole('button', { name: 'Kaydet' }))

    expect(dialog().getByText('Karakterin bir adı olmalı.')).toBeInTheDocument()
    expect(fakes.addCharacter).not.toHaveBeenCalled()
  })

  it('adds a character with a photo, cropped to a portrait', async () => {
    const user = userEvent.setup()
    const { fakes } = setup({ hand: 'bora', asDm: true })

    await user.click(main().getByRole('button', { name: 'Karakter ekle' }))
    await user.type(dialog().getByLabelText('Ad'), 'Lyra')
    await user.upload(photoInput(), pngFile())
    await user.click(dialog().getByRole('button', { name: 'Kaydet' }))

    expect(preparePicture).toHaveBeenCalledWith(
      expect.any(File),
      undefined,
      expect.objectContaining({ aspect: 3 / 4 }),
    )
    expect(fakes.addCharacter).toHaveBeenCalledWith({
      uid: 'bora',
      name: 'Lyra',
      by: testUser.uid,
      picture: { kind: 'new', blob: PREPARED.blob, hash: PREPARED.hash },
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('edits a character and removes its photo', async () => {
    stubWideWindow()
    const user = userEvent.setup()
    const { fakes } = setup()

    await user.click(main().getByRole('button', { name: 'Thorin' }))
    await user.click(main().getByRole('button', { name: '✎ Düzenle' }))
    await user.clear(dialog().getByLabelText('Ad'))
    await user.type(dialog().getByLabelText('Ad'), 'Thorin Oakenshield')
    await user.click(dialog().getByRole('button', { name: 'Resmi kaldır' }))
    await user.click(dialog().getByRole('button', { name: 'Kaydet' }))

    expect(fakes.saveCharacter).toHaveBeenCalledWith({
      character: thorin,
      name: 'Thorin Oakenshield',
      picture: { kind: 'remove' },
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps its fields when a save with a photo fails', async () => {
    const user = userEvent.setup()
    setup({
      actions: {
        addCharacter: () => Promise.reject(Object.assign(new Error('x'), { code: 'unknown' })),
      },
    })

    await user.click(main().getByRole('button', { name: 'Karakter ekle' }))
    await user.type(dialog().getByLabelText('Ad'), 'Lyra')
    await user.upload(photoInput(), pngFile())
    await user.click(dialog().getByRole('button', { name: 'Kaydet' }))

    expect(await dialog().findByRole('alert')).toHaveTextContent('Kaydedilemedi. Tekrar dene.')
    expect(dialog().getByLabelText('Ad')).toHaveValue('Lyra')
    expect(dialog().getByRole('img', { name: 'Lyra' })).toHaveAttribute('src', 'blob:preview')
  })

  it('says a photo needs a connection, and keeps the chosen photo', async () => {
    const user = userEvent.setup()
    const { fakes } = setup()
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

    await user.click(main().getByRole('button', { name: 'Karakter ekle' }))
    await user.type(dialog().getByLabelText('Ad'), 'Lyra')
    await user.upload(photoInput(), pngFile())
    await user.click(dialog().getByRole('button', { name: 'Kaydet' }))

    expect(dialog().getByRole('alert')).toHaveTextContent(
      'Fotoğraf yüklemek için bağlantı gerekiyor.',
    )
    expect(dialog().getByRole('img', { name: 'Lyra' })).toBeInTheDocument()
    expect(fakes.addCharacter).not.toHaveBeenCalled()
  })

  it('saves a name offline at once, without waiting', async () => {
    const user = userEvent.setup()
    const addCharacter = vi.fn(() => new Promise<string>(() => undefined))
    setup({ actions: { addCharacter } })
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

    await user.click(main().getByRole('button', { name: 'Karakter ekle' }))
    await user.type(dialog().getByLabelText('Ad'), 'Lyra')
    await user.click(dialog().getByRole('button', { name: 'Kaydet' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(addCharacter).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Lyra', picture: { kind: 'keep' } }),
    )
  })
})
