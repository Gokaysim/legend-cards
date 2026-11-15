import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Card } from '@/features/cards/schema'
import type { CardSet } from '@/features/sets/schema'
import { testPicturePath, testPictureUrl } from '@/test/artFixtures'
import { startingFlags } from '@/features/definitions/flags'
import { TABLE_BUSY_NOTE } from '@/features/table/errors'
import { ONLY_FROM_DM, testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'
import { ready, testUser } from '@/test/fixtures'
import { TestArtProvider } from '@/test/TestArtProvider'
import { TestAuthProvider } from '@/test/TestAuthProvider'
import { TestCardsProvider } from '@/test/TestCardsProvider'
import { TestDefinitionsProvider } from '@/test/TestDefinitionsProvider'
import { TEST_SETS, testSet } from '@/test/setFixtures'
import { TestSetsProvider } from '@/test/TestSetsProvider'
import { TestTableProvider } from '@/test/TestTableProvider'

import type { CardFields } from './api'
import { HELD_COPY_NOTE } from './BehaviorSection'
import { CardFormDialog } from './CardFormDialog'
import type { DefinitionActions } from './definitionsContext'
import { DefinitionChangedError, PictureTypeError, PictureUnsupportedError } from './errors'
import type * as PictureModule from './picture'
import type { PreparedPicture } from './picture'

// jsdom has no canvas: the form's picture preparation is a fake here, and object URLs are made up.
const preparePicture = vi.hoisted(() =>
  vi.fn<(file: Blob, ...rest: unknown[]) => Promise<PreparedPicture>>(),
)
vi.mock('./picture', async (importOriginal) => ({
  ...(await importOriginal<typeof PictureModule>()),
  preparePicture,
}))

const eyes = testCard("Aboleth's Eyes", { cost: '2' })
const hornswaggle = testCard("Hrolf's Hornswaggle", {
  setCode: 'Havenholm',
  text: '[Uno] Add +10 a d20 roll.',
})
const draft = testCard("Bard's Encore", { status: 'draft', mechanicPack: null })
const retired = testCard('Old Card', { status: 'retired' })
const hex = testCursedCard('Hex')
const halo = testBlessedCard('Halo')
const EYES_PICTURE = testPicturePath('card', 'legend-orbofseeing')
const orb = testCard('Orb of Seeing', { picture: EYES_PICTURE })
const CARDS: Card[] = [eyes, hornswaggle, draft, retired, hex, halo, orb]

/** A picture as `preparePicture` gives it. */
const PREPARED: PreparedPicture = {
  blob: new Blob(['webp'], { type: 'image/webp' }),
  hash: 'abcdef0123',
  width: 563,
  height: 788,
}

beforeEach(() => {
  preparePicture.mockResolvedValue(PREPARED)
  Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() })
})

afterEach(() => {
  vi.restoreAllMocks()
})

function setup({
  deck = 'legend',
  cardId = null,
  cards = CARDS,
  openPackId = null,
  actions = {},
  sets = TEST_SETS,
}: {
  deck?: 'legend' | 'cursed'
  cardId?: string | null
  cards?: Card[]
  openPackId?: string | null
  actions?: Partial<DefinitionActions>
  sets?: readonly CardSet[]
} = {}) {
  const user = userEvent.setup()
  const fakes = {
    addCard: vi.fn<DefinitionActions['addCard']>(() => Promise.resolve('legend-new')),
    saveCard: vi.fn<DefinitionActions['saveCard']>(() => Promise.resolve()),
    setCardStatus: vi.fn<DefinitionActions['setCardStatus']>(() => Promise.resolve()),
    deleteCard: vi.fn<DefinitionActions['deleteCard']>(() => Promise.resolve()),
    ...actions,
  }
  const onClose = vi.fn()
  const tree = (current: Card[], packId: string | null = openPackId) => (
    <TestAuthProvider state={{ status: 'signedIn', user: testUser }}>
      <TestArtProvider>
        <TestSetsProvider sets={ready([...sets])}>
          <TestCardsProvider cards={ready(current)}>
            <TestTableProvider openPackId={packId}>
              <TestDefinitionsProvider actions={fakes}>
                <CardFormDialog deck={deck} cardId={cardId} onClose={onClose} />
              </TestDefinitionsProvider>
            </TestTableProvider>
          </TestCardsProvider>
        </TestSetsProvider>
      </TestArtProvider>
    </TestAuthProvider>
  )
  const view = render(tree(cards))
  return {
    user,
    fakes,
    onClose,
    rerenderWith: (next: Card[]) => view.rerender(tree(next)),
    /** The same cards, with `packId` open or no pack. */
    rerenderPack: (packId: string | null) => view.rerender(tree(cards, packId)),
  }
}

/** Matches the fields of a step that contain these values. */
const fieldsWith = (values: Partial<CardFields>) => expect.objectContaining(values) as CardFields

const dialog = () => within(screen.getByRole('dialog'))
const button = (name: string) => dialog().getByRole('button', { name })
const field = (name: string | RegExp) => dialog().getByLabelText(name)

describe('CardFormDialog: adding', () => {
  it('saves an unfinished card as a draft, and names what publishing still needs', async () => {
    const { user, fakes, onClose } = setup()
    await user.type(field('Kart adı'), "Bard's Song")
    await user.selectOptions(field('Set'), 'Kesqer')
    await user.selectOptions(field('Rarity'), 'common')

    expect(button('Kaydet ve yayınla')).toBeDisabled()
    expect(dialog().getByText('Yayınlamak için doldur: Mechanic Pack, Metin.')).toBeVisible()
    await user.click(button('Kaydet'))

    expect(fakes.addCard).toHaveBeenCalledWith(
      expect.objectContaining({
        publish: false,
        by: testUser.uid,
        fields: {
          kind: 'normal',
          name: "Bard's Song",
          setCode: 'Kesqer',
          cost: null,
          rarity: 'common',
          mechanicPack: null,
          text: '',
          ...startingFlags('normal', ''),
        },
      }),
    )
    expect(onClose).toHaveBeenCalled()
  })

  it('adds a draft only the DM gives with "Sadece DM verebilir", and drops the note when a box is back on', async () => {
    const { user, fakes } = setup()
    await user.type(field('Kart adı'), 'The Last Wish')
    await user.click(button('Sadece DM verebilir'))

    expect(dialog().getByText('Bu kartı yalnızca DM verebilir.')).toBeVisible()
    expect(button('Sadece DM verebilir')).toBeDisabled()
    for (const label of [
      'Listede görünür',
      'Kart çekmede çıkar',
      'Set paketlerinde çıkar',
      'Mechanic paketlerinde çıkar',
    ]) {
      expect(field(label)).not.toBeChecked()
    }
    await user.click(field('Listede görünür'))
    expect(dialog().queryByText('Bu kartı yalnızca DM verebilir.')).toBeNull()
    await user.click(field('Listede görünür'))
    await user.click(button('Kaydet'))

    expect(fakes.addCard).toHaveBeenCalledWith(
      expect.objectContaining({ publish: false, fields: fieldsWith({ ...ONLY_FROM_DM }) }),
    )
  })

  it('adds a complete Cursed card on the Cursed Deck straight to active, without set, rarity or pack', async () => {
    const { user, fakes } = setup({ deck: 'cursed' })
    expect(dialog().queryByLabelText('Set')).toBeNull()
    expect(dialog().queryByLabelText('Mechanic Pack')).toBeNull()
    expect(dialog().queryByLabelText('Tür')).toBeNull()

    await user.type(field('Kart adı'), 'Hollow Bones')
    await user.type(field('Cost'), '1')
    await user.type(field('Metin'), 'Your bones ache.')
    await user.click(button('Kaydet ve yayınla'))

    expect(fakes.addCard).toHaveBeenCalledWith(
      expect.objectContaining({
        publish: true,
        fields: fieldsWith({ kind: 'cursed', cost: '1', text: 'Your bones ache.' }),
      }),
    )
  })

  it('lists the official sets in shop order, with an empty choice', () => {
    setup()
    const sets = within(field('Set'))
      .getAllByRole('option')
      .map((option) => option.textContent)
    expect(sets.slice(0, 4)).toEqual([
      'Seçilmedi',
      'The End is Nigh',
      'Conclave at Pentagon',
      'Rituals in Rhodelen',
    ])
    expect(sets.at(-1)).toBe('Pandemonium')
  })

  it('offers a set added on the Setler screen last, and stores its code', async () => {
    const { user, fakes } = setup({
      sets: [...TEST_SETS, testSet('Zaddir', 'Tower of Zaddir', 13)],
    })
    const options = within(field('Set'))
      .getAllByRole('option')
      .map((option) => option.textContent)
    expect(options.at(-1)).toBe('Tower of Zaddir')
    await user.type(field('Kart adı'), 'Spire Guard')
    await user.selectOptions(field('Set'), 'Tower of Zaddir')
    await user.click(button('Kaydet'))
    expect(fakes.addCard).toHaveBeenCalledWith(
      expect.objectContaining({ fields: fieldsWith({ setCode: 'Zaddir' }) }),
    )
  })

  it('makes a Blessed card without a set or a rarity', async () => {
    const { user, fakes } = setup()
    await user.type(field('Kart adı'), 'New Halo')
    await user.selectOptions(field('Tür'), 'blessed')
    expect(dialog().queryByLabelText('Set')).toBeNull()
    await user.click(button('Kaydet'))
    expect(fakes.addCard).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: fieldsWith({ kind: 'blessed', setCode: null, rarity: null }),
      }),
    )
  })

  it('refuses an empty name, a taken name and a cost over 10 characters', async () => {
    const { user, fakes } = setup()
    expect(dialog().getByText('Kart adı boş olamaz.')).toBeVisible()
    expect(button('Kaydet')).toBeDisabled()

    await user.type(field('Kart adı'), 'aboleths eyes')
    expect(dialog().getByText('Bu adla bir kart zaten var.')).toBeVisible()

    await user.clear(field('Kart adı'))
    await user.type(field('Kart adı'), 'Fresh')
    await user.type(field('Cost'), '12345678901')
    expect(dialog().getByText('Cost en fazla 10 karakter olabilir.')).toBeVisible()
    expect(button('Kaydet')).toBeDisabled()
    expect(fakes.addCard).not.toHaveBeenCalled()
  })

  it('reads a cost of "—" as no cost', async () => {
    const { user, fakes } = setup({ deck: 'cursed' })
    await user.type(field('Kart adı'), 'Hollow Bones')
    await user.type(field('Cost'), '—')
    await user.click(button('Kaydet'))
    expect(fakes.addCard).toHaveBeenCalledWith(
      expect.objectContaining({ fields: fieldsWith({ cost: null }) }),
    )
  })
})

describe('CardFormDialog: editing', () => {
  it('shows the bracket text, and saves an active card with its name kept unique except for itself', async () => {
    const { user, fakes } = setup({ cardId: hornswaggle.id })
    expect(field('Metin')).toHaveValue('[Uno] Add +10 a d20 roll.')
    expect(dialog().queryByLabelText('Tür')).toBeNull()
    expect(dialog().getByText('Yayında')).toBeVisible()

    await user.clear(field('Cost'))
    await user.type(field('Cost'), '3')
    await user.click(button('Kaydet'))

    expect(fakes.saveCard).toHaveBeenCalledWith(
      expect.objectContaining({
        card: hornswaggle,
        publish: false,
        fields: fieldsWith({ cost: '3', text: '[Uno] Add +10 a d20 roll.' }),
      }),
    )
  })

  it('refuses emptying a required field of an active card', async () => {
    const { user } = setup({ cardId: eyes.id })
    await user.clear(field('Metin'))
    expect(dialog().getByText('Yayında bir kart için doldur: Metin.')).toBeVisible()
    expect(button('Kaydet')).toBeDisabled()
  })

  it('retires an active card after a confirmation', async () => {
    const { user, fakes } = setup({ cardId: eyes.id })
    await user.click(button('Kaldır'))
    const confirm = within(screen.getByRole('dialog', { name: 'Kartı kaldır' }))
    await user.click(confirm.getByRole('button', { name: 'Kaldır' }))
    expect(fakes.setCardStatus).toHaveBeenCalledWith({
      card: eyes,
      status: 'retired',
      by: testUser.uid,
    })
  })

  it('brings a retired card back', async () => {
    const { user, fakes } = setup({ cardId: retired.id })
    await user.click(button('Geri al'))
    expect(fakes.setCardStatus).toHaveBeenCalledWith(
      expect.objectContaining({ card: retired, status: 'active' }),
    )
  })

  it('offers the kind for a draft, and publishes it once complete', async () => {
    const { user, fakes } = setup({ cardId: draft.id })
    expect(field('Tür')).toHaveValue('normal')
    expect(button('Yayınla')).toBeDisabled()

    await user.selectOptions(field('Mechanic Pack'), 'Permamancy')
    await user.click(button('Yayınla'))
    expect(fakes.saveCard).toHaveBeenCalledWith(
      expect.objectContaining({
        publish: true,
        fields: fieldsWith({ mechanicPack: 'Permamancy' }),
      }),
    )
  })

  it('deletes a draft after a confirmation', async () => {
    const { user, fakes } = setup({ cardId: draft.id })
    await user.click(button('Sil'))
    const confirm = within(screen.getByRole('dialog', { name: 'Taslağı sil' }))
    await user.click(confirm.getByRole('button', { name: 'Sil' }))
    expect(fakes.deleteCard).toHaveBeenCalledWith({ card: draft, by: testUser.uid })
  })

  it('waits for an open pack for status steps, but lets the DM fix a text', async () => {
    const { user, fakes } = setup({ cardId: eyes.id, openPackId: 'p-open' })
    expect(button('Kaldır')).toBeDisabled()
    expect(dialog().getByText(/Bir Pack açık: yayınlama, kaldırma/)).toBeVisible()

    await user.type(field('Metin'), ' More.')
    await user.click(button('Kaydet'))
    expect(fakes.saveCard).toHaveBeenCalled()
  })

  it('shows a card only the DM gives with its note, and lists it again with one box', async () => {
    const { user, fakes } = setup({
      cardId: eyes.id,
      cards: [...CARDS.filter((card) => card.id !== eyes.id), { ...eyes, ...ONLY_FROM_DM }],
    })
    expect(dialog().getByText('Bu kartı yalnızca DM verebilir.')).toBeVisible()
    await user.click(field('Listede görünür'))
    await user.click(button('Kaydet'))

    expect(fakes.saveCard).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: fieldsWith({ ...ONLY_FROM_DM, isInLibrary: true }),
      }),
    )
  })

  it('turns off a draw flag of an active card, as an edit', async () => {
    const { user, fakes } = setup({ cardId: eyes.id })
    await user.click(field('Kart çekmede çıkar'))
    await user.click(button('Kaydet'))

    expect(fakes.saveCard).toHaveBeenCalledWith(
      expect.objectContaining({ publish: false, fields: fieldsWith({ isInDraws: false }) }),
    )
  })

  it('greys out the pool flags while a pack is open, and still hides the card from the list', async () => {
    const { user, fakes } = setup({ cardId: eyes.id, openPackId: 'p-open' })
    for (const label of [
      'Kart çekmede çıkar',
      'Set paketlerinde çıkar',
      'Mechanic paketlerinde çıkar',
      'Birden fazla elde olabilir',
    ]) {
      expect(field(label)).toBeDisabled()
      expect(field(label)).toHaveAccessibleDescription(TABLE_BUSY_NOTE)
    }
    expect(button('Sadece DM verebilir')).toBeDisabled()
    expect(field('Elde etkili')).toBeEnabled()

    await user.click(field('Listede görünür'))
    await user.click(button('Kaydet'))
    expect(fakes.saveCard).toHaveBeenCalledWith(
      expect.objectContaining({ fields: fieldsWith({ isInLibrary: false }) }),
    )
  })

  it('waits for an open pack to save a pool flag changed before it opened', async () => {
    const { user, rerenderPack } = setup({ cardId: eyes.id })
    await user.click(field('Kart çekmede çıkar'))
    rerenderPack('p-open')

    expect(button('Kaydet')).toBeDisabled()
    expect(dialog().getByText(/Davranış bölümündeki bu değişiklik de bekler/)).toBeVisible()
  })

  it("greys out 'Birden fazla elde olabilir' while someone holds the card's one copy", () => {
    setup({
      cardId: eyes.id,
      cards: [
        ...CARDS.filter((card) => card.id !== eyes.id),
        { ...eyes, holder: { uid: 'bora', userCardId: 'h-bora' } },
      ],
    })
    expect(field('Birden fazla elde olabilir')).toBeDisabled()
    expect(field('Birden fazla elde olabilir')).toHaveAccessibleDescription(HELD_COPY_NOTE)
  })

  it('lets the DM turn off "Birden fazla elde olabilir" of a held Cursed card', async () => {
    const { user, fakes } = setup({ deck: 'cursed', cardId: hex.id })
    expect(field('Birden fazla elde olabilir')).toBeChecked()
    await user.click(field('Birden fazla elde olabilir'))
    await user.click(button('Kaydet'))
    expect(fakes.saveCard).toHaveBeenCalledWith(
      expect.objectContaining({ fields: fieldsWith({ isRepeatable: false }) }),
    )
  })

  it('reloads a card that changed on another device, with a Turkish message', async () => {
    const saveCard = vi.fn<DefinitionActions['saveCard']>(() =>
      Promise.reject(new DefinitionChangedError()),
    )
    const { user, rerenderWith, onClose } = setup({ cardId: eyes.id, actions: { saveCard } })
    const changed = { ...eyes, text: 'From the laptop.' }
    rerenderWith(CARDS.map((card) => (card.id === eyes.id ? changed : card)))

    await user.clear(field('Cost'))
    await user.type(field('Cost'), '5')
    await user.click(button('Kaydet'))

    expect(dialog().getByRole('alert')).toHaveTextContent('başka bir yerde değişti')
    expect(field('Metin')).toHaveValue('From the laptop.')
    expect(field('Cost')).toHaveValue('2')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('does nothing offline, and says why', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    setup({ cardId: eyes.id })
    expect(dialog().getByText('Bağlantı yok: değişiklikler kaydedilemez.')).toBeVisible()
    expect(button('Kaydet')).toBeDisabled()
    expect(button('Kaldır')).toBeDisabled()
    expect(button('Resim seç')).toBeDisabled()
  })
})

describe('CardFormDialog: the Davranış section', () => {
  const behavior = () => within(dialog().getByRole('group', { name: 'Davranış' }))
  const boxes = () =>
    behavior()
      .getAllByRole('checkbox')
      .map((box) => [box.closest('label')?.textContent, (box as HTMLInputElement).checked])

  it("starts a new normal card with its kind's behavior, in two groups of eight boxes", () => {
    setup()
    expect(boxes()).toEqual([
      ['Listede görünür', true],
      ['Kart çekmede çıkar', true],
      ['Set paketlerinde çıkar', true],
      ['Mechanic paketlerinde çıkar', true],
      ['Birden fazla elde olabilir', false],
      ['Elde etkili', false],
      ['Kullanınca efekt bırakır', true],
      ['Kullanınca elde kalır', false],
    ])
    expect(behavior().getByRole('heading', { name: 'Görünürlük ve kanallar' })).toBeVisible()
    expect(behavior().getByRole('heading', { name: 'Sahiplik ve etki' })).toBeVisible()
  })

  it('shows a Cursed card without pack boxes, its draw flag named after the Cursed Deck', () => {
    setup({ deck: 'cursed' })
    expect(boxes()).toEqual([
      ['Listede görünür', true],
      ["Cursed Deck'te çıkar", true],
      ['Birden fazla elde olabilir', true],
      ['Elde etkili', false],
      ['Kullanınca efekt bırakır', true],
      ['Kullanınca elde kalır', false],
    ])
  })

  it('checks "Elde etkili" for a held text until the DM decides', async () => {
    const { user } = setup()
    await user.type(field('Metin'), 'Held: +1 AC.')
    expect(field('Elde etkili')).toBeChecked()

    await user.click(field('Elde etkili'))
    await user.clear(field('Metin'))
    await user.type(field('Metin'), 'Held: +2 AC.')
    expect(field('Elde etkili')).not.toBeChecked()
  })

  it('does not follow the text of a stored card', async () => {
    const { user } = setup({ cardId: eyes.id })
    await user.clear(field('Metin'))
    await user.type(field('Metin'), 'Held: +1 AC.')
    expect(field('Elde etkili')).not.toBeChecked()
  })

  it('starts the flags over when a draft becomes Blessed', async () => {
    const { user, fakes } = setup({ cardId: draft.id })
    await user.click(field('Kart çekmede çıkar'))
    await user.selectOptions(field('Tür'), 'blessed')

    expect(field('Kart çekmede çıkar')).toBeChecked()
    expect(field('Birden fazla elde olabilir')).toBeChecked()
    await user.click(button('Kaydet'))
    expect(fakes.saveCard).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: fieldsWith({ kind: 'blessed', isInDraws: true, isRepeatable: true }),
      }),
    )
  })
})

describe('CardFormDialog: the picture', () => {
  const pictureInput = () => dialog().getByLabelText('Resim dosyası')
  const pngFile = () => new File(['png'], 'bardsencore.png', { type: 'image/png' })
  const preview = (name: string) => dialog().getByRole('img', { name })

  it('adds a card with a chosen picture, shown before it is saved', async () => {
    const { user, fakes } = setup()
    expect(dialog().getByText('Resim yok')).toBeVisible()
    await user.type(field('Kart adı'), "Bard's Song")

    await user.upload(pictureInput(), pngFile())

    expect(preparePicture).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'bardsencore.png' }),
      undefined,
      { width: 563, height: 788 },
    )
    expect(preview("Bard's Song")).toHaveAttribute('src', 'blob:preview')
    expect(dialog().getByText('Kaydedince bu resim yüklenir.')).toBeVisible()
    await user.click(button('Kaydet'))
    expect(fakes.addCard).toHaveBeenCalledWith(
      expect.objectContaining({
        publish: false,
        picture: { kind: 'new', blob: PREPARED.blob, hash: PREPARED.hash },
      }),
    )
  })

  it('saves a card without a picture change as keeping its picture', async () => {
    const { user, fakes } = setup({ cardId: orb.id })
    await user.click(button('Kaydet'))
    expect(fakes.saveCard).toHaveBeenCalledWith(
      expect.objectContaining({ picture: { kind: 'keep' } }),
    )
  })

  it('shows the stored picture, and offers "İndir" for it', () => {
    setup({ cardId: orb.id })
    expect(preview('Orb of Seeing')).toHaveAttribute('src', testPictureUrl(EYES_PICTURE))
    expect(dialog().getByRole('link', { name: 'İndir' })).toHaveAttribute(
      'href',
      testPictureUrl(EYES_PICTURE),
    )
  })

  it('offers no "İndir" or "Resmi kaldır" for a card without a picture', () => {
    setup({ cardId: eyes.id })
    expect(dialog().queryByRole('link', { name: 'İndir' })).toBeNull()
    expect(dialog().queryByRole('button', { name: 'Resmi kaldır' })).toBeNull()
  })

  it('replaces a stored picture, offering no download of the unsaved one', async () => {
    const { user, fakes } = setup({ cardId: orb.id })

    await user.upload(pictureInput(), pngFile())

    expect(preview('Orb of Seeing')).toHaveAttribute('src', 'blob:preview')
    expect(dialog().queryByRole('link', { name: 'İndir' })).toBeNull()
    await user.click(button('Kaydet'))
    expect(vi.mocked(fakes.saveCard).mock.calls[0]?.[0]).toMatchObject({
      card: orb,
      picture: { kind: 'new' },
    })
  })

  it('removes a stored picture with "Resmi kaldır", and "Vazgeç" brings it back', async () => {
    const { user, fakes } = setup({ cardId: orb.id })

    await user.click(button('Resmi kaldır'))
    expect(dialog().getByText('Resim yok')).toBeVisible()
    expect(dialog().getByText('Kaydedince resim kaldırılır.')).toBeVisible()
    await user.click(button('Vazgeç'))
    expect(preview('Orb of Seeing')).toHaveAttribute('src', testPictureUrl(EYES_PICTURE))

    await user.click(button('Resmi kaldır'))
    await user.click(button('Kaydet'))
    expect(fakes.saveCard).toHaveBeenCalledWith(
      expect.objectContaining({ picture: { kind: 'remove' } }),
    )
  })

  it('drops a chosen picture of a new card with "Resmi kaldır"', async () => {
    const { user, fakes } = setup()
    await user.type(field('Kart adı'), "Bard's Song")
    await user.upload(pictureInput(), pngFile())

    await user.click(button('Resmi kaldır'))

    expect(dialog().getByText('Resim yok')).toBeVisible()
    await user.click(button('Kaydet'))
    expect(fakes.addCard).toHaveBeenCalledWith(
      expect.objectContaining({ picture: { kind: 'keep' } }),
    )
  })

  it('changes nothing when closed without saving', async () => {
    const { user, fakes, onClose } = setup({ cardId: orb.id })
    await user.upload(pictureInput(), pngFile())

    // Escape does not close a native dialog in jsdom; closing it fires `close` as Escape would.
    act(() => screen.getByRole<HTMLDialogElement>('dialog').close())

    expect(onClose).toHaveBeenCalled()
    expect(fakes.saveCard).not.toHaveBeenCalled()
  })

  it.each([
    [new PictureTypeError(), 'Yalnızca PNG, JPEG ya da WebP bir resim kullanılabilir.'],
    [
      new PictureUnsupportedError(),
      'Bu tarayıcı resmi hazırlayamıyor. Resim yüklemek için Chrome kullan.',
    ],
  ])('keeps the picture and explains %s', async (error, message) => {
    preparePicture.mockRejectedValue(error)
    const { user, fakes } = setup({ cardId: orb.id })

    await user.upload(pictureInput(), new File(['pdf'], 'rules.pdf', { type: 'image/png' }))

    expect(dialog().getByRole('alert')).toHaveTextContent(message)
    expect(preview('Orb of Seeing')).toHaveAttribute('src', testPictureUrl(EYES_PICTURE))
    await user.click(button('Kaydet'))
    expect(fakes.saveCard).toHaveBeenCalledWith(
      expect.objectContaining({ picture: { kind: 'keep' } }),
    )
  })

  it('drops the chosen picture when the card changed on another device', async () => {
    const changed = { ...orb, text: 'From the laptop.' }
    const { user, fakes, rerenderWith } = setup({
      cardId: orb.id,
      actions: {
        saveCard: vi.fn<DefinitionActions['saveCard']>(() =>
          Promise.reject(new DefinitionChangedError()),
        ),
      },
    })
    await user.upload(pictureInput(), pngFile())
    rerenderWith(CARDS.map((card) => (card.id === orb.id ? changed : card)))

    await user.click(button('Kaydet'))

    expect(fakes.saveCard).toHaveBeenCalled()
    expect(preview('Orb of Seeing')).toHaveAttribute('src', testPictureUrl(EYES_PICTURE))
  })
})
