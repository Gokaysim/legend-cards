import { describe, expect, it } from 'vitest'

import { dmNoteTarget } from './playerNotesContext'

describe('dmNoteTarget', () => {
  it('names the player for the DM', () => {
    expect(dmNoteTarget(true, 'ayla')).toBe('ayla')
  })

  it('names nobody for a player or a profile that is still loading, so nothing is requested', () => {
    // `useIsDm()` is false for a player, and also while the profile loads or is missing.
    expect(dmNoteTarget(false, 'ayla')).toBeNull()
  })
})
