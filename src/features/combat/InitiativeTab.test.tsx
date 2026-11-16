import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { testCharacter } from '@/test/characterFixtures'
import {
  testCharacterCombatant,
  testCombat,
  testDmCombatant,
  testNpcCombatant,
  testRunningCombat,
} from '@/test/combatFixtures'
import { ready, testProfile, testUser } from '@/test/fixtures'
import { renderApp, type RenderAppOptions } from '@/test/renderApp'

import { resetSwitchMemory } from './asking'
import type { CombatActions } from './combatContext'
import type { Combatant } from './schema'

const ME = testProfile({ displayName: 'Ayla' })
const BORA = testProfile({ id: 'bora', displayName: 'Bora' })
const DM = testProfile({ id: 'dm-1', displayName: 'Dana', role: 'dm' })
const PROFILES = ready([ME, BORA, DM])

const THORN = testCharacter('Thorn', testUser.uid, { initiativeModifier: 3 })
const KUZGUN = testCharacter('Kuzgun', testUser.uid)
const ELARA = testCharacter('Elara', 'bora')
const SEF = testCharacter('Goblin şefi', 'dm-1')
const CHARACTERS = ready([THORN, KUZGUN, ELARA, SEF])

const AS_DM = { currentProfile: ready(testProfile({ role: 'dm' })), profiles: PROFILES }
const AS_PLAYER = { currentProfile: ready(ME), profiles: PROFILES }

function renderTab({ dm = false, ...options }: RenderAppOptions & { dm?: boolean } = {}) {
  return renderApp({
    path: '/dice?tab=inisiyatif',
    users: dm ? AS_DM : AS_PLAYER,
    characters: { characters: CHARACTERS },
    ...options,
  })
}

const list = () => screen.getByRole('list', { name: 'İnisiyatif sırası' })
const rowNames = () =>
  within(list())
    .getAllByRole('listitem')
    .map((item) => item.getAttribute('aria-label'))
const row = (name: string) => within(list()).getByRole('listitem', { name })

function setNetwork(online: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online)
  act(() => {
    window.dispatchEvent(new Event(online ? 'online' : 'offline'))
  })
}

beforeEach(() => {
  resetSwitchMemory()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('the İnisiyatif tab without a combat', () => {
  it('says that no combat is open, without "Savaş başlat" for a player', () => {
    renderTab()
    expect(screen.getByText('Açık bir savaş yok.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Savaş başlat' })).not.toBeInTheDocument()
  })

  it('offers the DM "Savaş başlat"', () => {
    renderTab({ dm: true })
    expect(screen.getByRole('button', { name: 'Savaş başlat' })).toBeEnabled()
  })

  it('marks the tab when a combat opens, without a reload', () => {
    const view = renderApp({ path: '/dice', users: AS_PLAYER })
    const tab = () => screen.getByRole('tab', { name: /İnisiyatif/ })
    expect(within(tab()).queryByRole('img', { name: 'savaş açık' })).not.toBeInTheDocument()
    view.setCombat({ combat: testCombat() })
    expect(within(tab()).getByRole('img', { name: 'savaş açık' })).toBeInTheDocument()
  })
})

describe('setting up a combat', () => {
  async function openSetup(open = vi.fn<CombatActions['open']>(() => Promise.resolve())) {
    const user = userEvent.setup()
    renderTab({ dm: true, combat: { actions: { open } } })
    await user.click(screen.getByRole('button', { name: 'Savaş başlat' }))
    return { user, open, dialog: screen.getByRole('dialog', { name: 'Savaş başlat' }) }
  }

  it("checks every player's characters and not the DM's own", async () => {
    const { dialog } = await openSetup()
    expect(within(dialog).getByRole('checkbox', { name: 'Thorn' })).toBeChecked()
    expect(within(dialog).getByRole('checkbox', { name: 'Kuzgun' })).toBeChecked()
    expect(within(dialog).getByRole('checkbox', { name: 'Elara' })).toBeChecked()
    expect(within(dialog).getByRole('checkbox', { name: 'Goblin şefi' })).not.toBeChecked()
  })

  it('asks for initiative with the checked characters and the typed NPCs', async () => {
    const { user, open, dialog } = await openSetup()
    await user.click(within(dialog).getByRole('checkbox', { name: 'Kuzgun' }))
    const npc = within(dialog).getByRole('group', { name: 'NPC ekle' })
    await user.type(within(npc).getByLabelText('Ad'), 'Goblin')
    await user.clear(within(npc).getByLabelText('Adet'))
    await user.type(within(npc).getByLabelText('Adet'), '4')
    await user.clear(within(npc).getByLabelText('Modifier'))
    await user.type(within(npc).getByLabelText('Modifier'), '+1')
    await user.click(within(npc).getByRole('button', { name: '+ NPC ekle' }))
    expect(within(dialog).getByRole('list', { name: "Eklenecek NPC'ler" })).toHaveTextContent(
      'Goblin ×4 · +1',
    )

    await user.click(within(dialog).getByRole('button', { name: 'Modifier iste' }))
    expect(open).toHaveBeenCalledWith({
      characters: [
        { characterId: THORN.id, uid: testUser.uid },
        { characterId: ELARA.id, uid: 'bora' },
      ],
      npcGroups: [{ name: 'Goblin', count: 4, modifier: 1 }],
    })
    expect(screen.queryByRole('dialog', { name: 'Savaş başlat' })).not.toBeInTheDocument()
  })

  it('disables "Modifier iste" without anyone', async () => {
    const { user, dialog } = await openSetup()
    for (const name of ['Thorn', 'Kuzgun', 'Elara']) {
      await user.click(within(dialog).getByRole('checkbox', { name }))
    }
    expect(within(dialog).getByRole('button', { name: 'Modifier iste' })).toBeDisabled()
  })

  it('keeps the dialog open with a message when the combat cannot open', async () => {
    const { user, dialog } = await openSetup(
      vi.fn<CombatActions['open']>(() => Promise.reject(new Error('x'))),
    )
    await user.click(within(dialog).getByRole('button', { name: 'Modifier iste' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Kaydedilemedi')
  })
})

describe('while the rolls come in', () => {
  const thorn = testCharacterCombatant(THORN, 0)
  const elara = testCharacterCombatant(ELARA, 1)
  const goblin1 = testNpcCombatant('Goblin 1', 2, 'dm-1')
  const goblin2 = testNpcCombatant('Goblin 2', 3, 'dm-1', { rolled: false })
  const gathering = (combatants: readonly Combatant[]) => ({
    combat: testCombat(),
    combatants,
    dmCombatants: [testDmCombatant(goblin1, 14, 1)],
  })

  it('shows the player\'s own characters with the remembered modifier and "At", and no "At" for others', () => {
    renderTab({ combat: gathering([thorn, elara, goblin1]) })
    expect(within(row('Thorn')).getByLabelText('Thorn modifier')).toHaveValue('+3')
    expect(within(row('Thorn')).getByRole('button', { name: 'Thorn için at' })).toBeEnabled()
    expect(within(row('Elara')).queryByRole('button', { name: /at$/ })).not.toBeInTheDocument()
  })

  it('offers +0 for a character that never rolled', () => {
    const kuzgun = testCharacterCombatant(KUZGUN, 4)
    renderTab({ combat: gathering([kuzgun]) })
    expect(within(row('Kuzgun')).getByLabelText('Kuzgun modifier')).toHaveValue('+0')
  })

  it('rolls with the typed modifier', async () => {
    const user = userEvent.setup()
    const rollInitiative = vi.fn<CombatActions['rollInitiative']>(() => Promise.resolve())
    renderTab({ combat: { ...gathering([thorn]), actions: { rollInitiative } } })
    const box = within(row('Thorn')).getByLabelText('Thorn modifier')
    await user.clear(box)
    await user.type(box, '-2')
    await user.click(within(row('Thorn')).getByRole('button', { name: 'Thorn için at' }))
    expect(rollInitiative).toHaveBeenCalledWith(thorn, 'Thorn', -2)
  })

  it('says when a roll was not recorded', async () => {
    const user = userEvent.setup()
    const rollInitiative = vi.fn<CombatActions['rollInitiative']>(() =>
      Promise.reject(new Error('denied')),
    )
    renderTab({ combat: { ...gathering([thorn]), actions: { rollInitiative } } })
    await user.click(within(row('Thorn')).getByRole('button', { name: 'Thorn için at' }))
    expect(within(row('Thorn')).getByRole('alert')).toHaveTextContent('Atış kaydedilmedi')
  })

  it.each([['31'], ['2.5'], ['abc']])('disables "At" for the modifier %s', async (text) => {
    const user = userEvent.setup()
    renderTab({ combat: gathering([thorn]) })
    const box = within(row('Thorn')).getByLabelText('Thorn modifier')
    await user.clear(box)
    await user.type(box, text)
    expect(within(row('Thorn')).getByRole('button', { name: 'Thorn için at' })).toBeDisabled()
  })

  it('lets the DM roll for every character', () => {
    renderTab({ dm: true, combat: gathering([thorn, elara]) })
    expect(within(row('Thorn')).getByRole('button', { name: 'Thorn için at' })).toBeEnabled()
    expect(within(row('Elara')).getByRole('button', { name: 'Elara için at' })).toBeEnabled()
  })

  it('offers no second roll, and lets the DM clear one', async () => {
    const user = userEvent.setup()
    const clearRoll = vi.fn<CombatActions['clearRoll']>(() => Promise.resolve())
    const rolled = testCharacterCombatant(THORN, 0, { die: 17, modifier: 3 })
    renderTab({ combat: gathering([rolled]) })
    expect(within(row('Thorn')).queryByRole('button', { name: 'Thorn için at' })).toBeNull()
    expect(within(row('Thorn')).queryByRole('button', { name: /yeniden/ })).toBeNull()

    renderTab({ dm: true, combat: { ...gathering([rolled]), actions: { clearRoll } } })
    const rows = screen.getAllByRole('list', { name: 'İnisiyatif sırası' })
    const dmRow = within(rows[1] as HTMLElement).getByRole('listitem', { name: 'Thorn' })
    await user.click(within(dmRow).getByRole('button', { name: 'Thorn yeniden attır' }))
    expect(clearRoll).toHaveBeenCalledWith(rolled)
  })

  it('shows the DM the order as it stands, with those waiting last', () => {
    const rolledThorn = testCharacterCombatant(THORN, 0, { die: 10, modifier: 3 })
    renderTab({ dm: true, combat: gathering([rolledThorn, elara, goblin1, goblin2]) })
    expect(rowNames()).toEqual(['Goblin 1', 'Thorn', 'Elara', 'Goblin 2'])
    expect(row('Goblin 1')).toHaveTextContent('15')
  })

  it('shows a player the join order, marked rolled or waiting, without NPC numbers', () => {
    const rolledThorn = testCharacterCombatant(THORN, 0, { die: 10, modifier: 3 })
    renderTab({ combat: gathering([rolledThorn, elara, goblin1, goblin2]) })
    expect(rowNames()).toEqual(['Thorn', 'Elara', 'Goblin 1', 'Goblin 2'])
    expect(row('Thorn')).toHaveTextContent('13')
    expect(row('Elara')).toHaveTextContent('bekleniyor')
    expect(row('Goblin 1')).toHaveTextContent('attı')
    expect(row('Goblin 1')).not.toHaveTextContent('15')
    expect(row('Goblin 2')).toHaveTextContent('bekleniyor')
  })

  it('disables "At" without a connection, and says why', () => {
    renderTab({ combat: gathering([thorn]) })
    setNetwork(false)
    expect(within(row('Thorn')).getByRole('button', { name: 'Thorn için at' })).toBeDisabled()
    expect(screen.getByText(/Bağlantı yok/)).toBeInTheDocument()
  })

  it('lets the DM start, and give up with a confirmation', async () => {
    const user = userEvent.setup()
    const start = vi.fn<CombatActions['start']>(() => Promise.resolve())
    const end = vi.fn<CombatActions['end']>(() => Promise.resolve())
    renderTab({ dm: true, combat: { ...gathering([thorn]), actions: { start, end } } })
    await user.click(screen.getByRole('button', { name: 'Başlat' }))
    expect(start).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Vazgeç' }))
    const confirm = screen.getByRole('dialog', { name: 'Savaştan vazgeç' })
    await user.click(within(confirm).getByRole('button', { name: 'Vazgeç' }))
    expect(end).toHaveBeenCalled()
  })
})

describe('switching to the İnisiyatif tab', () => {
  const waiting = { combat: testCombat(), combatants: [testCharacterCombatant(THORN, 0)] }

  it("opens the tab once when the combat waits for one of the user's characters", async () => {
    const user = userEvent.setup()
    const view = renderApp({
      path: '/dice',
      users: AS_PLAYER,
      characters: { characters: CHARACTERS },
    })
    expect(screen.getByRole('tab', { name: 'Kanal' })).toHaveAttribute('aria-selected', 'true')
    view.setCombat(waiting)
    expect(await screen.findByRole('tab', { name: /İnisiyatif/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await user.click(screen.getByRole('tab', { name: 'Kanal' }))
    view.setCombat({ ...waiting, combatants: [...waiting.combatants] })
    expect(screen.getByRole('tab', { name: 'Kanal' })).toHaveAttribute('aria-selected', 'true')
  })

  it('stays on Kanal when the combat waits only for others', () => {
    renderApp({
      path: '/dice',
      users: AS_PLAYER,
      characters: { characters: CHARACTERS },
      combat: { combat: testCombat(), combatants: [testCharacterCombatant(ELARA, 0)] },
    })
    expect(screen.getByRole('tab', { name: 'Kanal' })).toHaveAttribute('aria-selected', 'true')
  })
})

describe('the fight', () => {
  const goblin3 = testNpcCombatant('Goblin 3', 0, 'dm-1')
  const thorn = testCharacterCombatant(THORN, 1, { die: 17, modifier: 3 })
  const goblin2 = testNpcCombatant('Goblin 2', 2, 'dm-1')
  const brom = testCharacterCombatant(KUZGUN, 3, { die: 1, modifier: 12 })
  const elara = testCharacterCombatant(ELARA, 4)
  const wolf = testNpcCombatant('Kurt', 5, 'dm-1', { manual: true, rolled: false })
  const all = [goblin3, thorn, goblin2, brom, elara, wolf]
  const order = all.map((c) => c.id)
  const fight = (overrides: Parameters<typeof testRunningCombat>[1] = {}) => ({
    combat: testRunningCombat(order, overrides),
    combatants: all,
    dmCombatants: [testDmCombatant(goblin3, 20, -1), testDmCombatant(goblin2, 7, 1)],
  })

  it('shows the round, the active combatant and the marks', () => {
    renderTab({ dm: true, combat: fight() })
    expect(screen.getByRole('heading', { name: 'Savaş · Tur 1' })).toBeInTheDocument()
    expect(rowNames()).toEqual(['Goblin 3', 'Thorn', 'Goblin 2', 'Kuzgun', 'Elara', 'Kurt'])
    expect(row('Goblin 3')).toHaveAttribute('aria-current', 'step')
    expect(row('Goblin 3')).toHaveTextContent('nat 20')
    expect(row('Kuzgun')).toHaveTextContent('nat 1')
    expect(row('Elara')).toHaveTextContent('atmadı')
    expect(row('Kurt')).toHaveTextContent('elle eklendi')
  })

  it('shows players the NPC names only', () => {
    renderTab({ combat: fight() })
    expect(row('Goblin 3')).not.toHaveTextContent('nat 20')
    expect(row('Goblin 3')).not.toHaveTextContent('19')
    expect(row('Thorn')).toHaveTextContent('20')
  })

  it('lets the DM step on and back, but not before round 1', async () => {
    const user = userEvent.setup()
    const next = vi.fn<CombatActions['next']>(() => Promise.resolve())
    const back = vi.fn<CombatActions['back']>(() => Promise.resolve())
    const view = renderTab({ dm: true, combat: { ...fight(), actions: { next, back } } })
    expect(screen.getByRole('button', { name: '‹ Geri' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Sıradaki ›' }))
    expect(next).toHaveBeenCalledWith({ turn: 0, round: 1 })

    view.setCombat({ ...fight({ turn: 0, round: 3 }), actions: { next, back } })
    expect(screen.getByRole('heading', { name: 'Savaş · Tur 3' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '‹ Geri' }))
    expect(back).toHaveBeenCalledWith({ turn: 0, round: 3 })
  })

  it("lets the active character's owner end their turn, and nobody else", async () => {
    const user = userEvent.setup()
    const endMyTurn = vi.fn<CombatActions['endMyTurn']>(() => Promise.resolve())
    const view = renderTab({ combat: { ...fight({ turn: 1 }), actions: { endMyTurn } } })
    expect(row('Thorn')).toHaveAttribute('aria-current', 'step')
    await user.click(screen.getByRole('button', { name: 'Turumu bitirdim' }))
    expect(endMyTurn).toHaveBeenCalledWith({ turn: 1, round: 1 })

    view.setCombat({ ...fight({ turn: 4 }), actions: { endMyTurn } })
    expect(screen.queryByRole('button', { name: 'Turumu bitirdim' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sıradaki ›' })).not.toBeInTheDocument()
  })

  it('gives players no controls to reorder, add or remove', () => {
    renderTab({ combat: fight() })
    expect(screen.queryByRole('button', { name: /taşı$|sürükle$|çıkar$/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+ Ekle' })).not.toBeInTheDocument()
  })

  it('moves a combatant by keyboard, keeping the active one active', async () => {
    const user = userEvent.setup()
    const move = vi.fn<CombatActions['move']>(() => new Promise<void>(() => undefined))
    renderTab({ dm: true, combat: { ...fight({ turn: 1 }), actions: { move } } })
    expect(within(row('Thorn')).getByRole('button', { name: 'Thorn sürükle' })).toBeInTheDocument()
    within(row('Thorn')).getByRole('button', { name: 'Thorn aşağı taşı' }).focus()
    await user.keyboard('{Enter}')
    expect(move).toHaveBeenCalledWith(thorn.id, 2)
    expect(rowNames()).toEqual(['Goblin 3', 'Goblin 2', 'Thorn', 'Kuzgun', 'Elara', 'Kurt'])
    expect(row('Thorn')).toHaveAttribute('aria-current', 'step')
  })

  it('adds combatants by hand, offering only characters outside the combat', async () => {
    const user = userEvent.setup()
    const add = vi.fn<CombatActions['add']>(() => Promise.resolve())
    renderTab({ dm: true, combat: { ...fight(), actions: { add } } })
    await user.click(screen.getByRole('button', { name: '+ Ekle' }))
    const dialog = screen.getByRole('dialog', { name: 'Savaşa ekle' })
    expect(dialog).toHaveTextContent('Eklenenler zar atmaz')
    expect(within(dialog).queryByRole('checkbox', { name: 'Thorn' })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('checkbox', { name: 'Goblin şefi' })).not.toBeChecked()

    const npc = within(dialog).getByRole('group', { name: 'NPC ekle' })
    await user.type(within(npc).getByLabelText('Ad'), 'Kurt')
    await user.clear(within(npc).getByLabelText('Adet'))
    await user.type(within(npc).getByLabelText('Adet'), '2')
    await user.click(within(npc).getByRole('button', { name: '+ NPC ekle' }))
    await user.click(within(dialog).getByRole('button', { name: 'Ekle' }))
    expect(add).toHaveBeenCalledWith({
      characters: [],
      npcGroups: [{ name: 'Kurt', count: 2, modifier: 0 }],
    })
  })

  it('refuses NPCs that would take the combat over 50', async () => {
    const user = userEvent.setup()
    const many = Array.from({ length: 48 }, (_, i) =>
      testNpcCombatant(`Orc ${String(i)}`, i, 'dm-1'),
    )
    renderTab({
      dm: true,
      combat: { combat: testRunningCombat(many.map((c) => c.id)), combatants: many },
    })
    await user.click(screen.getByRole('button', { name: '+ Ekle' }))
    const dialog = screen.getByRole('dialog', { name: 'Savaşa ekle' })
    const npc = within(dialog).getByRole('group', { name: 'NPC ekle' })
    await user.type(within(npc).getByLabelText('Ad'), 'Kurt')
    await user.clear(within(npc).getByLabelText('Adet'))
    await user.type(within(npc).getByLabelText('Adet'), '3')
    await user.click(within(npc).getByRole('button', { name: '+ NPC ekle' }))
    expect(within(npc).getByRole('alert')).toHaveTextContent('en fazla 50')
    expect(within(dialog).queryByRole('list', { name: "Eklenecek NPC'ler" })).toBeNull()
  })

  it('removes a combatant', async () => {
    const user = userEvent.setup()
    const remove = vi.fn<CombatActions['remove']>(() => Promise.resolve())
    renderTab({ dm: true, combat: { ...fight(), actions: { remove } } })
    await user.click(within(row('Goblin 2')).getByRole('button', { name: 'Goblin 2 çıkar' }))
    expect(remove).toHaveBeenCalledWith(goblin2.id)
  })

  it('ends the fight only after the confirmation', async () => {
    const user = userEvent.setup()
    const end = vi.fn<CombatActions['end']>(() => Promise.resolve())
    renderTab({ dm: true, combat: { ...fight(), actions: { end } } })
    await user.click(screen.getByRole('button', { name: 'Bitir' }))
    let confirm = screen.getByRole('dialog', { name: 'Savaşı bitir' })
    await user.click(within(confirm).getByRole('button', { name: 'İptal' }))
    expect(end).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Bitir' }))
    confirm = screen.getByRole('dialog', { name: 'Savaşı bitir' })
    await user.click(within(confirm).getByRole('button', { name: 'Bitir' }))
    expect(end).toHaveBeenCalled()
  })
})
