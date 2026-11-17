import { formatAmount, formatDelta } from '@/features/balances/format'
import type { DrawFilters } from '@/features/cards/pool'
import type { SetName } from '@/features/cards/display'
import { BEHAVIOR_FLAGS, flagLabel } from '@/features/definitions/flags'
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
import type { SetChange, SetField } from '@/features/sets/schema'
import { PLAYER_DRAW_LABELS } from '@/features/table/playerDraw'
import { costLabel } from '@/features/true-words/display'
import type { WordDraft } from '@/features/true-words/schema'
import { ablative, accusative, dative, genitive } from '@/lib/turkish'

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
 * A draw: "Aboleth's Eyes kartını çekti (−1 LP).", or into another hand (the DM's draw) "Bora'ya Aboleth's Eyes
 * kartını çekti (filtre: Rare · Blood & Battle)." A Cursed draw: "Cursed kart çekti: Visions of Death."
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

const NONE = '—'
const KIND_LABELS = {
  normal: 'Normal',
  blessed: 'Blessed',
  cursed: 'Cursed',
  trueWord: 'True Word',
} as const
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
function shownValue(field: string, value: string | null | undefined, setName: SetName): string {
  if (value === null || value === undefined || value === '') return NONE
  if (field === 'setCode') return setName(value)
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
 * Each behavior flag turned on or off, in the form's order, with the form's label (spec: activity-log, "Behavior flags
 * in the log"): "Kart çekmede çıkar: evet → hayır".
 */
function flagLines(change: DefinitionStepRecord): string[] {
  const { before, after } = change
  if (before === null || after === null) return []
  const shown = (on: boolean) => (on ? 'evet' : 'hayır')
  return BEHAVIOR_FLAGS.filter((flag) => before[flag] !== after[flag]).map(
    (flag) => `${flagLabel(flag, after.kind)}: ${shown(before[flag])} → ${shown(after[flag])}`,
  )
}

/**
 * Each changed field as "Cost: 2 → 3" (spec: activity-log, "Definition changes are events"). A text is compared by its
 * visible part; when only the bracket text changed, the line says so and shows none of it ("Text changes in the log").
 * The behavior flags that changed, then a picture change, come last.
 */
function changedLines(change: DefinitionStepRecord, setName: SetName): string[] {
  const { before, after } = change
  if (before === null || after === null) return []
  const fields = change.target === 'card' ? CARD_FIELDS : WORD_FIELDS
  const picture = pictureLine(before.picture, after.picture)
  const extra = [...flagLines(change), ...(picture === null ? [] : [picture])]
  const lines = fields.flatMap(([field, label]: readonly [keyof CardSnapshot, string]) => {
    // Every field a log line names is text or empty.
    const old = (before[field] as string | null) ?? null
    const next = (after[field] as string | null) ?? null
    if (old === next) return []
    if (field === 'text') {
      const shownOld = visibleText(old ?? '')
      const shownNext = visibleText(next ?? '')
      return shownOld === shownNext
        ? [`${label}: metnin gizli kısmı değişti`]
        : [`${label}: “${shownOld || NONE}” → “${shownNext || NONE}”`]
    }
    return [`${label}: ${shownValue(field, old, setName)} → ${shownValue(field, next, setName)}`]
  })
  return [...lines, ...extra]
}

/**
 * A definition as a publish shows it: its set, rarity, mechanic pack and cost, then its visible text, and "Resimli"
 * when it has a picture.
 */
function definitionLines(change: DefinitionStepRecord, setName: SetName): string[] {
  const { after } = change
  if (after === null) return []
  const lines = fieldLines(change, setName)
  return after.picture === null ? lines : [...lines, 'Resimli']
}

function fieldLines(change: DefinitionStepRecord, setName: SetName): string[] {
  const { after } = change
  if (after === null) return []
  const text = visibleText(after.text) || NONE
  if (change.target === 'word') return [`Cost ${costLabel(after.cost)}`, text]
  const cardAfter = after
  const where =
    cardAfter.kind === 'normal'
      ? [
          shownValue('setCode', cardAfter.setCode, setName),
          shownValue('rarity', cardAfter.rarity, setName),
        ]
      : [KIND_LABELS[cardAfter.kind]]
  const pack =
    cardAfter.kind === 'cursed' ? [] : [shownValue('mechanicPack', cardAfter.mechanicPack, setName)]
  return [
    [...where, ...pack, `Cost ${shownValue('cost', cardAfter.cost, setName)}`].join(' · '),
    text,
  ]
}

/** A DM step on a card or a True Word: "Aboleth's Eyes kartını düzenledi.", with the changed fields below. */
function definitionSentence(change: DefinitionStepRecord, setName: SetName): EventSentence {
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
            lines: definitionLines(change, setName),
          }
    case 'edited':
      return {
        parts: [name, `${its} düzenledi.`],
        reason: null,
        lines: changedLines(change, setName),
      }
    case 'published':
      return {
        parts: [name, `${its} yayınladı.`],
        reason: null,
        lines: definitionLines(change, setName),
      }
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
 * ekledi.", "1 taslak True Word'e resim ekledi." or "1 gizli karta resim ekledi." for definitions not listed for
 * players, with the names that got one.
 */
function importSentence(change: ImportRecord): EventSentence {
  const isWord = change.target === 'word'
  const draft = change.public
    ? ''
    : change.items.every((item) => item.status === 'draft')
      ? 'taslak '
      : 'gizli '
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
    case 'definition':
      return definitionSentence(event.change, names.setName)
    case 'import':
      return importSentence(event.change)
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
