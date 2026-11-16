import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'

import { useDiceDeviceSettings } from './deviceSettings'
import { useDiceActions } from './diceContext'
import { DICE_STYLE_LABELS, DICE_STYLES, type DiceStyle } from './schema'
import { previewUrl } from './stage/previews'

/**
 * The dice settings (spec: dice-rolls, "The dice settings dialog"; design D8 of add-initiative-tracker): the user's
 * dice style and this device's settings. Choosing a style saves it and closes the dialog.
 */
export function DiceSettingsDialog({ style, onClose }: { style: DiceStyle; onClose: () => void }) {
  const actions = useDiceActions()
  const settings = useDiceDeviceSettings()

  return (
    <Dialog title="Zar ayarları" onClose={onClose} closeOnBackdrop className="max-w-md">
      <div className="flex flex-col gap-6">
        <section aria-labelledby="dice-style-heading">
          <h2 id="dice-style-heading" className="mb-3 text-sm font-semibold text-ink">
            Zar stilin
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {DICE_STYLES.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={option === style}
                onClick={() => {
                  actions.setDiceStyle(option).catch(() => undefined)
                  onClose()
                }}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-lg border-2 border-transparent bg-pane px-0.5 py-1.5 text-xs text-ink-muted',
                  option === style && 'border-gold bg-pane-raised text-ink',
                )}
              >
                <img src={previewUrl(option, 'd20')} alt="" className="size-9.5" />
                {DICE_STYLE_LABELS[option]}
              </button>
            ))}
          </div>
        </section>
        <section aria-labelledby="dice-device-heading" className="flex flex-col gap-3 text-sm">
          <h2 id="dice-device-heading" className="text-sm font-semibold text-ink">
            Bu cihazda
          </h2>
          <label className="flex items-center gap-2 text-ink-muted">
            <input
              type="checkbox"
              checked={settings.showRolls}
              onChange={(event) => settings.setShowRolls(event.target.checked)}
              className="size-4.5 accent-gold"
            />
            Atışları göster
          </label>
          <label className="flex items-center gap-2 text-ink-muted">
            <input
              type="checkbox"
              checked={settings.sound}
              onChange={(event) => {
                settings.setSound(event.target.checked)
                // The switch's own click may wake the audio: browsers start it only after a gesture.
                if (event.target.checked) {
                  import('./stage/audio')
                    .then((audio) => audio.prepareSounds())
                    .catch(() => undefined)
                }
              }}
              className="size-4.5 accent-gold"
            />
            Zar sesi
          </label>
        </section>
      </div>
    </Dialog>
  )
}
