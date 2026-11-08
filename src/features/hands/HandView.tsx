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

/** The hand in the order received, as card faces or as a list. Each card opens its details. */
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
            <li key={holding.id} className="relative">
              <CardFace
                card={card}
                handCost={cost}
                isActive={holding.active}
                hasNote={holding.note !== ''}
                isExtraCopy={isExtraCopy}
              />
              {/* The whole face opens the details; the face itself stays readable as an article. */}
              <button
                type="button"
                onClick={() => onSelect(holding.id)}
                aria-label={`${card.name}: ayrıntılar`}
                className="absolute inset-0 rounded-xl hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
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
