import { Navigate, Outlet, useLocation } from 'react-router'

import { FullScreenSpinner } from '@/components/ui/FullScreenSpinner'
import { AccessCheckFailedPage } from '@/features/access/AccessCheckFailedPage'
import { NoAccessPage } from '@/features/access/NoAccessPage'

import { useAuth } from './authContext'

export const SIGN_IN_PATH = '/sign-in'

/**
 * Layout route that lets only signed-in members of the access list through. While the session is being restored, or
 * the access list checked, it shows a neutral loading state, so neither the sign-in screen nor protected content
 * flashes. An account that is not on the list sees the "ekli değil" screen at the address it asked for, so it lands
 * there once the DM adds it. When every try to check the list failed, it shows the "Erişim kontrol edilemedi" screen
 * at that address instead.
 */
export function RequireAuth() {
  const auth = useAuth()
  const location = useLocation()

  if (auth.status === 'loading' || auth.status === 'checking') return <FullScreenSpinner />
  if (auth.status === 'noAccess') return <NoAccessPage />
  if (auth.status === 'checkFailed') return <AccessCheckFailedPage />
  if (auth.status === 'signedOut') {
    return <Navigate to={SIGN_IN_PATH} replace state={{ from: location }} />
  }
  return <Outlet />
}
