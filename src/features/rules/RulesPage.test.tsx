import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { testArt } from '@/test/artFixtures'
import { ready, testProfile } from '@/test/fixtures'
import { stubPhoneWidth, stubWideHover } from '@/test/media'
import { renderApp } from '@/test/renderApp'

/** The four sections, in order, each with its topics in order. */
const SECTIONS = [
  {
    title: 'Legend Point Kart Sistemi',
    topics: [
      'Legend Point nasıl kazanılır?',
      'Peki, bu puanlarla ne yapacağız?',
      'Kart alışverişi nasıl oluyor?',
      'Kartları ne zaman kullanabilirim?',
      'Kullandığım kartlara ne oluyor?',
      'Şu kartların renkleri ne anlama geliyor?',
    ],
  },
  {
    title: 'Cursed Kartlar',
    topics: ['Kart Çekmek', 'Takas', 'Lanetten Kurtulmak', 'Sonsuz Lanetler'],
  },
  {
    title: 'Blessed Kart Kuralları',
    topics: [
      'Blessed Kartlar Nasıl Kazanılır?',
      'Blessed Kartların Nadirliği',
      'Paketlerdeki Blessed Kartlar',
      'Bir Kutsama',
      'Blessed Kartlar Neden Kaybolur?',
      'Blessed Kartların Bedeli',
    ],
  },
  {
    title: 'True Word Kuralları',
    topics: ['True Word Nasıl Kullanılır?', 'True Word Nasıl Öğrenilir?', 'True Word Sahipliği'],
  },
]

/** The Kurallar screen's own content, without the shell around it. */
function rulesPage(): HTMLElement {
  const page = screen.getByRole('heading', { level: 1, name: 'Kurallar' }).closest('section')
  if (!page) throw new Error('The Kurallar screen is not shown')
  return page
}

const sectionTitles = () =>
  within(rulesPage())
    .getAllByRole('region')
    .map((region) => within(region).getByRole('heading', { level: 2 }).textContent)

const section = (title: string) => within(rulesPage()).getByRole('region', { name: title })

describe('Kurallar screen', () => {
  it('shows the four sections in order, and no not-ready note', () => {
    renderApp({ path: '/rules' })

    expect(sectionTitles()).toEqual(SECTIONS.map((s) => s.title))
    expect(screen.queryByText('Bu ekran henüz hazır değil.')).not.toBeInTheDocument()
  })

  it.each(SECTIONS.map((s) => [s.title, s.topics] as const))(
    'lists the topics of "%s" in order',
    (title, topics) => {
      renderApp({ path: '/rules' })

      const headings = within(section(title)).getAllByRole('heading', { level: 3 })
      expect(headings.map((heading) => heading.textContent)).toEqual(topics)
    },
  )

  it('has no English headings', () => {
    renderApp({ path: '/rules' })

    const headings = within(rulesPage())
      .getAllByRole('heading')
      .map((heading) => heading.textContent)
    for (const english of [
      'Cursed Cards',
      'Drawing Cards',
      'Trading',
      'Blessed Card Rules',
      'True Words Rules',
    ]) {
      expect(headings).not.toContain(english)
    }
  })

  it('gives every card in a draw the same chance, and no fixed percentage', () => {
    renderApp({ path: '/rules' })

    expect(
      within(section('Blessed Kart Kuralları')).getByText(
        /Kart çekerken destedeki her kartın şansı eşittir, Blessed'lar da onların arasındadır\./,
      ),
    ).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('%2')
  })

  it('names the packs with Blessed cards, and no per-mechanic formula', () => {
    renderApp({ path: '/rules' })

    const blessed = within(section('Blessed Kart Kuralları'))
    expect(
      blessed.getByText(
        "Blessed kartları Mechanic Pack'lerde, Golden Pack'lerde ve Pandemonium Pack'lerinde de bulabilirsin yavrum.",
      ),
    ).toBeInTheDocument()
    expect(
      blessed.getByText(
        "Her Mechanic'in kendine ait Blessed kartları vardır. Bereket dediğin böyle olur işte. Maşallah!",
      ),
    ).toBeInTheDocument()
    const text = rulesPage().textContent
    expect(text).not.toContain('Rare veya')
    expect(text).not.toContain('Rare Pack')
    expect(text).not.toContain('her 50 kart')
  })

  it('describes the card frame colors as the app shows them', () => {
    renderApp({ path: '/rules' })

    const colors = within(section('Legend Point Kart Sistemi'))
    for (const [frame, kind] of [
      ['Mor çerçeveli kartlar:', 'Common'],
      ['Altın çerçeveli kartlar:', 'Rare'],
      ['Beyaz çerçeveli kartlar:', 'Blessed'],
      ['Kırmızı çerçeveli kartlar:', 'Cursed'],
    ] as const) {
      expect(colors.getByText(frame).closest('li')).toHaveTextContent(`${kind} kart`)
    }
  })

  it('has no controls', () => {
    renderApp({ path: '/rules' })

    expect(within(rulesPage()).queryAllByRole('button')).toHaveLength(0)
    expect(within(rulesPage()).queryAllByRole('textbox')).toHaveLength(0)
    expect(rulesPage().querySelector('form')).toBeNull()
  })

  it('shows the DM the same text as a player', () => {
    const player = renderApp({ path: '/rules' })
    const playerText = rulesPage().textContent
    player.unmount()

    renderApp({ path: '/rules', users: { currentProfile: ready(testProfile({ role: 'dm' })) } })

    expect(rulesPage().textContent).toBe(playerText)
  })

  it('shows the whole text while the cards and the profiles are still loading', () => {
    renderApp({
      path: '/rules',
      users: { currentProfile: { status: 'loading' }, profiles: { status: 'loading' } },
      cards: { cards: { status: 'loading' } },
    })

    expect(sectionTitles()).toEqual(SECTIONS.map((s) => s.title))
    expect(
      within(section('True Word Kuralları')).getByText(/True Word'ler takas edilemez evladım\.$/),
    ).toBeInTheDocument()
  })

  it('shows the title and the whole text without a Cardmaker when the pictures are not built', () => {
    renderApp({ path: '/rules' })

    const header = screen.getByRole('heading', { level: 1, name: 'Kurallar' }).closest('header')
    expect(header?.querySelector('img')).toBeNull()
    expect(sectionTitles()).toEqual(SECTIONS.map((s) => s.title))
  })
})

describe('where the Kurallar Cardmaker stands', () => {
  const ART = testArt({
    mascots: { cardmaker_wave: '/art/mascots/cardmaker_wave.0123456789.webp' },
  })
  const headerMascot = () =>
    screen
      .getByRole('heading', { level: 1, name: 'Kurallar' })
      .closest('header')
      ?.querySelector('img[data-mascot]')

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('stands her in the corner on a wide window with a mouse, beside text of a readable width', () => {
    stubWideHover()
    renderApp({ path: '/rules', art: ART })

    expect(document.querySelector('[data-corner-cardmaker]')).toHaveAttribute(
      'data-corner-cardmaker',
      'cardmaker_wave',
    )
    expect(headerMascot()).toBeNull()
    expect(document.querySelector('[data-rules-text]')).toHaveClass('max-w-[70ch]')
  })

  it('keeps her by the title on a tablet', () => {
    renderApp({ path: '/rules', art: ART })

    expect(headerMascot()).toHaveAttribute('data-mascot', 'cardmaker_wave')
  })

  it('shows no Cardmaker on a phone', () => {
    stubPhoneWidth()
    renderApp({ path: '/rules', art: ART })

    expect(document.querySelector('img[data-mascot]')).toBeNull()
  })
})
