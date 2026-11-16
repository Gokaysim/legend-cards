import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Timestamp } from 'firebase/firestore'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UserProfile } from '@/features/users/schema'
import type { Subscription } from '@/lib/firestore/subscription'
import { ready, testProfile, testUser } from '@/test/fixtures'
import { TestAccessProvider } from '@/test/TestAccessProvider'
import { TestAuthProvider } from '@/test/TestAuthProvider'
import { TestUsersProvider } from '@/test/TestUsersProvider'

import { AccessSection } from './AccessSection'
import { ACCESS_MESSAGES } from './messages'
import type { AccessEntry } from './schema'

const add = vi.fn((_email: string) => Promise.resolve())
const remove = vi.fn((_email: string) => Promise.resolve())
const ACTIONS = { add, remove }

const entry = (email: string, uid?: string): AccessEntry => ({
  email,
  addedAt: Timestamp.fromMillis(0),
  ...(uid ? { uid } : {}),
})

// The signed-in DM is testUser (player@example.com). Ayla has entered; Bora has not.
const DM = testProfile({ role: 'dm' })
const AYLA = testProfile({ id: 'ayla', displayName: 'Ayla', photoURL: 'https://example.com/a.png' })
const BORA = testProfile({ id: 'bora', displayName: 'Bora' })
const ENTRIES = [
  entry('bora@example.com'),
  entry('player@example.com', testUser.uid),
  entry('ayla@example.com', 'ayla'),
]

function renderSection({
  asDm = true,
  profiles = [DM, AYLA],
  entries = ready(ENTRIES),
}: { asDm?: boolean; profiles?: UserProfile[]; entries?: Subscription<AccessEntry[]> } = {}) {
  const user = userEvent.setup()
  const tree = (currentProfiles: UserProfile[], currentEntries: Subscription<AccessEntry[]>) => (
    <TestAuthProvider state={{ status: 'signedIn', user: testUser }}>
      <TestUsersProvider
        currentProfile={ready(asDm ? DM : testProfile())}
        profiles={ready(currentProfiles)}
      >
        <TestAccessProvider entries={currentEntries} actions={ACTIONS}>
          <AccessSection />
        </TestAccessProvider>
      </TestUsersProvider>
    </TestAuthProvider>
  )
  const view = render(tree(profiles, entries))
  return {
    user,
    rerenderWith: (nextProfiles: UserProfile[], nextEntries: Subscription<AccessEntry[]>) =>
      view.rerender(tree(nextProfiles, nextEntries)),
  }
}

const rows = () =>
  within(screen.getByRole('list', { name: 'Erişimi olan adresler' })).getAllByRole('listitem')
const field = () => screen.getByRole('textbox', { name: 'E-posta adresi' })
const addButton = () => screen.getByRole('button', { name: 'Ekle' })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('the "Masaya erişim" section', () => {
  it('lists the people who entered by name, then the addresses still waiting', () => {
    renderSection()

    expect(screen.getByRole('heading', { level: 2, name: 'Masaya erişim' })).toBeInTheDocument()
    expect(screen.getByText('Bu listedeki Google hesapları giriş yapabilir.')).toBeInTheDocument()
    const [ayla, me, bora] = rows()
    expect(ayla).toHaveTextContent('Aylaayla@example.com')
    expect(me).toHaveTextContent('Gökayplayer@example.com')
    expect(bora).toHaveTextContent('bora@example.com')
    expect(bora).toHaveTextContent('Henüz giriş yapmadı')
    expect(ayla).not.toHaveTextContent('Henüz giriş yapmadı')
  })

  it('marks the DM’s own row, which has no "Çıkar"', () => {
    renderSection()

    const [, me] = rows()
    if (!me) throw new Error('Expected the DM’s own row')
    expect(me).toHaveTextContent('DM · sen')
    expect(within(me).queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Çıkar: ayla@example.com' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Çıkar: bora@example.com' })).toBeInTheDocument()
  })

  it('shows a person’s name once they enter, without a reload', () => {
    const { rerenderWith } = renderSection()

    rerenderWith([DM, AYLA, BORA], ready([...ENTRIES.slice(1), entry('bora@example.com', 'bora')]))

    expect(rows().map((row) => row.textContent)).toEqual([
      expect.stringContaining('Ayla'),
      expect.stringContaining('Bora'),
      expect.stringContaining('Gökay'),
    ])
    expect(screen.queryByText('Henüz giriş yapmadı')).not.toBeInTheDocument()
  })

  it('shows nothing to a player', () => {
    renderSection({ asDm: false })

    expect(screen.queryByRole('heading', { name: 'Masaya erişim' })).not.toBeInTheDocument()
    expect(screen.queryByText(/@example\.com/)).not.toBeInTheDocument()
  })

  describe('adding', () => {
    it('adds the address in lowercase without spaces, and clears the field', async () => {
      const { user } = renderSection()

      await user.type(field(), '  Cem@Gmail.com ')
      await user.click(addButton())

      expect(add).toHaveBeenCalledWith('cem@gmail.com')
      expect(field()).toHaveValue('')
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('adds with Enter', async () => {
      const { user } = renderSection()

      await user.type(field(), 'cem@gmail.com{Enter}')
      expect(add).toHaveBeenCalledWith('cem@gmail.com')
    })

    it('refuses a malformed address', async () => {
      const { user } = renderSection()

      await user.type(field(), 'cem.gmail.com')
      await user.click(addButton())

      expect(screen.getByRole('alert')).toHaveTextContent(ACCESS_MESSAGES.invalid)
      expect(add).not.toHaveBeenCalled()
      expect(field()).toHaveValue('cem.gmail.com')
    })

    it('refuses an address already on the list, whatever its letter case', async () => {
      const { user } = renderSection()

      await user.type(field(), 'AYLA@example.com')
      await user.click(addButton())

      expect(screen.getByRole('alert')).toHaveTextContent(ACCESS_MESSAGES.duplicate)
      expect(add).not.toHaveBeenCalled()
    })

    it('waits for the list before adding', () => {
      renderSection({ entries: { status: 'loading' } })

      expect(addButton()).toBeDisabled()
    })

    it('says so when the server refuses the address', async () => {
      add.mockRejectedValueOnce(new Error('denied'))
      const { user } = renderSection()

      await user.type(field(), 'cem@gmail.com')
      await user.click(addButton())

      expect(await screen.findByRole('alert')).toHaveTextContent(ACCESS_MESSAGES.addFailed)
    })
  })

  describe('removing', () => {
    it('asks first, saying that the cards and LP stay, then removes the address', async () => {
      const { user } = renderSection()

      await user.click(screen.getByRole('button', { name: 'Çıkar: ayla@example.com' }))
      const dialog = screen.getByRole('dialog', { name: 'Masadan çıkar' })
      expect(dialog).toHaveTextContent(
        "ayla@example.com masadan çıkarılsın mı? Kartları ve LP'si silinmez.",
      )
      expect(remove).not.toHaveBeenCalled()

      await user.click(within(dialog).getByRole('button', { name: 'Çıkar' }))
      expect(remove).toHaveBeenCalledWith('ayla@example.com')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('removes nothing when the DM declines', async () => {
      const { user } = renderSection()

      await user.click(screen.getByRole('button', { name: 'Çıkar: bora@example.com' }))
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Vazgeç' }))

      expect(remove).not.toHaveBeenCalled()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('says so when the server refuses the removal', async () => {
      remove.mockRejectedValueOnce(new Error('denied'))
      const { user } = renderSection()

      await user.click(screen.getByRole('button', { name: 'Çıkar: bora@example.com' }))
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Çıkar' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(ACCESS_MESSAGES.removeFailed)
    })
  })
})
