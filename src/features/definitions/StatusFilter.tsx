import { useId } from 'react'

import { cn } from '@/lib/cn'

import { STATUS_FILTER_OPTIONS, type StatusFilterValue } from './statusFilterOptions'

export type StatusFilterProps = {
  value: StatusFilterValue
  onChange: (value: StatusFilterValue) => void
  className?: string
}

/** The DM's status filter: a select labelled "Durum". Only the DM's screens render it. */
export function StatusFilter({ value, onChange, className }: StatusFilterProps) {
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
          const next = STATUS_FILTER_OPTIONS.find((option) => option.value === event.target.value)
          if (next) onChange(next.value)
        }}
        className={cn(
          'max-w-full min-w-0 rounded-lg border border-control-line bg-control px-3 py-2 text-sm text-ink',
          className,
        )}
      >
        {STATUS_FILTER_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </>
  )
}
