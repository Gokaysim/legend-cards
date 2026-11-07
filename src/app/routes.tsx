import type { ReactNode } from 'react'
import { Navigate, type RouteObject } from 'react-router'

import { ActivityLogPage } from '@/features/activity-log/ActivityLogPage'
import { RequireAuth, SIGN_IN_PATH } from '@/features/auth/RequireAuth'
import { SignInPage } from '@/features/auth/SignInPage'
import { CursedDeckPage } from '@/features/cursed-deck/CursedDeckPage'
import { HandsPage } from '@/features/hands/HandsPage'
import { LibraryPage } from '@/features/library/LibraryPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { ShopPage } from '@/features/shop/ShopPage'
import { TrueWordsPage } from '@/features/true-words/TrueWordsPage'

import { AppShell } from './layout/AppShell'
import { NotFoundPage } from './NotFoundPage'
import { DEFAULT_SCREEN_PATH, SCREENS, type ScreenId } from './screens'

/** The page for each screen. TypeScript requires an entry for every screen in SCREENS. */
const pages: Record<ScreenId, ReactNode> = {
  hands: <HandsPage />,
  shop: <ShopPage />,
  'true-words': <TrueWordsPage />,
  library: <LibraryPage />,
  'cursed-deck': <CursedDeckPage />,
  'activity-log': <ActivityLogPage />,
  settings: <SettingsPage />,
}

export const routes: RouteObject[] = [
  { path: SIGN_IN_PATH, element: <SignInPage /> },
  {
    // Everything else requires a signed-in user and renders inside the shell.
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <Navigate to={DEFAULT_SCREEN_PATH} replace /> },
          ...SCREENS.map((screen) => ({ path: screen.path, element: pages[screen.id] })),
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]
