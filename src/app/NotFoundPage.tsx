import { useState } from 'react'

import notFoundManticore from './notFoundManticore.webp'

/** The manticore picture's own size, so the page keeps its place before it loads. */
const MANTICORE_WIDTH = 1200
const MANTICORE_HEIGHT = 922

/**
 * The not-found page (spec: app-shell, "Not-found page"): only the shy but dangerous manticore, centered, with one
 * line under it (design D6 of release-1-0-0). It is not a Cardmaker, so phones show it too. When the picture fails to
 * load, the line stays.
 */
export function NotFoundPage() {
  const [isPictureBroken, setIsPictureBroken] = useState(false)
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      {isPictureBroken ? null : (
        <img
          src={notFoundManticore}
          alt="Mahcup ama tehlikeli bir mantikor"
          width={MANTICORE_WIDTH}
          height={MANTICORE_HEIGHT}
          decoding="async"
          draggable={false}
          onError={() => setIsPictureBroken(true)}
          className="h-auto w-full max-w-2xl rounded-2xl"
        />
      )}
      <h1 className="text-base text-ink-muted">Sayfa bulunamadı</h1>
    </section>
  )
}
