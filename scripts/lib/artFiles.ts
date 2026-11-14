import { normalize } from './cardCatalog.ts'
import type { CardDefinition, CardKind } from './cardRows.ts'
import { normalizeHeader, readRecords } from './csv.ts'
import { cardId } from './importCards.ts'
import { trueWordId } from './importTrueWords.ts'
import type { TrueWordDefinition } from './trueWordRows.ts'

// Matching the owner's picture files to cards, True Words, sets, cardbacks, packs and the Cardmaker (design D2, D3 of
// add-card-images). Pure: no files, no Firebase. Three scripts plan with it, each its own files (design D9, D10 of
// upload-card-and-word-pictures, D10 of add-set-management): `build-art` plans the assets (the Blessed and Cursed
// cardbacks, the packs and the screens' Cardmaker), `import-sets` the sets' cardbacks and Cardmakers against the
// stored sets, and `import-pictures` the cards and True Words against the stored definitions. Each leaves the other
// files to the other two.

/**
 * Where each group's pictures go: the manifest's sections for the built ones, and the card, word and set pictures in
 * Cloud Storage.
 */
export type ArtSection = 'cards' | 'words' | 'sets' | 'cardbacks' | 'packs' | 'mascots'

/** What the report counts, in its order. A group belongs to one section. */
export const ART_GROUPS = [
  'normal',
  'blessed',
  'cursed',
  'word',
  'back',
  'pack',
  'mascot',
  'setBack',
  'setMascot',
] as const
export type ArtGroup = (typeof ART_GROUPS)[number]

export const SECTION_OF_GROUP: Readonly<Record<ArtGroup, ArtSection>> = {
  normal: 'cards',
  blessed: 'cards',
  cursed: 'cards',
  word: 'words',
  back: 'cardbacks',
  pack: 'packs',
  mascot: 'mascots',
  setBack: 'sets',
  setMascot: 'sets',
}

/**
 * One thing a picture shows. `key` is its key in its section: a card or word document ID, a set ID (for a set's
 * cardback and Cardmaker), `blessed` or `cursed`, a pack key as `PackDef.key` writes it, or a mascot stem. `label`
 * names it in the report.
 */
export type ArtTarget = { group: ArtGroup; key: string; label: string }

/** A picture file. `name` is the file name with its extension; the rest is the caller's (its path, its archive). */
export type ArtFile = { name: string }

/** A stored definition as pictures are matched against it: its document ID, its name and its normalized name. */
export type ArtDefinition = { id: string; name: string; nameKey: string }

/** A stored card: a definition with its kind. */
export type ArtCard = ArtDefinition & { kind: CardKind }

/** A stored set as its pictures are matched against it: its document ID and every way to spell it. */
export type ArtSet = { setId: string; code: string; name: string; aliases: readonly string[] }

/** The stored definitions and sets the card, word and set pictures are matched against, whatever their status. */
export type ArtData = {
  /** Normal and Blessed cards (`legend-…`). */
  legend: readonly ArtCard[]
  /** Cursed cards (`cursed-…`). */
  cursed: readonly ArtCard[]
  words: readonly ArtDefinition[]
  /** The sets, in their order. */
  sets: readonly ArtSet[]
}

/** No definitions and no sets: what the picture build plans against, since it builds no card, word or set picture. */
export const NO_DEFINITIONS: ArtData = { legend: [], cursed: [], words: [], sets: [] }

/**
 * The definitions the repository's files would store, with the IDs an import gives them. Tests plan the archives
 * against these, as a stand-in for the stored ones.
 */
export function definitionsOfRows(
  legend: readonly CardDefinition[],
  cursed: readonly CardDefinition[],
  words: readonly TrueWordDefinition[],
): ArtData {
  const card = (deck: 'legend' | 'cursed') => (row: CardDefinition) => ({
    id: cardId(deck, row.nameKey),
    kind: row.kind,
    name: row.name,
    nameKey: row.nameKey,
  })
  return {
    legend: legend.map(card('legend')),
    cursed: cursed.map(card('cursed')),
    words: words.map((row) => ({
      id: trueWordId(row.nameKey),
      name: row.name,
      nameKey: row.nameKey,
    })),
    sets: [],
  }
}

/**
 * What a script plans: `build-art` the assets, `import-sets` the sets' pictures, `import-pictures` the card and word
 * definitions.
 */
export const ART_PLAN_MODES = ['assets', 'sets', 'definitions'] as const
export type ArtPlanMode = (typeof ART_PLAN_MODES)[number]

/** The groups each mode plans; the files of the other groups are left to the other scripts. */
export const GROUPS_OF_MODE: Readonly<Record<ArtPlanMode, readonly ArtGroup[]>> = {
  assets: ['back', 'pack', 'mascot'],
  sets: ['setBack', 'setMascot'],
  definitions: ['normal', 'blessed', 'cursed', 'word'],
}

/**
 * The legacy Cardmaker stems (`MASCOT_FILES`) that are no set's, `card_info` included. A screen shows one of them;
 * the shocked pair shows `cardmaker_shockl` and `cardmaker_shockr`, and the Golden Packs group `cardmaker_gold`. Every
 * other `cardmaker_<set>` is a set's Cardmaker, which the set import matches against the stored sets.
 */
export const CARDMAKER_STEMS: readonly string[] = [
  'card_info',
  'cardmaker_peek',
  'cardmaker_base',
  'cardmaker_shop',
  'cardmaker_think',
  'cardmaker_lib',
  'cardmaker_cursed',
  'cardmaker_true',
  'cardmaker_shockl',
  'cardmaker_shockr',
  'cardmaker_wave',
  'cardmaker_custom',
  'cardmaker_gold',
  'cardmaker_keep',
  'cardmaker_zaddir',
]

/** The legacy pack picture stems (`PACK_IMAGE_BY_MECHANIC`, `pack_gold`, `pack_cursedgold`) and their packs. */
const NAMED_PACKS: readonly { stem: string; key: string; label: string }[] = [
  ...(
    [
      ['arcanus', 'Arcanus Divine'],
      ['blood', 'Blood & Battle'],
      ['gamblers', "Gambler's Gambit"],
      ['risk', 'Risk & Reward'],
      ['dungeoneers', "Dungeoneer's Kit"],
      ['permamancy', 'Permamancy'],
      ['legends', 'Legends of Old'],
      ['horn', 'Horn of Plenty'],
    ] as const
  ).map(([stem, mechanicPack]) => ({
    stem,
    key: `mechanic:${mechanicPack}`,
    label: `${mechanicPack} Mechanic Pack`,
  })),
  { stem: 'gold', key: 'golden', label: 'Golden Pack' },
  { stem: 'cursedgold', key: 'cursedGolden', label: 'Cursed Golden Pack' },
]

/**
 * One deck's or the words' definitions, found by a normalized name: first the definition whose identity that name gives
 * (its ID is the prefix plus the name), then the one whose current name it is. So a card the DM renamed keeps the
 * pictures of its old name, and a card added in the app is found by its own name.
 */
type DefinitionIndex = {
  byIdentity: ReadonlyMap<string, ArtTarget>
  byName: ReadonlyMap<string, ArtTarget>
  targets: readonly ArtTarget[]
}

function indexDefinitions(
  definitions: readonly ArtDefinition[],
  prefix: string,
  toTarget: (definition: ArtDefinition) => ArtTarget,
): DefinitionIndex {
  const pairs = definitions.map((definition) => [definition, toTarget(definition)] as const)
  return {
    byIdentity: new Map(
      pairs
        .filter(([definition]) => definition.id.startsWith(prefix))
        .map(([definition, target]) => [definition.id.slice(prefix.length), target]),
    ),
    byName: new Map(pairs.map(([definition, target]) => [definition.nameKey, target])),
    targets: pairs.map(([, target]) => target),
  }
}

const find = (index: DefinitionIndex, key: string): ArtTarget | null =>
  index.byIdentity.get(key) ?? index.byName.get(key) ?? null

type TargetIndex = {
  legend: DefinitionIndex
  cursed: DefinitionIndex
  words: DefinitionIndex
  /** The sets by every normalized spelling: code, official name and aliases. The first set to spell it wins. */
  sets: ReadonlyMap<string, ArtSet>
  /** Every target the report expects, by group: the ones without a picture are missing. */
  expected: Readonly<Record<ArtGroup, readonly ArtTarget[]>>
}

function indexTargets(data: ArtData): TargetIndex {
  const cardTarget = (definition: ArtDefinition): ArtTarget => ({
    group: (definition as ArtCard).kind,
    key: definition.id,
    label: definition.name,
  })
  const legend = indexDefinitions(data.legend, 'legend-', cardTarget)
  const cursed = indexDefinitions(data.cursed, 'cursed-', cardTarget)
  const words = indexDefinitions(data.words, 'tw-', (word) => ({
    group: 'word',
    key: word.id,
    label: word.name,
  }))
  const sets = new Map<string, ArtSet>()
  for (const set of data.sets) {
    for (const spelling of [set.code, set.name, ...set.aliases]) {
      const key = normalize(spelling)
      if (key !== '' && !sets.has(key)) sets.set(key, set)
    }
  }
  return {
    legend,
    cursed,
    words,
    sets,
    expected: {
      normal: legend.targets.filter((target) => target.group === 'normal'),
      blessed: legend.targets.filter((target) => target.group === 'blessed'),
      cursed: [...cursed.targets],
      word: [...words.targets],
      back: [BLESSED_BACK, CURSED_BACK],
      pack: NAMED_PACKS.map(({ key, label }) => ({ group: 'pack', key, label })),
      mascot: CARDMAKER_STEMS.map((stem) => ({ group: 'mascot', key: stem, label: stem })),
      setBack: data.sets.map((set) => setTarget('setBack', set)),
      setMascot: data.sets.map((set) => setTarget('setMascot', set)),
    },
  }
}

const BLESSED_BACK: ArtTarget = { group: 'back', key: 'blessed', label: 'Blessed' }
const CURSED_BACK: ArtTarget = { group: 'back', key: 'cursed', label: 'Cursed' }

/** A set's cardback or Cardmaker, keyed by the set's ID and named by its official name. */
const setTarget = (group: 'setBack' | 'setMascot', set: ArtSet): ArtTarget => ({
  group,
  key: set.setId,
  label: set.name,
})

/** The file name without its extension. */
export function stemOf(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '')
}

/**
 * Which script a file belongs to by its legacy name (rules 2 to 5), before any data is asked:
 * - the build's assets: a screen's Cardmaker, a named pack, or the Blessed or Cursed cardback, with its target
 * - the set import's set files: any other `<set>_cb` or `cardmaker_<set>`, with the set as the file writes it
 * - `null` for every other file, which is the picture import's
 */
type FileClaim =
  | { mode: 'assets'; target: ArtTarget }
  | { mode: 'sets'; group: 'setBack' | 'setMascot'; set: string }
  | null

function claimFile(stem: string): FileClaim {
  const lower = stem.toLowerCase()
  if (CARDMAKER_STEMS.includes(lower)) {
    return { mode: 'assets', target: { group: 'mascot', key: lower, label: lower } }
  }
  const named = /^pack[_\s-]*(.*)$/i.exec(stem)
  if (named) {
    const pack = NAMED_PACKS.find(({ stem: packStem }) => packStem === normalize(named[1] ?? ''))
    if (pack) return { mode: 'assets', target: { group: 'pack', key: pack.key, label: pack.label } }
  }
  const back = /^(.*?)[_\s-]cb$/i.exec(stem)
  if (back) {
    const set = back[1] ?? ''
    const base = normalize(set)
    if (base === 'blessed') return { mode: 'assets', target: BLESSED_BACK }
    if (base === 'cursed') return { mode: 'assets', target: CURSED_BACK }
    return { mode: 'sets', group: 'setBack', set }
  }
  const cardmaker = /^cardmaker[_\s-]+(.+)$/i.exec(stem)
  if (cardmaker) return { mode: 'sets', group: 'setMascot', set: cardmaker[1] ?? '' }
  return null
}

/** The stored set a set file names, by its code, official name or an alias, as a target of its group. */
function matchSet(
  claim: { group: 'setBack' | 'setMascot'; set: string },
  index: TargetIndex,
): ArtTarget | null {
  const set = index.sets.get(normalize(claim.set))
  return set ? setTarget(claim.group, set) : null
}

/** Rules 6 to 9 of design D2, for a file that is no asset or set file: the card or word its name gives, or `null`. */
function matchDefinition(stem: string, index: TargetIndex): ArtTarget | null {
  if (/^tw/i.test(stem)) {
    const word = find(index.words, normalize(stem.slice(2)))
    if (word) return word
  }
  const prefixed = /^cursed[_\s-]+(.+)$/i.exec(stem)
  if (prefixed) {
    const card = find(index.cursed, normalize(prefixed[1] ?? ''))
    if (card) return card
  }
  const key = normalize(stem)
  return find(index.legend, key) ?? find(index.cursed, key)
}

// ---------------------------------------------------------------------------------------------------------------
// The alias table

/**
 * What an alias row names: a Legend card (normal or Blessed), a Cursed card, a True Word, or an asset stem. An asset
 * stem may be a set's (`kesqer_cb`, `cardmaker_kesqer`): such a row belongs to the set import.
 */
export const ALIAS_KINDS = ['legend', 'cursed', 'word', 'asset'] as const
export type AliasKind = (typeof ALIAS_KINDS)[number]

/** The table's columns, by their normalized header names. */
export const ALIAS_COLUMNS: readonly string[] = ['file', 'kind', 'name']

/**
 * One row of `data/image-aliases.csv`: its file becomes the picture of `target`. `owner` is the script that plans the
 * row. `target` is `null` for a row another script plans: its file is left to that script, and the row is not checked
 * here.
 */
export type ArtAlias = { row: number; file: string; owner: ArtPlanMode; target: ArtTarget | null }

/** A problem that stops the build or an import. `row` is the spreadsheet row number: the header is row 1. */
export type AliasError =
  | { kind: 'unreadable'; detail: string }
  | { kind: 'missing-columns'; columns: string[] }
  | { kind: 'empty-cell'; row: number; column: 'File' | 'Kind' | 'Name' }
  | { kind: 'unknown-kind'; row: number; value: string }
  | { kind: 'unknown-target'; row: number; aliasKind: AliasKind; name: string }
  | { kind: 'duplicate-file'; rows: [number, number]; file: string }

const isAliasKind = (value: string): value is AliasKind =>
  (ALIAS_KINDS as readonly string[]).includes(value)

/**
 * The script that plans an alias row: the picture import a card or word row, and for an asset row the script its
 * stem belongs to. An asset stem that is neither an asset nor a set file is the build's, which reports it.
 */
function aliasOwner(kind: AliasKind, name: string): ArtPlanMode {
  if (kind !== 'asset') return 'definitions'
  return claimFile(stemOf(name))?.mode ?? 'assets'
}

/** The target an alias row of the mode names, if it exists among the definitions, the sets or the known assets. */
function aliasTarget(kind: AliasKind, name: string, index: TargetIndex): ArtTarget | null {
  switch (kind) {
    case 'legend':
      return find(index.legend, normalize(name))
    case 'cursed':
      return find(index.cursed, normalize(name))
    case 'word':
      return find(index.words, normalize(name))
    case 'asset': {
      const claim = claimFile(stemOf(name))
      if (claim === null) return null
      return claim.mode === 'assets' ? claim.target : matchSet(claim, index)
    }
  }
}

/**
 * Reads the alias table (columns `File,Kind,Name`) and checks the mode's rows against the data (spec: card-images,
 * "Picture aliases"): the build checks the asset rows, the set import the set rows against the stored sets, and the
 * picture import the card and word rows against the stored definitions. A row naming nothing that exists is an error
 * with its row number; the caller writes nothing if there is an error. The other rows are kept without a target, so
 * their files are left to the other scripts.
 */
export function readAliases(
  text: string,
  data: ArtData,
  mode: ArtPlanMode,
): { aliases: ArtAlias[]; errors: AliasError[] } {
  const records = readRecords(text)
  if (!Array.isArray(records)) {
    return { aliases: [], errors: [{ kind: 'unreadable', detail: records.error }] }
  }
  const [header = [], ...rows] = records
  const headers = header.map(normalizeHeader)
  const missing = ALIAS_COLUMNS.filter((column) => !headers.includes(column))
  if (missing.length > 0)
    return { aliases: [], errors: [{ kind: 'missing-columns', columns: missing }] }
  const column = (record: string[], name: string) => (record[headers.indexOf(name)] ?? '').trim()

  const index = indexTargets(data)
  const aliases: ArtAlias[] = []
  const errors: AliasError[] = []
  const firstRowByFile = new Map<string, number>()

  rows.forEach((record, position) => {
    const row = position + 2
    if (record.every((cell) => cell.trim() === '')) return
    const file = column(record, 'file')
    const kindCell = column(record, 'kind')
    const name = column(record, 'name')
    const empty = file === '' ? 'File' : kindCell === '' ? 'Kind' : name === '' ? 'Name' : null
    if (empty) {
      errors.push({ kind: 'empty-cell', row, column: empty })
      return
    }
    const kind = kindCell.toLowerCase()
    if (!isAliasKind(kind)) {
      errors.push({ kind: 'unknown-kind', row, value: kindCell })
      return
    }
    const fileKey = file.toLowerCase()
    const firstRow = firstRowByFile.get(fileKey)
    if (firstRow !== undefined) {
      errors.push({ kind: 'duplicate-file', rows: [firstRow, row], file })
      return
    }
    firstRowByFile.set(fileKey, row)
    const owner = aliasOwner(kind, name)
    if (owner !== mode) {
      aliases.push({ row, file, owner, target: null })
      return
    }
    const target = aliasTarget(kind, name, index)
    if (target === null) {
      errors.push({ kind: 'unknown-target', row, aliasKind: kind, name })
      return
    }
    aliases.push({ row, file, owner, target })
  })
  return { aliases, errors }
}

// ---------------------------------------------------------------------------------------------------------------
// The plan

/** How a file was matched: by its name (rules 2 to 9) or by an alias row (rule 1). */
export type ArtMatch = 'name' | 'alias'

export type ArtAssignment<F extends ArtFile> = { target: ArtTarget; file: F; via: ArtMatch }

/** A second file for a target that already has its picture: reported, not used. */
export type ArtDuplicate<F extends ArtFile> = { file: F; target: ArtTarget; winner: F }

export type ArtCoverage = {
  /** How many targets the report expects. */
  expected: number
  /** How many of them got a picture. */
  found: number
  /** The labels of the expected targets without a picture. */
  missing: string[]
}

export type ArtPlan<F extends ArtFile> = {
  mode: ArtPlanMode
  /** One per target with a picture, in report order. */
  assignments: ArtAssignment<F>[]
  duplicates: ArtDuplicate<F>[]
  /** The files of this mode that match nothing, by name: never in the `assets` mode. */
  unknown: F[]
  /** The files the other scripts plan, by name. */
  skipped: F[]
  /** The same files by the script that plans them; the plan's own mode has none. */
  leftTo: Record<ArtPlanMode, F[]>
  /** The mode's groups only. */
  coverage: Partial<Record<ArtGroup, ArtCoverage>>
}

/** File order: by name, then by the caller's own order, so the same files always plan the same way. */
const byName = <F extends ArtFile>(a: F, b: F) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)

const targetId = (target: ArtTarget) => `${target.group}:${target.key}`

/**
 * What a file is for the mode: its target, `null` when it is the mode's but matches nothing, or the script it is left
 * to. The build never asks what a file that is no asset or set file is: it is the picture import's.
 */
function matchFile(
  stem: string,
  index: TargetIndex,
  mode: ArtPlanMode,
): { target: ArtTarget | null } | { leftTo: ArtPlanMode } {
  const claim = claimFile(stem)
  const owner = claim?.mode ?? 'definitions'
  if (owner !== mode) return { leftTo: owner }
  if (claim === null) return { target: matchDefinition(stem, index) }
  return { target: claim.mode === 'assets' ? claim.target : matchSet(claim, index) }
}

/**
 * Matches each file to what it shows (design D2) and settles the duplicates (D3): a file matched by its name beats
 * an alias, and otherwise the first by file name wins. Plans only the mode's files and leaves the others to their
 * script: `assets` plans the Blessed and Cursed cardbacks, the packs and the screens' Cardmaker; `sets` plans every
 * other `<set>_cb` and `cardmaker_<set>` against the given sets; `definitions` plans the rest against the cards and
 * words. A file of the mode that matches nothing is unknown. Pure: the files are only names to it.
 */
export function planArt<F extends ArtFile>(
  files: readonly F[],
  data: ArtData,
  aliases: readonly ArtAlias[],
  mode: ArtPlanMode,
): ArtPlan<F> {
  const index = indexTargets(data)
  const aliasByFile = new Map(aliases.map((alias) => [alias.file.toLowerCase(), alias]))
  const candidates = new Map<string, ArtAssignment<F>[]>()
  const unknown: F[] = []
  const skipped: F[] = []
  const leftTo: Record<ArtPlanMode, F[]> = { assets: [], sets: [], definitions: [] }
  const leave = (file: F, to: ArtPlanMode) => {
    skipped.push(file)
    leftTo[to].push(file)
  }
  const propose = (match: ArtAssignment<F>) => {
    const id = targetId(match.target)
    candidates.set(id, [...(candidates.get(id) ?? []), match])
  }

  for (const file of [...files].sort(byName)) {
    const alias = aliasByFile.get(file.name.toLowerCase())
    if (alias && alias.owner !== mode) {
      leave(file, alias.owner)
      continue
    }
    if (alias && alias.target !== null) {
      propose({ target: alias.target, file, via: 'alias' })
      continue
    }
    const match = matchFile(stemOf(file.name), index, mode)
    if ('leftTo' in match) leave(file, match.leftTo)
    else if (match.target === null) unknown.push(file)
    else propose({ target: match.target, file, via: 'name' })
  }

  const assignments: ArtAssignment<F>[] = []
  const duplicates: ArtDuplicate<F>[] = []
  for (const group of candidates.values()) {
    // Stable sort: a name match first, and the name order within each kind of match.
    const [winner, ...losers] = [...group].sort(
      (a, b) => Number(a.via === 'alias') - Number(b.via === 'alias'),
    )
    if (!winner) continue
    assignments.push(winner)
    for (const loser of losers) {
      duplicates.push({ file: loser.file, target: loser.target, winner: winner.file })
    }
  }

  const groupOrder = (target: ArtTarget) => ART_GROUPS.indexOf(target.group)
  assignments.sort(
    (a, b) =>
      groupOrder(a.target) - groupOrder(b.target) ||
      (a.target.key < b.target.key ? -1 : a.target.key > b.target.key ? 1 : 0),
  )
  duplicates.sort((a, b) => byName(a.file, b.file))

  const assigned = new Set(assignments.map(({ target }) => targetId(target)))
  const coverage = Object.fromEntries(
    GROUPS_OF_MODE[mode].map((group) => {
      const expected = index.expected[group]
      const missing = expected.filter((target) => !assigned.has(targetId(target)))
      return [
        group,
        {
          expected: expected.length,
          found: expected.length - missing.length,
          missing: missing.map(({ label }) => label),
        },
      ]
    }),
  ) as Partial<Record<ArtGroup, ArtCoverage>>

  return { mode, assignments, duplicates, unknown, skipped, leftTo, coverage }
}
