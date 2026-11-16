import { type FormEvent, useId, useState } from 'react'

import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { useAuth } from '@/features/auth/authContext'
import { profileName, useIsDm, useProfiles } from '@/features/users/usersContext'

import { useAccessList } from './accessContext'
import { type AccessRow, accessRows } from './accessRows'
import { isValidEmail, normalizeEmail } from './email'
import { ACCESS_MESSAGES } from './messages'

const fieldClasses =
  'min-w-0 flex-1 rounded-lg border border-control-line bg-control px-3 py-2 text-sm text-ink placeholder:text-ink-muted'

/**
 * "Masaya erişim" on the Ayarlar screen (spec: table-access; design D6 of invite-only-sign-in): the DM's list of the
 * Google addresses that may use the app. Players get nothing: the addresses are private, and `AccessProvider` reads
 * the list on the DM's device only.
 */
export function AccessSection() {
  const isDm = useIsDm()
  return isDm ? <AccessList /> : null
}

function AccessList() {
  const ids = useId()
  const auth = useAuth()
  const { entries, actions } = useAccessList()
  const profiles = useProfiles()
  const [input, setInput] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  const myEmail =
    auth.status === 'signedIn' && auth.user.email ? normalizeEmail(auth.user.email) : null
  const rows =
    entries.status === 'ready'
      ? accessRows(entries.data, profiles.status === 'ready' ? profiles.data : [], myEmail)
      : []

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (entries.status !== 'ready') return
    const email = normalizeEmail(input)
    if (!isValidEmail(email)) {
      setMessage(ACCESS_MESSAGES.invalid)
      return
    }
    if (entries.data.some((entry) => entry.email === email)) {
      setMessage(ACCESS_MESSAGES.duplicate)
      return
    }
    setMessage(null)
    setInput('')
    // The row shows at once from the local cache; a denial from the server takes it back and says so.
    actions.add(email).catch(() => {
      setMessage(ACCESS_MESSAGES.addFailed)
    })
  }

  function handleRemove(email: string) {
    setRemoving(null)
    setMessage(null)
    actions.remove(email).catch(() => {
      setMessage(ACCESS_MESSAGES.removeFailed)
    })
  }

  return (
    <section
      aria-labelledby={`${ids}-title`}
      className="flex flex-col gap-4 rounded-2xl border border-line bg-pane p-4 sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id={`${ids}-title`} className="text-lg font-bold text-ink">
          Masaya erişim
        </h2>
        <p className="text-sm text-ink-muted">Bu listedeki Google hesapları giriş yapabilir.</p>
      </div>
      <form noValidate onSubmit={handleAdd} className="flex flex-wrap gap-2">
        <label htmlFor={`${ids}-email`} className="sr-only">
          E-posta adresi
        </label>
        <input
          id={`${ids}-email`}
          type="email"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="e-posta adresi"
          className={fieldClasses}
        />
        <Button type="submit" variant="primary" disabled={entries.status !== 'ready'}>
          Ekle
        </Button>
      </form>
      {message ? (
        <p role="alert" className="text-sm text-danger-ink">
          {message}
        </p>
      ) : null}
      {entries.status === 'error' ? (
        <p role="alert" className="text-sm text-danger-ink">
          {ACCESS_MESSAGES.loadFailed}
        </p>
      ) : null}
      <ul className="flex flex-col gap-2" aria-label="Erişimi olan adresler">
        {rows.map((row) => (
          <AccessRowItem key={row.email} row={row} onRemove={() => setRemoving(row.email)} />
        ))}
      </ul>
      {removing ? (
        <Dialog title="Masadan çıkar" onClose={() => setRemoving(null)}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink">
              <strong className="font-semibold break-all">{removing}</strong> masadan çıkarılsın mı?
              Kartları ve LP&apos;si silinmez.
            </p>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setRemoving(null)}>Vazgeç</Button>
              <Button variant="danger" onClick={() => handleRemove(removing)}>
                Çıkar
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </section>
  )
}

function AccessRowItem({ row, onRemove }: { row: AccessRow; onRemove: () => void }) {
  const name = row.profile ? profileName(row.profile) : null
  return (
    <li className="flex items-center gap-3 rounded-lg border border-line bg-pane-raised p-3">
      {row.profile && name ? (
        <Avatar name={name} photoURL={row.profile.photoURL} />
      ) : (
        <span
          aria-hidden="true"
          className="size-9 shrink-0 rounded-full border border-dashed border-line"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        {name ? <span className="text-sm font-semibold text-ink">{name}</span> : null}
        <span className="text-sm break-all text-ink-muted">{row.email}</span>
        {row.isLinked ? null : <span className="text-xs text-ink-muted">Henüz giriş yapmadı</span>}
      </div>
      {row.isMe ? (
        <span className="shrink-0 text-xs font-semibold text-gold">DM · sen</span>
      ) : (
        <Button
          variant="danger"
          className="shrink-0"
          aria-label={`Çıkar: ${row.email}`}
          onClick={onRemove}
        >
          Çıkar
        </Button>
      )}
    </li>
  )
}
