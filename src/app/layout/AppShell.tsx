import { Outlet } from 'react-router'

import { CombatNotice } from '@/features/combat/CombatNotice'
import { DiceNotice } from '@/features/dice/DiceNotice'
import { NaturalSoundWatcher } from '@/features/dice/NaturalSoundWatcher'
import { useAudioUnlock } from '@/features/dice/sound/useAudioUnlock'
import { LiveDrawView } from '@/features/draws/LiveDrawView'
import { OpenPackView } from '@/features/packs/OpenPackView'

import { MobileNav } from './MobileNav'
import { OfflineBanner } from './OfflineBanner'
import { PlayerDrawBanner } from './PlayerDrawBanner'
import { SidebarContent } from './SidebarContent'

/**
 * The frame of every signed-in screen: a sidebar on wide screens, a menu on narrow ones. The open pack and other
 * users' draws show on every screen, above the page, and other users' dice rolls in a card over it. A fresh Nat 20 or
 * Nat 1 plays its sound on every screen, and the audio wakes on the user's first click or key press.
 */
export function AppShell() {
  useAudioUnlock()
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="hidden w-64 shrink-0 border-r border-line bg-sidebar lg:block">
        <div className="sticky top-0 h-dvh overflow-y-auto">
          <SidebarContent />
        </div>
      </aside>
      <MobileNav />
      <main className="flex min-w-0 flex-1 flex-col gap-4 p-4 lg:p-8">
        <OfflineBanner />
        <PlayerDrawBanner />
        <OpenPackView />
        <LiveDrawView />
        <DiceNotice />
        <NaturalSoundWatcher />
        <CombatNotice />
        <Outlet />
      </main>
    </div>
  )
}
