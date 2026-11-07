import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { Subscription } from '@/lib/firestore/subscription'
import { ready, testProfile } from '@/test/fixtures'
import { TestUsersProvider } from '@/test/TestUsersProvider'

import { DmOnly } from './DmOnly'
import type { UserProfile } from './schema'

function renderWith(currentProfile: Subscription<UserProfile | null>) {
  render(
    <TestUsersProvider currentProfile={currentProfile}>
      <DmOnly>
        <button type="button">Kart ekle</button>
      </DmOnly>
    </TestUsersProvider>,
  )
}

describe('DmOnly', () => {
  it('shows its children to the DM', () => {
    renderWith(ready(testProfile({ role: 'dm' })))

    expect(screen.getByRole('button', { name: 'Kart ekle' })).toBeInTheDocument()
  })

  it('hides its children from a player', () => {
    renderWith(ready(testProfile()))

    expect(screen.queryByRole('button', { name: 'Kart ekle' })).not.toBeInTheDocument()
  })

  it('hides its children while the profile loads or does not exist yet', () => {
    renderWith({ status: 'loading' })
    expect(screen.queryByRole('button', { name: 'Kart ekle' })).not.toBeInTheDocument()
  })

  it('hides its children when there is no profile yet', () => {
    renderWith(ready(null))
    expect(screen.queryByRole('button', { name: 'Kart ekle' })).not.toBeInTheDocument()
  })
})
