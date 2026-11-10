import { Link } from 'react-router'

import { screenById, SHOP_SCREENS } from '@/app/screens'
import { PageHeader } from '@/components/ui/PageHeader'

/** The Shops hub: one large link card for each shop sub-screen. */
export function ShopsPage() {
  return (
    <section className="flex flex-col gap-6">
      <PageHeader title={screenById('shops').label} mascot={screenById('shops').mascot} />
      <ul className="grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
        {SHOP_SCREENS.map((shop) => (
          <li key={shop.id}>
            <Link
              to={shop.path}
              aria-labelledby={`shop-${shop.id}-label`}
              aria-describedby={`shop-${shop.id}-summary`}
              className="flex h-full min-h-52 flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-pane p-6 text-center transition hover:border-gold hover:bg-pane-raised hover:shadow-xl motion-safe:hover:-translate-y-1.25 motion-safe:focus-visible:-translate-y-1.25"
            >
              <span aria-hidden="true" className="text-6xl leading-none">
                {shop.icon}
              </span>
              <span id={`shop-${shop.id}-label`} className="text-xl font-semibold text-gold">
                {shop.label}
              </span>
              <span id={`shop-${shop.id}-summary`} className="text-sm text-ink-muted">
                {shop.summary}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
