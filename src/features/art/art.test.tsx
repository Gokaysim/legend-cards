import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { testArt } from '@/test/artFixtures'
import { TestArtProvider } from '@/test/TestArtProvider'

import { artLookup, useArt } from './artContext'
import { ArtProvider } from './ArtProvider'
import { loadArtManifest } from './loadArtManifest'
import { EMPTY_ART } from './schema'

const MANIFEST = testArt({
  cards: { 'legend-abolethseyes': '/art/cards/legend-abolethseyes.0123456789.webp' },
  words: { 'tw-abyss': '/art/words/tw-abyss.0123456789.webp' },
  cardbacks: {
    Kesqer: '/art/backs/kesqer.0123456789.webp',
    'The End is Nigh': '/art/backs/the-end-is-nigh.0123456789.webp',
    cursed: '/art/backs/cursed.0123456789.webp',
  },
  packs: {
    'mechanic:Blood & Battle': '/art/packs/mechanic-blood-battle.0123456789.webp',
    golden: '/art/packs/golden.0123456789.webp',
    'standard:The End is Nigh': '/art/packs/standard-the-end-is-nigh.0123456789.webp',
  },
  mascots: { cardmaker_lib: '/art/mascots/cardmaker_lib.0123456789.webp' },
})

/** A fetch that answers with `body` and `status`. */
const answer = (body: string, status = 200) =>
  vi.fn<typeof fetch>(() => Promise.resolve(new Response(body, { status })))

describe('artLookup', () => {
  const art = artLookup(MANIFEST)

  it('gives the URL of each kind of picture, and null without one', () => {
    expect(art.cardUrl('legend-abolethseyes')).toBe(
      '/art/cards/legend-abolethseyes.0123456789.webp',
    )
    expect(art.cardUrl('legend-scorchedearth')).toBeNull()
    expect(art.wordUrl('tw-abyss')).toBe('/art/words/tw-abyss.0123456789.webp')
    expect(art.backUrl('cursed')).toBe('/art/backs/cursed.0123456789.webp')
    expect(art.backUrl('blessed')).toBeNull()
    expect(art.packUrl('golden')).toBe('/art/packs/golden.0123456789.webp')
    expect(art.mascotUrl('cardmaker_lib')).toBe('/art/mascots/cardmaker_lib.0123456789.webp')
    expect(art.mascotUrl('cardmaker_keep')).toBeNull()
  })

  it('finds sets and packs by any spelling of their set or mechanic pack', () => {
    // The card data writes "The End Is Nigh"; the official code is "The End is Nigh".
    expect(art.backUrl('The End Is Nigh')).toBe('/art/backs/the-end-is-nigh.0123456789.webp')
    expect(art.backUrl('endisnigh')).toBe('/art/backs/the-end-is-nigh.0123456789.webp')
    expect(art.backUrl('kesqer')).toBe('/art/backs/kesqer.0123456789.webp')
    expect(art.packUrl('standard:The End Is Nigh')).toBe(
      '/art/packs/standard-the-end-is-nigh.0123456789.webp',
    )
    expect(art.packUrl('mechanic:Blood & Battle')).toBe(
      '/art/packs/mechanic-blood-battle.0123456789.webp',
    )
    expect(art.packUrl('premium:The End Is Nigh')).toBeNull()
  })

  it('serves the pictures under the base URL the app is served at', () => {
    expect(artLookup(MANIFEST, '/cards/').cardUrl('legend-abolethseyes')).toBe(
      '/cards/art/cards/legend-abolethseyes.0123456789.webp',
    )
  })
})

describe('loadArtManifest', () => {
  it('gives the manifest of a valid answer', async () => {
    const fetcher = answer(JSON.stringify(MANIFEST))
    await expect(loadArtManifest('/art/manifest.json', fetcher)).resolves.toEqual(MANIFEST)
    expect(fetcher).toHaveBeenCalledWith('/art/manifest.json')
  })

  it.each([
    ['a failed request', vi.fn<typeof fetch>(() => Promise.reject(new TypeError('offline')))],
    ['a missing file', answer('Not found', 404)],
    // Vite and Hosting answer a missing file with the app's index.html.
    ['an HTML answer', answer('<!doctype html><html><body></body></html>')],
    ['an invalid manifest', answer(JSON.stringify({ version: 2, cards: {} }))],
    [
      'a picture outside /art/',
      answer(JSON.stringify(testArt({ cards: { x: 'https://example.com/x.webp' } }))),
    ],
  ])('gives EMPTY_ART for %s, and says why', async (_case, fetcher) => {
    const report = vi.fn()
    await expect(loadArtManifest('/art/manifest.json', fetcher, report)).resolves.toBe(EMPTY_ART)
    expect(report).toHaveBeenCalledOnce()
  })
})

function CardPictureUrl() {
  return <p>{useArt().cardUrl('legend-abolethseyes') ?? 'none'}</p>
}

describe('ArtProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('fetches the manifest once and shares its pictures', async () => {
    const fetcher = answer(JSON.stringify(MANIFEST))
    vi.stubGlobal('fetch', fetcher)
    render(
      <ArtProvider>
        <CardPictureUrl />
      </ArtProvider>,
    )
    expect(screen.getByText('none')).toBeInTheDocument()
    expect(
      await screen.findByText('/art/cards/legend-abolethseyes.0123456789.webp'),
    ).toBeInTheDocument()
    expect(fetcher).toHaveBeenCalledOnce()
    expect(fetcher).toHaveBeenCalledWith('/art/manifest.json')
  })

  it('keeps no pictures when there is no manifest', async () => {
    const fetcher = answer('<!doctype html>')
    vi.stubGlobal('fetch', fetcher)
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    render(
      <ArtProvider>
        <CardPictureUrl />
      </ArtProvider>,
    )
    await waitFor(() => expect(info).toHaveBeenCalledOnce())
    expect(fetcher).toHaveBeenCalledOnce()
    expect(screen.getByText('none')).toBeInTheDocument()
  })
})

describe('useArt', () => {
  it('has no pictures outside a provider', () => {
    render(<CardPictureUrl />)
    expect(screen.getByText('none')).toBeInTheDocument()
  })

  it('gives the test manifest inside TestArtProvider', () => {
    render(
      <TestArtProvider manifest={MANIFEST}>
        <CardPictureUrl />
      </TestArtProvider>,
    )
    expect(screen.getByText('/art/cards/legend-abolethseyes.0123456789.webp')).toBeInTheDocument()
  })
})
