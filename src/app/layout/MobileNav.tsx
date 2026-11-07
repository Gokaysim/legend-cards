import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'

import { SidebarContent } from './SidebarContent'

const DRAWER_ID = 'mobile-navigation'

/** Top bar with a menu button and a slide-in navigation drawer, for screens narrower than `lg`. */
export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isOpen])

  return (
    <div className="lg:hidden">
      <header className="flex items-center justify-between gap-3 border-b border-line bg-sidebar px-4 py-3">
        <p className="font-semibold text-gold">✦ Legend Cards</p>
        <Button
          variant="ghost"
          aria-expanded={isOpen}
          aria-controls={DRAWER_ID}
          onClick={() => setIsOpen(true)}
        >
          ☰ Menü
        </Button>
      </header>
      {isOpen ? (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            aria-label="Menüyü kapat"
            className="absolute inset-0 bg-canvas/80"
            onClick={() => setIsOpen(false)}
          />
          <div
            id={DRAWER_ID}
            role="dialog"
            aria-modal="true"
            aria-label="Menü"
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto border-r border-line bg-sidebar"
          >
            <SidebarContent onNavigate={() => setIsOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
