/** One mark of a card or word at the top of its details: "Aktif" in green, others plain ("Ek kopya"). */
export type DetailsBadge = { label: string; tone: 'active' | 'plain' }

/**
 * The marks of the selected card or word, at the top of its details (spec: card-holdings, "The card's face and labels
 * in the details"; design D1 of `redesign-selected-card-panel`).
 */
export function DetailsBadges({ badges }: { badges: readonly DetailsBadge[] }) {
  if (badges.length === 0) return null
  return (
    <ul aria-label="Durum" className="flex flex-wrap justify-end gap-1.5">
      {badges.map((badge) => (
        <li
          key={badge.label}
          data-badge={badge.tone}
          className={
            badge.tone === 'active'
              ? 'inline-flex items-center gap-1.5 rounded-full border border-green/55 bg-badge-active px-2.5 py-0.5 text-xs font-semibold text-green'
              : 'inline-flex items-center rounded-full border border-line bg-pane-raised px-2.5 py-0.5 text-xs font-medium text-ink'
          }
        >
          {badge.tone === 'active' ? (
            <span aria-hidden="true" className="size-1.75 rounded-full bg-glow-active" />
          ) : null}
          {badge.label}
        </li>
      ))}
    </ul>
  )
}
