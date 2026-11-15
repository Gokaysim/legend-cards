import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { Button } from './Button'

export type TabListItem<T extends string> = {
  id: T
  /** The tab's label, for example "♠ Kartlar", with a count where the caller adds one. */
  label: ReactNode
}

export type TabListProps<T extends string> = {
  tabs: readonly TabListItem<T>[]
  selected: T
  onChange: (id: T) => void
  /** The tab list's name for screen readers, for example "El". */
  label: string
  /** A prefix from `useId()`, shared with the `TabPanel` the tabs control. */
  idPrefix: string
  className?: string
  /** Classes for each tab, for example to size them in a row or a column. */
  tabClassName?: string
}

/** The ID of a tab in a `TabList` with this prefix. */
function tabId(idPrefix: string, id: string): string {
  return `${idPrefix}-tab-${id}`
}

/** The ID of the panel that the tabs of a `TabList` with this prefix control. */
function tabPanelId(idPrefix: string): string {
  return `${idPrefix}-panel`
}

/**
 * A row of tabs drawn as buttons, the selected one primary (the hand's tabs and the Kütüphane's). Each tab names the
 * one panel it controls; render that panel with `TabPanel` and the same `idPrefix`.
 */
export function TabList<T extends string>({
  tabs,
  selected,
  onChange,
  label,
  idPrefix,
  className,
  tabClassName,
}: TabListProps<T>) {
  return (
    <div role="tablist" aria-label={label} className={cn('flex gap-2', className)}>
      {tabs.map(({ id, label: tabLabel }) => (
        <Button
          key={id}
          role="tab"
          id={tabId(idPrefix, id)}
          aria-selected={selected === id}
          aria-controls={tabPanelId(idPrefix)}
          variant={selected === id ? 'primary' : 'secondary'}
          onClick={() => onChange(id)}
          className={tabClassName}
        >
          {tabLabel}
        </Button>
      ))}
    </div>
  )
}

/** The panel of a `TabList`, labelled by its selected tab. */
export function TabPanel({
  idPrefix,
  selected,
  className,
  children,
}: {
  idPrefix: string
  selected: string
  className?: string
  children: ReactNode
}) {
  return (
    <div
      role="tabpanel"
      id={tabPanelId(idPrefix)}
      aria-labelledby={tabId(idPrefix, selected)}
      className={className}
    >
      {children}
    </div>
  )
}
