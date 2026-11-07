import { createBrowserRouter, RouterProvider } from 'react-router'

import { AuthProvider } from '@/features/auth/AuthProvider'
import { UsersProvider } from '@/features/users/UsersProvider'

import { routes } from './routes'

const router = createBrowserRouter(routes)

/** Composition root: auth session, then the user profiles, then the router. */
export function App() {
  return (
    <AuthProvider>
      <UsersProvider>
        <RouterProvider router={router} />
      </UsersProvider>
    </AuthProvider>
  )
}
