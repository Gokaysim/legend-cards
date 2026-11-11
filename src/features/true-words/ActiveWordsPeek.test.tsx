import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import { testArt } from '@/test/artFixtures'
import { ready, testProfile } from '@/test/fixtures'
import { renderApp } from '@/test/renderApp'
import { testLearnedWord, testTrueWord } from '@/test/trueWordFixtures'

const AID = testTrueWord('Aid')
const ABYSS = testTrueWord('Abyss', { text: 'A random card is free.' })
const BIND = testTrueWord('Bind', { text: 'Hold a creature in place.' })
const WORDS = [AID, ABYSS, BIND]
const ART = testArt({
  words: { [AID.id]: '/art/words/aid.webp', [ABYSS.id]: '/art/words/abyss.webp' },
})

const ayla = testProfile({ id: 'ayla', displayName: 'Ayla' })

const learned = (id: string, word: typeof AID, millis: number, active: boolean) =>
  testLearnedWord(id, word, 'ayla', { learnedAt: Timestamp.fromMillis(millis), active })

/** Ayla knows Aid, Abyss and Bind, learned in that order; Aid and Bind are active unless said otherwise. */
function renderHand({
  path = '/hands/ayla',
  known = [
    learned('r1', AID, 1000, true),
    learned('r2', ABYSS, 2000, false),
    learned('r3', BIND, 3000, true),
  ],
} = {}) {
  return renderApp({
    path,
    users: { profiles: ready([testProfile(), ayla]) },
    trueWords: { words: ready(WORDS), knownWords: ready(known) },
    art: ART,
  })
}

const strip = () => screen.queryByRole('list', { name: 'Aktif True Words' })
const peeking = () =>
  within(strip()!)
    .getAllByRole('button')
    .map((button) => button.getAttribute('aria-label'))

describe('the active True Words above the hand', () => {
  it('shows only the active words, in the order learned, glowing purple', () => {
    renderHand()

    expect(peeking()).toEqual(['Aid: büyüt', 'Bind: büyüt'])
    expect(within(strip()!).getByRole('button', { name: 'Aid: büyüt' })).toHaveClass(
      'drop-shadow-glow-word-peek',
    )
  })

  it("shows a word's picture, or without one ✦ and its name", () => {
    renderHand()

    const aid = within(strip()!).getByRole('button', { name: 'Aid: büyüt' })
    expect(aid.querySelector('img')).toHaveAttribute('src', '/art/words/aid.webp')
    const bind = within(strip()!).getByRole('button', { name: 'Bind: büyüt' })
    expect(bind.querySelector('img')).toBeNull()
    expect(bind).toHaveTextContent('✦Bind')
  })

  it('follows a word switched off on another device, live', () => {
    const { setTrueWords } = renderHand()

    setTrueWords({
      words: ready(WORDS),
      knownWords: ready([
        learned('r1', AID, 1000, false),
        learned('r2', ABYSS, 2000, false),
        learned('r3', BIND, 3000, true),
      ]),
    })

    expect(peeking()).toEqual(['Bind: büyüt'])
  })

  it('shows nothing above the hand without an active word', () => {
    renderHand({ known: [learned('r2', ABYSS, 2000, false)] })

    expect(strip()).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Ayla — Kart Eli' })).toBeInTheDocument()
  })

  it('stays off the True Words tab', () => {
    renderHand({ path: '/hands/ayla?tab=true-words' })
    expect(strip()).not.toBeInTheDocument()
  })

  it('shows a word large when it is selected, and closes it again', async () => {
    const user = userEvent.setup()
    renderHand()

    await user.click(within(strip()!).getByRole('button', { name: 'Aid: büyüt' }))

    const zoom = screen.getByRole<HTMLDialogElement>('dialog', { name: '✦ Aid' })
    expect(within(zoom).getByRole('img', { name: 'Aid' })).toBeInTheDocument()

    // Escape closes a native dialog, which jsdom does not do by itself.
    act(() => zoom.close())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
