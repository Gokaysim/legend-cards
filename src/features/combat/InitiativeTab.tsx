import {
  type Announcements,
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth/authContext'
import { charactersOf, useCharacters } from '@/features/characters/charactersContext'
import type { Character } from '@/features/characters/schema'
import { usePresence } from '@/features/presence/presenceContext'
import type { UserProfile } from '@/features/users/schema'
import { profileName, sortProfiles, useIsDm, useProfiles } from '@/features/users/usersContext'
import type { Subscription } from '@/lib/firestore/subscription'
import { useOnlineStatus } from '@/lib/useOnlineStatus'

import { type Joining, useCombat, useCombatActions, useDmCombatants } from './combatContext'
import { CombatantRow } from './CombatantRow'
import { COMBAT_OFFLINE_NOTE, CombatPartlyAddedError, combatFailureMessage } from './errors'
import { JoinCombatDialog, type JoinGroup } from './JoinCombatDialog'
import { canStepBack, moveItem, turnAfterReorder } from './order'
import { RollControl } from './RollControl'
import { orderedRows, type Row } from './rows'
import { type Combat, COMBAT_LIMITS, type Combatant } from './schema'
import { initialCombatChoice, isOfflineOwner } from './setupChoice'

const NO_CHARACTERS: readonly Character[] = []
const NO_PROFILES: readonly UserProfile[] = []

/**
 * The table's unarchived characters by owner: players first, the DM's own last. With `online`, each owner who is not
 * online is marked (the setup only); without it, no owner is.
 */
function joinGroups(
  characters: readonly Character[],
  profiles: readonly UserProfile[],
  leaveOut: ReadonlySet<string> = new Set(),
  online: Subscription<ReadonlySet<string>> | null = null,
): JoinGroup[] {
  const sorted = sortProfiles(profiles)
  const ordered = [
    ...sorted.filter((p) => p.role !== 'dm'),
    ...sorted.filter((p) => p.role === 'dm'),
  ]
  return ordered
    .map((profile) => ({
      uid: profile.id,
      name: profileName(profile),
      characters: charactersOf(characters, profile.id).filter((c) => !leaveOut.has(c.id)),
      offline: online !== null && isOfflineOwner(profile.id, online),
    }))
    .filter((group) => group.characters.length > 0)
}

/** A step's button that reports its own failure. */
function useStep() {
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const run = (step: () => Promise<void>) => {
    setIsBusy(true)
    setError(null)
    step()
      .catch((failure: unknown) => setError(combatFailureMessage(failure)))
      .finally(() => setIsBusy(false))
  }
  return { error, isBusy, run }
}

type Confirming = 'end' | null

/**
 * The İnisiyatif tab of the Zarlar screen (spec: initiative-tracker). Without a combat it says so, and offers the DM
 * "Savaş başlat". While the rolls come in, each player rolls their own characters and the DM can roll for anyone;
 * once the fight runs, it shows the round and the active combatant, and the DM drags, adds, removes and steps on.
 * Every step that changes the combat needs a connection.
 */
export function InitiativeTab() {
  const combat = useCombat()
  const isDm = useIsDm()
  const auth = useAuth()
  const uid = auth.status === 'signedIn' ? auth.user.uid : null
  const characters = useCharacters()
  const profiles = useProfiles()
  const online = usePresence()
  const npcRolls = useDmCombatants()
  const actions = useCombatActions()
  const isOnline = useOnlineStatus()
  const step = useStep()
  const [isSetupOpen, setIsSetupOpen] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [confirming, setConfirming] = useState<Confirming>(null)
  const [leftOutNote, setLeftOutNote] = useState<string | null>(null)
  const [pending, setPending] = useState<{
    base: readonly string[]
    order: string[]
    turn: number
  } | null>(null)

  const characterList = characters.status === 'ready' ? characters.data : NO_CHARACTERS
  const profileList = profiles.status === 'ready' ? profiles.data : NO_PROFILES
  const characterMap = useMemo(
    () => new Map(characterList.map((c) => [c.id, c] as const)),
    [characterList],
  )
  // A setup cut short (design D3 and D4 of open-large-combats): the combat is open, so the dialog closes, and the tab
  // names the characters left out.
  const reportingLeftOut =
    (action: (joining: Joining) => Promise<void>) =>
    (joining: Joining): Promise<void> =>
      action(joining).catch((failure: unknown) => {
        if (!(failure instanceof CombatPartlyAddedError)) throw failure
        setLeftOutNote(combatFailureMessage(failure, (id) => characterMap.get(id)?.name))
      })
  const profileMap = useMemo(
    () => new Map(profileList.map((p) => [p.id, p] as const)),
    [profileList],
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  if (combat.status === 'loading') return <Spinner />
  if (combat.status === 'error') {
    return (
      <p role="alert" className="text-sm text-danger-ink">
        Savaş yüklenemedi.
      </p>
    )
  }

  const current: Combat =
    pending && pending.base === combat.combat.order
      ? { ...combat.combat, order: pending.order, turn: pending.turn }
      : combat.combat
  const list = combat.combatants

  if (current.phase === 'idle') {
    return (
      <>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm text-ink-muted">Açık bir savaş yok.</p>
          {isDm ? (
            <>
              <Button
                variant="primary"
                disabled={!isOnline}
                onClick={() => {
                  setLeftOutNote(null)
                  setIsSetupOpen(true)
                }}
              >
                <span aria-hidden="true">⚔</span> Savaş başlat
              </Button>
              {!isOnline ? <p className="text-xs text-ink-muted">{COMBAT_OFFLINE_NOTE}</p> : null}
            </>
          ) : null}
        </div>
        {isSetupOpen ? (
          <JoinCombatDialog
            title="Savaş başlat"
            submitLabel="Modifier iste"
            groups={joinGroups(characterList, profileList, new Set(), online)}
            // Read once, when the dialog opens: a player who comes or goes later changes no checkbox.
            initiallyChecked={initialCombatChoice(characterList, profileList, online)}
            remaining={COMBAT_LIMITS.combatants}
            onSubmit={reportingLeftOut(actions.open)}
            onClose={() => setIsSetupOpen(false)}
          />
        ) : null}
      </>
    )
  }

  const rows = orderedRows(current, list, characterMap, npcRolls, isDm)
  const isRunning = current.phase === 'running'
  const activeId = isRunning ? current.order[current.turn] : undefined
  const active = list.find((c) => c.id === activeId)
  const isMyTurn = active?.kind === 'character' && active.uid === uid
  const seen = { turn: current.turn, round: current.round, activeId: activeId ?? null }
  const canAct = isOnline && !step.isBusy

  const nameOf = (id: string | number) =>
    rows.find((row) => row.combatant.id === String(id))?.name ?? ''
  const announcements: Announcements = {
    onDragStart: ({ active: dragged }) => `${nameOf(dragged.id)} tutuldu.`,
    onDragOver: ({ active: dragged, over }) =>
      over
        ? `${nameOf(dragged.id)}, ${nameOf(over.id)} yerinde.`
        : `${nameOf(dragged.id)} listenin dışında.`,
    onDragEnd: ({ active: dragged, over }) =>
      over
        ? `${nameOf(dragged.id)}, ${nameOf(over.id)} yerine bırakıldı.`
        : `${nameOf(dragged.id)} bırakıldı.`,
    onDragCancel: ({ active: dragged }) => `${nameOf(dragged.id)} taşınmadı.`,
  }

  const moveTo = (id: string, toIndex: number) => {
    const from = current.order.indexOf(id)
    if (from < 0 || toIndex < 0 || toIndex >= current.order.length || from === toIndex) return
    const order = moveItem(current.order, from, toIndex)
    setPending({
      base: combat.combat.order,
      order,
      turn: turnAfterReorder(current.order, order, current.turn),
    })
    step.run(() => actions.move(id, toIndex))
  }

  const onDragEnd = (event: DragEndEvent) => {
    if (!event.over) return
    moveTo(String(event.active.id), current.order.indexOf(String(event.over.id)))
  }

  const hasRollControl = (row: Row) =>
    current.phase === 'gathering' &&
    row.combatant.kind === 'character' &&
    !row.combatant.rolled &&
    (row.combatant.uid === uid || isDm)

  const controlsOf = (row: Row, index: number) => {
    const c: Combatant = row.combatant
    const parts = []
    if (hasRollControl(row)) {
      parts.push(<RollControl key="roll" row={row} isOnline={isOnline} />)
    }
    if (isDm && current.phase === 'gathering' && c.rolled) {
      parts.push(
        <Button
          key="again"
          variant="ghost"
          disabled={!canAct}
          aria-label={`${row.name} yeniden attır`}
          onClick={() => step.run(() => actions.clearRoll(c))}
        >
          ↻
        </Button>,
      )
    }
    if (isDm && isRunning) {
      parts.push(
        <Button
          key="up"
          variant="ghost"
          disabled={!canAct || index === 0}
          aria-label={`${row.name} yukarı taşı`}
          onClick={() => moveTo(c.id, index - 1)}
          className="px-1.5"
        >
          ▲
        </Button>,
        <Button
          key="down"
          variant="ghost"
          disabled={!canAct || index === rows.length - 1}
          aria-label={`${row.name} aşağı taşı`}
          onClick={() => moveTo(c.id, index + 1)}
          className="px-1.5"
        >
          ▼
        </Button>,
      )
    }
    if (isDm) {
      parts.push(
        <Button
          key="remove"
          variant="ghost"
          disabled={!canAct}
          aria-label={`${row.name} çıkar`}
          onClick={() => step.run(() => actions.remove(c.id))}
          className="px-1.5"
        >
          ✕
        </Button>,
      )
    }
    return parts.length > 0 ? parts : null
  }

  const inCombat = new Set(list.flatMap((c) => (c.characterId ? [c.characterId] : [])))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">
          {isRunning ? `Savaş · Tur ${String(current.round)}` : 'İnisiyatif bekleniyor'}
        </h2>
        <span className="text-xs text-ink-muted">{list.length} katılımcı</span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              'Taşımak için boşluk tuşuna bas, yerini oklarla seç, bırakmak için yine boşluk tuşuna bas. Escape vazgeçer.',
          },
        }}
      >
        <SortableContext
          items={rows.map((row) => row.combatant.id)}
          strategy={verticalListSortingStrategy}
        >
          <ol aria-label="İnisiyatif sırası" className="flex flex-col gap-1.5">
            {rows.map((row, index) => (
              <CombatantRow
                key={row.combatant.id}
                row={row}
                ownerName={(() => {
                  const owner = profileMap.get(row.combatant.uid)
                  return owner ? profileName(owner) : null
                })()}
                isActive={row.combatant.id === activeId}
                canDrag={isDm && isRunning && canAct}
                isDm={isDm}
                controls={controlsOf(row, index)}
                showStatus={!hasRollControl(row)}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {rows.length === 0 ? (
        <p className="text-center text-sm text-ink-muted">Listede kimse yok.</p>
      ) : null}

      {step.error ? (
        <p role="alert" className="text-sm text-danger-ink">
          {step.error}
        </p>
      ) : null}
      {leftOutNote ? (
        <p role="alert" className="text-sm text-danger-ink">
          {leftOutNote}
        </p>
      ) : null}
      {!isOnline ? <p className="text-xs text-ink-muted">{COMBAT_OFFLINE_NOTE}</p> : null}

      {isRunning && (isDm || isMyTurn) ? (
        <div className="flex flex-wrap items-center gap-2">
          {isDm ? (
            <>
              <Button
                disabled={!canAct || !canStepBack(current, current.order.length)}
                onClick={() => step.run(() => actions.back(seen))}
              >
                ‹ Geri
              </Button>
              <Button
                variant="primary"
                disabled={!canAct || current.order.length === 0}
                onClick={() => step.run(() => actions.next(seen))}
              >
                Sıradaki ›
              </Button>
            </>
          ) : (
            <>
              <Button
                disabled={!canAct || current.order.length < 2}
                onClick={() => step.run(() => actions.delayMyTurn(seen))}
              >
                Turumu beklet
              </Button>
              <Button
                variant="primary"
                disabled={!canAct}
                onClick={() => step.run(() => actions.endMyTurn(seen))}
              >
                Turumu bitirdim
              </Button>
            </>
          )}
        </div>
      ) : null}

      {isDm ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <Button
            disabled={!canAct}
            onClick={() => {
              setLeftOutNote(null)
              setIsAddOpen(true)
            }}
          >
            + Ekle
          </Button>
          {current.phase === 'gathering' ? (
            <Button
              variant="primary"
              disabled={!canAct || list.length === 0}
              onClick={() => step.run(actions.start)}
            >
              Başlat
            </Button>
          ) : null}
          <Button
            variant="danger"
            disabled={!canAct}
            onClick={() => setConfirming('end')}
            className="ml-auto"
          >
            {isRunning ? 'Bitir' : 'Vazgeç'}
          </Button>
        </div>
      ) : null}

      {isAddOpen ? (
        <JoinCombatDialog
          title="Savaşa ekle"
          submitLabel="Ekle"
          groups={joinGroups(characterList, profileList, inCombat)}
          initiallyChecked={new Set()}
          remaining={COMBAT_LIMITS.combatants - list.length}
          note={
            isRunning
              ? 'Eklenenler zar atmaz: listenin sonuna eklenir, yerlerini sen seçersin.'
              : 'Karakterlerin sahipleri zar atar; NPC’ler hemen gizli atılır.'
          }
          onSubmit={reportingLeftOut(actions.add)}
          onClose={() => setIsAddOpen(false)}
        />
      ) : null}

      {confirming === 'end' ? (
        <Dialog
          title={isRunning ? 'Savaşı bitir' : 'Savaştan vazgeç'}
          onClose={() => setConfirming(null)}
          className="max-w-sm"
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink">
              {isRunning
                ? `Savaş ${String(current.round)}. turda bitecek ve liste temizlenecek. Atışlar kanalda kalır.`
                : 'Savaş başlamadan kapanacak ve liste temizlenecek. Atışlar kanalda kalır.'}
            </p>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setConfirming(null)}>İptal</Button>
              <Button
                variant="danger"
                onClick={() => {
                  setConfirming(null)
                  step.run(actions.end)
                }}
              >
                {isRunning ? 'Bitir' : 'Vazgeç'}
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </div>
  )
}
