import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { testArt } from '@/test/artFixtures'
import { TestArtProvider } from '@/test/TestArtProvider'
import { testTrueWord } from '@/test/trueWordFixtures'

import { TrueWordZoomDialog } from './TrueWordZoomDialog'

const BIND = testTrueWord('Bind', { text: 'Hold a creature in place.' })
const ART = testArt({ words: { [BIND.id]: '/art/words/bind.webp' } })

describe('TrueWordZoomDialog', () => {
  it("shows the word's name and its picture, in the document body", () => {
    render(
      <TestArtProvider manifest={ART}>
        <TrueWordZoomDialog word={BIND} onClose={vi.fn()} />
      </TestArtProvider>,
    )

    const dialog = screen.getByRole('dialog', { name: '✦ Bind' })
    expect(within(dialog).getByRole('img', { name: 'Bind' })).toHaveAttribute(
      'src',
      '/art/words/bind.webp',
    )
    expect(dialog.parentElement).toBe(document.body)
  })

  it('shows the visible text of a word without a picture, and after the picture fails to load', () => {
    render(<TrueWordZoomDialog word={BIND} onClose={vi.fn()} />)
    expect(
      within(screen.getByRole('dialog', { name: '✦ Bind' })).getByText('Hold a creature in place.'),
    ).toBeVisible()
  })

  it('falls back to the text when the picture fails to load', () => {
    render(
      <TestArtProvider manifest={ART}>
        <TrueWordZoomDialog word={BIND} onClose={vi.fn()} />
      </TestArtProvider>,
    )
    fireEvent.error(screen.getByRole('img', { name: 'Bind' }))

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('Hold a creature in place.')).toBeVisible()
  })

  it('calls onClose from "✕ Kapat" and from Escape', async () => {
    const onClose = vi.fn()
    render(<TrueWordZoomDialog word={BIND} onClose={onClose} />)

    await userEvent.setup().click(screen.getByRole('button', { name: '✕ Kapat' }))
    expect(onClose).toHaveBeenCalledTimes(1)

    act(() => {
      screen.getByRole<HTMLDialogElement>('dialog').close()
    })
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
