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
/** The text of an element without what is hidden from screen readers, such as a thumbnail's initial. */
function visibleText(element: HTMLElement): string {
  const copy = element.cloneNode(true) as HTMLElement
  copy.querySelectorAll('[aria-hidden="true"]').forEach((hidden) => hidden.remove())
  return copy.textContent
}
/** The character tabs' names, in order. */
const tabs = () =>
  within(main().getByRole('tablist', { name: 'Karakterler' }))
    .queryAllByRole('tab')
    .map(visibleText)
const tab = (name: string) => main().getByRole('tab', { name: new RegExp(`^${name}`) })
const addButton = () => main().queryByRole('button', { name: 'Karakter ekle' })
/** The selected character's view, labelled by its tab. */
const view = (name: string) =>
  within(main().getByRole('tabpanel', { name: new RegExp(`^${name}`) }))

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

  it("shows the hand's active characters as tabs in the order added, and Karakter ekle for their owner", () => {
    setup()

    expect(tabs()).toEqual(['Thorin', 'Kuzgun'])
    expect(addButton()).toBeInTheDocument()
  })

  it("shows another player's characters without Karakter ekle", () => {
    setup({ hand: 'bora' })

    expect(main().getByRole('heading', { name: 'Bora — Karakterler' })).toBeInTheDocument()
    expect(tabs()).toEqual(['Elara'])
    expect(addButton()).not.toBeInTheDocument()
  })

  it("lets the DM add on a player's hand", () => {
    setup({ hand: 'bora', asDm: true })

    expect(tabs()).toEqual(['Elara'])
    expect(addButton()).toBeInTheDocument()
  })

  it('says so when the hand has no characters, with no view', () => {
    setup({ hand: 'bora', characters: [thorin] })

    expect(main().getByText('Henüz karakter yok.')).toBeInTheDocument()
    expect(main().queryByRole('tablist', { name: 'Karakterler' })).not.toBeInTheDocument()
    expect(main().queryByRole('tabpanel', { name: /^Thorin/ })).not.toBeInTheDocument()
  })

  it('offers Karakter ekle to the owner of a hand without characters', () => {
    setup({ characters: [] })

    expect(main().getByText('Henüz karakter yok.')).toBeInTheDocument()
    expect(addButton()).toBeInTheDocument()
  })

  it('shows a character added on another device without a reload, keeping the selection', () => {
    const { setList } = setup({ hand: 'bora' })

    setList([elara, testCharacter('Lyra', 'bora', { addedAtMillis: 9000 })])

    expect(tabs()).toEqual(['Elara', 'Lyra'])
    expect(tab('Elara')).toHaveAttribute('aria-selected', 'true')
  })

  it("shows the photo, or the name's first letter when the photo cannot be loaded", () => {
    setup()

    const thorinTab = tab('Thorin')
    const photo = thorinTab.querySelector('img')
    expect(photo).toHaveAttribute('src', `/stored/${thorin.picture}`)
    expect(within(tab('Kuzgun')).getByText('K')).toBeInTheDocument()

    fireEvent.error(photo as HTMLImageElement)

    expect(thorinTab.querySelector('img')).toBeNull()
    expect(within(thorinTab).getByText('T')).toBeInTheDocument()
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

describe("the selected character's view", () => {
  it('shows the first character when the tab opens, with its tab marked', () => {
    stubWideWindow()
    setup()

    expect(tab('Thorin')).toHaveAttribute('aria-selected', 'true')
    expect(tab('Kuzgun')).toHaveAttribute('aria-selected', 'false')
    expect(view('Thorin').getByRole('heading', { name: 'Thorin' })).toBeInTheDocument()
    expect(view('Thorin').getByRole('img', { name: 'Thorin' })).toBeInTheDocument()
    expect(view('Thorin').getByText('Sahibi: Ayla')).toBeInTheDocument()
    expect(view('Thorin').getByRole('button', { name: '✎ Düzenle' })).toBeInTheDocument()
  })

  it.each([
    ['a wide window', true],
    ['a narrow window', false],
  ])(
    'switches to the selected tab on %s, with no side panel and no dialog',
    async (_case, isWide) => {
      if (isWide) stubWideWindow()
      const user = userEvent.setup()
      setup()

      await user.click(tab('Kuzgun'))

      expect(tab('Kuzgun')).toHaveAttribute('aria-selected', 'true')
      expect(tab('Thorin')).toHaveAttribute('aria-selected', 'false')
      expect(view('Kuzgun').getByRole('heading', { name: 'Kuzgun' })).toBeInTheDocument()
      expect(main().queryByRole('region', { name: 'Seçili Karakter' })).not.toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    },
  )

  it('offers no editing controls to another player', () => {
    setup({ hand: 'bora' })

    expect(view('Elara').getByText('Sahibi: Bora')).toBeInTheDocument()
    expect(view('Elara').queryByRole('button', { name: '✎ Düzenle' })).not.toBeInTheDocument()
    expect(view('Elara').queryByRole('button', { name: 'Arşivle' })).not.toBeInTheDocument()
  })

  it('archives the character', async () => {
    const user = userEvent.setup()
    const { fakes } = setup()

    await user.click(tab('Kuzgun'))
    await user.click(view('Kuzgun').getByRole('button', { name: 'Arşivle' }))

    expect(fakes.setCharacterArchived).toHaveBeenCalledWith(kuzgun.id, true)
  })

  it('shows the first character once the selected one is archived on another device', async () => {
    const user = userEvent.setup()
    const { setList } = setup()

    await user.click(tab('Kuzgun'))
    setList([thorin, { ...kuzgun, archived: true }, old, elara])

    expect(tabs()).toEqual(['Thorin'])
    expect(tab('Thorin')).toHaveAttribute('aria-selected', 'true')
    expect(view('Thorin').getByRole('heading', { name: 'Thorin' })).toBeInTheDocument()
  })

  describe('the sheet link', () => {
    const SHEET = 'https://docs.google.com/document/d/abc'
    const sheetLink = (name: string) =>
      view(name).queryByRole('link', { name: '📄 Karakter kağıdı (yeni sekmede açılır)' })

    it("shows another player's sheet link, opening in a new tab, with its site", () => {
      setup({ hand: 'bora', characters: [{ ...elara, sheetUrl: SHEET }] })

      const link = sheetLink('Elara')
      expect(link).toHaveAttribute('href', SHEET)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link?.getAttribute('rel')?.split(' ')).toEqual(
        expect.arrayContaining(['noopener', 'noreferrer']),
      )
      expect(view('Elara').getByText('· docs.google.com', { exact: false })).toBeInTheDocument()
      expect(view('Elara').queryByRole('button', { name: '✎ Düzenle' })).not.toBeInTheDocument()
    })

    it('shows no sheet link for a character without one', async () => {
      const user = userEvent.setup()
      setup({ characters: [{ ...thorin, sheetUrl: SHEET }, kuzgun] })

      await user.click(tab('Kuzgun'))

      expect(sheetLink('Kuzgun')).not.toBeInTheDocument()
      expect(view('Kuzgun').queryByText(/Karakter kağıdı/)).not.toBeInTheDocument()
    })

    it('shows a link added on another device without a reload', () => {
      const { setList } = setup({ characters: [thorin, kuzgun] })
      expect(sheetLink('Thorin')).not.toBeInTheDocument()

      setList([{ ...thorin, sheetUrl: SHEET }, kuzgun])

      expect(sheetLink('Thorin')).toHaveAttribute('href', SHEET)
    })
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
      sheetUrl: null,
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('edits a character and removes its photo', async () => {
    const user = userEvent.setup()
    const { fakes } = setup()

    await user.click(view('Thorin').getByRole('button', { name: '✎ Düzenle' }))
    await user.clear(dialog().getByLabelText('Ad'))
    await user.type(dialog().getByLabelText('Ad'), 'Thorin Oakenshield')
    await user.click(dialog().getByRole('button', { name: 'Resmi kaldır' }))
    await user.click(dialog().getByRole('button', { name: 'Kaydet' }))

    expect(fakes.saveCharacter).toHaveBeenCalledWith({
      character: thorin,
      name: 'Thorin Oakenshield',
      picture: { kind: 'remove' },
      sheetUrl: null,
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

  it('selects a character just added once it shows, offline at once', async () => {
    const user = userEvent.setup()
    const addCharacter = vi.fn(() => new Promise<string>(() => undefined))
    const { setList } = setup({ actions: { addCharacter } })

    await user.click(tab('Kuzgun'))
    await user.click(main().getByRole('button', { name: 'Karakter ekle' }))
    await user.type(dialog().getByLabelText('Ad'), 'Lyra')
    await user.click(dialog().getByRole('button', { name: 'Kaydet' }))

    expect(tab('Kuzgun')).toHaveAttribute('aria-selected', 'true')

    // The queued write shows in the local cache.
    setList([thorin, kuzgun, old, elara, testCharacter('Lyra', ayla.id, { addedAtMillis: 9000 })])

    expect(tabs()).toEqual(['Thorin', 'Kuzgun', 'Lyra'])
    expect(tab('Lyra')).toHaveAttribute('aria-selected', 'true')
    expect(view('Lyra').getByRole('heading', { name: 'Lyra' })).toBeInTheDocument()
  })

  it('keeps the selection when the form is closed without saving', async () => {
    const user = userEvent.setup()
    const { setList } = setup()

    await user.click(main().getByRole('button', { name: 'Karakter ekle' }))
    await user.click(dialog().getByRole('button', { name: 'Vazgeç' }))
    setList([thorin, kuzgun, old, elara, testCharacter('Lyra', ayla.id, { addedAtMillis: 9000 })])

    expect(tab('Thorin')).toHaveAttribute('aria-selected', 'true')
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

  describe('the sheet link', () => {
    const SHEET = 'https://docs.google.com/document/d/abc'
    const sheetField = () => dialog().getByLabelText('Karakter kağıdı linki')
    const linkedThorin = { ...thorin, sheetUrl: SHEET }

    it('adds a character with a link typed without its start', async () => {
      const user = userEvent.setup()
      const { fakes } = setup()

      await user.click(main().getByRole('button', { name: 'Karakter ekle' }))
      await user.type(dialog().getByLabelText('Ad'), 'Lyra')
      expect(sheetField()).toHaveValue('')
      expect(sheetField()).toHaveAccessibleDescription(
        'İsteğe bağlı. Örneğin Google Docs ya da Myth-Weavers linki.',
      )
      await user.type(sheetField(), 'docs.google.com/document/d/abc')
      await user.click(dialog().getByRole('button', { name: 'Kaydet' }))

      expect(fakes.addCharacter).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Lyra', sheetUrl: SHEET }),
      )
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('shows the stored link, and removes it when emptied', async () => {
      const user = userEvent.setup()
      const { fakes } = setup({ characters: [linkedThorin, kuzgun] })

      await user.click(view('Thorin').getByRole('button', { name: '✎ Düzenle' }))
      expect(sheetField()).toHaveValue(SHEET)
      await user.clear(sheetField())
      await user.click(dialog().getByRole('button', { name: 'Kaydet' }))

      expect(fakes.saveCharacter).toHaveBeenCalledWith({
        character: linkedThorin,
        name: 'Thorin',
        picture: { kind: 'keep' },
        sheetUrl: null,
      })
    })

    it.each([
      ['javascript:alert(1)', 'Link http:// ya da https:// ile başlamalı.'],
      ['https://', 'Bu geçerli bir link değil.'],
    ])('refuses %j with a message, keeping the text', async (text, message) => {
      const user = userEvent.setup()
      const { fakes } = setup()

      await user.click(view('Thorin').getByRole('button', { name: '✎ Düzenle' }))
      await user.type(sheetField(), text)
      await user.click(dialog().getByRole('button', { name: 'Kaydet' }))

      expect(sheetField()).toHaveValue(text)
      expect(sheetField()).toHaveAttribute('aria-invalid', 'true')
      expect(sheetField()).toHaveAccessibleDescription(expect.stringContaining(message))
      expect(fakes.saveCharacter).not.toHaveBeenCalled()

      await user.type(sheetField(), 'x')
      expect(dialog().queryByText(message)).not.toBeInTheDocument()
      expect(sheetField()).not.toHaveAttribute('aria-invalid')
    })

    it('checks the name and the link in one save', async () => {
      const user = userEvent.setup()
      const { fakes } = setup()

      await user.click(main().getByRole('button', { name: 'Karakter ekle' }))
      await user.type(sheetField(), 'mailto:a@b.c')
      await user.click(dialog().getByRole('button', { name: 'Kaydet' }))

      expect(dialog().getByText('Karakterin bir adı olmalı.')).toBeInTheDocument()
      expect(dialog().getByText('Link http:// ya da https:// ile başlamalı.')).toBeInTheDocument()
      expect(fakes.addCharacter).not.toHaveBeenCalled()
    })

    it('saves a link offline at once, without waiting', async () => {
      const user = userEvent.setup()
      const saveCharacter = vi.fn(() => new Promise<void>(() => undefined))
      setup({ actions: { saveCharacter } })
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

      await user.click(view('Thorin').getByRole('button', { name: '✎ Düzenle' }))
      await user.type(sheetField(), SHEET)
      await user.click(dialog().getByRole('button', { name: 'Kaydet' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(saveCharacter).toHaveBeenCalledWith(expect.objectContaining({ sheetUrl: SHEET }))
    })
  })
})
