import { useId } from 'react'

import { cn } from '@/lib/cn'

export type NotePaperProps = {
  /** The note's name, "Kart notu". */
  label: string
  value: string
  /** `true` draws a field to write in; otherwise the note is text, or `emptyText` without one. */
  isEditable: boolean
  onChange?: (value: string) => void
  onFocus?: () => void
  onBlur?: () => void
  maxLength?: number
  placeholder?: string
  /** What a read-only note says when it is empty. Defaults to "Not yok.". */
  emptyText?: string
}

/**
 * A note on cream paper, like the scrolls printed on the cards (spec: card-holdings, "The holder and the note in the
 * details"; design D2 of `redesign-selected-card-panel`). The colors are the speech bubble's tested `bubble` tokens.
 */
export function NotePaper({
  label,
  value,
  isEditable,
  onChange,
  onFocus,
  onBlur,
  maxLength,
  placeholder,
  emptyText = 'Not yok.',
}: NotePaperProps) {
  const id = useId()
  const labelClasses = 'text-[11px] font-extrabold tracking-[0.1em] text-bubble-title uppercase'
  return (
    <div
      data-note-paper=""
      className="flex flex-col gap-1.5 rounded-xl border border-bubble-line bg-linear-160 from-bubble to-bubble-deep px-3 pt-2.5 pb-2 shadow-sm"
    >
      {isEditable ? (
        <>
          <label htmlFor={id} className={labelClasses}>
            {label}
          </label>
          <textarea
            id={id}
            value={value}
            rows={3}
            maxLength={maxLength}
            placeholder={placeholder}
            onFocus={onFocus}
            onChange={(event) => onChange?.(event.target.value)}
            onBlur={onBlur}
            className="w-full resize-y rounded-sm border-0 bg-transparent p-0 text-sm leading-relaxed text-bubble-ink placeholder:text-bubble-ink-muted focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bubble-title"
          />
        </>
      ) : (
        <>
          <p className={labelClasses}>{label}</p>
          <p
            className={cn(
              'text-sm leading-relaxed break-words whitespace-pre-line',
              value === '' ? 'text-bubble-ink-muted' : 'text-bubble-ink',
            )}
          >
            {value === '' ? emptyText : value}
          </p>
        </>
      )}
    </div>
  )
}
