import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

import { screenById } from '@/app/screens'

import { useDiceDeviceSettings } from './deviceSettings'
import { useFreshRoll } from './diceContext'
import { playNaturalOnce } from './sound/natural'

/**
 * Plays a fresh roll's natural sound when it arrives while the user is on any screen but Zarlar (spec: dice-rolls,
 * "Natural sounds"; design D6 of tune-dice-feel-and-natural-sounds), whether or not its card opens. The Zarlar screen
 * plays it itself, when the roll's result shows. It acts only on a roll that arrives while it is mounted, never on
 * leaving the Zarlar screen. Mounted once in the app shell; it renders nothing.
 */
export function NaturalSoundWatcher() {
  const fresh = useFreshRoll()
  const location = useLocation()
  const { naturalSound } = useDiceDeviceSettings()
  const isOnDice = location.pathname.startsWith(screenById('dice').path)
  const lastId = useRef(fresh?.id ?? null)

  useEffect(() => {
    if (!fresh || fresh.id === lastId.current) return
    lastId.current = fresh.id
    if (!isOnDice) playNaturalOnce(fresh, naturalSound)
  }, [fresh, isOnDice, naturalSound])

  return null
}
