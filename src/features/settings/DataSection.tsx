import { useId, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { useCombat } from '@/features/combat/combatContext'
import { useDiceActions, useDiceRolls } from '@/features/dice/diceContext'
import { DICE_RESET_OFFLINE_MESSAGE, diceResetFailureMessage } from '@/features/dice/errors'
import { useIsDm } from '@/features/users/usersContext'
import { useOnlineStatus } from '@/lib/useOnlineStatus'

/**
 * The "Veri / Yedek" section of the Ayarlar screen (spec: table-settings, "The Ayarlar screen"): for the DM, the dice
 * channel reset; for everyone, the note that backup and restore are still to come.
 */
export function DataSection() {
  const isDm = useIsDm()
  return (
    <section
      aria-labelledby="settings-data"
      className="flex flex-col gap-4 rounded-2xl border border-line bg-pane p-4 sm:p-6"
    >
      <h2 id="settings-data" className="text-lg font-bold text-ink">
        Veri / Yedek
      </h2>
      {isDm ? <DiceChannelReset /> : null}
      <p className="text-sm text-ink-muted">Yakında: verileri yedekleme ve geri yükleme.</p>
    </section>
  )
}

/**
 * "Zar kanalı" (spec: dice-rolls, "Resetting the dice channel"; design D5 of release-1-0-0): the DM's reset of every
 * roll. Selecting it counts the rolls on the server, then a confirmation names the count, and during a combat says
 * that the initiative order stays. It needs a connection.
 */
function DiceChannelReset() {
  const ids = useId()
  const rolls = useDiceRolls()
  const actions = useDiceActions()
  const combat = useCombat()
  const isOnline = useOnlineStatus()
  const [confirming, setConfirming] = useState<{ count: number } | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const hasRolls = rolls.status === 'ready' && rolls.rolls.length > 0
  const isCombatOpen = combat.status === 'ready' && combat.combat.phase !== 'idle'

  const run = async (step: () => Promise<void>) => {
    setMessage(null)
    setDone(null)
    if (!isOnline) {
      setMessage(DICE_RESET_OFFLINE_MESSAGE)
      return
    }
    setIsBusy(true)
    try {
      await step()
    } catch (error) {
      setMessage(diceResetFailureMessage(error))
    } finally {
      setIsBusy(false)
    }
  }

  const ask = () =>
    run(async () => {
      setConfirming({ count: await actions.countRolls() })
    })

  const reset = () =>
    run(async () => {
      try {
        const count = await actions.resetChannel()
        setDone(`Zar kanalı sıfırlandı: ${count} atış silindi.`)
      } finally {
        setConfirming(null)
      }
    })

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-pane-raised p-3">
      <div className="flex flex-col gap-1">
        <h3 id={`${ids}-title`} className="text-sm font-semibold text-ink">
          Zar kanalı
        </h3>
        <p className="text-sm text-ink-muted">
          Kanaldaki bütün atışları siler, gizli atışlar dahil. Kartlar, LP, inisiyatif ve İşlem Logu
          etkilenmez.
        </p>
      </div>
      <Button
        variant="danger"
        className="self-start"
        disabled={!hasRolls || isBusy}
        aria-busy={isBusy}
        onClick={() => void ask()}
      >
        Zar kanalını sıfırla
      </Button>
      {message ? (
        <p role="alert" className="text-sm text-danger-ink">
          {message}
        </p>
      ) : null}
      {done ? (
        <p role="status" className="text-sm text-ink-muted">
          {done}
        </p>
      ) : null}
      {confirming ? (
        <Dialog title="Zar kanalı sıfırlansın mı?" onClose={() => setConfirming(null)}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink">
              {confirming.count} atış kalıcı olarak silinecek. Bu geri alınamaz.
            </p>
            {isCombatOpen ? (
              <p className="text-sm text-ink-muted">
                Savaş açık: inisiyatif sırası kalır, yalnızca kanaldaki atışlar silinir.
              </p>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button onClick={() => setConfirming(null)} disabled={isBusy}>
                Vazgeç
              </Button>
              <Button
                variant="danger"
                disabled={isBusy}
                aria-busy={isBusy}
                onClick={() => void reset()}
              >
                Sıfırla
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </div>
  )
}
