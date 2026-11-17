import { useId } from 'react'

import { screenById } from '@/app/screens'
import { PageHeader } from '@/components/ui/PageHeader'
import { AccessSection } from '@/features/access/AccessSection'
import {
  PLAYER_DRAW_LABELS,
  PLAYER_DRAW_LINES,
  PLAYER_DRAW_MODES,
} from '@/features/table/playerDraw'
import { usePlayerDrawMode } from '@/features/table/tableContext'
import { useChangePlayerDrawMode } from '@/features/table/useChangePlayerDrawMode'
import { useIsDm } from '@/features/users/usersContext'

import { DataSection } from './DataSection'

/**
 * Ayarlar (spec: table-settings, "The Ayarlar screen"): the table settings that the DM changes for everyone, the DM's
 * "Masaya erişim" list (spec: table-access), and the data section, with the DM's dice channel reset and the backup
 * that is still to come. The DM changes "Oyuncu kart çekişi" here; a player sees the chosen mode without a control to
 * change it, no access list and no reset.
 */
export function SettingsPage() {
  const screen = screenById('settings')
  return (
    <section className="flex flex-col gap-6">
      <PageHeader title={screen.label} mascot={screen.mascot} mascotPlacement="corner" />
      <TableSettings />
      <AccessSection />
      <DataSection />
    </section>
  )
}

function TableSettings() {
  const ids = useId()
  const isDm = useIsDm()
  const mode = usePlayerDrawMode()
  const { change, isBusy, message } = useChangePlayerDrawMode()

  return (
    <section
      aria-labelledby={`${ids}-title`}
      className="flex flex-col gap-4 rounded-2xl border border-line bg-pane p-4 sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id={`${ids}-title`} className="text-lg font-bold text-ink">
          Masa ayarları
        </h2>
        <p className="text-sm text-ink-muted">
          {isDm
            ? "Bu ayarlar bütün masa için geçerli; değişiklik herkeste hemen görünür ve İşlem Logu'na yazılır."
            : 'Bu ayarları DM değiştirir.'}
        </p>
      </div>
      <fieldset className="flex flex-col gap-2" aria-busy={isBusy} disabled={!isDm || isBusy}>
        <legend className="mb-1 text-sm font-semibold text-ink">Oyuncu kart çekişi</legend>
        {PLAYER_DRAW_MODES.map((option) => (
          <label
            key={option}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-pane-raised p-3 has-checked:border-gold has-disabled:cursor-default"
          >
            <input
              type="radio"
              name={`${ids}-player-draw`}
              value={option}
              checked={mode === option}
              onChange={() => void change(option)}
              aria-labelledby={`${ids}-${option}-label`}
              aria-describedby={`${ids}-${option}-line`}
              className="mt-0.5 size-4 shrink-0 accent-gold"
            />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span id={`${ids}-${option}-label`} className="text-sm font-semibold text-ink">
                {PLAYER_DRAW_LABELS[option]}
              </span>
              <span id={`${ids}-${option}-line`} className="text-sm text-ink-muted">
                {PLAYER_DRAW_LINES[option]}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      {message ? (
        <p role="alert" className="text-sm text-danger-ink">
          {message}
        </p>
      ) : null}
    </section>
  )
}
