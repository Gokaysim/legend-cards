import { Button } from '@/components/ui/Button'
import { Pill, type PillTone } from '@/components/ui/Pill'
import { cn } from '@/lib/cn'

import type { CharacterEffect, EffectSource } from './effects'
import type { HeldEffect } from './heldEffects'

/** "9 Kas 14:32": when a stored effect was added, as the notes and the İşlem Logu show a time. */
const addedAtFormat = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

/** Each stored source's mark. */
const SOURCE_MARKS: Record<EffectSource, string> = {
  card: 'Kart',
  word: 'True Word',
  own: 'Özel',
  dm: 'DM',
}

type Row = {
  key: string
  mark: string
  tone?: PillTone
  name: string
  /** Card and word names are English, as the cards are. */
  isEnglish: boolean
  text: string
  cursed: boolean
  /** "Ayla · 9 Kas 14:32" for a stored effect; `null` for one from the hand. */
  meta: string | null
  /** The stored effect, when it is one and the user may remove it. */
  removable: CharacterEffect | null
}

function heldRow(effect: HeldEffect): Row {
  return {
    key: `held-${effect.id}`,
    mark: effect.kind === 'held' ? 'Elden' : 'True Word',
    tone: effect.cursed ? 'cursed' : effect.kind === 'word' ? 'true-word' : undefined,
    name: effect.name,
    isEnglish: true,
    text: effect.text,
    cursed: effect.cursed,
    meta: null,
    removable: null,
  }
}

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
  const rows: Row[] = [
    ...held.map(heldRow),
    ...effects.map((effect) => ({
      key: effect.id,
      mark: SOURCE_MARKS[effect.source],
      tone: effect.cursed
        ? ('cursed' as const)
        : effect.source === 'word'
          ? ('true-word' as const)
          : undefined,
      name: effect.name,
      isEnglish: effect.source === 'card' || effect.source === 'word',
      text: effect.text,
      cursed: effect.cursed,
      meta: [
        nameOf(effect.createdBy),
        effect.createdAt === null ? null : addedAtFormat.format(effect.createdAt.toDate()),
      ]
        .filter((part) => part !== null)
        .join(' · '),
      removable: canRemove(effect) ? effect : null,
    })),
  ]
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
          {rows.map((row) => (
            <li
              key={row.key}
              className={cn(
                'flex flex-col gap-1 rounded-lg border-l-2 bg-pane-raised p-2 text-sm',
                row.cursed ? 'border-cursed' : 'border-line',
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={row.tone}>{row.mark}</Pill>
                <p
                  lang={row.isEnglish ? 'en' : undefined}
                  className="min-w-0 flex-1 font-semibold break-words text-ink"
                >
                  {row.cursed ? <span className="sr-only">Cursed: </span> : null}
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
          ))}
        </ul>
      )}
    </section>
  )
}
