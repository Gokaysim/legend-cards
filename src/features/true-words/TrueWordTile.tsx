import type { ReactNode } from 'react'

import { useArt } from '@/features/art/artContext'
import { CardPicture } from '@/features/art/CardPicture'
import { usePicture } from '@/features/art/usePicture'
import { visibleText } from '@/features/cards/text'
import { cn } from '@/lib/cn'

import { costLabel } from './display'
import type { TrueWord } from './schema'

export type TrueWordTileProps = {
  word: TrueWord
  /** Marks a word the chosen player knows ("Biliyor"). */
  isKnown?: boolean
  /** Marks a word that is active now. */
  isActive?: boolean
  /**
   * On the hand's True Words tab (design D9): with its picture, the tile is the picture alone, as in v2.2.8, and its
   * name, cost and text are left to screen readers. Without a picture, it is drawn in full.
   */
  isPictureOnly?: boolean
  /** The word whose details show beside the hand. It glows gold unless it is active, as a selected card does. */
  isSelected?: boolean
  /** Controls under the text, for example "Öğren". */
  children?: ReactNode
  className?: string
}

/**
 * One True Word: ✦, its name, its cost as "<cost> LP", and its picture, or without one its visible text. With the
 * picture, which carries the text, the text stays for screen readers (design D8). Known and active words are marked.
 */
export function TrueWordTile({
  word,
  isKnown,
  isActive,
  isPictureOnly = false,
  isSelected = false,
  children,
  className,
}: TrueWordTileProps) {
  const picture = usePicture(useArt().pictureUrl(word.picture))
  const text = visibleText(word.text)
  const isBare = isPictureOnly && picture.src !== null
  const glow = isActive ? 'word' : isSelected ? 'selected' : undefined
  return (
    <article
      aria-label={word.name}
      data-glow={glow}
      data-look={isBare ? 'picture' : undefined}
      className={cn(
        'flex h-full flex-col gap-2',
        !isBare && 'rounded-2xl border bg-pane p-3',
        !isBare && (isActive ? 'border-true-word-line' : 'border-line'),
        // An active word glows purple (spec: visual-effects); a selected one gold, as a selected card does.
        glow === 'word' && 'glow-word',
        glow === 'selected' && 'drop-shadow-glow-selected',
        className,
      )}
    >
      <header className={cn('flex items-start justify-between gap-2', isBare && 'sr-only')}>
        <h3 lang="en" className="min-w-0 font-semibold break-words text-ink">
          <span aria-hidden="true" className="text-gold">
            ✦{' '}
          </span>
          {word.name}
        </h3>
        <span className="shrink-0 rounded-full border border-gold px-2 py-0.5 text-xs text-gold tabular-nums">
          {costLabel(word.cost)}
        </span>
      </header>
      {picture.src === null ? null : (
        <CardPicture
          src={picture.src}
          alt={word.name}
          onError={picture.onError}
          className={isBare ? 'w-full' : 'mx-auto max-w-56'}
        />
      )}
      <p
        lang="en"
        className={cn(
          'grow text-sm break-words whitespace-pre-line text-ink-muted',
          picture.src !== null && 'sr-only',
        )}
      >
        {text === '' ? 'Efekt metni yok.' : text}
      </p>
      {isKnown || isActive ? (
        <p className="flex flex-wrap gap-1 text-xs">
          {isKnown ? (
            <span className="rounded-full bg-pane-raised px-2 py-0.5 text-ink">Biliyor</span>
          ) : null}
          {isActive ? (
            <span className="rounded-full bg-pane-raised px-2 py-0.5 text-gold">● Aktif</span>
          ) : null}
        </p>
      ) : null}
      {children}
    </article>
  )
}
