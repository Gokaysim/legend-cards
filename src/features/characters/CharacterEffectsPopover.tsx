import { Pill } from '@/components/ui/Pill'
import { cn } from '@/lib/cn'

import type { EffectRow } from './effectRows'
import { EFFECT_STYLES } from './effectStyles'

export type CharacterEffectsPopoverProps = {
  id: string
  characterName: string
  /** The character's effects, in the order of its "Aktif efektler". */
  rows: readonly EffectRow[]
  className?: string
}

/**
 * The popover of a character's tab (spec: character-effects, "Effects on a character's tab"): headed with the
 * character's name and how many effects are on it, the names of its effects with their marks, each glowing in its
 * kind's color (spec: visual-effects, "Effect colors"), without their texts.
 */
export function CharacterEffectsPopover({
  id,
  characterName,
  rows,
  className,
}: CharacterEffectsPopoverProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn(
        'pointer-events-none flex flex-col gap-2 rounded-xl border border-gold/60 bg-sidebar p-3 shadow-lg',
        className,
      )}
    >
      <h2 id={`${id}-title`} className="text-sm font-semibold break-words text-gold">
        {`${characterName} · ${rows.length} aktif efekt`}
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-muted">Aktif efekt yok.</p>
      ) : (
        <ul className="flex flex-col gap-1.5 text-sm">
          {rows.map((row) => {
            const style = EFFECT_STYLES[row.kind]
            return (
              <li
                key={row.key}
                data-kind={row.kind}
                className={cn(
                  'flex items-center gap-2 rounded-lg border bg-pane-raised px-2 py-1',
                  style.box,
                )}
              >
                <span
                  lang={row.isEnglish ? 'en' : undefined}
                  className={cn('min-w-0 flex-1 font-semibold break-words', style.name)}
                >
                  {style.prefix ? <span className="sr-only">{style.prefix}</span> : null}
                  {row.name}
                </span>
                <Pill tone={style.tone}>{row.mark}</Pill>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
