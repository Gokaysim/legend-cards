import { Link } from 'react-router'

import { DEFAULT_SCREEN_PATH, screenById } from './screens'

export function NotFoundPage() {
  return (
    <section className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold text-ink">Sayfa bulunamadı</h1>
      <p className="text-ink-muted">Aradığın sayfa yok ya da taşınmış.</p>
      <Link
        to={DEFAULT_SCREEN_PATH}
        className="rounded-lg border border-control-line bg-control px-3 py-2 text-sm font-medium text-ink hover:bg-pane-raised"
      >
        {screenById('hands').label} ekranına dön
      </Link>
    </section>
  )
}
