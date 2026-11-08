import { createBrowserRouter, RouterProvider } from 'react-router'

import { ActivityLogProvider } from '@/features/activity-log/ActivityLogProvider'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { BalancesProvider } from '@/features/balances/BalancesProvider'
import { CardsProvider } from '@/features/cards/CardsProvider'
import { HoldingsProvider } from '@/features/hands/HoldingsProvider'
import { UsersProvider } from '@/features/users/UsersProvider'

import { routes } from './routes'

const router = createBrowserRouter(routes)

/**
 * Composition root: auth session, then the user profiles, the party purse, the cards, the open holdings and the
 * log's record source, then the router.
 */
export function App() {
  return (
    <AuthProvider>
      <UsersProvider>
        <BalancesProvider>
          <CardsProvider>
            <HoldingsProvider>
              <ActivityLogProvider>
                <RouterProvider router={router} />
              </ActivityLogProvider>
            </HoldingsProvider>
          </CardsProvider>
        </BalancesProvider>
      </UsersProvider>
    </AuthProvider>
  )
}
