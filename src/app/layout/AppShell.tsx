import { Outlet } from 'react-router'

import { DiceNotice } from '@/features/dice/DiceNotice'
import { LiveDrawView } from '@/features/draws/LiveDrawView'
import { OpenPackView } from '@/features/packs/OpenPackView'

import { MobileNav } from './MobileNav'
import { OfflineBanner } from './OfflineBanner'
import { PlayerDrawBanner } from './PlayerDrawBanner'
import { SidebarContent } from './SidebarContent'

/**
 * The frame of every signed-in screen: a sidebar on wide screens, a menu on narrow ones. The open pack and other
 * users' draws show on every screen, above the page, and other users' dice rolls in a card over it.
 */
export function AppShell() {
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
        <Outlet />
      </main>
    </div>
  )
}
