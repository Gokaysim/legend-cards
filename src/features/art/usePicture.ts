import { useState } from 'react'

/**
 * A picture that may fail to load: `src` is the URL until the image reports an error, then `null`, so the caller
 * falls back to its look without pictures (spec: card-images, "Pictures with a fallback").
 */
export function usePicture(url: string | null): { src: string | null; onError: () => void } {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  return {
    src: url !== null && url !== failedUrl ? url : null,
    onError: () => setFailedUrl(url),
  }
}
