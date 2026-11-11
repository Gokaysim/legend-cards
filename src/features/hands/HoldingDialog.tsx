import { Dialog } from '@/components/ui/Dialog'

import type { HandEntry } from './handEntries'
import { HoldingDetails } from './HoldingDetails'

export type HoldingDialogProps = {
  entry: HandEntry
  /** The name of the player who holds the card. */
  holderName: string
  onClose: () => void
}

/**
 * A held card's details in a dialog: where the window is too narrow for the panel beside the hand (spec:
 * card-holdings, "Card details in a dialog on narrow windows"). It closes once the card leaves the hand from here.
 */
export function HoldingDialog({ entry, holderName, onClose }: HoldingDialogProps) {
  return (
    <Dialog title={entry.card.name} onClose={onClose}>
      <HoldingDetails entry={entry} holderName={holderName} onDone={onClose} layout="dialog" />
    </Dialog>
  )
}
