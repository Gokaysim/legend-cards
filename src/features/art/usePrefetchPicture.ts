import { useEffect } from 'react'

/**
 * Fetches a picture in the background while `enabled` holds, so an `<img>` with the same address shows it at once
 * later (spec: card-images, "Pictures fetched before the turn"; design D4 of `show-set-art-on-draws-and-library`). A
 * face-down card fetches its face's picture this way without putting the face in the page. The image is detached: it
 * is never shown, and a failed fetch changes nothing. It is kept until the address changes, `enabled` turns off or the
 * component unmounts, so the decoded picture stays in the browser's memory cache for the turn.
 */
export function usePrefetchPicture(url: string | null, enabled: boolean): void {
  useEffect(() => {
    if (!enabled || url === null) return
    let image: HTMLImageElement | null = new Image()
    image.decoding = 'async'
    image.src = url
    return () => {
      image = null
    }
  }, [url, enabled])
}
