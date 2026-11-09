import { useState } from 'react'

export type SavedField = {
  /** What the field shows: the user's draft, then the value being saved, then the stored value. */
  value: string
  onFocus: () => void
  onChange: (value: string) => void
  onBlur: () => void
}

/**
 * A text field saved when it loses focus, if it changed. While the user types, and until the subscription shows
 * the saved value, the field keeps what the user wrote; otherwise it follows the stored value live. A failed save
 * shows the stored value again and reports the error.
 */
export function useSavedField(
  stored: string,
  save: (value: string) => Promise<void>,
  onError: (error: unknown) => void,
  normalize: (value: string) => string = (value) => value,
): SavedField {
  const [draft, setDraft] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  if (saving !== null && saving === stored) setSaving(null)

  return {
    value: draft ?? saving ?? stored,
    onFocus: () => setDraft(saving ?? stored),
    onChange: (value: string) => setDraft(value),
    onBlur: () => {
      if (draft === null) return
      setDraft(null)
      const next = normalize(draft)
      if (next === stored) return
      setSaving(next)
      save(next).catch((error: unknown) => {
        setSaving(null)
        onError(error)
      })
    },
  }
}
