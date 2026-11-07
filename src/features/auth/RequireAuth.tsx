import { Navigate, Outlet, useLocation } from 'react-router'

import { FullScreenSpinner } from '@/components/ui/FullScreenSpinner'

import { useAuth } from './authContext'

export const SIGN_IN_PATH = '/sign-in'

/**
 * Layout route that lets only signed-in users through. While the session is being restored it shows a
 * neutral loading state, so neither the sign-in screen nor protected content flashes.
 */
export function RequireAuth() {
  const auth = useAuth()
  const location = useLocation()

  if (auth.status === 'loading') return <FullScreenSpinner />
  if (auth.status === 'signedOut') {
    return <Navigate to={SIGN_IN_PATH} replace state={{ from: location }} />
  }
  return <Outlet />
}
