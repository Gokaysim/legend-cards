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
const BACK: ArtTarget = { group: 'back', key: 'Kesqer', label: 'Kesqerian Nights' }
const MASCOT: ArtTarget = { group: 'mascot', key: 'cardmaker_lib', label: 'cardmaker_lib' }

describe('writeArt', () => {
  it('writes WebP pictures with hashed names, a shrunk Cardmaker, and the manifest', async () => {
    const back = await png('kesqer_cb.png', 30, 42, 112)
    const mascot = await png('cardmaker_lib.png', 100, 1000, 192, 0.5)
    const out = join(root, 'art')

    const manifest = await writeArt([assign(BACK, back), assign(MASCOT, mascot)], out)

    const [backFile] = await readdir(join(out, 'backs'))
    const [mascotFile] = await readdir(join(out, 'mascots'))
    expect(backFile).toMatch(/^kesqer\.[0-9a-f]{10}\.webp$/)
    expect(mascotFile).toMatch(/^cardmaker_lib\.[0-9a-f]{10}\.webp$/)

    const backBytes = await readFile(join(out, 'backs', backFile ?? ''))
    const mascotBytes = await readFile(join(out, 'mascots', mascotFile ?? ''))
    expect(backFile).toBe(`kesqer.${contentHash(backBytes)}.webp`)
    expect(mascotFile).toBe(`cardmaker_lib.${contentHash(mascotBytes)}.webp`)

    // A cardback keeps its own size; a Cardmaker is at most 480 px high and keeps its transparency.
    expect(await sharp(backBytes).metadata()).toMatchObject({
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
      cardbacks: { Kesqer: `/art/backs/${backFile}` },
      packs: {},
      mascots: { cardmaker_lib: `/art/mascots/${mascotFile}` },
    }
    expect(manifest).toEqual(expected)
    expect(JSON.parse(await readFile(join(out, 'manifest.json'), 'utf8'))).toEqual(expected)
  })

  it('replaces an earlier build, its card and word folders too, and only a changed picture gets a new address', async () => {
    const out = join(root, 'art')
    await mkdir(join(out, 'cards'), { recursive: true })
    await writeFile(join(out, 'cards', 'legend-abolethseyes.0123456789.webp'), 'old')

    const back = await png('kesqer_cb.png', 30, 42, 32)
    const mascot = await png('cardmaker_lib.png', 30, 42, 112)
    const first = await writeArt([assign(BACK, back), assign(MASCOT, mascot)], out)
    expect(await readdir(out)).toEqual(['backs', 'manifest.json', 'mascots', 'packs'])

    await png('cardmaker_lib.png', 30, 42, 160)
    const second = await writeArt([assign(BACK, back), assign(MASCOT, mascot)], out)

    expect(second.mascots.cardmaker_lib).not.toBe(first.mascots.cardmaker_lib)
    expect(second.cardbacks.Kesqer).toBe(first.cardbacks.Kesqer)
    expect(second.cardbacks.Kesqer).toMatch(/^\/art\/backs\/kesqer\.[0-9a-f]{10}\.webp$/)
    expect(await readdir(join(out, 'mascots'))).toHaveLength(1)
  })

  it('builds no card or word picture', async () => {
    const card = await png('abolethseyes.png', 30, 42, 112)
    await expect(writeArt([assign(CARD, card)], join(root, 'art'))).rejects.toThrow(
      "Not a built picture: Aboleth's Eyes",
    )
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
