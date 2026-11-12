import { useId } from 'react'

import { cn } from '@/lib/cn'

import type { StatusFilterOption } from './statusFilterOptions'

export type StatusFilterProps<V extends string> = {
  value: V
  onChange: (value: V) => void
  /** The choices in order: `STATUS_FILTER_OPTIONS` for True Words, `CARD_FILTER_OPTIONS` for cards. */
  options: readonly StatusFilterOption<V>[]
  className?: string
}

/** The DM's status filter: a select labelled "Durum". Only the DM's screens render it. */
export function StatusFilter<V extends string>({
  value,
  onChange,
  options,
  className,
}: StatusFilterProps<V>) {
  const id = useId()
  return (
    <>
      <label htmlFor={id} className="sr-only">
        Durum
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          const next = options.find((option) => option.value === event.target.value)
          if (next) onChange(next.value)
        }}
        className={cn(
          'max-w-full min-w-0 rounded-lg border border-control-line bg-control px-3 py-2 text-sm text-ink',
          className,
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </>
  )
}
