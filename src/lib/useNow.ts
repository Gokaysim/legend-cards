import { useEffect, useState } from 'react'

/** The current time in milliseconds, read again every `intervalMs`, for views whose state depends on the clock. */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}
