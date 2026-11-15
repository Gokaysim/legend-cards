import { Navigate, useParams, useSearchParams } from 'react-router'

import { cardHistoryPath, LIBRARY_FOR_PARAM, libraryPath } from './screens'

/**
 * The former True Words screen's address (`/true-words?for=<uid>`): the Kütüphane's True Words tab, keeping the DM's
 * chosen player (spec: app-shell, "Former addresses of the merged screens").
 */
export function FormerTrueWordsAddress() {
  const [params] = useSearchParams()
  return (
    <Navigate to={libraryPath('true-words', params.get(LIBRARY_FOR_PARAM) ?? undefined)} replace />
  )
}

/** The former address of a Cursed card's Kart geçmişi (`/cursed-deck/:cardId`): its page below the Kütüphane. */
export function FormerCardHistoryAddress() {
  const { cardId = '' } = useParams()
  return <Navigate to={cardHistoryPath({ id: cardId })} replace />
}
