import { useState } from 'react'

import { useAuth } from '@/features/auth/authContext'
import { useOnlineStatus } from '@/lib/useOnlineStatus'

import { TABLE_SETTING_OFFLINE_MESSAGE, tableSettingFailureMessage } from './errors'
import type { PlayerDrawMode } from './playerDraw'
import { useTableActions } from './tableContext'

export type ChangePlayerDrawMode = {
  /** Sets the mode as the signed-in DM. A failure shows in `message`; nothing changes then. */
  change: (mode: PlayerDrawMode) => Promise<void>
  /** While a change is being saved. */
  isBusy: boolean
  /** The Turkish message of the last failed change, or `null`. */
  message: string | null
}

/**
 * The DM's change of the player draw mode, shared by the Ayarlar screen and the banner (spec: table-settings). It
 * needs a connection: offline, it says so and writes nothing.
 */
export function useChangePlayerDrawMode(): ChangePlayerDrawMode {
  const auth = useAuth()
  const actions = useTableActions()
  const isOnline = useOnlineStatus()
  const [isBusy, setIsBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const change = async (mode: PlayerDrawMode) => {
    if (auth.status !== 'signedIn' || isBusy) return
    if (!isOnline) {
      setMessage(TABLE_SETTING_OFFLINE_MESSAGE)
      return
    }
    setMessage(null)
    setIsBusy(true)
    try {
      await actions.setPlayerDrawMode({ mode, by: auth.user.uid })
    } catch (error) {
      setMessage(tableSettingFailureMessage(error))
    } finally {
      setIsBusy(false)
    }
  }

  return { change, isBusy, message }
}
