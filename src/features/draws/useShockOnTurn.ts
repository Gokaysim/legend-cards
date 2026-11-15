import { useEffect, useRef } from 'react'

/**
 * Starts the shocked pair (spec: card-images, "The shocked Cardmaker for a Blessed card") when a Blessed card turns
 * face up while the view is open, here or on another device. `turned` names the turned cards by a key; cards already
 * turned when the view opened do not start it.
 */
export function useShockOnTurn(
  turned: readonly string[],
  isBlessed: (key: string) => boolean,
  shock: () => void,
): void {
  const seen = useRef<ReadonlySet<string>>(new Set(turned))
  useEffect(() => {
    const fresh = turned.filter((key) => !seen.current.has(key))
    if (fresh.length === 0) return
    seen.current = new Set([...seen.current, ...fresh])
    if (fresh.some(isBlessed)) shock()
  }, [turned, isBlessed, shock])
}
