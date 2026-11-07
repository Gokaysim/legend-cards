import { useOnlineStatus } from '@/lib/useOnlineStatus'

/** Tells the user they are offline and that their changes will sync later. */
export function OfflineBanner() {
  const isOnline = useOnlineStatus()
  if (isOnline) return null

  return (
    <div
      role="status"
      className="rounded-lg border border-danger-line bg-pane-raised px-4 py-2 text-sm text-danger-ink"
    >
      Çevrimdışısın — değişiklikler bağlantı gelince eşitlenecek.
    </div>
  )
}
