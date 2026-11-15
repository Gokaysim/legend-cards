import type { ReactNode } from 'react'
import { Navigate, type RouteObject } from 'react-router'

import { ActivityLogPage } from '@/features/activity-log/ActivityLogPage'
import { RequireAuth, SIGN_IN_PATH } from '@/features/auth/RequireAuth'
import { SignInPage } from '@/features/auth/SignInPage'
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

import { FormerCardHistoryAddress, FormerTrueWordsAddress } from './FormerAddresses'
import { AppShell } from './layout/AppShell'
import { NotFoundPage } from './NotFoundPage'
import {
  CARD_HISTORY_ROUTE,
  DEFAULT_SCREEN_PATH,
  HAND_ROUTE,
  libraryPath,
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
  'custom-draft': <CustomDraftPage />,
  library: <LibraryPage />,
  sets: <SetsPage />,
  'activity-log': <ActivityLogPage />,
  rules: <RulesPage />,
  settings: <SettingsPage />,
}

/** The page for each Shops sub-screen. TypeScript requires an entry for every screen in SHOP_SCREENS. */
const shopPages: Record<ShopScreenId, ReactNode> = {
  'pack-shop': <PackShopPage />,
  'elixir-shop': <ElixirShopPage />,
}

/**
 * The former addresses of the screens merged into the Kütüphane (spec: app-shell, "Former addresses of the merged
 * screens"; design D8 of merge-library-tabs). Each replaces itself in the history with its new address.
 */
const FORMER_ADDRESSES: RouteObject[] = [
  { path: '/cursed-deck', element: <Navigate to={libraryPath('cursed')} replace /> },
  { path: '/cursed-deck/:cardId', element: <FormerCardHistoryAddress /> },
  { path: '/true-words', element: <FormerTrueWordsAddress /> },
]

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
          { path: CARD_HISTORY_ROUTE, element: <CardHistoryPage /> },
          { path: SET_STATS_ROUTE, element: <SetStatsPage /> },
          ...FORMER_ADDRESSES,
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]
