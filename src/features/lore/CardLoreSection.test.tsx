import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Timestamp } from 'firebase/firestore'
import { describe, expect, it, vi } from 'vitest'

import { ready, testUser } from '@/test/fixtures'
import { renderApp } from '@/test/renderApp'
import { ABOLETH, abolethHistory, STATS_AYLA, STATS_DM, STATS_PROFILES } from '@/test/statsFixtures'
import type { TestLore } from '@/test/TestLoreProvider'

import type { Lore } from './schema'

const LORE: Lore = {
  text: 'Derin suların efendisi.\n\nGözleri hâlâ bakıyor.',
  updatedBy: STATS_DM.id,
  updatedAt: Timestamp.fromMillis(1000),
}

function renderPage({ asDm = false, lore = {} }: { asDm?: boolean; lore?: TestLore } = {}) {
  return renderApp({
    path: `/library/${ABOLETH.id}`,
    users: { currentProfile: ready(asDm ? STATS_DM : STATS_AYLA), profiles: ready(STATS_PROFILES) },
    cards: { cards: ready([ABOLETH]) },
    stats: { records: ready(abolethHistory()) },
    lore,
  })
}

const loreSection = () => screen.queryByRole('region', { name: 'Hikâye' })

describe('the Hikâye section', () => {
  it('shows a player the lore with its paragraphs', () => {
    renderPage({ lore: { lore: { [ABOLETH.id]: ready(LORE) } } })

    const section = loreSection()
    expect(section).not.toBeNull()
    const text = within(section as HTMLElement).getByText(/Derin suların efendisi\./)
    expect(text.textContent).toBe(LORE.text)
    expect(text).toHaveClass('whitespace-pre-wrap')
    expect(screen.queryByRole('button', { name: 'Düzenle' })).toBeNull()
  })

  it('shows a player nothing for a card without lore', () => {
    renderPage()

    expect(loreSection()).toBeNull()
    expect(screen.queryByText('Hikâye')).toBeNull()
  })

  it('shows new lore live, without a reload', () => {
    const view = renderPage({ lore: { lore: { [ABOLETH.id]: ready(LORE) } } })

    view.setLore({ lore: { [ABOLETH.id]: ready({ ...LORE, text: 'Yeni hikâye.' }) } })

    expect(within(loreSection() as HTMLElement).getByText('Yeni hikâye.')).toBeInTheDocument()
  })

  it('says so in Turkish when the lore cannot be read', () => {
    renderPage({
      lore: {
        lore: {
          [ABOLETH.id]: {
            status: 'error',
            error: { kind: 'unknown', message: 'x', path: `cardLore/${ABOLETH.id}` },
          },
        },
      },
    })

    expect(screen.getByRole('alert')).toHaveTextContent('Hikâye yüklenemedi.')
  })

  it('stands under the labels and above the tiles', () => {
    renderPage({ lore: { lore: { [ABOLETH.id]: ready(LORE) } } })

    const labels = screen.getByRole('list', { name: 'Kart bilgileri' })
    const tiles = screen.getByLabelText('Kart istatistikleri')
    const section = loreSection() as HTMLElement
    expect(labels.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(section.compareDocumentPosition(tiles) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe("the DM's lore editing", () => {
  it('offers "Hikâye ekle" on a card without lore, and saves what the DM writes', async () => {
    const user = userEvent.setup()
    const saveLore = vi.fn(() => Promise.resolve())
    renderPage({ asDm: true, lore: { actions: { saveLore } } })

    await user.click(screen.getByRole('button', { name: 'Hikâye ekle' }))
    await user.type(screen.getByRole('textbox', { name: 'Hikâye' }), 'Bir göz.')
    await user.click(screen.getByRole('button', { name: 'Kaydet' }))

    expect(saveLore).toHaveBeenCalledWith({
      cardId: ABOLETH.id,
      text: 'Bir göz.',
      by: testUser.uid,
    })
    expect(screen.queryByRole('textbox', { name: 'Hikâye' })).toBeNull()
  })

  it('offers "Düzenle" with the stored lore in the text box', async () => {
    const user = userEvent.setup()
    renderPage({ asDm: true, lore: { lore: { [ABOLETH.id]: ready(LORE) } } })

    await user.click(screen.getByRole('button', { name: 'Düzenle' }))

    expect(screen.getByRole('textbox', { name: 'Hikâye' })).toHaveValue(LORE.text)
    expect(screen.getByRole('textbox', { name: 'Hikâye' })).toHaveFocus()
    expect(screen.getByRole('textbox', { name: 'Hikâye' })).toHaveAttribute('maxLength', '10000')
  })

  it('keeps the stored lore on "Vazgeç"', async () => {
    const user = userEvent.setup()
    const saveLore = vi.fn(() => Promise.resolve())
    renderPage({ asDm: true, lore: { lore: { [ABOLETH.id]: ready(LORE) }, actions: { saveLore } } })

    await user.click(screen.getByRole('button', { name: 'Düzenle' }))
    await user.clear(screen.getByRole('textbox', { name: 'Hikâye' }))
    await user.type(screen.getByRole('textbox', { name: 'Hikâye' }), 'Başka.')
    await user.click(screen.getByRole('button', { name: 'Vazgeç' }))

    expect(saveLore).not.toHaveBeenCalled()
    expect(within(loreSection() as HTMLElement).getByText(/Derin suların/)).toBeInTheDocument()
  })

  it('saves an emptied text, which clears the lore', async () => {
    const user = userEvent.setup()
    const saveLore = vi.fn(() => Promise.resolve())
    renderPage({ asDm: true, lore: { lore: { [ABOLETH.id]: ready(LORE) }, actions: { saveLore } } })

    await user.click(screen.getByRole('button', { name: 'Düzenle' }))
    await user.clear(screen.getByRole('textbox', { name: 'Hikâye' }))
    await user.click(screen.getByRole('button', { name: 'Kaydet' }))

    expect(saveLore).toHaveBeenCalledWith({ cardId: ABOLETH.id, text: '', by: testUser.uid })
  })

  it('keeps the text box open with the text when a save fails', async () => {
    const user = userEvent.setup()
    const saveLore = vi.fn(() => Promise.reject(new Error('offline')))
    renderPage({ asDm: true, lore: { actions: { saveLore } } })

    await user.click(screen.getByRole('button', { name: 'Hikâye ekle' }))
    await user.type(screen.getByRole('textbox', { name: 'Hikâye' }), 'Kaybolmasın.')
    await user.click(screen.getByRole('button', { name: 'Kaydet' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Hikâye kaydedilemedi.')
    expect(screen.getByRole('textbox', { name: 'Hikâye' })).toHaveValue('Kaybolmasın.')
    expect(screen.getByRole('button', { name: 'Kaydet' })).toBeEnabled()
  })
})
