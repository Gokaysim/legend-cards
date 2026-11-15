import type { ReactNode } from 'react'
import { Navigate, type RouteObject } from 'react-router'

import { ActivityLogPage } from '@/features/activity-log/ActivityLogPage'
import { RequireAuth, SIGN_IN_PATH } from '@/features/auth/RequireAuth'
import { SignInPage } from '@/features/auth/SignInPage'
import { CursedDeckPage } from '@/features/cursed-deck/CursedDeckPage'
import { CustomDraftPage } from '@/features/custom-draft/CustomDraftPage'
import { HandsPage, PlayerHandPage } from '@/features/hands/HandsPage'
import { LibraryPage } from '@/features/library/LibraryPage'
import { PackShopPage } from '@/features/packs/PackShopPage'
import { RulesPage } from '@/features/rules/RulesPage'
import { SetsPage } from '@/features/sets/SetsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { CardHistoryPage } from '@/features/stats/CardHistoryPage'
import { SetStatsPage } from '@/features/stats/SetStatsPage'
import { ElixirShopPage } from '@/features/shops/ElixirShopPage'
import { ShopsPage } from '@/features/shops/ShopsPage'
import { TrueWordsPage } from '@/features/true-words/TrueWordsPage'

import { AppShell } from './layout/AppShell'
import { NotFoundPage } from './NotFoundPage'
import {
  CARD_HISTORY_ROUTES,
  DEFAULT_SCREEN_PATH,
  HAND_ROUTE,
  SCREENS,
  SET_STATS_ROUTE,
  SHOP_SCREENS,
  type ScreenId,
  type ShopScreenId,
} from './screens'

/** The page for each screen. TypeScript requires an entry for every screen in SCREENS. */
const pages: Record<ScreenId, ReactNode> = {
  hands: <HandsPage />,
  shops: <ShopsPage />,
  'true-words': <TrueWordsPage />,
  'custom-draft': <CustomDraftPage />,
  library: <LibraryPage />,
  sets: <SetsPage />,
  'cursed-deck': <CursedDeckPage />,
  'activity-log': <ActivityLogPage />,
  rules: <RulesPage />,
  settings: <SettingsPage />,
}

/** The page for each Shops sub-screen. TypeScript requires an entry for every screen in SHOP_SCREENS. */
const shopPages: Record<ShopScreenId, ReactNode> = {
  'pack-shop': <PackShopPage />,
  'elixir-shop': <ElixirShopPage />,
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
          ...SHOP_SCREENS.map((screen) => ({ path: screen.path, element: shopPages[screen.id] })),
          // One player's hand: a detail route under "Oyuncu elleri", without a menu entry of its own.
          { path: HAND_ROUTE, element: <PlayerHandPage /> },
          // A card's history and a set's statistics: detail routes under their menu entries.
          { path: CARD_HISTORY_ROUTES.legend, element: <CardHistoryPage deck="legend" /> },
          { path: CARD_HISTORY_ROUTES.cursed, element: <CardHistoryPage deck="cursed" /> },
          { path: SET_STATS_ROUTE, element: <SetStatsPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]
