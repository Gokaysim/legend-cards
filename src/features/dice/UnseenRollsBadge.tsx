import { unseenLabel, useUnseenRolls } from './unseen'

/** The menu's count of rolls this device has not shown the user, "9+" above 9, or nothing (design D9). */
export function UnseenRollsBadge() {
  const count = useUnseenRolls()
  const label = unseenLabel(count)
  if (label === null) return null
  return (
    <span
      data-testid="unseen-rolls"
      className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-xs font-extrabold text-canvas"
    >
      <span className="sr-only">Görülmemiş atış: </span>
      {label}
    </span>
  )
}
