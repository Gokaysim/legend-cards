import type { FirestoreErrorCode } from 'firebase/firestore'
import type { z } from 'zod'

/**
 * Recognizes Firestore errors by shape. `instanceof FirestoreError` does not work: Firebase's base error
 * class resets the prototype in its constructor, so real Firestore errors fail that check.
 */
function isFirestoreError(error: unknown): error is Error & { code: FirestoreErrorCode } {
  return error instanceof Error && typeof (error as { code?: unknown }).code === 'string'
}

function describeIssues(issues: readonly z.core.$ZodIssue[]): string {
  return issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ')
}

/** A Firestore document that does not match its declared shape. Thrown by converters from `createConverter`. */
export class InvalidDataError extends Error {
  override readonly name = 'InvalidDataError'
  readonly path: string
  readonly issues: readonly z.core.$ZodIssue[]

  constructor(path: string, issues: readonly z.core.$ZodIssue[]) {
    super(`Document ${path} does not match its schema: ${describeIssues(issues)}`)
    this.path = path
    this.issues = issues
  }
}

export type SubscriptionErrorKind = 'permission-denied' | 'invalid-data' | 'unknown'

/** Why a subscription failed. `message` is for developers; features show their own Turkish text per `kind`. */
export type SubscriptionError = {
  kind: SubscriptionErrorKind
  message: string
  /** The document path (invalid data) or the subscribed path. */
  path: string
  /** Validation issues, for `invalid-data`. */
  issues?: readonly z.core.$ZodIssue[]
  /** The Firestore error code, for `unknown` Firestore errors. */
  code?: string
}

/** Maps anything a snapshot listener can throw or report into a `SubscriptionError`. */
export function toSubscriptionError(error: unknown, subscribedPath: string): SubscriptionError {
  if (error instanceof InvalidDataError) {
    return { kind: 'invalid-data', message: error.message, path: error.path, issues: error.issues }
  }
  if (isFirestoreError(error)) {
    if (error.code === 'permission-denied') {
      return { kind: 'permission-denied', message: error.message, path: subscribedPath }
    }
    return { kind: 'unknown', message: error.message, path: subscribedPath, code: error.code }
  }
  const message = error instanceof Error ? error.message : String(error)
  return { kind: 'unknown', message, path: subscribedPath }
}
