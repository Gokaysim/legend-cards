import type { PictureChoice } from './api'
import type { PreparedPicture } from './picture'

/**
 * The form's unsaved picture choice: keep the stored picture, use a prepared one (with the object URL that previews
 * it), or remove the stored one.
 */
export type PictureDraft =
  | { kind: 'keep' }
  | { kind: 'new'; prepared: PreparedPicture; previewUrl: string }
  | { kind: 'remove' }

export const KEEP_DRAFT: PictureDraft = { kind: 'keep' }

/** What a save does with the picture. */
export function choiceOf(draft: PictureDraft): PictureChoice {
  return draft.kind === 'new'
    ? { kind: 'new', blob: draft.prepared.blob, hash: draft.prepared.hash }
    : draft
}
