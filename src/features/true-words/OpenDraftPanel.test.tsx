import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { ArtManifest } from '@/features/art/schema'
import { TABLE_BUSY_NOTE } from '@/features/table/errors'
import { testPicturePath, testPictureUrl } from '@/test/artFixtures'
import { ready, testProfile, testUser } from '@/test/fixtures'
import { renderApp } from '@/test/renderApp'
import { testLearnedWord, testTrueWord, testWordDraft } from '@/test/trueWordFixtures'

import { WordError } from './errors'
import type { WordDraft } from './schema'
import type { TrueWordActions } from './trueWordsContext'

const ABYSS = testTrueWord('Abyss')
const AID = testTrueWord('Aid')
const DRAGON = testTrueWord('Dragon', { cost: 'X' })
const WORDS = [ABYSS, AID, DRAGON, testTrueWord('Chaos')]

const ayla = testProfile({ displayName: 'Ayla', lp: 2 })
const dm = testProfile({ role: 'dm', displayName: 'Dana' })

function fakeActions() {
  return {
    learnWord: vi.fn<TrueWordActions['learnWord']>(() => Promise.resolve('r-new')),
    skipDraft: vi.fn<TrueWordActions['skipDraft']>(() => Promise.resolve()),
    cancelDraft: vi.fn<TrueWordActions['cancelDraft']>(() => Promise.resolve()),
  }
}

/** Ayla's open draft for 3 LP, showing Abyss, Aid and Dragon. */
const aylasDraft = (overrides: Partial<WordDraft> = {}) =>
  testWordDraft('d1', testUser.uid, [ABYSS, AID, DRAGON], { cost: 3, ...overrides })

/** Renders the True Words screen as `viewer`, for Ayla (the signed-in user's ID), while her draft is open. */
function watch({
  viewer = ayla,
  draft = aylasDraft(),
  knownWords = [],
  table,
  words = WORDS,
  art,
}: {
  viewer?: typeof ayla
  draft?: WordDraft
  knownWords?: ReturnType<typeof testLearnedWord>[]
  table?: { openPackId: string | null }
  words?: typeof WORDS
  art?: ArtManifest
} = {}) {
  const actions = fakeActions()
  const aylaProfile = { ...ayla, id: testUser.uid }
  renderApp({
    path: `/true-words?for=${testUser.uid}`,
    users: {
      currentProfile: ready({ ...viewer, id: testUser.uid }),
      profiles: ready(
        viewer.role === 'dm' ? [aylaProfile, { ...viewer, id: 'dana' }] : [aylaProfile],
      ),
    },
    art,
    trueWords: {
      words: ready(words),
      knownWords: ready(knownWords),
      openDrafts: ready([draft]),
      actions,
    },
    table,
  })
  const panel = within(screen.getByRole('region', { name: "Ayla için açık True Word draft'ı" }))
  return { panel, actions, user: userEvent.setup() }
}

describe('the open draft panel', () => {
  it('shows the 3 words with their payment, and lets the player learn one', async () => {
    const { panel, actions, user } = watch()

    expect(panel.getByText(/Ödeme: 3 LP/)).toBeInTheDocument()
    expect(panel.getAllByRole('article').map((tile) => tile.getAttribute('aria-label'))).toEqual([
      'Abyss',
      'Aid',
      'Dragon',
    ])
    await user.click(panel.getByRole('button', { name: 'Aid: öğren' }))

    expect(actions.learnWord).toHaveBeenCalledWith({
      draftId: 'd1',
      wordId: AID.id,
      by: testUser.uid,
    })
  })

  it('shows a word with its picture in place of its text, with its name, cost and control', () => {
    const picture = testPicturePath('word', ABYSS.id)
    const abyss = {
      ...ABYSS,
      cost: '5',
      text: 'Once per turn a random card of yours is free.',
      picture,
    }
    const { panel } = watch({ words: [abyss, AID, DRAGON] })

    const tile = within(panel.getByRole('article', { name: 'Abyss' }))
    expect(tile.getByRole('img', { name: 'Abyss' })).toHaveAttribute('src', testPictureUrl(picture))
    expect(tile.getByRole('heading', { name: 'Abyss' })).toBeInTheDocument()
    expect(tile.getByText('5 LP')).toBeInTheDocument()
    expect(tile.getByText(/a random card of yours is free/)).toHaveClass('sr-only')
    expect(tile.getByRole('button', { name: 'Abyss: öğren' })).toHaveTextContent('Öğren')
    // A word without a picture keeps its text.
    const aid = within(panel.getByRole('article', { name: 'Aid' }))
    expect(aid.queryByRole('img')).not.toBeInTheDocument()
    expect(aid.getByText('Aid text.')).not.toHaveClass('sr-only')
  })

  it('marks a shown word that the player came to know meanwhile, and does not let it be learned', () => {
    const { panel } = watch({ knownWords: [testLearnedWord('r1', ABYSS, testUser.uid)] })
    const abyss = panel.getByRole('button', { name: 'Abyss: öğren' })
    expect(abyss).toBeDisabled()
    expect(abyss).toHaveTextContent('Zaten biliyor')
  })

  it('asks before skipping, naming the payment that will not come back', async () => {
    const { panel, actions, user } = watch()

    await user.click(panel.getByRole('button', { name: '✕ Pas Geç' }))
    expect(
      panel.getByText('Ödenen 3 LP geri gelmez ve hiçbir True Word öğrenilmez. Pas geçilsin mi?'),
    ).toBeVisible()
    await user.click(panel.getByRole('button', { name: 'Evet, pas geç' }))

    expect(actions.skipDraft).toHaveBeenCalledWith({ draftId: 'd1', by: testUser.uid })
  })

  it('does not offer the player a cancel', () => {
    const { panel } = watch()
    expect(panel.queryByRole('button', { name: 'İptal et ve iade et' })).toBeNull()
  })

  it('lets the DM cancel with a refund, after a confirmation', async () => {
    const { panel, actions, user } = watch({ viewer: dm })

    await user.click(panel.getByRole('button', { name: 'İptal et ve iade et' }))
    expect(
      panel.getByText(
        "Ayla'ya 3 LP iade edilecek. Hiçbir True Word öğrenilmez. Draft iptal edilsin mi?",
      ),
    ).toBeVisible()
    await user.click(panel.getByRole('button', { name: 'Evet, iptal et' }))

    expect(actions.cancelDraft).toHaveBeenCalledWith({ draftId: 'd1', by: testUser.uid })
  })

  it('says a free draft has no refund', async () => {
    const { panel, user } = watch({
      viewer: dm,
      draft: aylasDraft({ by: 'dana', paidWith: 'none', cost: 0, entryId: null }),
    })
    expect(panel.getByText(/Ödeme: ücretsiz/)).toBeInTheDocument()
    await user.click(panel.getByRole('button', { name: 'İptal et ve iade et' }))
    expect(panel.getByText(/Draft ücretsizdi; iade yok\./)).toBeVisible()
  })

  it('lets the DM learn for the player', async () => {
    const { panel, actions, user } = watch({ viewer: dm })
    await user.click(panel.getByRole('button', { name: 'Dragon: öğren' }))
    expect(actions.learnWord).toHaveBeenCalledWith({
      draftId: 'd1',
      wordId: DRAGON.id,
      by: testUser.uid,
    })
  })

  it('disables learning, skipping and cancelling while a pack is open', () => {
    const { panel } = watch({ viewer: dm, table: { openPackId: 'p1' } })
    expect(panel.getByRole('button', { name: 'Abyss: öğren' })).toBeDisabled()
    expect(panel.getByRole('button', { name: '✕ Pas Geç' })).toBeDisabled()
    expect(panel.getByRole('button', { name: 'İptal et ve iade et' })).toBeDisabled()
    expect(panel.getByText(TABLE_BUSY_NOTE)).toBeVisible()
  })

  it('shows a failure in Turkish', async () => {
    const { panel, actions, user } = watch()
    actions.learnWord.mockRejectedValueOnce(new WordError('word-known'))

    await user.click(panel.getByRole('button', { name: 'Aid: öğren' }))

    expect(panel.getByRole('alert')).toHaveTextContent("Ayla bu True Word'ü zaten biliyor.")
  })
})
