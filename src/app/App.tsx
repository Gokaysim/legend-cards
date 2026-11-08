import { createBrowserRouter, RouterProvider } from 'react-router'

import { AuthProvider } from '@/features/auth/AuthProvider'
import { CardsProvider } from '@/features/cards/CardsProvider'
import { HoldingsProvider } from '@/features/hands/HoldingsProvider'
import { UsersProvider } from '@/features/users/UsersProvider'

import { routes } from './routes'

const router = createBrowserRouter(routes)

/** Composition root: auth session, then the user profiles, the cards and the open holdings, then the router. */
export function App() {
  return (
    <AuthProvider>
      <UsersProvider>
        <CardsProvider>
          <HoldingsProvider>
            <RouterProvider router={router} />
          </HoldingsProvider>
        </CardsProvider>
      </UsersProvider>
    </AuthProvider>
  )
}
