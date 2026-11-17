import { useCallback, useEffect, useMemo, useState } from 'react'

import { auth } from '@/lib/firebase/auth'
import { db } from '@/lib/firebase/firestore'
import type { Subscription } from '@/lib/firestore/subscription'
import { useDocument } from '@/lib/firestore/useDocument'

import { accessEntryRef } from './api'
import type { AccessEntry } from './schema'

/**
 * The waits before the second to fifth try of a failed check (design D1 of retry-own-access-check). The fifth failed
 * try gives up.
 */
export const RETRY_WAITS_MS = [500, 1000, 2000, 4000] as const

/** The result of following the account's own access-list entry. */
export type OwnAccessCheck = {
  /** The last answer that was not an error: `loading` before any answer. Never `error`. */
  entry: Subscription<AccessEntry | null>
  /** Every try of the check failed. */
  failed: boolean
  /** Starts the check again at once, with a fresh token and a full set of retries. */
  retry: () => void
}

type CheckState = {
  email: string | null
  /** Restarts the subscription when it changes. */
  key: number
  /** Retries made since the last answer from the server. */
  retries: number
  /** The next try runs at once (the user asked for it), and starts a full set of retries. */
  retryNow: boolean
  lastAnswer: Subscription<AccessEntry | null> | null
}

const LOADING = { status: 'loading' } as const

function initialState(email: string | null): CheckState {
  return { email, key: 0, retries: 0, retryNow: false, lastAnswer: null }
}

/** Refreshes the signed-in account's ID token, which Firestore then uses for the next requests. */
async function refreshToken(): Promise<void> {
  try {
    await auth.currentUser?.getIdToken(true)
  } catch (error) {
    console.warn('Could not refresh the ID token before checking the access list again', error)
  }
}

/**
 * The signed-in account's own access-list entry, live (design D4 of invite-only-sign-in, D1 of
 * retry-own-access-check). `email` is the account's normalized, verified address, or `null` to follow nothing. The
 * rules let such an account read its own entry whether or not it exists, so a failed read is never an answer: right
 * after sign-in, the first read sometimes goes out without the account's token. The hook refreshes the token and
 * subscribes again, after growing waits, and reports `failed` only when every try failed. Meanwhile `entry` keeps the
 * last answer, so a member stays in the app and a new sign-in stays in the loading state.
 */
export function useOwnAccessCheck(email: string | null): OwnAccessCheck {
  const [state, setState] = useState(() => initialState(email))
  const current = state.email === email ? state : initialState(email)
  if (current !== state) {
    // Adjusting state during render: a new account starts a new check.
    setState(current)
  }

  const ref = useMemo(() => (email ? accessEntryRef(db, email) : null), [email])
  const subscription = useDocument(ref, current.key)

  if (subscription.status === 'ready' && subscription !== current.lastAnswer) {
    // Keeps the answer for the retries; an answer from the server starts the count again.
    setState({
      ...current,
      lastAnswer: subscription,
      retries: subscription.fromCache ? current.retries : 0,
    })
  }

  const failed =
    subscription.status === 'error' && !current.retryNow && current.retries >= RETRY_WAITS_MS.length

  const { retries, retryNow } = current
  useEffect(() => {
    if (subscription.status !== 'error') return
    if (!retryNow) {
      console.warn(
        `Checking the access list failed (${subscription.error.kind}): ${subscription.error.message}`,
      )
    }
    if (failed) {
      console.error('Gave up checking the access list after every try failed')
      return
    }

    let cancelled = false
    const wait = retryNow ? 0 : RETRY_WAITS_MS[retries]
    const timer = setTimeout(() => {
      void refreshToken().then(() => {
        if (cancelled) return
        setState((previous) =>
          previous.email === email
            ? {
                ...previous,
                key: previous.key + 1,
                retries: previous.retryNow ? 0 : previous.retries + 1,
                retryNow: false,
              }
            : previous,
        )
      })
    }, wait)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [subscription, failed, retries, retryNow, email])

  const retry = useCallback(() => {
    setState((previous) =>
      previous.email === email ? { ...previous, retries: 0, retryNow: true } : previous,
    )
  }, [email])

  const entry = subscription.status === 'ready' ? subscription : (current.lastAnswer ?? LOADING)
  return { entry, failed, retry }
}
