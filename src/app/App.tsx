import { createBrowserRouter, RouterProvider } from 'react-router'

import { AuthProvider } from '@/features/auth/AuthProvider'

import { routes } from './routes'

const router = createBrowserRouter(routes)

/** Composition root: auth session, then the router. */
export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
