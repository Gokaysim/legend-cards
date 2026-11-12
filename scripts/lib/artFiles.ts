import { normalize, OFFICIAL_SETS, type OfficialSet } from './cardCatalog.ts'
import type { CardDefinition, CardKind } from './cardRows.ts'
import { normalizeHeader, readRecords } from './csv.ts'
import { cardId } from './importCards.ts'
import { trueWordId } from './importTrueWords.ts'
import type { TrueWordDefinition } from './trueWordRows.ts'

// Matching the owner's picture files to cards, True Words, cardbacks, packs and the Cardmaker (design D2, D3 of
// add-card-images). Pure: no files, no Firebase. Two scripts plan with it (design D9, D10 of
// upload-card-and-word-pictures): `build-art` plans the assets (cardbacks, packs, Cardmaker) and leaves the other
// files to `import-pictures`, which plans the cards and True Words against the stored definitions.

/** Where each group's pictures go: the manifest's sections for the built ones, and the card and word pictures. */
export type ArtSection = 'cards' | 'words' | 'cardbacks' | 'packs' | 'mascots'

/** What the report counts, in its order. A group belongs to one section. */
export const ART_GROUPS = [
  'normal',
  'blessed',
  'cursed',
  'word',
  'back',
  'pack',
  'setPack',
  'mascot',
] as const
export type ArtGroup = (typeof ART_GROUPS)[number]

export const SECTION_OF_GROUP: Readonly<Record<ArtGroup, ArtSection>> = {
  normal: 'cards',
  blessed: 'cards',
  cursed: 'cards',
  word: 'words',
  back: 'cardbacks',
  pack: 'packs',
  setPack: 'packs',
  mascot: 'mascots',
}

/**
 * One thing a picture shows. `key` is its key in the manifest section: a card or word document ID, a set code (or
 * `blessed`, `cursed`), a pack key as `PackDef.key` writes it, or a mascot stem. `label` names it in the report.
 */
export type ArtTarget = { group: ArtGroup; key: string; label: string }

/** A picture file. `name` is the file name with its extension; the rest is the caller's (its path, its archive). */
export type ArtFile = { name: string }

/** A stored definition as pictures are matched against it: its document ID, its name and its normalized name. */
export type ArtDefinition = { id: string; name: string; nameKey: string }

/** A stored card: a definition with its kind. */
export type ArtCard = ArtDefinition & { kind: CardKind }

/** The stored definitions the card and word pictures are matched against, whatever their status. */
export type ArtData = {
  /** Normal and Blessed cards (`legend-…`). */
  legend: readonly ArtCard[]
  /** Cursed cards (`cursed-…`). */
  cursed: readonly ArtCard[]
  words: readonly ArtDefinition[]
}

/** No definitions: what the picture build plans against, since it builds no card or word picture. */
export const NO_DEFINITIONS: ArtData = { legend: [], cursed: [], words: [] }

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
  }
}

/** What a script plans: `build-art` the assets, `import-pictures` the card and word definitions. */
export type ArtPlanMode = 'assets' | 'definitions'

/** The groups each mode plans; the files of the other groups are left to the other script. */
export const GROUPS_OF_MODE: Readonly<Record<ArtPlanMode, readonly ArtGroup[]>> = {
  assets: ['back', 'pack', 'setPack', 'mascot'],
  definitions: ['normal', 'blessed', 'cursed', 'word'],
}

/**
 * The legacy Cardmaker stems (`MASCOT_FILES`), `card_info` included. A screen or a set group shows one of them;
 * the shocked pair shows `cardmaker_shockl` and `cardmaker_shockr`.
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
  'cardmaker_theendisnigh',
  'cardmaker_pentagon',
  'cardmaker_rhodelen',
  'cardmaker_ashavir',
  'cardmaker_kesqer',
  'cardmaker_godtower',
  'cardmaker_davarron',
  'cardmaker_havenholm',
  'cardmaker_ulagal',
  'cardmaker_nordhallr',
  'cardmaker_gurgitea',
  'cardmaker_custom',
  'cardmaker_pandemonium',
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

const PANDEMONIUM = 'Pandemonium'

/** A set's pack: its `PackDef` type, and the words after the set name in its title. */
type SetPackName = { type: string; label: string }

const STANDARD: SetPackName = { type: 'standard', label: 'Standard Pack' }
const PREMIUM: SetPackName = { type: 'premium', label: 'Premium Pack' }
const CURSED: SetPackName = { type: 'cursed', label: 'Cursed Pack' }
const PANDEMONIUM_PACK: SetPackName = { type: 'pandemonium', label: 'Pack' }
const PANDEMONIUM_CURSED: SetPackName = { type: 'pandemoniumCursed', label: 'Cursed Pack' }

/**
 * A set pack picture's suffix, and the pack it names for an ordinary set and for Pandemonium, which has its own two
 * packs (legacy `importImages`). `null`: the suffix names no pack of that set.
 */
const SET_PACK_SUFFIXES: Readonly<
  Record<string, { set: SetPackName | null; pandemonium: SetPackName | null }>
> = {
  std: { set: STANDARD, pandemonium: PANDEMONIUM_PACK },
  prm: { set: PREMIUM, pandemonium: null },
  crs: { set: CURSED, pandemonium: PANDEMONIUM_CURSED },
  cursed: { set: CURSED, pandemonium: PANDEMONIUM_CURSED },
  gold: { set: null, pandemonium: PANDEMONIUM_PACK },
  gld: { set: null, pandemonium: PANDEMONIUM_PACK },
}

const setsByKey = new Map(
  OFFICIAL_SETS.flatMap((set) =>
    [set.code, set.name, ...set.aliases].map((spelling) => [normalize(spelling), set] as const),
  ),
)

/** The official set a file names, by its code, official name or an alias. */
function recognizeSet(value: string): OfficialSet | undefined {
  return setsByKey.get(normalize(value))
}

/** Lookups for the targets that exist, built once per plan. */
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
  return {
    legend,
    cursed,
    words,
    expected: {
      normal: legend.targets.filter((target) => target.group === 'normal'),
      blessed: legend.targets.filter((target) => target.group === 'blessed'),
      cursed: [...cursed.targets],
      word: [...words.targets],
      back: [
        ...OFFICIAL_SETS.map((set) => backTarget(set)),
        backTarget('blessed'),
        backTarget('cursed'),
      ],
      pack: NAMED_PACKS.map(({ key, label }) => ({ group: 'pack', key, label })),
      // A set pack's own picture is optional: without one, the shop shows the set's cardback.
      setPack: [],
      mascot: CARDMAKER_STEMS.map((stem) => ({ group: 'mascot', key: stem, label: stem })),
    },
  }
}

function backTarget(of: OfficialSet | 'blessed' | 'cursed'): ArtTarget {
  if (of === 'blessed') return { group: 'back', key: 'blessed', label: 'Blessed' }
  if (of === 'cursed') return { group: 'back', key: 'cursed', label: 'Cursed' }
  return { group: 'back', key: of.code, label: of.name }
}

/** The file name without its extension. */
export function stemOf(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '')
}

/** Rules 2 to 5: a Cardmaker, a named pack, a set pack or a cardback picture, by the legacy file names. */
function matchAsset(stem: string): ArtTarget | null {
  const lower = stem.toLowerCase()
  if (CARDMAKER_STEMS.includes(lower)) return { group: 'mascot', key: lower, label: lower }

  const named = /^pack[_\s-]*(.*)$/i.exec(stem)
  if (named) {
    const pack = NAMED_PACKS.find(({ stem: packStem }) => packStem === normalize(named[1] ?? ''))
    if (pack) return { group: 'pack', key: pack.key, label: pack.label }
  }

  const setPack = /^(.*?)[_\s-](std|prm|crs|cursed|gold|gld)$/i.exec(stem)
  const set = setPack ? recognizeSet(setPack[1] ?? '') : undefined
  if (setPack && set) {
    const suffix = SET_PACK_SUFFIXES[(setPack[2] ?? '').toLowerCase()]
    const pack = set.code === PANDEMONIUM ? suffix?.pandemonium : suffix?.set
    if (pack) {
      return {
        group: 'setPack',
        key: `${pack.type}:${set.code}`,
        label: `${set.name} ${pack.label}`,
      }
    }
  }

  const back = /^(.*?)[_\s-]cb$/i.exec(stem)
  if (back) {
    const base = normalize(back[1] ?? '')
    if (base === 'blessed' || base === 'cursed') return backTarget(base)
    const backSet = recognizeSet(base)
    if (backSet) return backTarget(backSet)
  }
  return null
}

/** Rules 6 to 9 of design D2, for a file that is no asset: the card or word its name gives, or `null`. */
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

/** What an alias row names: a Legend card (normal or Blessed), a Cursed card, a True Word, or an asset stem. */
export const ALIAS_KINDS = ['legend', 'cursed', 'word', 'asset'] as const
export type AliasKind = (typeof ALIAS_KINDS)[number]

/** The table's columns, by their normalized header names. */
export const ALIAS_COLUMNS: readonly string[] = ['file', 'kind', 'name']

/**
 * One row of `data/image-aliases.csv`, checked: its file becomes the picture of `target`. `target` is `null` for a row
 * the other script plans: its file is left to that script, and the row is not checked here.
 */
export type ArtAlias = { row: number; file: string; target: ArtTarget | null }

/** A problem that stops the build. `row` is the spreadsheet row number: the header is row 1. */
export type AliasError =
  | { kind: 'unreadable'; detail: string }
  | { kind: 'missing-columns'; columns: string[] }
  | { kind: 'empty-cell'; row: number; column: 'File' | 'Kind' | 'Name' }
  | { kind: 'unknown-kind'; row: number; value: string }
  | { kind: 'unknown-target'; row: number; aliasKind: AliasKind; name: string }
  | { kind: 'duplicate-file'; rows: [number, number]; file: string }

const isAliasKind = (value: string): value is AliasKind =>
  (ALIAS_KINDS as readonly string[]).includes(value)

/** The target an alias row names, if it exists among the definitions or the known assets. */
function aliasTarget(kind: AliasKind, name: string, index: TargetIndex): ArtTarget | null {
  switch (kind) {
    case 'legend':
      return find(index.legend, normalize(name))
    case 'cursed':
      return find(index.cursed, normalize(name))
    case 'word':
      return find(index.words, normalize(name))
    case 'asset':
      return matchAsset(stemOf(name))
  }
}

/** The alias kinds each mode checks and uses. */
const ALIAS_KINDS_OF_MODE: Readonly<Record<ArtPlanMode, readonly AliasKind[]>> = {
  assets: ['asset'],
  definitions: ['legend', 'cursed', 'word'],
}

/**
 * Reads the alias table (columns `File,Kind,Name`) and checks each row of the mode's kinds against the data (spec:
 * card-images, "Picture aliases"): the build checks the asset rows, the picture import the card and word rows against
 * the stored definitions. A row naming nothing that exists is an error with its row number; the caller writes nothing
 * if there is an error. The other rows are kept without a target, so their files are left to the other script.
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
    if (!ALIAS_KINDS_OF_MODE[mode].includes(kind)) {
      aliases.push({ row, file, target: null })
      return
    }
    const target = aliasTarget(kind, name, index)
    if (target === null) {
      errors.push({ kind: 'unknown-target', row, aliasKind: kind, name })
      return
    }
    aliases.push({ row, file, target })
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
  /** How many got a picture: of the expected ones, or for `setPack` every one found. */
  found: number
  /** The labels of the expected targets without a picture. */
  missing: string[]
}

export type ArtPlan<F extends ArtFile> = {
  mode: ArtPlanMode
  /** One per target with a picture, in report order. */
  assignments: ArtAssignment<F>[]
  duplicates: ArtDuplicate<F>[]
  /** The files that match nothing, by name. */
  unknown: F[]
  /** The files the other script plans, by name. */
  skipped: F[]
  /** The mode's groups only. */
  coverage: Partial<Record<ArtGroup, ArtCoverage>>
}

/** File order: by name, then by the caller's own order, so the same files always plan the same way. */
const byName = <F extends ArtFile>(a: F, b: F) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)

const targetId = (target: ArtTarget) => `${SECTION_OF_GROUP[target.group]}:${target.key}`

/**
 * Matches each file to what it shows (design D2) and settles the duplicates (D3): a file matched by its name beats
 * an alias, and otherwise the first by file name wins. Plans only the mode's groups: `assets` leaves every other file
 * to the picture import, without asking what it is, and `definitions` leaves the asset files to the build and calls a
 * file that matches no definition unknown. Pure: the files are only names to it.
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

  for (const file of [...files].sort(byName)) {
    const alias = aliasByFile.get(file.name.toLowerCase())
    if (alias && alias.target === null) {
      skipped.push(file)
      continue
    }
    if (alias && alias.target !== null) {
      const id = targetId(alias.target)
      candidates.set(id, [
        ...(candidates.get(id) ?? []),
        { target: alias.target, file, via: 'alias' },
      ])
      continue
    }
    const stem = stemOf(file.name)
    const asset = matchAsset(stem)
    const target = mode === 'assets' ? asset : asset !== null ? null : matchDefinition(stem, index)
    if (target === null) {
      if (mode === 'assets' || asset !== null) skipped.push(file)
      else unknown.push(file)
      continue
    }
    const match: ArtAssignment<F> = { target, file, via: 'name' }
    const id = targetId(match.target)
    candidates.set(id, [...(candidates.get(id) ?? []), match])
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
      const found =
        expected.length === 0
          ? assignments.filter(({ target }) => target.group === group).length
          : expected.length - missing.length
      return [
        group,
        { expected: expected.length, found, missing: missing.map(({ label }) => label) },
      ]
    }),
  ) as Partial<Record<ArtGroup, ArtCoverage>>

  return { mode, assignments, duplicates, unknown, skipped, coverage }
}
