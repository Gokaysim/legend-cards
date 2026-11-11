import { normalize } from '@/features/cards/text'

import type { PackDef } from './catalog'

// What the Cardmaker says about the Mechanic Packs and the Golden Packs (design D6, spec: cardmaker-speech): v2.2.8's
// `MECHANIC_SHOP_LINES`, word for word, with only the typo "Blessed cartlar" fixed. Her voice stays as written.

/** A pack's description (what it holds) and the Cardmaker's own line about it. */
export type PackLine = { summary: string; speech: string }

const riskReward: PackLine = {
  summary:
    'Cursed kartlarla, discard etkileriyle veya oyuncunun kendine zarar verme karşılığında fayda elde etmesiyle ilgili kartları içerir.',
  speech: 'Aman yavrum, ateşle oynama emi? Yanarsın sonra.',
}

/** The Mechanic Packs' lines, keyed by the normalized mechanic pack name, as v2.2.8 keys them. */
export const PACK_LINES: Readonly<Record<string, PackLine>> = {
  arcanusdivine: {
    summary: 'Büyülerle ve sihirli etkilerle ilgili kartları içerir.',
    speech: 'Şimdi bakalım kuzum, şöyle bir ateş büyüsü yapıver de çayımızı demleyelim, olur mu?',
  },
  bloodbattle: {
    summary: 'Combat etkileri, saldırı ve hasar zarlarıyla ilgili kartları içerir.',
    speech:
      'Aman dikkat et kendine evladım. Öyle savaşacağım diye parmaklarını falan kaybetme sakın! Sonra benim güzelim kartlarımı nasıl tutacaksın, ha?',
  },
  dungeoneerskit: {
    summary: 'Skill checkler ve savaş dışı durumlarla ilgili kartları içerir.',
    speech:
      'Bak şimdi yavrum, bunlar dövüş mövüş kartı değil diye sıkıcı sanma sakın. Sonra arkandan ağlar gariplerim.',
  },
  gamblersgambit: {
    summary: 'Rastgele etkilere ve maliyetlere sahip kartları içerir.',
    speech:
      'Şimdi kuzum, RNG bağımlılığı şakaya gelmez, ona göre. Kendini kaptırırsan da utanıp içine atma, konuş birileriyle. Benle değil ama, kötü örnek olurum.',
  },
  hornofplenty: {
    summary: 'Kart çektiren kartlar içerir.',
    speech:
      'Evet! Kart! Daha çok kart! Benim sizin için yaptığım o güzelim kartlardan daha da çekin! Daha da! DAHA DA! ... Öhö öhö. Kusura bakma yavrum, biraz heyecanlandım. Sen canın hangi kartlardan isterse onu al tabii.',
  },
  legendsofold: {
    summary:
      'Legend Point kazandıran, bu puanlarla etkileşime giren veya metagame mekanikleri etkileyen kartları içerir.',
    speech:
      'Vallahi yavrum, ben de ne dediğimi anlamadım ama sözleşmeye yazmışlar, söylemek zorundayım.',
  },
  permamancy: {
    summary: 'Uzun süreli veya kalıcı etkileri olan kartları içerir.',
    speech: 'Ama unutma kuzum... Bu dünyada hiçbir şey sonsuz değildir. Ah, ah...',
  },
  riskreward: riskReward,
  // v2.2.8 knows the pack by both spellings.
  riskandreward: riskReward,
}

/** The Golden Packs' line: it describes the Golden Pack, not the Cursed Golden Pack. */
export const GOLDEN_LINE: PackLine = {
  summary: 'Sadece Rare kartlar ve Blessed kartlar içerir.',
  speech: 'Yavrum sandığa dikkat yalnız, bazen ısırabilir...',
}

/**
 * The line of a pack: a Mechanic Pack's by its mechanic pack, the Golden Pack's, or `null` for every other pack and
 * for a mechanic pack that v2.2.8 has no words for.
 */
export function packLine(def: Pick<PackDef, 'type' | 'mechanicPack'>): PackLine | null {
  if (def.type === 'golden') return GOLDEN_LINE
  if (def.type !== 'mechanic' || def.mechanicPack === null) return null
  return PACK_LINES[normalize(def.mechanicPack)] ?? null
}
