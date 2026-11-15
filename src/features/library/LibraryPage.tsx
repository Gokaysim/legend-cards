import { useId, useState } from 'react'
import { useSearchParams } from 'react-router'

import {
  LIBRARY_FOR_PARAM,
  LIBRARY_TAB_PARAM,
  LIBRARY_TABS,
  type LibraryTab,
  libraryTabById,
  libraryTabOf,
  screenById,
} from '@/app/screens'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { TabList, TabPanel } from '@/components/ui/TabList'
import { type BrowserDeck, CardBrowser } from '@/features/cards/CardBrowser'
import type { Deck } from '@/features/cards/cardsContext'
import { useAddDefinition } from '@/features/definitions/useAddDefinition'
import { useCardEditing } from '@/features/definitions/useCardEditing'
import { useDeckStatus } from '@/features/hands/cardStatus'
import { TrueWordsTab } from '@/features/true-words/TrueWordsTab'

import { PoolDistributionDialog } from './PoolDistributionDialog'
import { useLibraryCounts } from './useLibraryCounts'

/** What each tab browses. */
const TAB_DECKS: Record<LibraryTab, BrowserDeck> = {
  cards: 'legend',
  cursed: 'cursed',
  'true-words': 'words',
}

/**
 * The Kütüphane (spec: card-library, "The Kütüphane screen and its tabs"): the Legend cards, the Cursed cards and the
 * True Words, each in its own tab, kept in the URL (`?tab=`). The open tab chooses the Cardmaker in the corner and the
 * DM's add control; the Kartlar tab adds "▥ Havuz Dağılımı". Only the open tab is rendered, keyed by the tab, so its
 * search and filters start afresh each time it opens (design D9 of merge-library-tabs).
 */
export function LibraryPage() {
  const ids = useId()
  const [params, setParams] = useSearchParams()
  const tab = libraryTabOf(params.get(LIBRARY_TAB_PARAM))
  const deck = TAB_DECKS[tab]
  const adding = useAddDefinition(deck)
  const counts = useLibraryCounts()
  const [isDistributionOpen, setIsDistributionOpen] = useState(false)

  const chooseTab = (next: LibraryTab) => {
    const search = new URLSearchParams(params)
    const value = libraryTabById(next).value
    if (value === null) search.delete(LIBRARY_TAB_PARAM)
    else search.set(LIBRARY_TAB_PARAM, value)
    // The chosen player belongs to the True Words tab alone.
    if (next !== 'true-words') search.delete(LIBRARY_FOR_PARAM)
    setParams(search)
  }

  const actions =
    tab === 'cards' ? (
      <>
        {adding.addButton}
        <Button onClick={() => setIsDistributionOpen(true)}>▥ Havuz Dağılımı</Button>
      </>
    ) : (
      adding.addButton
    )

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title={screenById('library').label}
        mascot={libraryTabById(tab).mascot}
        mascotPlacement="corner"
        actions={actions}
      />
      <TabList
        tabs={LIBRARY_TABS.map(({ id, label }) => ({
          id,
          label: counts[id] === undefined ? label : `${label} (${counts[id]})`,
        }))}
        selected={tab}
        onChange={chooseTab}
        label="Kütüphane"
        idPrefix={ids}
        className="flex-wrap"
        tabClassName="whitespace-nowrap"
      />
      <TabPanel idPrefix={ids} selected={tab}>
        {deck === 'words' ? <TrueWordsTab /> : <DeckTab key={deck} deck={deck} />}
      </TabPanel>
      {isDistributionOpen ? (
        <PoolDistributionDialog onClose={() => setIsDistributionOpen(false)} />
      ) : null}
      {adding.dialog}
    </section>
  )
}

/**
 * The Kartlar or the Cursed tab: every active card of the deck with where it is, live, and its history links. The DM
 * also edits the cards here, and browses the drafts and the retired cards through the status filter.
 */
function DeckTab({ deck }: { deck: Deck }) {
  const editing = useCardEditing(deck)
  const status = useDeckStatus(deck)
  return (
    <>
      <CardBrowser
        deck={deck}
        cards={editing.cards}
        status={status}
        {...editing.browserProps}
        linksHistory
      />
      {editing.dialog}
    </>
  )
}
