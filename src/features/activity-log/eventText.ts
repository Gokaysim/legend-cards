import { formatAmount, formatDelta } from '@/features/balances/format'
import type { DrawFilters } from '@/features/cards/pool'
import { setDisplayName } from '@/features/cards/sets'
import { DM_ONLY_LABEL } from '@/features/cards/status'
import { visibleText } from '@/features/cards/text'
import type {
  CardSnapshot,
  DefinitionStepRecord,
  ImportRecord,
  WordSnapshot,
} from '@/features/definitions/schema'
import type { CardDraw, PackOpening } from '@/features/draws/schema'
import { packOpeningTitle } from '@/features/packs/catalog'
import type { Holding } from '@/features/hands/schema'
import { costLabel } from '@/features/true-words/display'
import type { WordDraft } from '@/features/true-words/schema'
import { ablative, dative, genitive } from '@/lib/turkish'

import type { LogEvent } from './events'

/** A piece of a sentence: Turkish text, or a card name, which is English and shown as such. */
export type SentencePart = string | { card: string }

/**
 * What an event says, after the name of the user who did it. A balance change also carries its reason. A definition
 * change carries `lines` under the sentence (each changed field, or the published definition), and an import the
 * `names` it added.
 */
export type EventSentence = {
  parts: SentencePart[]
  reason: string | null
  lines?: readonly string[]
  names?: readonly string[]
}

/** The name of the user with this uid, as the log shows it. */
export type NameOf = (uid: string) => string

/** The sentence as plain text. */
export function sentenceText(sentence: EventSentence): string {
  return sentence.parts.map((part) => (typeof part === 'string' ? part : part.card)).join('')
}

const card = (name: string): SentencePart => ({ card: name })

function usedSentence(event: LogEvent & { holding: Holding }, nameOf: NameOf): SentencePart[] {
  const { holding } = event
  const owner = event.by === holding.uid ? '' : `${genitive(nameOf(holding.uid))} `
  const where = holding.usedOn === null ? '' : ` ${holding.usedOn} üzerinde`
  return [owner, card(holding.cardName), ` kartını${where} kullandı.`]
}

const RARITY_LABELS = { common: 'Common', rare: 'Rare', blessed: 'Blessed' } as const

/** The DM's filters as the log shows them ("filtre: Rare · Blood & Battle"), or `null` without filters. */
function filtersText(filters: DrawFilters | null): string | null {
  if (filters === null) return null
  const parts = [
    filters.rarity === null ? null : RARITY_LABELS[filters.rarity],
    filters.mechanicPack,
    filters.cost === null ? null : `Cost ${filters.cost}`,
    filters.keyword === null ? null : `kelime “${filters.keyword}”`,
  ].filter((part) => part !== null)
  return parts.length === 0 ? null : `filtre: ${parts.join(' · ')}`
}

/**
 * A draw: "Aboleth's Eyes kartını çekti (−1 LP).", or into another hand (the DM's draw) "Bora'ya Aboleth's Eyes
 * kartını çekti (filtre: Rare · Blood & Battle)." A Cursed draw: "Cursed kart çekti: Visions of Death."
 */
function drawnSentence(draw: CardDraw, nameOf: NameOf): SentencePart[] {
  const into = draw.by === draw.uid ? '' : `${dative(nameOf(draw.uid))} `
  if (draw.kind === 'cursed') return [`${into}Cursed kart çekti: `, card(draw.cardName), '.']
  const details = [
    draw.paidWith === 'lp' ? `${formatDelta(-draw.cost)} LP` : null,
    filtersText(draw.filters),
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
function packSentence(pack: PackOpening, nameOf: NameOf): SentencePart[] {
  const into = pack.by === pack.uid ? '' : `${nameOf(pack.uid)} için `
  const title = packOpeningTitle(pack)
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
        card(draft.learned?.wordName ?? ''),
        ` True Word'ünü öğrendi${learnedByDm ? ' (seçimi DM yaptı)' : ''} (${payment}).`,
      ]
    }
  }
}

const NONE = '—'
const KIND_LABELS = { normal: 'Normal', blessed: 'Blessed', cursed: 'Cursed' } as const
const CARD_RARITY_LABELS = { common: 'Common', rare: 'Rare' } as const

/** The card fields a log line names, in the order the form shows them, with their Turkish labels. */
const CARD_FIELDS = [
  ['name', 'Ad'],
  ['kind', 'Tür'],
  ['setCode', 'Set'],
  ['rarity', 'Rarity'],
  ['mechanicPack', 'Mechanic Pack'],
  ['cost', 'Cost'],
  ['text', 'Metin'],
] as const satisfies readonly (readonly [keyof CardSnapshot, string])[]

const WORD_FIELDS = [
  ['name', 'Ad'],
  ['cost', 'Cost'],
  ['text', 'Metin'],
] as const satisfies readonly (readonly [keyof WordSnapshot, string])[]

/** A field's value as the log shows it: the official set name, "Common", "Blessed", or "—" for none. */
function shownValue(field: string, value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return NONE
  if (field === 'setCode') return setDisplayName(value)
  if (field === 'rarity') return CARD_RARITY_LABELS[value as 'common' | 'rare']
  if (field === 'kind') return KIND_LABELS[value as keyof typeof KIND_LABELS]
  return value
}

/**
 * A picture change in Turkish (spec: activity-log, "Picture changes in the log"), never with the picture's address:
 * `null` when the picture stayed the same.
 */
function pictureLine(before: string | null, after: string | null): string | null {
  if (before === after) return null
  if (before === null) return 'Resim: eklendi'
  return after === null ? 'Resim: kaldırıldı' : 'Resim: değişti'
}

/**
 * A card's DM-only flag turned on or off (spec: activity-log, "The DM-only flag in the log"): `null` when it stayed the
 * same, and always for a True Word, which has no flag.
 */
function dmOnlyLine(change: DefinitionStepRecord): string | null {
  if (change.target !== 'card' || change.before === null || change.after === null) return null
  if (change.before.dmOnly === change.after.dmOnly) return null
  const shown = (dmOnly: boolean) => (dmOnly ? 'evet' : 'hayır')
  return `${DM_ONLY_LABEL}: ${shown(change.before.dmOnly)} → ${shown(change.after.dmOnly)}`
}

/**
 * Each changed field as "Cost: 2 → 3" (spec: activity-log, "Definition changes are events"). A text is compared by its
 * visible part; when only the bracket text changed, the line says so and shows none of it ("Text changes in the log").
 * A change of the DM-only flag, then a picture change, come last.
 */
function changedLines(change: DefinitionStepRecord): string[] {
  const { before, after } = change
  if (before === null || after === null) return []
  const fields = change.target === 'card' ? CARD_FIELDS : WORD_FIELDS
  const extra = [dmOnlyLine(change), pictureLine(before.picture, after.picture)].filter(
    (line) => line !== null,
  )
  const lines = fields.flatMap(([field, label]) => {
    // Every field a log line names is text or empty.
    const old = (before as Record<string, string | null>)[field] ?? null
    const next = (after as Record<string, string | null>)[field] ?? null
    if (old === next) return []
    if (field === 'text') {
      const shownOld = visibleText(old ?? '')
      const shownNext = visibleText(next ?? '')
      return shownOld === shownNext
        ? [`${label}: metnin gizli kısmı değişti`]
        : [`${label}: “${shownOld || NONE}” → “${shownNext || NONE}”`]
    }
    return [`${label}: ${shownValue(field, old)} → ${shownValue(field, next)}`]
  })
  return [...lines, ...extra]
}

/**
 * A definition as a publish shows it: its set, rarity, mechanic pack and cost, then its visible text, and "Resimli"
 * when it has a picture.
 */
function definitionLines(change: DefinitionStepRecord): string[] {
  const { after } = change
  if (after === null) return []
  return after.picture === null ? fieldLines(change) : [...fieldLines(change), 'Resimli']
}

function fieldLines(change: DefinitionStepRecord): string[] {
  const { after } = change
  if (after === null) return []
  const text = visibleText(after.text) || NONE
  if (change.target === 'word') return [`Cost ${costLabel(after.cost)}`, text]
  const cardAfter = after as CardSnapshot
  const where =
    cardAfter.kind === 'normal'
      ? [shownValue('setCode', cardAfter.setCode), shownValue('rarity', cardAfter.rarity)]
      : [KIND_LABELS[cardAfter.kind]]
  const pack =
    cardAfter.kind === 'cursed' ? [] : [shownValue('mechanicPack', cardAfter.mechanicPack)]
  return [[...where, ...pack, `Cost ${shownValue('cost', cardAfter.cost)}`].join(' · '), text]
}

/** A DM step on a card or a True Word: "Aboleth's Eyes kartını düzenledi.", with the changed fields below. */
function definitionSentence(change: DefinitionStepRecord): EventSentence {
  const isWord = change.target === 'word'
  const name = card(change.name)
  const its = isWord ? " True Word'ünü" : ' kartını'
  const what = isWord ? 'True Word' : 'kart'
  switch (change.step) {
    case 'added':
      return change.after?.status === 'draft'
        ? { parts: [`Taslak ${what} ekledi: `, name, '.'], reason: null }
        : {
            parts: [`${isWord ? 'True Word' : 'Kart'} ekledi ve yayınladı: `, name, '.'],
            reason: null,
            lines: definitionLines(change),
          }
    case 'edited':
      return { parts: [name, `${its} düzenledi.`], reason: null, lines: changedLines(change) }
    case 'published':
      return { parts: [name, `${its} yayınladı.`], reason: null, lines: definitionLines(change) }
    case 'retired':
      return { parts: [name, `${its} kaldırdı.`], reason: null }
    case 'restored':
      return { parts: [name, `${its} yeniden yayına aldı.`], reason: null }
    case 'deleted':
      return { parts: ['Taslak ', name, `${its} sildi.`], reason: null }
  }
}

/**
 * An import: "742 kart ekledi." or "3 taslak kart ekledi.", with the names it added. A picture import: "700 karta resim
 * ekledi.", "1 taslak True Word'e resim ekledi." or "1 DM'e özel karta resim ekledi.", with the names that got one.
 */
function importSentence(change: ImportRecord): EventSentence {
  const isWord = change.target === 'word'
  const draft = change.public
    ? ''
    : change.items.every((item) => item.status === 'draft')
      ? 'taslak '
      : `${DM_ONLY_LABEL} `
  const count = formatAmount(change.items.length)
  const sentence =
    change.what === 'pictures'
      ? `${count} ${draft}${isWord ? "True Word'e" : 'karta'} resim ekledi.`
      : `${count} ${draft}${isWord ? 'True Word' : 'kart'} ekledi.`
  return {
    parts: [sentence],
    reason: null,
    names: change.items.map((item) => item.name),
  }
}

/**
 * The Turkish sentence of an event. For a transfer with one side missing, `other` is that side once it is read;
 * until then the sentence leaves out the name it cannot know.
 */
export function describeEvent(
  event: LogEvent,
  nameOf: NameOf,
  other: Holding | null = null,
): EventSentence {
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
          `${genitive(nameOf(event.holding.uid))} elinden `,
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
      return { parts: drawnSentence(event.draw, nameOf), reason: null }
    case 'pack':
      return { parts: packSentence(event.pack, nameOf), reason: null }
    case 'wordDraft':
      return { parts: draftSentence(event.draft, nameOf), reason: null }
    case 'wordTaught':
      return {
        parts: [
          `${dative(nameOf(event.record.uid))} `,
          card(event.record.wordName),
          " True Word'ünü öğretti.",
        ],
        reason: null,
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
    case 'definition':
      return definitionSentence(event.change)
    case 'import':
      return importSentence(event.change)
  }
}
