import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement } from 'react'

import { TestSetsProvider } from './TestSetsProvider'

/**
 * `render` inside `TestSetsProvider` with the 12 test sets, for a component that names sets (through `useSetIndex()`)
 * without the rest of `renderApp`. A `wrapper` option wraps inside the sets.
 */
export function renderWithSets(ui: ReactElement, options: RenderOptions = {}) {
  const Inner = options.wrapper
  return render(ui, {
    ...options,
    wrapper: ({ children }) => (
      <TestSetsProvider>{Inner ? <Inner>{children}</Inner> : children}</TestSetsProvider>
    ),
  })
}
