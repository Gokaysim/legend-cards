import { Timestamp } from 'firebase/firestore'
import { z } from 'zod'

import { DEFAULT_DICE_STYLE, DICE_STYLES } from '@/features/dice/schema'
import { createConverter } from '@/lib/firestore/converter'

/**
 * The two roles. Every user starts as a player. A DM makes others DMs, takes the role, or steps down (spec: dm-roles);
 * the admin script can set any role too. Any number of users may be DMs.
 */
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
  /** The user's Legend Points, a DM's included. Each change has a ledger entry. Missing: 0. */
  lp: z.number().int().min(0).default(0),
  /** The ledger entry that set the current `lp`. Missing: null, before the first change. */
  lpEntryId: z.string().min(1).nullable().default(null),
  /** The user's dice style (spec: dice-rolls, "Dice styles"). Only the user changes it. Missing: Galaxy. */
  diceStyle: z.enum(DICE_STYLES).default(DEFAULT_DICE_STYLE),
  /** The `roleChanges/{id}` of the last role change made in the app. Missing: null (none, or by the admin script). */
  roleChangeId: z.string().min(1).nullable().default(null),
})

export const userProfileConverter = createConverter(userProfileSchema, { idField: 'id' })

/** A profile as features see it: the stored fields plus the user's uid as `id`. */
export type UserProfile = z.infer<typeof userProfileSchema> & { id: string }

/**
 * One role change a DM made in the app, at `roleChanges/{changeId}` (design D2 of give-dms-lp-and-share-the-dm-role).
 * It is created once, together with the profile change it records, and never changed or deleted. A DM who steps down
 * (`target` is `by`) names another DM in `otherDm`.
 */
export const roleChangeSchema = z.object({
  /** The DM who made the change. */
  by: z.string().min(1),
  // null only in the local snapshot while the server timestamp is pending.
  at: z.instanceof(Timestamp).nullable(),
  /** Whose role changed. */
  target: z.string().min(1),
  before: z.enum(ROLES),
  after: z.enum(ROLES),
  otherDm: z.string().min(1).optional(),
})

export const roleChangeConverter = createConverter(roleChangeSchema, { idField: 'id' })

/** A role change record with its document ID as `id`. */
export type RoleChange = z.infer<typeof roleChangeSchema> & { id: string }
