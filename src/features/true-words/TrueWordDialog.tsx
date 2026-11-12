import { Dialog } from '@/components/ui/Dialog'

import { TrueWordDetails } from './TrueWordDetails'
import type { KnownWordEntry } from './trueWordsContext'

export type TrueWordDialogProps = {
  entry: KnownWordEntry
  /** The name of the player who knows the word. */
  holderName: string
  onClose: () => void
}

/**
 * A known word's details in a dialog: where the window is too narrow for the panel beside the hand (spec: true-words,
 * "True Words tab on the hand screen"). It closes once the word is taken back from here.
 */
export function TrueWordDialog({ entry, holderName, onClose }: TrueWordDialogProps) {
  return (
    <Dialog title={`✦ ${entry.word.name}`} onClose={onClose}>
      <TrueWordDetails entry={entry} holderName={holderName} onDone={onClose} layout="dialog" />
    </Dialog>
  )
}
