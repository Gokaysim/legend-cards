import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

import type { FacetChoice, FacetKey } from './filters'
import { FilterPill } from './FilterPill'
import { pillClasses } from './pillClasses'

export type FilterBarPill = {
  key: FacetKey
  name: string
  choices: readonly FacetChoice[]
  value: string | null
  onChange: (value: string | null) => void
}

export type FilterBarToggle = {
  label: string
  isOn: boolean
  onChange: (isOn: boolean) => void
}

export type FilterBarProps = {
  pills: readonly FilterBarPill[]
  /** An on/off filter drawn as a pill, such as "Yalnızca havuzdakiler". */
  toggle?: FilterBarToggle
  /** A keyword field at the end of the row. */
  keyword?: { value: string; onChange: (value: string) => void; maxLength?: number }
  /** True while any filter is on: "Temizle" shows. */
  isActive: boolean
  onClear: () => void
  className?: string
}

/**
 * The DM's filters in one wrapping row of pills, shared by the draw dialog and "+ Kart ver" (design D3 of
 * `improve-draw-and-give-dialogs`). One pill's menu is open at a time. "Temizle" clears every filter.
 */
export function FilterBar({
  pills,
  toggle,
  keyword,
  isActive,
  onClear,
  className,
}: FilterBarProps) {
  const [openKey, setOpenKey] = useState<FacetKey | null>(null)
  return (
    <div
      role="group"
      aria-label="Filtreler"
      className={cn('relative flex flex-wrap items-center gap-2', className)}
    >
      {pills.map((pill) => (
        <FilterPill
          key={pill.key}
          name={pill.name}
          choices={pill.choices}
          value={pill.value}
          onChange={pill.onChange}
          isOpen={openKey === pill.key}
          onOpenChange={(isOpen) =>
            setOpenKey((current) => (isOpen ? pill.key : current === pill.key ? null : current))
          }
        />
      ))}
      {toggle ? (
        <button
          type="button"
          aria-pressed={toggle.isOn}
          className={pillClasses(toggle.isOn)}
          onClick={() => toggle.onChange(!toggle.isOn)}
        >
          {toggle.label}
        </button>
      ) : null}
      {keyword ? (
        <input
          type="search"
          aria-label="Kelime"
          placeholder="Kelime"
          maxLength={keyword.maxLength}
          value={keyword.value}
          onChange={(event) => keyword.onChange(event.target.value)}
          className="h-9 w-full min-w-0 rounded-full border border-control-line bg-control px-3.5 text-sm text-ink placeholder:text-ink-muted sm:w-40"
        />
      ) : null}
      {isActive ? (
        <Button variant="ghost" className="ml-auto h-9 py-0 text-gold" onClick={onClear}>
          Temizle
        </Button>
      ) : null}
    </div>
  )
}
