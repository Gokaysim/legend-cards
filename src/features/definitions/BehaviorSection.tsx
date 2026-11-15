import { useId } from 'react'

import { Button } from '@/components/ui/Button'
import { TABLE_BUSY_NOTE } from '@/features/table/errors'

import {
  type BehaviorFlag,
  type BehaviorFlags,
  type DefinitionKind,
  flagLabel,
  isOnlyFromDm,
  OWNERSHIP_FLAGS,
  POOL_FLAGS,
  shownFlags,
  WHERE_FLAGS,
} from './flags'

/** Why "Birden fazla elde olabilir" cannot be turned on: someone holds the card's one copy. */
export const HELD_COPY_NOTE = 'Kart bir oyuncunun elinde.'

export type BehaviorSectionProps = {
  kind: DefinitionKind
  flags: BehaviorFlags
  /** One box changed; the form records that the DM touched it. */
  onChange: (flag: BehaviorFlag, value: boolean) => void
  /** "Sadece DM verebilir": every box of the first group off. */
  onOnlyFromDm: () => void
  /**
   * The stored definition's flags and holder, or `null` for a new one. A pool flag of a stored definition waits for an
   * open pack, and a card whose one copy someone holds cannot become repeatable.
   */
  stored: (BehaviorFlags & { holder: unknown }) | null
  /** A pack is open: the table waits for it. */
  isTableBusy: boolean
  disabled?: boolean
}

/** Why a box cannot change now, or `null` when it can. */
function lockReason(
  flag: BehaviorFlag,
  { flags, stored, isTableBusy }: Pick<BehaviorSectionProps, 'flags' | 'stored' | 'isTableBusy'>,
): string | null {
  if (stored === null) return null
  if (isTableBusy && (POOL_FLAGS as readonly BehaviorFlag[]).includes(flag)) return TABLE_BUSY_NOTE
  if (flag === 'isRepeatable' && !flags.isRepeatable && stored.holder != null) return HELD_COPY_NOTE
  return null
}

/**
 * The "Davranış" section of the DM's card and True Word forms (design D8 of unify-cards-and-true-words; spec:
 * definition-editing, "The Davranış section"): "Görünürlük ve kanallar" with the "where" flags and the "Sadece DM
 * verebilir" button, then "Sahiplik ve etki". It shows only the flags the kind does not fix, with the draw flag named
 * after the kind. A box that cannot change now is greyed out with its reason.
 */
export function BehaviorSection({
  kind,
  flags,
  onChange,
  onOnlyFromDm,
  stored,
  isTableBusy,
  disabled = false,
}: BehaviorSectionProps) {
  const ids = useId()
  const shown = new Set(shownFlags(kind))
  const groups = [
    {
      key: 'where',
      title: 'Görünürlük ve kanallar',
      flags: WHERE_FLAGS.filter((f) => shown.has(f)),
    },
    { key: 'own', title: 'Sahiplik ve etki', flags: OWNERSHIP_FLAGS.filter((f) => shown.has(f)) },
  ]
  const onlyFromDmLocked =
    stored !== null &&
    isTableBusy &&
    WHERE_FLAGS.some((flag) => flag !== 'isInLibrary' && flags[flag])
  const isWord = kind === 'trueWord'

  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border border-line p-3">
      <legend className="px-1 text-sm font-semibold text-ink">Davranış</legend>
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3
              id={`${ids}-${group.key}`}
              className="text-xs font-semibold tracking-wide text-ink-muted uppercase"
            >
              {group.title}
            </h3>
            {group.key === 'where' ? (
              <Button
                variant="secondary"
                className="px-2 py-1 text-xs"
                onClick={onOnlyFromDm}
                disabled={disabled || onlyFromDmLocked || isOnlyFromDm(flags)}
              >
                Sadece DM verebilir
              </Button>
            ) : null}
          </div>
          <ul aria-labelledby={`${ids}-${group.key}`} className="flex flex-col gap-1.5">
            {group.flags.map((flag) => {
              const reason = lockReason(flag, { flags, stored, isTableBusy })
              const noteId = `${ids}-${flag}-note`
              return (
                <li key={flag}>
                  <label className="flex items-start gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={flags[flag]}
                      disabled={disabled || reason !== null}
                      aria-describedby={reason === null ? undefined : noteId}
                      onChange={(event) => onChange(flag, event.target.checked)}
                      className="mt-0.5 size-4 accent-gold"
                    />
                    <span className={reason === null ? undefined : 'text-ink-muted'}>
                      {flagLabel(flag, kind)}
                    </span>
                  </label>
                  {reason === null ? null : (
                    <p id={noteId} className="ml-6 text-xs text-ink-muted">
                      {reason}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
          {group.key === 'where' && isOnlyFromDm(flags) ? (
            <p className="text-xs text-ink-muted">
              {isWord
                ? "Bu True Word'ü yalnızca DM öğretebilir."
                : 'Bu kartı yalnızca DM verebilir.'}
            </p>
          ) : null}
        </div>
      ))}
    </fieldset>
  )
}
