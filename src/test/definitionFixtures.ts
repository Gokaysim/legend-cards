import { Timestamp } from 'firebase/firestore'

import type {
  CardSnapshot,
  DefinitionStepRecord,
  ImportRecord,
  WordSnapshot,
} from '@/features/definitions/schema'

/** A card's definition as a change record keeps it: an active Common Kesqer card unless overridden. */
export function testCardSnapshot(
  name: string,
  overrides: Partial<CardSnapshot> = {},
): CardSnapshot {
  return {
    kind: 'normal',
    name,
    nameKey: name.toLowerCase().replace(/[^a-z0-9]/g, ''),
    setCode: 'Kesqer',
    cost: '2',
    rarity: 'common',
    mechanicPack: 'Arcanus Divine',
    text: `${name} text.`,
    status: 'active',
    picture: null,
    ...overrides,
  }
}

/** A True Word's definition as a change record keeps it: active, cost "1", unless overridden. */
export function testWordSnapshot(
  name: string,
  overrides: Partial<WordSnapshot> = {},
): WordSnapshot {
  return {
    name,
    nameKey: name.toLowerCase(),
    cost: '1',
    text: `${name} text.`,
    status: 'active',
    picture: null,
    ...overrides,
  }
}

/** A DM's step on a card: an edit of an active card by "dana" unless overridden. */
export function testCardChange(
  id: string,
  before: CardSnapshot | null,
  after: CardSnapshot | null,
  overrides: Partial<DefinitionStepRecord> = {},
): DefinitionStepRecord {
  return {
    id,
    target: 'card',
    targetId: `legend-${(after ?? before)?.nameKey ?? id}`,
    name: (after ?? before)?.name ?? id,
    step: 'edited',
    before,
    after,
    public: true,
    by: 'dana',
    at: Timestamp.fromMillis(1000),
    ...overrides,
  } as DefinitionStepRecord
}

/** A DM's step on a True Word. */
export function testWordChange(
  id: string,
  before: WordSnapshot | null,
  after: WordSnapshot | null,
  overrides: Partial<DefinitionStepRecord> = {},
): DefinitionStepRecord {
  return {
    id,
    target: 'word',
    targetId: `tw-${(after ?? before)?.nameKey ?? id}`,
    name: (after ?? before)?.name ?? id,
    step: 'edited',
    before,
    after,
    public: true,
    by: 'dana',
    at: Timestamp.fromMillis(1000),
    ...overrides,
  } as DefinitionStepRecord
}

/** An import's record of `count` active cards, unless overridden. */
export function testImportRecord(
  id: string,
  count: number,
  overrides: Partial<ImportRecord> = {},
): ImportRecord {
  return {
    id,
    target: 'card',
    step: 'imported',
    what: 'definitions',
    items: Array.from({ length: count }, (_, index) => ({
      id: `legend-card${index}`,
      name: `Card ${index}`,
      status: 'active' as const,
    })),
    public: true,
    by: null,
    at: Timestamp.fromMillis(1000),
    ...overrides,
  }
}
