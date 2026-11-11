import { useId, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { CardDeck } from '@/features/cards/CardDeck'
import { CardFace } from '@/features/cards/CardFace'

import type { HandEntry } from './handEntries'
import { HandTable } from './HandTable'

type View = 'cards' | 'list'

export type HandViewProps = {
  /** The panel's heading, naming whose hand it is: "Ayla — Kart Eli". */
  title: string
  /** In hand order. */
  entries: readonly HandEntry[]
  /** Opens a card's details. */
  onSelect: (holdingId: string) => void
  /** The holding whose details show beside the hand, if any: its face glows gold and its row is marked. */
  selectedId?: string | null
}

/**
 * The hand's panel (v2.2.8's `.cards-hand-panel`): its heading, the count, and the view switch, then the hand in the
 * order received, as card faces or as a list. Each card opens its details, and each face zooms.
 */
export function HandView({ title, entries, onSelect, selectedId = null }: HandViewProps) {
  const ids = useId()
  const [view, setView] = useState<View>('cards')

  return (
    <section
      aria-labelledby={`${ids}-title`}
      className="flex flex-col gap-3 rounded-xl border border-line bg-pane p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${ids}-title`} className="font-semibold text-ink">
          {title}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
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
              isSelected={holding.id === selectedId}
              onOpen={() => onSelect(holding.id)}
              openLabel={`${card.name}: ayrıntılar`}
            />
          )}
        />
      ) : (
        <HandTable entries={entries} onSelect={onSelect} selectedId={selectedId} />
      )}
    </section>
  )
}
