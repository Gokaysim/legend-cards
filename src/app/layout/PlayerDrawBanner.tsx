import { Button } from '@/components/ui/Button'
import { PLAYER_DRAW_LABELS, PLAYER_DRAW_LINES } from '@/features/table/playerDraw'
import { usePlayerDrawMode } from '@/features/table/tableContext'
import { useChangePlayerDrawMode } from '@/features/table/useChangePlayerDrawMode'
import { useIsDm } from '@/features/users/usersContext'

/**
 * Tells everyone on every screen that the DM lent the players draw tools (spec: table-settings, "The banner while a
 * mode is on"): the mode and what it allows. The DM closes it from here with "Kapat", which sets the mode to off.
 * Under "Kapalı" it shows nothing.
 */
export function PlayerDrawBanner() {
  const mode = usePlayerDrawMode()
  const isDm = useIsDm()
  const { change, isBusy, message } = useChangePlayerDrawMode()
  if (mode === 'off') return null

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-primary-line bg-pane-raised px-4 py-2 text-sm"
    >
      <p className="min-w-0 flex-1 basis-60 text-ink">
        <span className="font-semibold text-gold">✦ {PLAYER_DRAW_LABELS[mode]} açık.</span>{' '}
        <span className="text-ink-muted">{PLAYER_DRAW_LINES[mode]}</span>
      </p>
      {isDm ? (
        <Button
          aria-busy={isBusy}
          disabled={isBusy}
          onClick={() => void change('off')}
          className="shrink-0"
        >
          Kapat
        </Button>
      ) : null}
      {message ? (
        <p role="alert" className="w-full text-danger-ink">
          {message}
        </p>
      ) : null}
    </div>
  )
}
