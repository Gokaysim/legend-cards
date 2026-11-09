import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Timestamp } from 'firebase/firestore'
import { describe, expect, it, vi } from 'vitest'

import type { UserProfile } from '@/features/users/schema'
import { ready, testProfile, testUser } from '@/test/fixtures'
import { renderApp } from '@/test/renderApp'
import type { TestNotes } from '@/test/TestPlayerNotesProvider'

import type { NoteActions } from './playerNotesContext'
import type { Note } from './schema'

const me = testProfile({ displayName: 'Gökay' })
const ayla = testProfile({ id: 'ayla', displayName: 'Ayla' })
const dana = testProfile({ id: 'dana', displayName: 'Dana', role: 'dm' })

/** 9 November 2026, 14:32, local time: the time the tests read as "9 Kas 14:32". */
const NOV_9_1432 = Timestamp.fromDate(new Date(2026, 10, 9, 14, 32))

const note = (text: string, overrides: Partial<Note> = {}): Note => ({
  text,
  updatedBy: 'ayla',
  updatedAt: NOV_9_1432,
  ...overrides,
})

const main = () => within(screen.getByRole('main'))

function fakeActions() {
  return {
    savePlayerNote: vi.fn<NoteActions['savePlayerNote']>(() => Promise.resolve()),
    saveDmNote: vi.fn<NoteActions['saveDmNote']>(() => Promise.resolve()),
  }
}

/**
 * The Notlar tab of `owner`'s hand, as `viewer` (signed in as `testUser`). Ayla's hand by default, seen by another
 * player.
 */
function renderNotes({
  viewer = me,
  owner = ayla,
  notes = {},
}: {
  viewer?: UserProfile
  owner?: UserProfile
  notes?: TestNotes
} = {}) {
  const actions = fakeActions()
  const onUseDmNote = vi.fn()
  const signedIn = { ...viewer, id: testUser.uid }
  const ownerProfile = owner.id === viewer.id ? signedIn : owner
  const view = renderApp({
    path: `/hands/${ownerProfile.id}?tab=notes`,
    users: {
      currentProfile: ready(signedIn),
      profiles: ready([ownerProfile, signedIn, dana]),
    },
    notes: { onUseDmNote, ...notes, actions: { ...actions, ...notes.actions } },
  })
  return { ...view, actions, onUseDmNote, user: userEvent.setup() }
}

const section = (name: string) => within(main().getByRole('region', { name }))

describe('the player note', () => {
  it("is editable on the player's own hand, with no DM note section", () => {
    const { onUseDmNote } = renderNotes({ owner: me })

    expect(main().getByRole('textbox', { name: 'Oyuncu notu' })).toHaveAttribute(
      'placeholder',
      'Oyuncunun genel notlarını buraya yaz…',
    )
    expect(main().queryByRole('region', { name: 'DM notu' })).not.toBeInTheDocument()
    expect(main().queryByText('🔒 Yalnızca DM görür')).not.toBeInTheDocument()
    expect(onUseDmNote).not.toHaveBeenCalled()
  })

  it("is read-only text on another player's hand, with its line breaks", () => {
    renderNotes({ notes: { playerNotes: { ayla: ready(note('Bir.\nİki.')) } } })

    const player = section('Oyuncu notu')
    expect(player.queryByRole('textbox')).not.toBeInTheDocument()
    expect(player.getByText(/Bir\.\s+İki\./)).toHaveClass('whitespace-pre-line')
  })

  it('reads "Not yok." when it was never written, or is blank, with the last editor only once written', () => {
    const { setNotes } = renderNotes()

    expect(section('Oyuncu notu').getByText('Not yok.')).toBeInTheDocument()
    expect(section('Oyuncu notu').queryByText(/Son düzenleyen/)).not.toBeInTheDocument()

    setNotes({ playerNotes: { ayla: ready(note('  \n ')) } })

    expect(section('Oyuncu notu').getByText('Not yok.')).toBeInTheDocument()
    expect(
      section('Oyuncu notu').getByText('Son düzenleyen: Ayla · 9 Kas 14:32'),
    ).toBeInTheDocument()
  })

  it('shows who changed it last and when', () => {
    renderNotes({
      notes: {
        playerNotes: { ayla: ready(note('Kayıp kardeşini arıyor.', { updatedBy: 'dana' })) },
      },
    })

    expect(
      section('Oyuncu notu').getByText('Son düzenleyen: Dana · 9 Kas 14:32'),
    ).toBeInTheDocument()
  })

  it('says "kaydediliyor…" while the server time is pending, and "Bir oyuncu" for an unknown editor', () => {
    renderNotes({
      notes: {
        playerNotes: { ayla: ready(note('Yeni.', { updatedBy: 'ghost', updatedAt: null })) },
      },
    })

    expect(
      section('Oyuncu notu').getByText('Son düzenleyen: Bir oyuncu · kaydediliyor…'),
    ).toBeInTheDocument()
  })

  it('shows a new text live, as from another device', () => {
    const { setNotes } = renderNotes({ notes: { playerNotes: { ayla: ready(note('Eski.')) } } })

    setNotes({ playerNotes: { ayla: ready(note('Yeni not.')) } })

    expect(section('Oyuncu notu').getByText('Yeni not.')).toBeInTheDocument()
  })

  it('saves on leaving the field, as the signed-in user, only when the text changed', async () => {
    const { user, actions } = renderNotes({
      owner: me,
      notes: { playerNotes: { [testUser.uid]: ready(note('Eski.')) } },
    })
    const field = main().getByRole('textbox', { name: 'Oyuncu notu' })

    await user.click(field)
    await user.tab()
    expect(actions.savePlayerNote).not.toHaveBeenCalled()

    await user.click(field)
    await user.type(field, ' Yeni.')
    expect(actions.savePlayerNote).not.toHaveBeenCalled()
    await user.tab()

    expect(actions.savePlayerNote).toHaveBeenCalledExactlyOnceWith({
      uid: testUser.uid,
      text: 'Eski. Yeni.',
      by: testUser.uid,
    })
  })

  it("keeps the player's typing while the DM saves, and saves it on leaving the field", async () => {
    const { user, actions, setNotes } = renderNotes({
      owner: me,
      notes: { playerNotes: { [testUser.uid]: ready(note('Eski.')) } },
    })
    const field = main().getByRole('textbox', { name: 'Oyuncu notu' })

    await user.clear(field)
    await user.type(field, 'Benim metnim')
    act(() => {
      setNotes({
        playerNotes: { [testUser.uid]: ready(note('DM yazdı.', { updatedBy: 'dana' })) },
        actions,
      })
    })

    expect(field).toHaveValue('Benim metnim')
    await user.tab()
    expect(actions.savePlayerNote).toHaveBeenLastCalledWith({
      uid: testUser.uid,
      text: 'Benim metnim',
      by: testUser.uid,
    })
  })

  it('says so when a save fails, and shows the stored text again', async () => {
    const savePlayerNote = vi.fn<NoteActions['savePlayerNote']>(() =>
      Promise.reject(new Error('permission-denied')),
    )
    const { user } = renderNotes({
      owner: me,
      notes: { playerNotes: { [testUser.uid]: ready(note('Eski.')) }, actions: { savePlayerNote } },
    })
    const field = main().getByRole('textbox', { name: 'Oyuncu notu' })

    await user.type(field, ' Yeni.')
    await user.tab()

    expect(await main().findByRole('alert')).toHaveTextContent('Not kaydedilemedi.')
    expect(field).toHaveValue('Eski.')
  })

  it('says so when it cannot be read', () => {
    renderNotes({
      notes: {
        playerNotes: {
          ayla: {
            status: 'error',
            error: { kind: 'unknown', message: 'x', path: 'playerNotes/ayla' },
          },
        },
      },
    })

    expect(section('Oyuncu notu').getByRole('alert')).toHaveTextContent('Notlar yüklenemedi.')
  })
})

describe('the DM note', () => {
  it("shows the DM both notes of a player, editable, the DM note marked as the DM's alone", () => {
    const { onUseDmNote } = renderNotes({
      viewer: dana,
      notes: {
        playerNotes: { ayla: ready(note('Kayıp kardeşini arıyor.')) },
        dmNotes: { ayla: ready(note('Kardeşi aslında hayatta.', { updatedBy: 'dana' })) },
      },
    })

    expect(main().getByRole('textbox', { name: 'Oyuncu notu' })).toHaveValue(
      'Kayıp kardeşini arıyor.',
    )
    const dm = main().getByRole('textbox', { name: 'DM notu' })
    expect(dm).toHaveValue('Kardeşi aslında hayatta.')
    expect(dm).toHaveAccessibleDescription('🔒 Yalnızca DM görür')
    expect(section('DM notu').getByText('Son düzenleyen: Dana · 9 Kas 14:32')).toBeInTheDocument()
    expect(onUseDmNote).toHaveBeenCalledWith('ayla')
  })

  it('lets the DM save both notes about the player, as the DM', async () => {
    const { user, actions } = renderNotes({ viewer: dana })

    await user.type(main().getByRole('textbox', { name: 'Oyuncu notu' }), 'Herkes görür.')
    await user.type(main().getByRole('textbox', { name: 'DM notu' }), 'Sadece ben.')
    await user.tab()

    expect(actions.savePlayerNote).toHaveBeenCalledExactlyOnceWith({
      uid: 'ayla',
      text: 'Herkes görür.',
      by: testUser.uid,
    })
    expect(actions.saveDmNote).toHaveBeenCalledExactlyOnceWith({
      uid: 'ayla',
      text: 'Sadece ben.',
      by: testUser.uid,
    })
  })

  it('is never shown or read on a player’s screen, not even on their own hand', () => {
    const { onUseDmNote } = renderNotes({
      owner: me,
      notes: { dmNotes: { [testUser.uid]: ready(note('Gizli sır.')) } },
    })

    expect(main().queryByText('Gizli sır.')).not.toBeInTheDocument()
    expect(main().queryByRole('region', { name: 'DM notu' })).not.toBeInTheDocument()
    expect(onUseDmNote).not.toHaveBeenCalled()
  })

  it('stays off the other tabs of a hand the DM shows to the table', async () => {
    const onUseDmNote = vi.fn()
    const user = userEvent.setup()
    const dm = { ...dana, id: testUser.uid }
    renderApp({
      path: '/hands/ayla',
      users: { currentProfile: ready(dm), profiles: ready([ayla, dm]) },
      notes: { dmNotes: { ayla: ready(note('Gizli sır.')) }, onUseDmNote },
    })

    expect(screen.queryByText('Gizli sır.')).not.toBeInTheDocument()
    await user.click(main().getByRole('tab', { name: '✦ True Words' }))
    expect(screen.queryByText('Gizli sır.')).not.toBeInTheDocument()
    expect(onUseDmNote).not.toHaveBeenCalled()

    await user.click(main().getByRole('tab', { name: '✎ Notlar' }))
    expect(main().getByRole('textbox', { name: 'DM notu' })).toHaveValue('Gizli sır.')
  })

  it('says so when it cannot be read', () => {
    renderNotes({
      viewer: dana,
      notes: {
        dmNotes: {
          ayla: { status: 'error', error: { kind: 'unknown', message: 'x', path: 'dmNotes/ayla' } },
        },
      },
    })

    expect(section('DM notu').getByRole('alert')).toHaveTextContent('DM notu yüklenemedi.')
    expect(main().getByRole('textbox', { name: 'Oyuncu notu' })).toBeInTheDocument()
  })
})
