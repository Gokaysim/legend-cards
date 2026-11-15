import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { NEUTRAL_BACK, type SpreadBack } from '@/features/art/spreadBack'
import { testArt, testPicturePath, testPictureUrl } from '@/test/artFixtures'
import { testCard } from '@/test/cardFixtures'
import { TestArtProvider } from '@/test/TestArtProvider'

import { type BannerCard, LiveBanner } from './LiveBanner'

const KESQER_BACK: SpreadBack = { kind: 'set', setCode: 'Kesqer' }
const BACKS = testArt({ cardbacks: { Kesqer: '/art/backs/kesqer.0123456789.webp' } })

const pictured = (name: string) => {
  const card = testCard(name)
  return { ...card, picture: testPicturePath('card', card.id) }
}

const EYES = pictured("Aboleth's Eyes")
const RITE = pictured('Blood Rite')
const DIARY = pictured("Ahriman's Diary")
const OATH = pictured('Oath')
const WIND = pictured('Wind')

const card = (
  entry: BannerCard['card'],
  isUp: boolean,
  back: SpreadBack = KESQER_BACK,
): BannerCard => ({
  key: entry?.id ?? 'missing',
  card: entry,
  isUp,
  back,
})

function renderBanner(cards: BannerCard[], onShow = vi.fn()) {
  render(
    <TestArtProvider manifest={BACKS}>
      <LiveBanner text="Ayla Pack açıyor" cards={cards} onShow={onShow} />
    </TestArtProvider>,
  )
  return onShow
}

const pictures = () =>
  Array.from(screen.getByRole('status').querySelectorAll('img')).map((img) =>
    img.getAttribute('src'),
  )

describe('LiveBanner', () => {
  it('shows a shrunk pack: the live mark, three faces and two backs, the line and "Göster"', async () => {
    const onShow = renderBanner([
      card(EYES, true),
      card(RITE, true),
      card(DIARY, true),
      card(OATH, false),
      card(WIND, false),
    ])

    expect(screen.getByTestId('live-mark')).toBeInTheDocument()
    expect(screen.getByText('Ayla Pack açıyor')).toBeInTheDocument()
    const back = '/art/backs/kesqer.0123456789.webp'
    expect(pictures()).toEqual([
      testPictureUrl(EYES.picture ?? ''),
      testPictureUrl(RITE.picture ?? ''),
      testPictureUrl(DIARY.picture ?? ''),
      back,
      back,
    ])
    await userEvent.setup().click(screen.getByRole('button', { name: 'Göster' }))
    expect(onShow).toHaveBeenCalledOnce()
  })

  it('never gives a face-down card away: its picture is the back, the same for every card', () => {
    renderBanner([card(EYES, false), card(RITE, false)])
    const [first, second] = pictures()
    expect(first).toBe('/art/backs/kesqer.0123456789.webp')
    expect(second).toBe(first)
    expect(screen.getByRole('status')).not.toHaveTextContent("Aboleth's Eyes")
  })

  it('draws a back without a picture, without the card', () => {
    renderBanner([card(EYES, false, NEUTRAL_BACK)])
    expect(screen.getByTestId('banner-back')).toBeInTheDocument()
    expect(pictures()).toEqual([])
  })

  it('shows the DM\'s extra controls after "Göster"', () => {
    render(
      <LiveBanner
        text="Ayla kart çekiyor"
        cards={[]}
        onShow={vi.fn()}
        actions={<button type="button">Bitir</button>}
      />,
    )
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Göster',
      'Bitir',
    ])
  })
})
