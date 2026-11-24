import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { testCustomCard } from '@/test/cardFixtures'
import { TEST_VARIANTS, testCustomDraft } from '@/test/customDraftFixtures'
import { ready, testProfile } from '@/test/fixtures'
import { testHolding } from '@/test/holdingFixtures'
import { renderApp } from '@/test/renderApp'

import type { UserProfile } from '@/features/users/schema'

import type { CustomDraftActions } from './customDraftContext'
import type { CustomDraft } from './schema'

afterEach(() => {
  vi.restoreAllMocks()
})

const ayla = testProfile({ displayName: 'Ayla', lp: 5 })
const dm = testProfile({ role: 'dm', displayName: 'Dana' })

type Setup = {
  viewer?: UserProfile
  draft?: CustomDraft
  actions?: Partial<CustomDraftActions>
}

function setup({ viewer = ayla, draft = testCustomDraft(), actions = {} }: Setup = {}) {
  const user = userEvent.setup()
  const pick = vi.fn<CustomDraftActions['pick']>(
    actions.pick ?? (() => Promise.resolve({ finished: false })),
  )
  const cancel = vi.fn<CustomDraftActions['cancel']>(() => Promise.resolve())
  const profiles = viewer === dm ? [dm, { ...ayla, id: 'user-2' }] : [ayla]
  const view = renderApp({
    path: viewer === dm ? '/custom-draft?for=user-2' : '/custom-draft',
    users: { currentProfile: ready(viewer), profiles: ready(profiles) },
    customDraft: {
      variants: ready(TEST_VARIANTS),
      openDrafts: ready([draft]),
      actions: { pick, cancel },
    },
  })
  return { user, pick, cancel, ...view }
}

const panel = () => within(screen.getByRole('region', { name: /açık Custom Card draft'ı$/ }))

/** A 3-cost draft after Special, Caster and Draw: two 1-cost picks left. */
const BONUS_DRAFT = testCustomDraft({
  pickTypes: ['Special', 'Caster', 'Draw'],
  pickCosts: [3, 3, 3],
  offered: ['Gold', 'Roll'],
  offerCost: 1,
  required: 5,
  bonusLeft: 2,
})

describe('an open Custom Card draft', () => {
  it('shows the picks, the count with the extra 1-cost picks, and the options with their texts', () => {
    setup({ draft: BONUS_DRAFT })
    expect(panel().getByRole('heading')).toHaveTextContent('✧ 3-Cost Custom Card · Ayla')
    expect(panel().getByText(/farklı efekt/)).toHaveTextContent(
      '3 / 5 farklı efekt · kalan 2 adet 1-Cost seçim · Ödeme: −3 LP',
    )
    const picked = within(panel().getByRole('list', { name: 'Seçilen efektler' }))
    expect(picked.getAllByRole('listitem').map((item) => item.getAttribute('title'))).toEqual([
      'Special · 3-Cost',
      'Caster · 3-Cost',
      'Draw · 3-Cost',
    ])
    const options = within(panel().getByRole('list', { name: 'Seçenekler' }))
    expect(options.getByText('Gold · 1-Cost')).toBeInTheDocument()
    expect(options.getByText('Gold at 1.')).toBeInTheDocument()
    expect(options.getByText('Roll at 1.')).toBeInTheDocument()
  })

  it('picks an option', async () => {
    const { user, pick } = setup()
    await user.click(panel().getByRole('button', { name: 'Draw · 3-Cost: seç' }))
    expect(pick).toHaveBeenCalledWith({ draftId: 'draft-1', type: 'Draw', by: 'user-1' })
  })

  it('opens the hand with the new card selected after the last pick', async () => {
    const card = testCustomCard('custom-new', { holder: { uid: 'user-1', userCardId: 'h-new' } })
    const user = userEvent.setup()
    const pick = vi.fn<CustomDraftActions['pick']>(() =>
      Promise.resolve({ finished: true, uid: 'user-1', cardId: card.id, holdingId: 'h-new' }),
    )
    const view = renderApp({
      path: '/custom-draft',
      users: { currentProfile: ready(ayla), profiles: ready([ayla]) },
      cards: { cards: ready([card]) },
      holdings: {
        openHoldings: ready([
          testHolding(card, 'user-1', 1000, { id: 'h-new', givenVia: 'draft', drawId: 'draft-1' }),
        ]),
      },
      customDraft: {
        variants: ready(TEST_VARIANTS),
        openDrafts: ready([testCustomDraft()]),
        actions: { pick },
      },
    })
    await user.click(panel().getByRole('button', { name: 'Caster · 3-Cost: seç' }))
    expect(view.router.state.location.pathname).toBe('/hands/user-1')
    expect(await screen.findByRole('dialog', { name: /3-Cost Custom Card/ })).toBeInTheDocument()
    expect(view.router.state.location.search).toBe('')
  })

  it('says the custom effects are incomplete when no option is left', () => {
    setup({ draft: testCustomDraft({ pickTypes: ['Caster'], pickCosts: [3], offered: [] }) })
    expect(panel().getByText(/Custom efektler eksik/)).toBeInTheDocument()
    expect(panel().queryByRole('list', { name: 'Seçenekler' })).not.toBeInTheDocument()
  })

  it('gives the player no cancel control', () => {
    setup()
    expect(panel().queryByRole('button', { name: '✕ İptal' })).not.toBeInTheDocument()
  })

  it('lets the DM cancel with a refund after a confirmation', async () => {
    const { user, cancel } = setup({ viewer: dm, draft: testCustomDraft({ uid: 'user-2' }) })
    await user.click(panel().getByRole('button', { name: '✕ İptal' }))
    expect(panel().getByText(/Ayla'ya 3 LP iade edilecek\. Kart yapılmaz\./)).toBeInTheDocument()
    await user.click(panel().getByRole('button', { name: 'Evet, iptal et ve iade et' }))
    expect(cancel).toHaveBeenCalledWith({ draftId: 'draft-1', by: 'user-1' })
  })

  it('shows a new pick live', () => {
    const { setCustomDraft } = setup({ viewer: dm, draft: testCustomDraft({ uid: 'user-2' }) })
    const next: CustomDraft = testCustomDraft({
      uid: 'user-2',
      pickTypes: ['Draw'],
      pickCosts: [3],
      offered: ['Caster', 'Roll'],
    })
    setCustomDraft({ variants: ready(TEST_VARIANTS), openDrafts: ready([next]) })
    expect(panel().getByText(/farklı efekt/)).toHaveTextContent('1 / 3 farklı efekt')
    expect(panel().getByRole('list', { name: 'Seçilen efektler' })).toHaveTextContent('Draw')
  })

  it('does not pick offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const { user, pick } = setup()
    await user.click(panel().getByRole('button', { name: 'Draw · 3-Cost: seç' }))
    expect(panel().getByRole('alert')).toHaveTextContent(/^Bağlantı yok/)
    expect(pick).not.toHaveBeenCalled()
  })
})
