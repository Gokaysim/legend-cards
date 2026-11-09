import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { CardFace } from '@/features/cards/CardFace'

import type { HandEntry } from './handEntries'
import { HandTable } from './HandTable'

type View = 'cards' | 'list'

export type HandViewProps = {
  /** In hand order. */
  entries: readonly HandEntry[]
  /** Opens a card's details. */
  onSelect: (holdingId: string) => void
}

/** The hand in the order received, as card faces or as a list. Each card opens its details, and each face zooms. */
export function HandView({ entries, onSelect }: HandViewProps) {
  const [view, setView] = useState<View>('cards')

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-muted">{entries.length} kart · alınış sırası</p>
        <div role="group" aria-label="Görünüm" className="flex gap-2">
          <Button
            variant={view === 'cards' ? 'primary' : 'secondary'}
            aria-pressed={view === 'cards'}
            onClick={() => setView('cards')}
          >
            ▦ Kartlar
          </Button>
          <Button
            variant={view === 'list' ? 'primary' : 'secondary'}
            aria-pressed={view === 'list'}
            onClick={() => setView('list')}
          >
            ☷ Liste
          </Button>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-xl border border-line bg-pane p-6 text-ink-muted">
          Bu elde henüz kart yok.
        </p>
      ) : view === 'cards' ? (
        <ol
          aria-label="Eldeki kartlar"
          className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3"
        >
          {entries.map(({ holding, card, cost, isExtraCopy }) => (
            <li key={holding.id}>
              {/* The face opens the details; its magnifier opens the zoom view instead. */}
              <CardFace
                card={card}
                handCost={cost}
                isActive={holding.active}
                hasNote={holding.note !== ''}
                isExtraCopy={isExtraCopy}
                onOpen={() => onSelect(holding.id)}
                openLabel={`${card.name}: ayrıntılar`}
              />
            </li>
          ))}
        </ol>
      ) : (
        <HandTable entries={entries} onSelect={onSelect} />
      )}
    </div>
  )
}
