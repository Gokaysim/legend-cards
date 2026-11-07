import { Timestamp } from 'firebase/firestore'
import { z } from 'zod'

import { createConverter } from '@/lib/firestore/converter'

/** The two roles. Every user starts as a player; only the admin script makes someone the DM. */
export const ROLES = ['player', 'dm'] as const
export type Role = (typeof ROLES)[number]

/** Limits shared with `firestore.rules` (validName, validPhoto). */
export const DISPLAY_NAME_MAX = 100
export const PHOTO_URL_MAX = 2048

/**
 * A user's profile at `users/{uid}`. It holds no email address, because every signed-in user can read it.
 * Later changes add fields with defaults, so existing profiles need no migration.
 */
export const userProfileSchema = z.object({
  displayName: z.string().min(1).max(DISPLAY_NAME_MAX).nullable(),
  photoURL: z.string().max(PHOTO_URL_MAX).nullable(),
  role: z.enum(ROLES),
  // null only in the local snapshot right after creation, while the server timestamp is pending.
  createdAt: z.instanceof(Timestamp).nullable(),
})

export const userProfileConverter = createConverter(userProfileSchema, { idField: 'id' })

/** A profile as features see it: the stored fields plus the user's uid as `id`. */
export type UserProfile = z.infer<typeof userProfileSchema> & { id: string }
