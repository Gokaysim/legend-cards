import { Outlet } from 'react-router'

import { MobileNav } from './MobileNav'
import { OfflineBanner } from './OfflineBanner'
import { SidebarContent } from './SidebarContent'

/** The frame of every signed-in screen: a sidebar on wide screens, a menu on narrow ones. */
export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="hidden w-64 shrink-0 border-r border-line bg-sidebar lg:block">
        <div className="sticky top-0 h-dvh">
          <SidebarContent />
        </div>
      </aside>
      <MobileNav />
      <main className="flex min-w-0 flex-1 flex-col gap-4 p-4 lg:p-8">
        <OfflineBanner />
        <Outlet />
      </main>
    </div>
  )
}
