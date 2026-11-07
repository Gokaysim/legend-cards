import { Spinner } from './Spinner'

/** A neutral full-page loading state, for example while the auth session is restored. */
export function FullScreenSpinner({ label }: { label?: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <Spinner label={label} />
    </main>
  )
}
