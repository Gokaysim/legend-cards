// @vitest-environment node
// Plans the file names of the owner's archives against the repository's data and alias table, so a change to
// either shows here before a build (design D3, the expected coverage).
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { type ArtData, planArt, readAliases } from './artFiles.ts'
import { ART_INVENTORY } from './artInventory.fixture.ts'
import { parseCardFile } from './cardRows.ts'
import { parseTrueWordFile } from './trueWordRows.ts'

const dataFile = (name: string) =>
  readFileSync(new URL(`../../data/${name}`, import.meta.url), 'utf8')

const DATA: ArtData = {
  legend: parseCardFile(dataFile('legend-cards.csv'), 'legend').cards.map(({ card }) => card),
  cursed: parseCardFile(dataFile('cursed-cards.csv'), 'cursed').cards.map(({ card }) => card),
  words: parseTrueWordFile(dataFile('true-words.csv')).words.map(({ word }) => word),
}

const FILES = Object.entries(ART_INVENTORY).flatMap(([archive, names]) =>
  names.map((name) => ({ name, archive })),
)

describe('the inventory of the archives', () => {
  const aliases = readAliases(dataFile('image-aliases.csv'), DATA)
  const plan = planArt(FILES, DATA, aliases.aliases)

  it('has 866 files, and every alias row names something that exists', () => {
    expect(FILES).toHaveLength(866)
    expect(aliases.errors).toEqual([])
    expect(aliases.aliases).toHaveLength(17)
  })

  // The Cartographer, which imports used to skip for its missing set, now comes in as a draft; the archives have no
  // picture for it.
  it('gives every card, word, cardback and pack a picture, except Scorched Earth and The Cartographer', () => {
    const { normal, blessed, cursed, word, back, pack } = plan.coverage
    expect(normal).toEqual({ expected: 572, found: 571, missing: ['The Cartographer'] })
    expect(blessed).toEqual({ expected: 19, found: 19, missing: [] })
    expect(cursed).toEqual({ expected: 154, found: 153, missing: ['Scorched Earth'] })
    expect(word).toEqual({ expected: 53, found: 53, missing: [] })
    expect(back).toEqual({ expected: 14, found: 14, missing: [] })
    expect(pack).toEqual({ expected: 10, found: 10, missing: [] })
  })

  it('has no set pack pictures, so set packs show their cardback', () => {
    expect(plan.coverage.setPack).toEqual({ expected: 0, found: 0, missing: [] })
  })

  it('has 24 of the 27 Cardmakers', () => {
    expect(plan.coverage.mascot).toEqual({
      expected: 27,
      found: 24,
      missing: ['card_info', 'cardmaker_custom', 'cardmaker_keep'],
    })
  })

  it('uses the aliased Blessed pictures for their renamed cards', () => {
    const fileOf = (key: string) =>
      plan.assignments.find(({ target }) => target.key === key)?.file.name
    expect(fileOf('legend-roguishcharm')).toBe('charmingrogue.png')
    expect(fileOf('legend-secondwind')).toBe('drivendiehard.png')
    expect(fileOf('legend-forgewizardconstitution')).toBe('durabledwarf.png')
    expect(fileOf("mechanic:Gambler's Gambit")).toBe('pack_galmblers.png')
  })

  it('has no duplicates: the misspelled copies without an alias are unknown', () => {
    expect(plan.duplicates).toEqual([])
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
