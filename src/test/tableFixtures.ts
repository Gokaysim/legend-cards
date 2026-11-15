import { Timestamp } from 'firebase/firestore'

import type { TableChange } from '@/features/table/schema'

/** The DM Dana's change of the player draw mode from Kapalı to Filtreli çekiş, at `millis`. */
export function testTableChange(millis: number, overrides: Partial<TableChange> = {}): TableChange {
  return {
    id: `tc-${millis}`,
    by: 'dana',
    at: Timestamp.fromMillis(millis),
    setting: 'playerDraw',
    before: 'off',
    after: 'filtered',
    ...overrides,
  }
}
