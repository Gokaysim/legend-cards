import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { TrueWord } from '@/features/true-words/schema'
import { testPicturePath, testPictureUrl } from '@/test/artFixtures'
import { ready, testUser } from '@/test/fixtures'
import { TestArtProvider } from '@/test/TestArtProvider'
import { TestAuthProvider } from '@/test/TestAuthProvider'
import { TestDefinitionsProvider } from '@/test/TestDefinitionsProvider'
import { TestTableProvider } from '@/test/TestTableProvider'
import { TestTrueWordsProvider } from '@/test/TestTrueWordsProvider'
import { testTrueWord } from '@/test/trueWordFixtures'

import type { WordFields } from './api'
import type { DefinitionActions } from './definitionsContext'
import { PictureUnsupportedError } from './errors'
import type * as PictureModule from './picture'
import type { PreparedPicture } from './picture'
import { WordFormDialog } from './WordFormDialog'

// jsdom has no canvas: the form's picture preparation is a fake here, and object URLs are made up.
const preparePicture = vi.hoisted(() => vi.fn<(file: Blob) => Promise<PreparedPicture>>())
vi.mock('./picture', async (importOriginal) => ({
  ...(await importOriginal<typeof PictureModule>()),
  preparePicture,
}))

const ABYSS_PICTURE = testPicturePath('word', 'tw-abyss')
const abyss = testTrueWord('Abyss', { cost: '5', picture: ABYSS_PICTURE })
const echo = testTrueWord('Echo', { status: 'draft', cost: null, text: '' })
const WORDS: TrueWord[] = [abyss, echo]

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

function setup(wordId: string | null) {
  const user = userEvent.setup()
  const fakes = {
    addWord: vi.fn<DefinitionActions['addWord']>(() => Promise.resolve('tw-new')),
    saveWord: vi.fn<DefinitionActions['saveWord']>(() => Promise.resolve()),
  }
  render(
    <TestAuthProvider state={{ status: 'signedIn', user: testUser }}>
      <TestArtProvider>
        <TestTrueWordsProvider words={ready(WORDS)}>
          <TestTableProvider openPackId={null}>
            <TestDefinitionsProvider actions={fakes}>
              <WordFormDialog wordId={wordId} onClose={vi.fn()} />
            </TestDefinitionsProvider>
          </TestTableProvider>
        </TestTrueWordsProvider>
      </TestArtProvider>
    </TestAuthProvider>,
  )
  return { user, fakes }
}

const dialog = () => within(screen.getByRole('dialog'))
const button = (name: string) => dialog().getByRole('button', { name })
const pictureInput = () => dialog().getByLabelText('Resim dosyası')
const pngFile = () => new File(['png'], 'twlull.png', { type: 'image/png' })

describe('WordFormDialog: the picture', () => {
  it('adds a word with a chosen picture, previewed before it is saved', async () => {
    const { user, fakes } = setup(null)
    await user.type(dialog().getByLabelText('True Word adı'), 'Lull')
    await user.type(dialog().getByLabelText('Cost'), '2')

    await user.upload(pictureInput(), pngFile())

    expect(dialog().getByRole('img', { name: 'Lull' })).toHaveAttribute('src', 'blob:preview')
    await user.click(button('Kaydet'))
    expect(fakes.addWord).toHaveBeenCalledWith(
      expect.objectContaining({
        picture: { kind: 'new', blob: PREPARED.blob, hash: PREPARED.hash },
      }),
    )
  })

  it('shows a word\'s stored picture with "İndir", and replaces it', async () => {
    const { user, fakes } = setup(abyss.id)
    expect(dialog().getByRole('img', { name: 'Abyss' })).toHaveAttribute(
      'src',
      testPictureUrl(ABYSS_PICTURE),
    )
    expect(dialog().getByRole('link', { name: 'İndir' })).toHaveAttribute(
      'href',
      testPictureUrl(ABYSS_PICTURE),
    )

    await user.upload(pictureInput(), pngFile())
    await user.click(button('Kaydet'))

    expect(fakes.saveWord.mock.calls[0]?.[0]).toMatchObject({
      word: abyss,
      picture: { kind: 'new' },
    })
  })

  it("removes a word's picture", async () => {
    const { user, fakes } = setup(abyss.id)

    await user.click(button('Resmi kaldır'))
    await user.click(button('Kaydet'))

    expect(fakes.saveWord).toHaveBeenCalledWith(
      expect.objectContaining({ picture: { kind: 'remove' } }),
    )
  })

  it('offers no download for a word without a picture, and names Chrome when the browser cannot prepare one', async () => {
    preparePicture.mockRejectedValue(new PictureUnsupportedError())
    const { user } = setup(echo.id)
    expect(dialog().queryByRole('link', { name: 'İndir' })).toBeNull()

    await user.upload(pictureInput(), pngFile())

    expect(dialog().getByRole('alert')).toHaveTextContent('Chrome')
    expect(dialog().getByText('Resim yok')).toBeVisible()
  })

  it('cannot choose a picture offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    setup(abyss.id)
    expect(button('Resim seç')).toBeDisabled()
  })
})

describe('WordFormDialog: the Davranış section', () => {
  const behavior = () => within(dialog().getByRole('group', { name: 'Davranış' }))

  it('shows only the four flags a True Word does not fix, its draw flag named after the draft', () => {
    setup(abyss.id)
    expect(
      behavior()
        .getAllByRole('checkbox')
        .map((box) => box.closest('label')?.textContent),
    ).toEqual(['Listede görünür', "Draft'ta çıkar", 'Elde etkili', 'Kullanınca efekt bırakır'])
  })

  it('makes a word only the DM teaches, and saves it with every "where" flag off', async () => {
    const { user, fakes } = setup(abyss.id)
    await user.click(button('Sadece DM verebilir'))

    expect(dialog().getByText("Bu True Word'ü yalnızca DM öğretebilir.")).toBeVisible()
    await user.click(button('Kaydet'))
    expect(fakes.saveWord).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: expect.objectContaining({
          isInLibrary: false,
          isInDraws: false,
          isInSetPacks: false,
          isInMechanicPacks: false,
          isRepeatable: true,
          isKeptOnUse: true,
        }) as WordFields,
      }),
    )
  })

  it('checks "Elde etkili" for a new word with a held text', async () => {
    const { user } = setup(null)
    await user.type(dialog().getByLabelText('Metin'), 'Held: you glow.')
    expect(dialog().getByLabelText('Elde etkili')).toBeChecked()
  })
})
