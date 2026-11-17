import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { cn } from '@/lib/cn'

import { effectRows } from './effectRows'
import type { CharacterEffect } from './effects'
import { EFFECT_STYLES } from './effectStyles'
import type { HeldEffect } from './heldEffects'

/** "9 Kas 14:32": when a stored effect was added, as the notes and the İşlem Logu show a time. */
const addedAtFormat = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export type CharacterEffectsListProps = {
  /** The effects from the owner's hand: the same on every one of their characters. */
  held: readonly HeldEffect[]
  /** The character's stored effects, newest first. */
  effects: readonly CharacterEffect[]
  /** Whether the signed-in user may remove this stored effect. */
  canRemove: (effect: CharacterEffect) => boolean
  onRemove: (effect: CharacterEffect) => void
  /** A user's name, for who added an effect. */
  nameOf: (uid: string) => string
  /** "+ Efekt ekle", for the owner and the DM; `null` for anyone else. */
  onAdd: (() => void) | null
}

/**
 * A character's "Aktif efektler" (spec: character-effects, "Active effects in the details"): the held cards and the
 * active True Words from the owner's hand, which nobody removes here, then the stored effects, newest first, each with
 * its mark, who added it and when, and "Kaldır" for those who may remove it.
 */
export function CharacterEffectsList({
  held,
  effects,
  canRemove,
  onRemove,
  nameOf,
  onAdd,
}: CharacterEffectsListProps) {
  const rows = effectRows(held, effects).map((row) => ({
    ...row,
    /** "Ayla · 9 Kas 14:32" for a stored effect; `null` for one from the hand. */
    meta:
      row.stored === null
        ? null
        : [
            nameOf(row.stored.createdBy),
            row.stored.createdAt === null
              ? null
              : addedAtFormat.format(row.stored.createdAt.toDate()),
          ]
            .filter((part) => part !== null)
            .join(' · '),
    /** The stored effect, when it is one and the user may remove it. */
    removable: row.stored !== null && canRemove(row.stored) ? row.stored : null,
  }))
  return (
    <section aria-label="Aktif efektler" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">Aktif efektler</h3>
        {onAdd !== null ? (
          <Button variant="ghost" className="px-2 py-1" onClick={onAdd}>
            + Efekt ekle
          </Button>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-muted">Aktif efekt yok.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => {
            const style = EFFECT_STYLES[row.kind]
            return (
              <li
                key={row.key}
                data-kind={row.kind}
                className={cn(
                  'flex flex-col gap-1 rounded-lg border bg-pane-raised p-2 text-sm',
                  style.box,
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={style.tone}>{row.mark}</Pill>
                  <p
                    lang={row.isEnglish ? 'en' : undefined}
                    className={cn('min-w-0 flex-1 font-semibold break-words', style.name)}
                  >
                    {style.prefix ? <span className="sr-only">{style.prefix}</span> : null}
                    {row.name}
                  </p>
                  {row.removable !== null ? (
                    <Button
                      variant="ghost"
                      className="px-2 py-1 text-danger-ink"
                      aria-label={`${row.name} efektini kaldır`}
                      onClick={() => {
                        if (row.removable) onRemove(row.removable)
                      }}
                    >
                      Kaldır
                    </Button>
                  ) : null}
                </div>
                <p
                  lang={row.isEnglish ? 'en' : undefined}
                  className="break-words whitespace-pre-line text-ink-muted"
                >
                  {row.text || 'Efekt metni yok.'}
                </p>
                {row.meta !== null ? <p className="text-xs text-ink-muted">{row.meta}</p> : null}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
