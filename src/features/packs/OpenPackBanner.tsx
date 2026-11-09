import { Button } from '@/components/ui/Button'

export type OpenPackBannerProps = {
  /** "Ayla bir Pack açıyor: Kesqerian Nights Standard Pack". */
  text: string
  onShow: () => void
}

/** The shrunk open pack: a line on every screen that names it, and brings the pack back. */
export function OpenPackBanner({ text, onShow }: OpenPackBannerProps) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold bg-pane px-4 py-3"
    >
      <p className="min-w-0 text-sm break-words text-ink">
        <span aria-hidden="true">🎴 </span>
        {text}
      </p>
      <Button variant="primary" className="shrink-0" onClick={onShow}>
        Göster
      </Button>
    </div>
  )
}
