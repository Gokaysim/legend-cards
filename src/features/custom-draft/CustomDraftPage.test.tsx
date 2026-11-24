import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { testArt } from '@/test/artFixtures'
import { TEST_VARIANTS, testCustomDraft } from '@/test/customDraftFixtures'
import { ready, testProfile } from '@/test/fixtures'
import { renderApp } from '@/test/renderApp'

import type { UserProfile } from '@/features/users/schema'

import type { CustomDraftActions } from './customDraftContext'
import type { EffectVariants } from './draftRules'
import type { CustomDraft } from './schema'
import { CustomDraftError } from './errors'

afterEach(() => {
  vi.restoreAllMocks()
})

const ayla = testProfile({ displayName: 'Ayla', lp: 5 })
const dm = testProfile({ role: 'dm', displayName: 'Dana', lp: 0 })
const bora = testProfile({ id: 'bora', displayName: 'Bora', lp: 4 })

type Setup = {
  viewer?: UserProfile
  path?: string
  variants?: EffectVariants
  drafts?: CustomDraft[]
  actions?: Partial<CustomDraftActions>
}

function setup({
  viewer = ayla,
  path = '/custom-draft',
  variants = TEST_VARIANTS,
  drafts = [],
  actions = {},
}: Setup = {}) {
  const user = userEvent.setup()
  const start = vi.fn<CustomDraftActions['start']>(actions.start ?? (() => Promise.resolve('d')))
  const view = renderApp({
    path,
    users: {
      currentProfile: ready(viewer),
      profiles: ready([viewer, bora, ...(viewer === dm ? [] : [dm])]),
    },
    customDraft: {
      variants: ready(variants),
      openDrafts: ready(drafts),
      actions: { ...actions, start },
    },
    art: testArt({
      customCovers: { '1': '/art/custom/1.0123456789.webp', '3': '/art/custom/3.0123456789.webp' },
    }),
  })
  return { user, start, ...view }
}

const choice = (name: string) => screen.getByRole('button', { name: new RegExp(name) })

describe('the Custom Card Draft screen', () => {
  it('shows a player the three choices with their covers and prices', () => {
    setup()
    expect(screen.getByRole('heading', { level: 1, name: /Custom Card Draft/ })).toBeInTheDocument()
    expect(screen.queryByText('Yakında')).not.toBeInTheDocument()
    const list = within(screen.getByRole('list', { name: 'Custom Card seçenekleri' }))
    const buttons = list.getAllByRole('button')
    expect(buttons.map((button) => button.textContent)).toEqual([
      '1-Cost Custom Card1 LP',
      '3-Cost Custom Card3 LP',
      '✧ 55-Cost Custom Card5 LP',
    ])
    expect(buttons[0]?.querySelector('img')).toHaveAttribute('src', '/art/custom/1.0123456789.webp')
    expect(buttons[2]?.querySelector('img')).toBeNull()
    expect(screen.queryByLabelText('Kimin için')).not.toBeInTheDocument()
  })

  it("disables the choices a player cannot pay, naming the price and the player's LP", () => {
    setup({ viewer: testProfile({ displayName: 'Ayla', lp: 2 }) })
    expect(choice('1-Cost')).toBeEnabled()
    expect(choice('3-Cost')).toBeDisabled()
    expect(choice('5-Cost')).toBeDisabled()
    expect(choice('3-Cost')).toHaveAccessibleDescription("3 LP gerekiyor; Ayla'nın 2 LP'si var.")
  })

  it('disables every choice when no custom effect is loaded', () => {
    setup({ variants: {} })
    for (const name of ['1-Cost', '3-Cost', '5-Cost']) {
      expect(choice(name)).toBeDisabled()
      expect(choice(name)).toHaveAccessibleDescription('Custom efektler yüklenmemiş.')
    }
  })

  it('starts a paid draft after the confirmation', async () => {
    const { user, start } = setup()
    await user.click(choice('3-Cost'))
    const dialog = within(screen.getByRole('dialog', { name: '✧ 3-Cost Custom Card' }))
    await user.click(dialog.getByRole('button', { name: "Draft'ı başlat (3 LP)" }))
    expect(start).toHaveBeenCalledWith({ uid: 'user-1', by: 'user-1', base: 3, amount: 'price' })
  })

  it('lets the DM choose the player, kept in the address, and start a free draft', async () => {
    const { user, start, router } = setup({ viewer: dm })
    const select = screen.getByLabelText('Kimin için')
    await user.selectOptions(select, 'bora')
    expect(router.state.location.search).toBe('?for=bora')
    await user.click(choice('5-Cost'))
    const dialog = within(screen.getByRole('dialog', { name: '✧ 5-Cost Custom Card' }))
    const amount = dialog.getByLabelText("Tutar (Bora'nın LP'sinden)")
    expect(amount).toHaveValue(5)
    await user.clear(amount)
    await user.type(amount, '0')
    await user.click(dialog.getByRole('button', { name: "Draft'ı başlat" }))
    expect(start).toHaveBeenCalledWith({ uid: 'bora', by: 'user-1', base: 5, amount: 0 })
  })

  it("refuses the DM more than the user's LP, naming it", async () => {
    const { user, start } = setup({ viewer: dm, path: '/custom-draft?for=bora' })
    await user.click(choice('5-Cost'))
    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('button', { name: "Draft'ı başlat" }))
    expect(dialog.getByRole('alert')).toHaveTextContent(
      "Bu draft 5 LP tutuyor; Bora'nın 4 LP'si var.",
    )
    expect(start).not.toHaveBeenCalled()
  })

  it('shows a Turkish message when the server refuses', async () => {
    const { user } = setup({
      actions: { start: () => Promise.reject(new CustomDraftError('draft-open')) },
    })
    await user.click(choice('1-Cost'))
    await user.click(screen.getByRole('button', { name: "Draft'ı başlat (1 LP)" }))
    expect(screen.getByRole('alert')).toHaveTextContent("Ayla'nın açık bir Custom Card draft'ı var")
  })

  it('does not start a draft offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    setup()
    expect(choice('1-Cost')).toBeDisabled()
    expect(choice('1-Cost')).toHaveAccessibleDescription(
      'Bağlantı yok: draft için internet bağlantısı gerekiyor.',
    )
  })

  it('shows the open draft instead of the choices', () => {
    setup({ drafts: [testCustomDraft()] })
    expect(screen.queryByRole('list', { name: 'Custom Card seçenekleri' })).not.toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: "Ayla için açık Custom Card draft'ı" }),
    ).toBeInTheDocument()
  })

  it("shows the DM the chosen player's open draft", () => {
    setup({
      viewer: dm,
      path: '/custom-draft?for=bora',
      drafts: [testCustomDraft({ uid: 'bora' })],
    })
    expect(
      screen.getByRole('region', { name: "Bora için açık Custom Card draft'ı" }),
    ).toBeInTheDocument()
  })
})
