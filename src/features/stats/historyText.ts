import { hasChannel } from '@/features/cards/pool'
import type { SetName } from '@/features/cards/display'
import type { HandCard } from '@/features/cards/schema'
import type { PackOpening } from '@/features/draws/schema'
import type { Holding } from '@/features/hands/schema'
import { packOpeningTitle } from '@/features/packs/catalog'
import { ablative, dative, genitive } from '@/lib/turkish'

import type { HistoryRow } from './cardHistory'

// The Turkish of a card's Geçmiş list (design D6 of add-card-and-set-stats). The rows are about one card, so they
// never name it: they name the people and the packs.

/** A user's name in the history: their profile name, a DM's included, or "İsimsiz oyuncu". */
export type NameOf = (uid: string) => string

/** What the texts need: the names, the sets' names for the packs, and the card itself. */
export type HistoryNames = {
  nameOf: NameOf
  setName: SetName
  card: Pick<HandCard, 'kind' | 'isRepeatable' | 'isInDraws' | 'isInSetPacks' | 'isInMechanicPacks'>
}

/** The dot of a row: how the card reached a hand, left it, changed hands, or was only seen. */
export type HistoryTone = 'given' | 'used' | 'discarded' | 'transferred' | 'seen'

export type HistoryText = {
  /** Who did what: "Ayla kullandı". */
  text: string
  /** The row's details joined with " · ", or `null` without any: "Kael üzerinde · 1 LP". */
  details: string | null
  tone: HistoryTone
}

/** The details' separator. */
const DOT = ' · '

function details(parts: readonly (string | null)[]): string | null {
  const kept = parts.filter((part): part is string => part !== null && part !== '')
  return kept.length === 0 ? null : kept.join(DOT)
}

/** Every pack's name ends in "Pack", which Turkish reads with front vowels: "Pack'ten", "Pack'inde". */
function packName(pack: PackOpening, setName: SetName): string {
  return packOpeningTitle(pack, setName)
}

/**
 * Whether the card went back to the pool when its holding closed as used or discarded: a normal or Blessed card with one
 * copy and a channel. A repeatable card never leaves the pool, a Cursed card's deck is not the pool, and a card without
 * a channel is never in it.
 */
function returnsToPool(card: HistoryNames['card']): boolean {
  return card.kind !== 'cursed' && !card.isRepeatable && hasChannel(card)
}

/** "1 LP", or "ücretsiz" for 0. */
function lp(amount: number): string {
  return amount > 0 ? `${amount} LP` : 'ücretsiz'
}

function closer(holding: Holding, nameOf: NameOf): string | null {
  return holding.returnedBy === null ? null : nameOf(holding.returnedBy)
}

/** The text, the details and the dot of one row of a card's Geçmiş list. */
export function describeHistoryRow(row: HistoryRow, names: HistoryNames): HistoryText {
  const { nameOf, setName, card } = names
  switch (row.kind) {
    case 'given': {
      const { holding } = row
      return {
        text: `${nameOf(holding.givenBy)}, ${dative(nameOf(holding.uid))} verdi`,
        details: 'Kart ver',
        tone: 'given',
      }
    }
    case 'drawn': {
      const { holding, draw } = row
      const by = draw?.by ?? holding.givenBy
      const isCursed = holding.cardKind === 'cursed'
      return {
        text:
          by === holding.uid
            ? `${nameOf(holding.uid)} çekti`
            : `${nameOf(by)}, ${genitive(nameOf(holding.uid))} eline çekti`,
        details: isCursed
          ? 'Cursed çekiliş'
          : details(['Rastgele çekiliş', draw === undefined ? null : lp(draw.cost)]),
        tone: 'given',
      }
    }
    case 'drafted': {
      const { holding, draft } = row
      const by = draft?.by ?? holding.givenBy
      return {
        text:
          by === holding.uid
            ? `${nameOf(holding.uid)}, Custom Card draft'ında yaptı`
            : `${nameOf(by)}, ${nameOf(holding.uid)} için Custom Card draft'ında yaptı`,
        details:
          draft === undefined
            ? 'Custom Card draft'
            : details([lp(draft.cost), draft.pickTypes.join(', ')]),
        tone: 'given',
      }
    }
    case 'fromPack': {
      const { holding, pack } = row
      const title = pack === undefined ? 'bir Pack' : packName(pack, setName)
      if (holding.cardKind === 'cursed') {
        return {
          text: `${title} ile ${genitive(nameOf(holding.uid))} eline geçti`,
          details: null,
          tone: 'given',
        }
      }
      return {
        text: `${nameOf(holding.uid)}, ${title}'ten seçti`,
        details: pack === undefined ? null : `Pack'i ${nameOf(pack.by)} açtı`,
        tone: 'given',
      }
    }
    case 'used': {
      const { holding } = row
      const by = holding.returnedBy ?? holding.uid
      return {
        text:
          by === holding.uid
            ? `${nameOf(holding.uid)} kullandı`
            : `${nameOf(by)}, ${genitive(nameOf(holding.uid))} kartını kullandı`,
        details: details([
          holding.usedOn === null ? null : `${holding.usedOn} üzerinde`,
          holding.useCost === null ? null : lp(holding.useCost),
          returnsToPool(card) ? 'kart havuza döndü' : null,
        ]),
        tone: 'used',
      }
    }
    case 'keptUsed': {
      const { use } = row
      return {
        text:
          use.by === use.uid
            ? `${nameOf(use.uid)} kullandı`
            : `${nameOf(use.by)}, ${genitive(nameOf(use.uid))} kartını kullandı`,
        details: details([use.usedOn === null ? null : `${use.usedOn} üzerinde`, lp(use.cost)]),
        tone: 'used',
      }
    }
    case 'discarded': {
      const { holding } = row
      return {
        text: `${genitive(nameOf(holding.uid))} elinden discard edildi`,
        details: details([
          closer(holding, nameOf),
          returnsToPool(card) ? 'kart havuza döndü' : null,
        ]),
        tone: 'discarded',
      }
    }
    case 'transferred': {
      const { holding, receiver } = row
      return {
        text:
          receiver === undefined
            ? `${genitive(nameOf(holding.uid))} elinden transfer edildi`
            : `${ablative(nameOf(holding.uid))} ${dative(nameOf(receiver.uid))} transfer edildi`,
        details: closer(holding, nameOf),
        tone: 'transferred',
      }
    }
    case 'seen': {
      const { pack } = row
      return {
        text: `${genitive(nameOf(pack.uid))} ${packName(pack, setName)}'inde göründü`,
        details:
          pack.status === 'open'
            ? 'Pack açık'
            : pack.status === 'cancelled'
              ? 'Pack iptal edildi'
              : 'Seçilmedi',
        tone: 'seen',
      }
    }
  }
}
