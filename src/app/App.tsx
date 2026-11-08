import { createBrowserRouter, RouterProvider } from 'react-router'

import { AuthProvider } from '@/features/auth/AuthProvider'
import { CardsProvider } from '@/features/cards/CardsProvider'
import { UsersProvider } from '@/features/users/UsersProvider'

import { routes } from './routes'

const router = createBrowserRouter(routes)

/** Composition root: auth session, then the user profiles and the cards, then the router. */
export function App() {
  return (
    <AuthProvider>
      <UsersProvider>
        <CardsProvider>
          <RouterProvider router={router} />
        </CardsProvider>
      </UsersProvider>
    </AuthProvider>
  )
}
