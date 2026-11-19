import { useEffect, useId, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/authContext'
import { FIELD_CLASSES } from '@/features/definitions/fieldClasses'
import { useIsDm } from '@/features/users/usersContext'

import { useLore, useLoreActions } from './loreContext'
import { LORE_LIMIT } from './schema'

/**
 * The "Hikâye" section of a card's Kart geçmişi page (spec: card-lore): the story of the character on the card, as
 * the DM wrote it, with its line breaks. A player sees it only when the card has lore. The DM sees it on every card,
 * with "Hikâye ekle" or "Düzenle", which open a text box with "Kaydet" and "Vazgeç"; saving a blank text deletes it.
 * The lore is read only while the section is mounted.
 */
export function CardLoreSection({ cardId }: { cardId: string }) {
  const ids = useId()
  const isDm = useIsDm()
  const lore = useLore(cardId)
  const [isEditing, setIsEditing] = useState(false)

  if (lore.status === 'loading') return null
  if (lore.status === 'error') {
    return (
      <p role="alert" className="text-sm text-danger-ink">
        Hikâye yüklenemedi.
      </p>
    )
  }
  const text = lore.data?.text ?? null
  if (text === null && !isDm) return null

  const headingId = `${ids}-heading`
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="text-lg font-semibold text-gold">
          {isEditing ? <label htmlFor={`${ids}-text`}>Hikâye</label> : 'Hikâye'}
        </h2>
        {isDm && !isEditing ? (
          <Button onClick={() => setIsEditing(true)}>
            {text === null ? 'Hikâye ekle' : 'Düzenle'}
          </Button>
        ) : null}
      </div>
      {isEditing ? (
        <LoreEditor
          id={`${ids}-text`}
          cardId={cardId}
          stored={text ?? ''}
          onClose={() => setIsEditing(false)}
        />
      ) : text === null ? null : (
        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap text-ink">{text}</p>
      )}
    </section>
  )
}

type LoreEditorProps = {
  id: string
  cardId: string
  stored: string
  onClose: () => void
}

/**
 * The DM's text box, with the stored lore, focused when it opens with the cursor at the end. A failed save keeps it
 * open with the DM's text.
 */
function LoreEditor({ id, cardId, stored, onClose }: LoreEditorProps) {
  const auth = useAuth()
  const field = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const element = field.current
    if (element === null) return
    element.focus()
    element.setSelectionRange(element.value.length, element.value.length)
  }, [])
  const { saveLore } = useLoreActions()
  const [draft, setDraft] = useState(stored)
  const [isSaving, setIsSaving] = useState(false)
  const [hasFailed, setHasFailed] = useState(false)

  const save = async () => {
    if (auth.status !== 'signedIn') return
    setIsSaving(true)
    setHasFailed(false)
    try {
      await saveLore({ cardId, text: draft, by: auth.user.uid })
      onClose()
    } catch {
      setHasFailed(true)
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        ref={field}
        id={id}
        value={draft}
        maxLength={LORE_LIMIT}
        rows={10}
        placeholder="Kartın üstündeki karakterin hikâyesini yaz…"
        onChange={(event) => setDraft(event.target.value)}
        className={FIELD_CLASSES}
      />
      {hasFailed ? (
        <p role="alert" className="text-sm text-danger-ink">
          Hikâye kaydedilemedi.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" disabled={isSaving} onClick={() => void save()}>
          Kaydet
        </Button>
        <Button disabled={isSaving} onClick={onClose}>
          Vazgeç
        </Button>
      </div>
    </div>
  )
}
