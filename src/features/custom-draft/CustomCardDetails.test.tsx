import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { HoldingActions } from '@/features/hands/holdingsContext'
import type { UserProfile } from '@/features/users/schema'
import { testCustomCard, testEffect } from '@/test/cardFixtures'
import { TEST_VARIANTS } from '@/test/customDraftFixtures'
import { ready, signedInAs, testProfile, testUser } from '@/test/fixtures'
import { testHolding } from '@/test/holdingFixtures'
import { renderApp } from '@/test/renderApp'

import type { CustomDraftActions } from './customDraftContext'

// A Custom Card's details in the hand (spec: custom-cards, "The Custom Card's details", "Discarding a Custom Card",
// "The DM edits a Custom Card's effects"; design D8, D9 of add-custom-card-draft).

afterEach(() => {
  vi.restoreAllMocks()
})

const ayla = testProfile({ id: 'ayla', displayName: 'Ayla', lp: 5 })
const dm = testProfile({ role: 'dm', displayName: 'Dana' })

/** Ayla's 3-cost card with Effects and Cursed at 3-cost, and Caster. */
const card = testCustomCard('custom-1', {
  effects: [testEffect('Effects'), testEffect('Cursed'), testEffect('Caster')],
  holder: { uid: 'ayla', userCardId: 'h-1' },
})

function setup(viewer: UserProfile = ayla) {
  const user = userEvent.setup()
  const closeHolding = vi.fn<HoldingActions['closeHolding']>(() => Promise.resolve())
  const editEffects = vi.fn<CustomDraftActions['editEffects']>(() => Promise.resolve())
  renderApp({
    path: '/hands/ayla',
    state: signedInAs({ ...testUser, uid: viewer.id }),
    users: { currentProfile: ready(viewer), profiles: ready([ayla, dm]) },
    cards: { cards: ready([card]) },
    holdings: {
      openHoldings: ready([testHolding(card, 'ayla', 1000, { id: 'h-1', givenVia: 'draft' })]),
      actions: { closeHolding },
    },
    customDraft: { variants: ready(TEST_VARIANTS), actions: { editEffects } },
  })
  return { user, closeHolding, editEffects }
}

async function openDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '3-Cost Custom Card: ayrıntılar' }))
  return within(screen.getByRole('dialog', { name: /3-Cost Custom Card/ }))
}

describe("a Custom Card's details", () => {
  it('list its effects and how its cost was reached', async () => {
    const { user } = setup()
    const details = await openDetails(user)
    const effects = within(details.getByRole('region', { name: 'Efektler' }))
    expect(effects.getByText(/^Maliyet:/).parentElement).toHaveTextContent(
      'Maliyet: 3 + 2 (Effects) − 2 (Cursed) = 3',
    )
    expect(effects.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Effects (3-Cost): Invented Effects effect at 3-cost.',
      'Cursed (3-Cost): Invented Cursed effect at 3-cost.',
      'Caster (3-Cost): Invented Caster effect at 3-cost.',
    ])
  })

  it('destroy the card after a confirmation from "✕ Custom kartı yok et"', async () => {
    const { user, closeHolding } = setup()
    const details = await openDetails(user)
    expect(details.queryByRole('button', { name: 'At' })).not.toBeInTheDocument()
    await user.click(details.getByRole('button', { name: '✕ Custom kartı yok et' }))
    expect(
      details.getByText(/yok edilsin mi\? Kart oyundan çıkar ve geri gelmez\./),
    ).toBeInTheDocument()
    await user.click(details.getByRole('button', { name: 'Evet, yok et' }))
    expect(closeHolding).toHaveBeenCalledWith({ holdingId: 'h-1', by: 'ayla', reason: 'discarded' })
  })

  it('give a player no control to edit the effects', async () => {
    const { user } = setup()
    const details = await openDetails(user)
    expect(details.queryByRole('button', { name: 'Efektleri düzenle' })).not.toBeInTheDocument()
  })

  it('let the DM add Held, with the new cost, and remove an effect', async () => {
    const { user, editEffects } = setup(dm)
    const details = await openDetails(user)
    await user.click(details.getByRole('button', { name: 'Efektleri düzenle' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Efektleri düzenle' }))

    await user.selectOptions(dialog.getByLabelText('Tür'), 'Held')
    expect(
      within(dialog.getByLabelText('Maliyet'))
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Seç', '1-Cost', '3-Cost', '5-Cost'])
    await user.selectOptions(dialog.getByLabelText('Maliyet'), '1')
    expect(dialog.getByText('Held at 1.')).toBeInTheDocument()
    await user.click(dialog.getByRole('button', { name: 'Ekle' }))
    await user.click(dialog.getByRole('button', { name: 'Cursed: kaldır' }))
    expect(dialog.getByText(/^Maliyet:/).parentElement).toHaveTextContent(
      'Maliyet: 3 + 2 (Effects) = 5',
    )
    await user.click(dialog.getByRole('button', { name: 'Kaydet' }))

    expect(editEffects).toHaveBeenCalledWith({
      card,
      by: dm.id,
      effects: [
        testEffect('Effects'),
        testEffect('Caster'),
        { type: 'Held', cost: 1, text: 'Held at 1.' },
      ],
    })
  })

  it('keep at least one effect', async () => {
    const { user } = setup(dm)
    const details = await openDetails(user)
    await user.click(details.getByRole('button', { name: 'Efektleri düzenle' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Efektleri düzenle' }))
    await user.click(dialog.getByRole('button', { name: 'Effects: kaldır' }))
    await user.click(dialog.getByRole('button', { name: 'Cursed: kaldır' }))
    expect(dialog.getByRole('button', { name: 'Caster: kaldır' })).toBeDisabled()
  })
})
