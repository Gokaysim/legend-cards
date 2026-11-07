import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ConfigErrorScreen } from './ConfigErrorScreen'

describe('ConfigErrorScreen', () => {
  it('names each problem setting in Turkish', () => {
    render(
      <ConfigErrorScreen
        problems={[
          { key: 'VITE_FIREBASE_PROJECT_ID', kind: 'missing' },
          { key: 'VITE_USE_FIREBASE_EMULATORS', kind: 'invalid' },
        ]}
      />,
    )

    const alert = screen.getByRole('alert')
    expect(within(alert).getByRole('heading', { name: 'Uygulama başlatılamadı' })).toBeVisible()

    const items = within(alert).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('VITE_FIREBASE_PROJECT_ID')
    expect(items[0]).toHaveTextContent('eksik')
    expect(items[1]).toHaveTextContent('VITE_USE_FIREBASE_EMULATORS')
    expect(items[1]).toHaveTextContent('geçersiz')
  })
})
