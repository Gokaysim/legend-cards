import { createBrowserRouter, RouterProvider } from 'react-router'

import { ActivityLogProvider } from '@/features/activity-log/ActivityLogProvider'
import { ArtProvider } from '@/features/art/ArtProvider'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { BalancesProvider } from '@/features/balances/BalancesProvider'
import { CardsProvider } from '@/features/cards/CardsProvider'
import { DefinitionsProvider } from '@/features/definitions/DefinitionsProvider'
import { DrawsProvider } from '@/features/draws/DrawsProvider'
import { HoldingsProvider } from '@/features/hands/HoldingsProvider'
import { PacksProvider } from '@/features/packs/PacksProvider'
import { PlayerNotesProvider } from '@/features/player-notes/PlayerNotesProvider'
import { TableProvider } from '@/features/table/TableProvider'
import { TrueWordsProvider } from '@/features/true-words/TrueWordsProvider'
import { UsersProvider } from '@/features/users/UsersProvider'

import { routes } from './routes'

const router = createBrowserRouter(routes)

/**
 * Composition root: the built pictures, the auth session, then the user profiles, the party purse, the cards, the
 * open holdings, the table's lock, the open pack, the log's record source, the draws, the True Words, the notes'
 * source and the DM's definition steps, then the router.
 */
export function App() {
  return (
    <ArtProvider>
      <AuthProvider>
        <UsersProvider>
          <BalancesProvider>
            <CardsProvider>
              <HoldingsProvider>
                <TableProvider>
                  <PacksProvider>
                    <ActivityLogProvider>
                      <DrawsProvider>
                        <TrueWordsProvider>
                          <PlayerNotesProvider>
                            <DefinitionsProvider>
                              <RouterProvider router={router} />
                            </DefinitionsProvider>
                          </PlayerNotesProvider>
                        </TrueWordsProvider>
                      </DrawsProvider>
                    </ActivityLogProvider>
                  </PacksProvider>
                </TableProvider>
              </HoldingsProvider>
            </CardsProvider>
          </BalancesProvider>
        </UsersProvider>
      </AuthProvider>
    </ArtProvider>
  )
}
