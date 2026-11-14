// @vitest-environment node
// Plans the file names of the owner's archives against the repository's data and alias table, so a change to
// either shows here before a build or an import (design D3, the expected coverage). The build plans the assets; the set
// import plans the sets' pictures, here against the sets `data/sets.csv` would store; the picture import plans the
// cards and words, here against the definitions the repository's files would store.
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  type ArtData,
  definitionsOfRows,
  NO_DEFINITIONS,
  planArt,
  readAliases,
} from './artFiles.ts'
import { ART_INVENTORY } from './artInventory.fixture.ts'
import { parseCardFile } from './cardRows.ts'
import { setIdOf } from './importSets.ts'
import { parseSetFile } from './setRows.ts'
import { parseTrueWordFile } from './trueWordRows.ts'

const dataFile = (name: string) =>
  readFileSync(new URL(`../../data/${name}`, import.meta.url), 'utf8')

const DATA: ArtData = {
  ...definitionsOfRows(
    parseCardFile(dataFile('legend-cards.csv'), 'legend').cards.map(({ card }) => card),
    parseCardFile(dataFile('cursed-cards.csv'), 'cursed').cards.map(({ card }) => card),
    parseTrueWordFile(dataFile('true-words.csv')).words.map(({ word }) => word),
  ),
  sets: parseSetFile(dataFile('sets.csv')).sets.map(({ code, name, aliases }) => ({
    setId: setIdOf(code),
    code,
    name,
    aliases,
  })),
}

const FILES = Object.entries(ART_INVENTORY).flatMap(([archive, names]) =>
  names.map((name) => ({ name, archive })),
)

describe('the inventory of the archives', () => {
  const ALIASES = dataFile('image-aliases.csv')
  const assetAliases = readAliases(ALIASES, NO_DEFINITIONS, 'assets')
  const setAliases = readAliases(ALIASES, DATA, 'sets')
  const definitionAliases = readAliases(ALIASES, DATA, 'definitions')
  const assets = planArt(FILES, NO_DEFINITIONS, assetAliases.aliases, 'assets')
  const sets = planArt(FILES, DATA, setAliases.aliases, 'sets')
  const plan = planArt(FILES, DATA, definitionAliases.aliases, 'definitions')

  it('has 866 files, and every alias row names something that exists', () => {
    expect(FILES).toHaveLength(866)
    expect(DATA.sets).toHaveLength(12)
    expect(assetAliases.errors).toEqual([])
    expect(setAliases.errors).toEqual([])
    expect(definitionAliases.errors).toEqual([])
    expect(definitionAliases.aliases).toHaveLength(17)
  })

  // The Cartographer, which imports used to skip for its missing set, now comes in as a draft; the archives have no
  // picture for it.
  it('gives every card and word a picture, except Scorched Earth and The Cartographer', () => {
    const { normal, blessed, cursed, word } = plan.coverage
    expect(normal).toEqual({ expected: 572, found: 571, missing: ['The Cartographer'] })
    expect(blessed).toEqual({ expected: 19, found: 19, missing: [] })
    expect(cursed).toEqual({ expected: 154, found: 153, missing: ['Scorched Earth'] })
    expect(word).toEqual({ expected: 53, found: 53, missing: [] })
  })

  it('gives the Blessed and Cursed cardbacks and every pack a picture', () => {
    expect(assets.coverage.back).toEqual({ expected: 2, found: 2, missing: [] })
    expect(assets.coverage.pack).toEqual({ expected: 10, found: 10, missing: [] })
  })

  it('gives each of the 12 sets its cardback and its Cardmaker', () => {
    expect(sets.coverage.setBack).toEqual({ expected: 12, found: 12, missing: [] })
    expect(sets.coverage.setMascot).toEqual({ expected: 12, found: 12, missing: [] })
    expect(sets.unknown).toEqual([])
  })

  it('splits the files between the three scripts', () => {
    expect(assets.assignments.length + assets.skipped.length).toBe(FILES.length)
    expect(assets.leftTo.sets).toHaveLength(24)
    expect(sets.assignments.length + sets.duplicates.length + sets.unknown.length).toBe(
      assets.leftTo.sets.length,
    )
    expect(plan.leftTo.assets.length).toBe(assets.assignments.length + assets.duplicates.length)
    expect(plan.leftTo.sets).toEqual(assets.leftTo.sets)
  })

  it("has 12 of the 15 screens' Cardmakers", () => {
    expect(assets.coverage.mascot).toEqual({
      expected: 15,
      found: 12,
      missing: ['card_info', 'cardmaker_custom', 'cardmaker_keep'],
    })
  })

  it('uses the aliased Blessed pictures for their renamed cards', () => {
    const fileOf = (key: string) =>
      plan.assignments.find(({ target }) => target.key === key)?.file.name
    expect(fileOf('legend-roguishcharm')).toBe('charmingrogue.png')
    expect(fileOf('legend-secondwind')).toBe('drivendiehard.png')
    expect(fileOf('legend-forgewizardconstitution')).toBe('durabledwarf.png')
    expect(
      assets.assignments.find(({ target }) => target.key === "mechanic:Gambler's Gambit")?.file
        .name,
    ).toBe('pack_galmblers.png')
  })

  it('has no duplicates: the misspelled copies without an alias are unknown', () => {
    expect(plan.duplicates).toEqual([])
    expect(assets.duplicates).toEqual([])
    expect(sets.duplicates).toEqual([])
    expect(plan.unknown.map(({ name }) => name)).toEqual([
      '_cursed_endgame.png',
      'alazizsurpiseattack.png',
      'alulabbuballad.png',
      'ashodrasreaping.png',
      'balefraazbackstab.png',
      'brannanskinglyuty.png',
      'chakandiscontribution.png',
      'eduardshiddenloot.png',
      'kyasrosyieldingfaith.png',
      'lordfalaraenssformidability.png',
      'quetzelkansthunderoustornado.png',
      'raggarhrashsrapacity.png',
      'ripsreapingrevenge.png',
      'samirsassasinationattempt.png',
      'snikkeriffscharge.png',
      'sultanambrosiasthleticancestry.png',
      'thecartographersmapkit.png',
      'thedaggrofshadows.png',
      'vidajalsaqrsunjustblade.png',
      'viffskrsvengeance.png',
      'zallut_shop.png',
      'zamansgolfc.png',
    ])
  })
})
