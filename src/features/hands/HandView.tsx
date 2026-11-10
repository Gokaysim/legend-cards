import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { CardDeck } from '@/features/cards/CardDeck'
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
        <CardDeck
          as="ol"
          label="Eldeki kartlar"
          deck="hand"
          items={entries}
          itemKey={(entry) => entry.holding.id}
          renderItem={({ holding, card, cost, isExtraCopy }) => (
            // The face opens the details; its magnifier opens the zoom view instead.
            <CardFace
              card={card}
              handCost={cost}
              isTiltable
              isActive={holding.active}
              hasNote={holding.note !== ''}
              isExtraCopy={isExtraCopy}
              onOpen={() => onSelect(holding.id)}
              openLabel={`${card.name}: ayrıntılar`}
            />
          )}
        />
      ) : (
        <HandTable entries={entries} onSelect={onSelect} />
      )}
    </div>
  )
}
