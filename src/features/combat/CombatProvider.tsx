import { type ReactNode, useMemo } from 'react'

import { useAuth } from '@/features/auth/authContext'
import { useDiceActions } from '@/features/dice/diceContext'
import { useIsDm } from '@/features/users/usersContext'
import { db } from '@/lib/firebase/firestore'
import { useCollection } from '@/lib/firestore/useCollection'
import { useDocument } from '@/lib/firestore/useDocument'
import { shuffle } from '@/lib/random'

import {
  addCombatants,
  clearRoll,
  combatantsRef,
  combatRef,
  type CreatedNpcGroup,
  dmCombatantsRef,
  endCombat,
  delayMyTurn,
  endMyTurn,
  initiativeRequest,
  initiativeWrites,
  moveCombatant,
  npcGroupRequest,
  npcGroupWrites,
  openCombat,
  removeCombatant,
  startFight,
  stepTurn,
} from './api'
import {
  type CombatActions,
  CombatContext,
  type CombatContextValue,
  type CombatView,
} from './combatContext'
import { CombatPartlyAddedError } from './errors'
import { currentOrder } from './order'
import { type DmCombatant, IDLE_COMBAT } from './schema'

const combat = combatRef(db)
const combatants = combatantsRef(db)
const dmCombatants = dmCombatantsRef(db)

const NO_DM_COMBATANTS: ReadonlyMap<string, DmCombatant> = new Map()

/**
 * Shares the combat in real time, with one subscription each for the whole app: `combat/main` and the combatants. Only
 * on the DM's device it also subscribes to the NPCs' rolls; a player's device never asks for them (design D1). It
 * binds the combat steps to the signed-in user and the dice. Signed out, it subscribes to nothing.
 */
export function CombatProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const uid = auth.status === 'signedIn' ? auth.user.uid : null
  const isDm = useIsDm()
  const dice = useDiceActions()

  const main = useDocument(uid ? combat : null)
  const list = useCollection(uid ? combatants : null)
  const npcRolls = useCollection(uid && isDm ? dmCombatants : null)

  const view = useMemo<CombatView>(() => {
    if (main.status === 'error' || list.status === 'error') return { status: 'error' }
    if (main.status !== 'ready' || list.status !== 'ready') return { status: 'loading' }
    const current = main.data ?? IDLE_COMBAT
    return {
      status: 'ready',
      combat: current,
      combatants: list.data.filter((c) => c.combatId === current.combatId),
    }
  }, [main, list])

  const npcMap = useMemo<ReadonlyMap<string, DmCombatant>>(
    () =>
      npcRolls.status === 'ready' ? new Map(npcRolls.data.map((r) => [r.id, r])) : NO_DM_COMBATANTS,
    [npcRolls],
  )

  const actions = useMemo<CombatActions>(() => {
    const me = () => {
      if (uid === null) throw new Error('Signed out')
      return uid
    }
    const ready = () => {
      if (view.status !== 'ready') throw new Error('The combat is not loaded')
      return view
    }
    const rollGroup = async (
      group: CreatedNpcGroup,
      combatId: string,
      create?: { dmUid: string; firstSeq: number },
    ) => {
      const { written } = await dice.rollWith(
        npcGroupRequest(group),
        npcGroupWrites(db, group, combatId, create),
      )
      await written
    }
    const nextSeq = () => Math.max(-1, ...ready().combatants.map((c) => c.seq)) + 1

    return {
      open: async (joining) => {
        const opened = await openCombat(db, { by: me(), ...joining })
        // One group after another: each throws on the DM's tray. The NPCs are in even when some characters were left
        // out, so they roll first (design D3 of open-large-combats).
        for (const group of opened.npcGroups) await rollGroup(group, opened.combatId)
        if (opened.leftOut.length > 0) throw new CombatPartlyAddedError('open', opened.leftOut)
      },
      rollInitiative: async (combatant, characterName, modifier) => {
        const { written } = await dice.rollWith(
          initiativeRequest(characterName, modifier),
          initiativeWrites(db, combatant, modifier),
        )
        await written
      },
      add: async (joining) => {
        const { combat: current } = ready()
        if (current.combatId === null) throw new Error('No combat')
        const combatId = current.combatId
        const firstSeq = nextSeq()
        const characterCount = joining.characters.length
        const added = await addCombatants(db, { by: me(), combatId, firstSeq, ...joining })
        let seq = firstSeq + characterCount
        for (const group of added.npcGroups) {
          await rollGroup(group, combatId, { dmUid: me(), firstSeq: seq })
          seq += group.ids.length
        }
        if (added.leftOut.length > 0) throw new CombatPartlyAddedError('add', added.leftOut)
      },
      clearRoll: (combatant) => clearRoll(db, combatant),
      start: async () => {
        const { combat: current, combatants: list } = ready()
        if (current.combatId === null) throw new Error('No combat')
        await startFight(db, {
          by: me(),
          combatId: current.combatId,
          order: currentOrder(list, npcMap, (items) => shuffle(items)),
        })
      },
      next: (seen) => stepTurn(db, 'next', seen),
      back: (seen) => stepTurn(db, 'back', seen),
      endMyTurn: (seen) => endMyTurn(db, me(), seen),
      delayMyTurn: (seen) => delayMyTurn(db, me(), seen),
      move: (combatantId, toIndex) => moveCombatant(db, combatantId, toIndex),
      remove: (combatantId) => removeCombatant(db, combatantId),
      end: () => endCombat(db, { by: me(), combatantIds: ready().combatants.map((c) => c.id) }),
    }
  }, [uid, dice, view, npcMap])

  const value = useMemo<CombatContextValue>(
    () => ({ combat: view, dmCombatants: npcMap, actions }),
    [view, npcMap, actions],
  )
  return <CombatContext value={value}>{children}</CombatContext>
}
