import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { formatModifier } from './npcs'
import { ROW_STATUS_TEXT, type Row } from './rows'

export type CombatantRowProps = {
  row: Row
  /** The owner's name, under a character's name. */
  ownerName: string | null
  isActive: boolean
  /** The DM's handle for dragging, once the fight runs. */
  canDrag: boolean
  /** Controls at the row's end: the roll, "Yeniden attır", moving and removing. */
  controls?: ReactNode
  isDm: boolean
  /** `false` hides the status, where a control already says it (the roll control says "waiting"). */
  showStatus?: boolean
}

/** One combatant in the İnisiyatif list: its name, whose it is, its total and marks, and its controls. */
export function CombatantRow({
  row,
  ownerName,
  isActive,
  canDrag,
  controls,
  isDm,
  showStatus = true,
}: CombatantRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.combatant.id, disabled: !canDrag })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const subtitle = row.combatant.kind === 'npc' ? 'NPC' : ownerName

  return (
    <li
      ref={setNodeRef}
      style={style}
      aria-label={row.name}
      aria-current={isActive ? 'step' : undefined}
      className={cn(
        'flex items-center gap-2 rounded-xl border border-line bg-pane px-3 py-2',
        isActive && 'border-gold bg-pane-raised',
        isDragging && 'relative z-10 shadow-lg',
      )}
    >
      {canDrag ? (
        <button
          ref={setActivatorNodeRef}
          type="button"
          aria-label={`${row.name} sürükle`}
          className="cursor-grab touch-none px-1 text-ink-muted"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
      ) : null}
      {isActive ? (
        <span aria-hidden="true" className="text-gold">
          ▶
        </span>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-ink">
          {row.name}
          {isActive ? <span className="sr-only"> (sırada)</span> : null}
        </span>
        {subtitle ? <span className="truncate text-xs text-ink-muted">{subtitle}</span> : null}
      </div>
      <div className="flex shrink-0 flex-col items-end">
        {row.total !== null ? (
          <span className="text-lg font-semibold text-ink tabular-nums">{row.total}</span>
        ) : null}
        {row.mark === 'nat20' ? (
          <span className="text-xs font-semibold text-gold">nat 20</span>
        ) : null}
        {row.mark === 'nat1' ? (
          <span className="text-xs font-semibold text-cursed">nat 1</span>
        ) : null}
        {isDm && row.die !== null && row.mark === null ? (
          <span className="text-xs text-ink-muted tabular-nums">
            d20 {row.die} {formatModifier(row.modifier ?? 0)}
          </span>
        ) : null}
        {showStatus && row.status !== null ? (
          <span className="text-xs text-ink-muted">{ROW_STATUS_TEXT[row.status]}</span>
        ) : null}
      </div>
      {controls ? <div className="flex shrink-0 items-center gap-1">{controls}</div> : null}
    </li>
  )
}
