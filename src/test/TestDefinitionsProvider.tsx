import { type ReactNode, useMemo } from 'react'

import {
  type DefinitionActions,
  DefinitionsContext,
} from '@/features/definitions/definitionsContext'

export type TestDefinitions = {
  /** Fakes for the steps, for example `vi.fn()`. Missing ones succeed without doing anything. */
  actions?: Partial<DefinitionActions>
}

export type TestDefinitionsProviderProps = TestDefinitions & { children: ReactNode }

const SUCCEEDING_ACTIONS: DefinitionActions = {
  addCard: () => Promise.resolve('legend-test'),
  saveCard: () => Promise.resolve(),
  setCardStatus: () => Promise.resolve(),
  deleteCard: () => Promise.resolve(),
  addWord: () => Promise.resolve('tw-test'),
  saveWord: () => Promise.resolve(),
  setWordStatus: () => Promise.resolve(),
  deleteWord: () => Promise.resolve(),
}

/** Provides fake definition steps to components under test, without Firebase. */
export function TestDefinitionsProvider({ actions, children }: TestDefinitionsProviderProps) {
  const value = useMemo(() => ({ ...SUCCEEDING_ACTIONS, ...actions }), [actions])
  return <DefinitionsContext value={value}>{children}</DefinitionsContext>
}
