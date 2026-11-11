import { type ReactNode, useState } from 'react'

import { useArt } from '@/features/art/artContext'
import { CardPicture } from '@/features/art/CardPicture'
import { usePicture } from '@/features/art/usePicture'
import { cn } from '@/lib/cn'

import type { TrueWord } from './schema'
import type { KnownWordEntry } from './trueWordsContext'
import { TrueWordZoomDialog } from './TrueWordZoomDialog'

/** One active word peeking out above the hand: its picture, or v2.2.8's placeholder with ✦ and its name. */
function PeekWord({ word, onOpen }: { word: TrueWord; onOpen: () => void }) {
  const picture = usePicture(useArt().wordUrl(word.id))
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${word.name}: büyüt`}
      className="block w-26.25 cursor-zoom-in rounded-lg drop-shadow-glow-word-peek focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:w-31.5 lg:w-35"
    >
      {/* Two elements, because a `drop-shadow-*` utility holds one layer: the purple glow outside, the lift inside. */}
      <span className="block drop-shadow-lift">
        {picture.src !== null ? (
          <CardPicture
            src={picture.src}
            alt=""
            onError={picture.onError}
            className="object-contain"
          />
        ) : (
          <span className="flex aspect-[563/788] flex-col items-center justify-center gap-2 rounded-lg bg-radial-[at_50%_35%] from-stat-word to-canvas to-75% p-2 text-center">
            <span aria-hidden="true" className="text-3xl text-true-word sm:text-4xl">
              ✦
            </span>
            <span lang="en" className="text-xs font-semibold break-words text-ink sm:text-sm">
              {word.name}
            </span>
          </span>
        )}
      </span>
    </button>
  )
}

export type ActiveWordsPeekProps = {
  /** The player's known words, in the order learned. Only the active ones show. */
  entries: readonly KnownWordEntry[]
  /** The hand's panel, which the words peek out from behind. */
  children: ReactNode
}

/**
 * The hand's panel with the player's active True Words peeking out from behind its top (v2.2.8's `.cards-hand-wrap`
 * and `.tw-peek-strip`; spec: true-words, "Active True Words above the hand"; design D8). The words overlap a little,
 * in the order learned, and glow purple. Selecting one shows it large. They never widen the page: words that do not
 * fit are cut at the sides, and the summary still lists them. Without an active word, only the panel shows.
 */
export function ActiveWordsPeek({ entries, children }: ActiveWordsPeekProps) {
  const [zoomedId, setZoomedId] = useState<string | null>(null)
  const active = entries.filter((entry) => entry.record.active)
  // A word switched off on another device closes its zoom view.
  const zoomed = active.find((entry) => entry.record.id === zoomedId)
  const hasWords = active.length > 0

  return (
    <div className={cn('relative isolate min-w-0', hasWords && 'pt-20.5 sm:pt-24.5 lg:pt-27')}>
      {hasWords ? (
        <ul
          aria-label="Aktif True Words"
          className="absolute inset-x-0 top-0 flex justify-center overflow-x-clip px-5"
        >
          {active.map(({ record, word }) => (
            <li
              key={record.id}
              className="shrink-0 not-last:-mr-6 sm:not-last:-mr-6.75 lg:not-last:-mr-7.5"
            >
              <PeekWord word={word} onOpen={() => setZoomedId(record.id)} />
            </li>
          ))}
        </ul>
      ) : null}
      {/* Above the words, so it covers their lower part. */}
      <div className="relative z-1">{children}</div>
      {zoomed ? <TrueWordZoomDialog word={zoomed.word} onClose={() => setZoomedId(null)} /> : null}
    </div>
  )
}
