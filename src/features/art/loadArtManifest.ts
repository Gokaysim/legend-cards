import { type ArtManifest, artManifestSchema, EMPTY_ART } from './schema'

/**
 * Fetches the picture manifest. Anything but a valid manifest gives `EMPTY_ART`, so the app keeps its look without
 * pictures: a failed request, an answer that is not JSON (Vite and Hosting answer a missing file with `index.html`),
 * or an invalid manifest. `report` hears why, for a note in development.
 */
export async function loadArtManifest(
  url: string,
  fetcher: typeof fetch = fetch,
  report: (reason: string) => void = () => {},
): Promise<ArtManifest> {
  try {
    const response = await fetcher(url)
    if (!response.ok) {
      report(`HTTP ${response.status}`)
      return EMPTY_ART
    }
    const body: unknown = JSON.parse(await response.text())
    const parsed = artManifestSchema.safeParse(body)
    if (!parsed.success) {
      report(`invalid manifest: ${parsed.error.message}`)
      return EMPTY_ART
    }
    return parsed.data
  } catch (error) {
    report(error instanceof Error ? error.message : String(error))
    return EMPTY_ART
  }
}
