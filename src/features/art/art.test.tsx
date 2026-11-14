import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { testArt, testPictureUrl } from '@/test/artFixtures'
import { TestArtProvider } from '@/test/TestArtProvider'

import { artLookup, useArt } from './artContext'
import { ArtProvider } from './ArtProvider'
import { loadArtManifest } from './loadArtManifest'
import { EMPTY_ART } from './schema'

// The app's stored picture addresses need the Firebase settings; here they are a fixed fake.
vi.mock('@/lib/firebase/storage', () => ({
  storedPictureUrl: (path: string) => `https://storage.test/${path}`,
}))

const ABOLETH_PICTURE = 'cards/legend-abolethseyes/0123456789.webp'

const MANIFEST = testArt({
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
  const art = artLookup(MANIFEST, '/', testPictureUrl)

  it('gives the URL of each kind of picture, and null without one', () => {
    expect(art.pictureUrl(ABOLETH_PICTURE)).toBe(testPictureUrl(ABOLETH_PICTURE))
    expect(art.pictureUrl(null)).toBeNull()
    expect(art.backUrl('cursed')).toBe('/art/backs/cursed.0123456789.webp')
    expect(art.backUrl('blessed')).toBeNull()
    expect(art.packUrl('golden')).toBe('/art/packs/golden.0123456789.webp')
    expect(art.mascotUrl('cardmaker_lib')).toBe('/art/mascots/cardmaker_lib.0123456789.webp')
    expect(art.mascotUrl('cardmaker_keep')).toBeNull()
  })

  it('finds a back and a pack by any spelling of its key', () => {
    expect(art.backUrl('Cursed')).toBe('/art/backs/cursed.0123456789.webp')
    expect(art.packUrl('mechanic:Blood & Battle')).toBe(
      '/art/packs/mechanic-blood-battle.0123456789.webp',
    )
    expect(art.packUrl('mechanic:blood battle')).toBe(
      '/art/packs/mechanic-blood-battle.0123456789.webp',
    )
    expect(art.packUrl('premium:The End Is Nigh')).toBeNull()
  })

  it('knows no set Cardmaker by itself: the stored sets add them', () => {
    expect(art.setMascotUrl('Kesqer')).toBeNull()
  })

  it('gives no card or word picture without a way to build its address', () => {
    expect(artLookup(MANIFEST).pictureUrl(ABOLETH_PICTURE)).toBeNull()
  })

  it('serves the built pictures under the base URL the app is served at', () => {
    expect(artLookup(MANIFEST, '/cards/').backUrl('cursed')).toBe(
      '/cards/art/backs/cursed.0123456789.webp',
    )
  })
})

describe('loadArtManifest', () => {
  it('gives the manifest of a valid answer', async () => {
    const fetcher = answer(JSON.stringify(MANIFEST))
    await expect(loadArtManifest('/art/manifest.json', fetcher)).resolves.toEqual(MANIFEST)
    expect(fetcher).toHaveBeenCalledWith('/art/manifest.json')
  })

  it('keeps the built pictures of an older manifest that still lists cards and words', async () => {
    const older = {
      ...MANIFEST,
      cards: { 'legend-abolethseyes': '/art/cards/legend-abolethseyes.0123456789.webp' },
      words: { 'tw-abyss': '/art/words/tw-abyss.0123456789.webp' },
    }
    await expect(
      loadArtManifest('/art/manifest.json', answer(JSON.stringify(older))),
    ).resolves.toEqual(MANIFEST)
  })

  it.each([
    ['a failed request', vi.fn<typeof fetch>(() => Promise.reject(new TypeError('offline')))],
    ['a missing file', answer('Not found', 404)],
    // Vite and Hosting answer a missing file with the app's index.html.
    ['an HTML answer', answer('<!doctype html><html><body></body></html>')],
    ['an invalid manifest', answer(JSON.stringify({ version: 2, cards: {} }))],
    [
      'a picture outside /art/',
      answer(JSON.stringify(testArt({ cardbacks: { x: 'https://example.com/x.webp' } }))),
    ],
  ])('gives EMPTY_ART for %s, and says why', async (_case, fetcher) => {
    const report = vi.fn()
    await expect(loadArtManifest('/art/manifest.json', fetcher, report)).resolves.toBe(EMPTY_ART)
    expect(report).toHaveBeenCalledOnce()
  })
})

function PictureUrls() {
  const art = useArt()
  return (
    <>
      <p>{art.backUrl('cursed') ?? 'no back'}</p>
      <p>{art.pictureUrl(ABOLETH_PICTURE) ?? 'no card picture'}</p>
    </>
  )
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
        <PictureUrls />
      </ArtProvider>,
    )
    expect(screen.getByText('no back')).toBeInTheDocument()
    expect(await screen.findByText('/art/backs/cursed.0123456789.webp')).toBeInTheDocument()
    expect(fetcher).toHaveBeenCalledOnce()
    expect(fetcher).toHaveBeenCalledWith('/art/manifest.json')
  })

  it("builds the stored pictures' addresses without a request", () => {
    vi.stubGlobal('fetch', answer('<!doctype html>'))
    vi.spyOn(console, 'info').mockImplementation(() => {})
    render(
      <ArtProvider>
        <PictureUrls />
      </ArtProvider>,
    )
    expect(screen.getByText(`https://storage.test/${ABOLETH_PICTURE}`)).toBeInTheDocument()
  })

  it('keeps no pictures when there is no manifest', async () => {
    const fetcher = answer('<!doctype html>')
    vi.stubGlobal('fetch', fetcher)
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    render(
      <ArtProvider>
        <PictureUrls />
      </ArtProvider>,
    )
    await waitFor(() => expect(info).toHaveBeenCalledOnce())
    expect(fetcher).toHaveBeenCalledOnce()
    expect(screen.getByText('no back')).toBeInTheDocument()
  })
})

describe('useArt', () => {
  it('has no pictures outside a provider', () => {
    render(<PictureUrls />)
    expect(screen.getByText('no back')).toBeInTheDocument()
    expect(screen.getByText('no card picture')).toBeInTheDocument()
  })

  it('gives the test manifest and the test addresses inside TestArtProvider', () => {
    render(
      <TestArtProvider manifest={MANIFEST}>
        <PictureUrls />
      </TestArtProvider>,
    )
    expect(screen.getByText('/art/backs/cursed.0123456789.webp')).toBeInTheDocument()
    expect(screen.getByText(testPictureUrl(ABOLETH_PICTURE))).toBeInTheDocument()
  })
})
