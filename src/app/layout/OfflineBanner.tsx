import { useOnlineStatus } from '@/lib/useOnlineStatus'

/**
 * Tells the user they are offline, that their changes will sync later, and to keep the app open until then: the cache
 * and the queued writes live only in the open app (design D5 of drop-persistent-cache-and-dm-own-entry-query).
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus()
  if (isOnline) return null

  return (
    <div
      role="status"
      className="rounded-lg border border-danger-line bg-pane-raised px-4 py-2 text-sm text-danger-ink"
    >
      Çevrimdışısın — değişiklikler bağlantı gelince eşitlenecek. O zamana kadar uygulamayı kapatma.
    </div>
  )
}
