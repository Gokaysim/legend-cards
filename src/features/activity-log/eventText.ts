import { formatAmount, formatDelta } from '@/features/balances/format'
import type { DrawFilters } from '@/features/cards/pool'
import type { SetName } from '@/features/cards/display'
import { customCardName } from '@/features/custom-draft/draftRules'
import type { CustomDraft } from '@/features/custom-draft/schema'
import type { CardDraw, PackOpening } from '@/features/draws/schema'
import { packOpeningTitle } from '@/features/packs/catalog'
import type { Holding } from '@/features/hands/schema'
import type { SetChange, SetField } from '@/features/sets/schema'
import { PLAYER_DRAW_LABELS } from '@/features/table/playerDraw'
import type { WordDraft } from '@/features/true-words/schema'
import { ablative, accusative, dative, genitive } from '@/lib/turkish'

import type { LogEvent } from './events'

/** A piece of a sentence: Turkish text, or a card name, which is English and shown as such. */
export type SentencePart = string | { card: string }

/**
 * What an event says, after the name of the user who did it. A balance change also carries its reason. A set edit
 * carries `lines` under the sentence (the changed fields), and a set import the `names` it added.
 */
export type EventSentence = {
  parts: SentencePart[]
  reason: string | null
  lines?: readonly string[]
  names?: readonly string[]
}

/** The name of the user with this uid, as the log shows it. */
export type NameOf = (uid: string) => string

/** How the log names users and sets. */
export type LogNames = { nameOf: NameOf; setName: SetName }

/** The sentence as plain text. */
export function sentenceText(sentence: EventSentence): string {
  return sentence.parts.map((part) => (typeof part === 'string' ? part : part.card)).join('')
}

const card = (name: string): SentencePart => ({ card: name })

function usedSentence(event: LogEvent & { holding: Holding }, nameOf: NameOf): SentencePart[] {
  const { holding } = event
  const owner = event.by === holding.uid ? '' : `${genitive(nameOf(holding.uid))} `
  const where = holding.usedOn === null ? '' : ` ${holding.usedOn} üzerinde`
  // A paid use shows its payment; a free one, and one from before payments, shows none.
  const payment =
    holding.useCost !== null && holding.useCost > 0 ? ` (${formatDelta(-holding.useCost)} LP)` : ''
  return [owner, card(holding.cardName), ` kartını${where} kullandı${payment}.`]
}

const RARITY_LABELS = { common: 'Common', rare: 'Rare', blessed: 'Blessed' } as const

/**
 * A draw's filters, the DM's or a player's, as the log shows them ("filtre: Kesqerian Nights · Rare · Blood & Battle"), or `null` without
 * filters. A set shows by its official name, or by its code when no stored set has it.
 */
function filtersText(filters: DrawFilters | null, setName: SetName): string | null {
  if (filters === null) return null
  const parts = [
    filters.setCode === null ? null : setName(filters.setCode),
    filters.rarity === null ? null : RARITY_LABELS[filters.rarity],
    filters.mechanicPack,
    filters.cost === null ? null : `Cost ${filters.cost}`,
    filters.keyword === null ? null : `kelime “${filters.keyword}”`,
  ].filter((part) => part !== null)
  return parts.length === 0 ? null : `filtre: ${parts.join(' · ')}`
}

/**
 * A draw: "Aboleth's Eyes kartını çekti (−1 LP).", with the price paid, whatever it was ("−3 LP"), and none for a free
 * draw. Into another hand (the DM's draw): "Bora'ya Aboleth's Eyes kartını çekti (filtre: Rare · Blood & Battle).", or
 * "(−2 LP)" when the DM charged Bora's LP. A Cursed draw: "Cursed kart çekti: Visions of Death."
 */
function drawnSentence(draw: CardDraw, { nameOf, setName }: LogNames): SentencePart[] {
  const into = draw.by === draw.uid ? '' : `${dative(nameOf(draw.uid))} `
  if (draw.kind === 'cursed') return [`${into}Cursed kart çekti: `, card(draw.cardName), '.']
  const details = [
    draw.paidWith === 'lp' ? `${formatDelta(-draw.cost)} LP` : null,
    filtersText(draw.filters, setName),
  ].filter((part) => part !== null)
  const suffix = details.length === 0 ? '' : ` (${details.join('; ')})`
  return [into, card(draw.cardName), ` kartını çekti${suffix}.`]
}

/** A pack's payment as the log shows it: "−2 LP", "−7.500 GP", or "ücretsiz". */
function packPayment(pack: PackOpening): string {
  if (pack.paidWith === 'none') return 'ücretsiz'
  return `${formatDelta(-pack.cost)} ${pack.paidWith === 'lp' ? 'LP' : 'GP'}`
}

/**
 * A pack opening, as it stands: "Kesqerian Nights Standard Pack açıyor (−2 LP).", then "… açtı ve Aboleth's Eyes
 * kartını seçti (−2 LP).", with the mandatory Cursed card of a Cursed type, or "… açtı (−2 LP); DM iptal etti,
 * 2 LP iade edildi.". The hand comes first when the opener is not its owner ("Bora için …"), and "(seçimi DM
 * yaptı)" when the DM chose for someone else's pack.
 */
function packSentence(pack: PackOpening, { nameOf, setName }: LogNames): SentencePart[] {
  const into = pack.by === pack.uid ? '' : `${nameOf(pack.uid)} için `
  const title = packOpeningTitle(pack, setName)
  const payment = packPayment(pack)
  if (pack.status === 'open') return [`${into}${title} açıyor (${payment}).`]
  if (pack.status === 'cancelled') {
    const refund =
      pack.paidWith === 'none'
        ? ''
        : `, ${formatAmount(pack.cost)} ${pack.paidWith === 'lp' ? 'LP' : 'GP'} iade edildi`
    return [`${into}${title} açtı (${payment}); DM iptal etti${refund}.`]
  }
  const chosenByDm =
    pack.closedBy !== null && pack.closedBy !== pack.by && pack.closedBy !== pack.uid
  return [
    `${into}${title} açtı ve `,
    card(pack.chosen?.cardName ?? ''),
    ' kartını seçti',
    ...(pack.cursed === null ? [] : ['; Cursed kart: ', card(pack.cursed.cardName)]),
    `${chosenByDm ? ' (seçimi DM yaptı)' : ''} (${payment}).`,
  ]
}

/**
 * A True Word draft, as it stands: "True Word draft'ı açıyor (−3 LP).", then "… açtı ve Abyss True Word'ünü öğrendi
 * (−3 LP).", "… açtı (ücretsiz); Bora pas geçti.", or "… açtı (−3 LP); DM iptal etti, 3 LP iade edildi.". The player
 * comes first when the starter is not the player ("Bora için …"), and "(seçimi DM yaptı)" when the DM learned for the
 * player.
 */
function draftSentence(draft: WordDraft, nameOf: NameOf): SentencePart[] {
  const into = draft.by === draft.uid ? '' : `${nameOf(draft.uid)} için `
  const payment = draft.paidWith === 'none' ? 'ücretsiz' : `${formatDelta(-draft.cost)} LP`
  const closer = draft.closedBy === null || draft.closedBy === draft.uid ? nameOf(draft.uid) : 'DM'
  switch (draft.status) {
    case 'open':
      return [`${into}True Word draft'ı açıyor (${payment}).`]
    case 'skipped':
      return [`${into}True Word draft'ı açtı (${payment}); ${closer} pas geçti.`]
    case 'cancelled': {
      const refund = draft.paidWith === 'none' ? '' : `, ${formatAmount(draft.cost)} LP iade edildi`
      return [`${into}True Word draft'ı açtı (${payment}); DM iptal etti${refund}.`]
    }
    case 'learned': {
      const learnedByDm = draft.closedBy !== null && draft.closedBy !== draft.uid
      return [
        `${into}True Word draft'ı açtı ve `,
        card(draft.learned?.cardName ?? ''),
        ` True Word'ünü öğrendi${learnedByDm ? ' (seçimi DM yaptı)' : ''} (${payment}).`,
      ]
    }
  }
}

/**
 * A Custom Card draft (spec: activity-log, "A Custom Card draft is one event"): open, finished with the card and its
 * effect types, or cancelled by the DM with its refund. One event for the draft, its card, its payment and its refund.
 */
function customDraftSentence(draft: CustomDraft, nameOf: NameOf): SentencePart[] {
  const into = draft.by === draft.uid ? '' : `${nameOf(draft.uid)} için `
  const payment = draft.paidWith === 'none' ? 'ücretsiz' : `${formatDelta(-draft.cost)} LP`
  const name = customCardName(draft.base)
  switch (draft.status) {
    case 'open':
      return [`${into}${name} draft'ı açıyor (${payment}).`]
    case 'cancelled': {
      const refund = draft.paidWith === 'none' ? '' : `, ${formatAmount(draft.cost)} LP iade edildi`
      return [`${into}${name} draft'ı açtı (${payment}); DM iptal etti${refund}.`]
    }
    case 'finished': {
      const byDm = draft.closedBy !== null && draft.closedBy !== draft.uid
      return [
        `${into}Custom Card draft'ı açtı ve `,
        card(name),
        ` kartını yaptı${byDm ? ' (son seçimi DM yaptı)' : ''} (${payment}): ${draft.pickTypes.join(', ')}.`,
      ]
    }
  }
}

/** The set fields as an edit's event names them (spec: activity-log, "Set changes are events"). */
const SET_FIELD_LABELS: Readonly<Record<SetField, string>> = {
  name: 'Ad',
  aliases: "Alias'lar",
  packLayout: 'Paketler',
  cardback: 'Cardback',
  mascot: 'Cardmaker',
}

/**
 * A set change: "Ballad of Ulagal setini düzenledi.", with the changed fields' names below and never their values, or
 * "… setini sırada yukarı taşıdı.". The set import: "12 set ekledi.", "12 sete resim ekledi." or both, with the names.
 */
function setSentence(change: SetChange): EventSentence {
  const name = change.name ?? change.code ?? ''
  switch (change.step) {
    case 'added':
      return { parts: [`${name} setini ekledi.`], reason: null }
    case 'edited':
      return {
        parts: [`${name} setini düzenledi.`],
        reason: null,
        lines: [change.fields.map((field) => SET_FIELD_LABELS[field]).join(', ')],
      }
    case 'moved':
      return {
        parts: [
          `${name} setini sırada ${change.direction === 'down' ? 'aşağı' : 'yukarı'} taşıdı.`,
        ],
        reason: null,
      }
    case 'deleted':
      return { parts: [`${name} setini sildi.`], reason: null }
    case 'imported': {
      const sentences = [
        change.added.length > 0 ? `${formatAmount(change.added.length)} set ekledi` : null,
        change.pictured.length > 0
          ? `${formatAmount(change.pictured.length)} sete resim ekledi`
          : null,
      ].filter((part) => part !== null)
      return {
        parts: [`${sentences.join('; ')}.`],
        reason: null,
        names: [...new Set([...change.added, ...change.pictured])],
      }
    }
  }
}

/**
 * The Turkish sentence of an event. For a transfer with one side missing, `other` is that side once it is read;
 * until then the sentence leaves out the name it cannot know.
 */
export function describeEvent(
  event: LogEvent,
  names: LogNames,
  other: Holding | null = null,
): EventSentence {
  const { nameOf } = names
  switch (event.kind) {
    case 'given':
      return {
        parts: [
          card(event.holding.cardName),
          ` kartını ${dative(nameOf(event.holding.uid))} verdi.`,
        ],
        reason: null,
      }
    case 'used':
      return { parts: usedSentence(event, nameOf), reason: null }
    case 'discarded':
      return {
        parts: [
          // The holder's own discard does not repeat whose hand it was, as a use does not.
          event.by === event.holding.uid ? '' : `${genitive(nameOf(event.holding.uid))} elinden `,
          card(event.holding.cardName),
          ' kartını attı.',
        ],
        reason: null,
      }
    case 'transferred': {
      // The side that is missing from the records is `other`, once it is read.
      const fromUid = event.from?.uid ?? other?.uid ?? null
      const toUid = event.to?.uid ?? other?.uid ?? null
      const route = [
        fromUid === null ? null : ablative(nameOf(fromUid)),
        toUid === null ? null : dative(nameOf(toUid)),
      ]
        .filter((name) => name !== null)
        .join(' ')
      return {
        parts: [
          card(event.cardName),
          ` kartını${route === '' ? ' başka bir ele' : ` ${route}`} verdi.`,
        ],
        reason: null,
      }
    }
    case 'drawn':
      return { parts: drawnSentence(event.draw, names), reason: null }
    case 'pack':
      return { parts: packSentence(event.pack, names), reason: null }
    case 'wordDraft':
      return { parts: draftSentence(event.draft, nameOf), reason: null }
    case 'customDraft':
      return { parts: customDraftSentence(event.draft, nameOf), reason: null }
    case 'wordTaught':
      return {
        parts: [
          `${dative(nameOf(event.record.uid))} `,
          card(event.record.wordName),
          " True Word'ünü öğretti.",
        ],
        reason: null,
      }
    case 'wordUsed':
    case 'keptUsed': {
      const { use } = event
      // The DM's use of a player's word or card names the player; a free use shows no payment. A card kept on use
      // reads as any card's use (spec: activity-log, "A kept card's use is one event").
      const owner = event.by === use.uid ? '' : `${genitive(nameOf(use.uid))} `
      const payment = use.cost > 0 ? ` (${formatDelta(-use.cost)} LP)` : ''
      const its = event.kind === 'wordUsed' ? " True Word'ünü" : ' kartını'
      return {
        parts: [
          owner,
          card(use.cardName),
          `${its}${use.usedOn === null ? '' : ` ${use.usedOn} üzerinde`} kullandı${payment}.`,
        ].filter((part) => part !== ''),
        reason: null,
      }
    }
    case 'wordTakenBack':
      return {
        parts: [
          `${ablative(nameOf(event.record.uid))} `,
          card(event.record.wordName),
          " True Word'ünü geri aldı.",
        ],
        reason: null,
      }
    case 'balance': {
      const { entry } = event
      const owner = entry.currency === 'gp' ? 'Grup kesesi' : nameOf(entry.account)
      const unit = entry.currency === 'gp' ? 'GP' : 'LP'
      const before = entry.balanceAfter - entry.delta
      return {
        parts: [
          `${owner}: ${formatDelta(entry.delta)} ${unit} (${formatAmount(before)} → ${formatAmount(entry.balanceAfter)})`,
        ],
        reason: entry.reason,
      }
    }
    case 'set':
      return setSentence(event.change)
    case 'tableSetting':
      // spec: activity-log, "Player draw mode changes are events" and "Dice channel resets are events".
      return event.change.setting === 'diceReset'
        ? { parts: [`zar kanalını sıfırladı: ${event.change.rolls} atış.`], reason: null }
        : {
            parts: [`oyuncu kart çekişini “${PLAYER_DRAW_LABELS[event.change.after]}” yaptı.`],
            reason: null,
          }
    case 'fight':
      // spec: activity-log, "Fights are events".
      return {
        parts: [
          event.change.step === 'start'
            ? `savaşı başlattı: ${String(event.change.count)} katılımcı.`
            : `savaşı bitirdi: ${String(event.change.count)} tur.`,
        ],
        reason: null,
      }
    case 'role': {
      // spec: activity-log, "DM role changes are events".
      const { change } = event
      const target = names.nameOf(change.target)
      return {
        parts: [
          change.after === 'dm'
            ? `${accusative(target)} DM yaptı.`
            : change.target === change.by
              ? "DM'likten çıktı."
              : `${genitive(target)} DM'liğini aldı.`,
        ],
        reason: null,
      }
    }
  }
}
