// @vitest-environment node
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sharp from 'sharp'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ArtAssignment, ArtTarget } from './artFiles.ts'
import { contentHash, fileSlug, type SourceFile, writeArt } from './artWrite.ts'

let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'art-write-'))
  await mkdir(join(root, 'src'))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

/** A tiny generated PNG of one color, optionally half transparent. */
async function png(name: string, width: number, height: number, red: number, alpha = 1) {
  const path = join(root, 'src', name)
  await sharp({
    create: { width, height, channels: 4, background: { r: red, g: 64, b: 160, alpha } },
  })
    .png()
    .toFile(path)
  return { name, path }
}

const assign = (target: ArtTarget, file: SourceFile): ArtAssignment<SourceFile> => ({
  target,
  file,
  via: 'name',
})

const CARD: ArtTarget = { group: 'normal', key: 'legend-abolethseyes', label: "Aboleth's Eyes" }
const MASCOT: ArtTarget = { group: 'mascot', key: 'cardmaker_lib', label: 'cardmaker_lib' }

describe('writeArt', () => {
  it('writes WebP pictures with hashed names, a shrunk Cardmaker, and the manifest', async () => {
    const card = await png('abolethseyes.png', 30, 42, 112)
    const mascot = await png('cardmaker_lib.png', 100, 1000, 192, 0.5)
    const out = join(root, 'art')

    const manifest = await writeArt([assign(CARD, card), assign(MASCOT, mascot)], out)

    const [cardFile] = await readdir(join(out, 'cards'))
    const [mascotFile] = await readdir(join(out, 'mascots'))
    expect(cardFile).toMatch(/^legend-abolethseyes\.[0-9a-f]{10}\.webp$/)
    expect(mascotFile).toMatch(/^cardmaker_lib\.[0-9a-f]{10}\.webp$/)

    const cardBytes = await readFile(join(out, 'cards', cardFile ?? ''))
    const mascotBytes = await readFile(join(out, 'mascots', mascotFile ?? ''))
    expect(cardFile).toBe(`legend-abolethseyes.${contentHash(cardBytes)}.webp`)
    expect(mascotFile).toBe(`cardmaker_lib.${contentHash(mascotBytes)}.webp`)

    // A card keeps its own size; a Cardmaker is at most 480 px high and keeps its transparency.
    expect(await sharp(cardBytes).metadata()).toMatchObject({
      format: 'webp',
      width: 30,
      height: 42,
    })
    expect(await sharp(mascotBytes).metadata()).toMatchObject({
      format: 'webp',
      width: 48,
      height: 480,
      hasAlpha: true,
    })

    const expected = {
      version: 1,
      cards: { 'legend-abolethseyes': `/art/cards/${cardFile}` },
      words: {},
      cardbacks: {},
      packs: {},
      mascots: { cardmaker_lib: `/art/mascots/${mascotFile}` },
    }
    expect(manifest).toEqual(expected)
    expect(JSON.parse(await readFile(join(out, 'manifest.json'), 'utf8'))).toEqual(expected)
  })

  it('replaces an earlier build, and only a changed picture gets a new address', async () => {
    const out = join(root, 'art')
    await mkdir(join(out, 'cards'), { recursive: true })
    await writeFile(join(out, 'cards', 'stale.webp'), 'old')

    const card = await png('abolethseyes.png', 30, 42, 112)
    const back = await png('kesqer_cb.png', 30, 42, 32)
    const backTarget: ArtTarget = { group: 'back', key: 'Kesqer', label: 'Kesqerian Nights' }
    const first = await writeArt([assign(CARD, card), assign(backTarget, back)], out)
    expect(await readdir(join(out, 'cards'))).toHaveLength(1)

    await png('abolethseyes.png', 30, 42, 160)
    const second = await writeArt([assign(CARD, card), assign(backTarget, back)], out)

    expect(second.cards['legend-abolethseyes']).not.toBe(first.cards['legend-abolethseyes'])
    expect(second.cardbacks.Kesqer).toBe(first.cardbacks.Kesqer)
    expect(second.cardbacks.Kesqer).toMatch(/^\/art\/backs\/kesqer\.[0-9a-f]{10}\.webp$/)
    expect(await readdir(join(out, 'cards'))).toHaveLength(1)
  })
})

describe('fileSlug', () => {
  it('turns any key into a safe file name', () => {
    expect(fileSlug("mechanic:Gambler's Gambit")).toBe('mechanic-gambler-s-gambit')
    expect(fileSlug('standard:The End is Nigh')).toBe('standard-the-end-is-nigh')
    expect(fileSlug('Ragnarök')).toBe('ragnarok')
    expect(fileSlug('cardmaker_lib')).toBe('cardmaker_lib')
    expect(fileSlug('legend-abolethseyes')).toBe('legend-abolethseyes')
  })
})
