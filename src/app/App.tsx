import { createBrowserRouter, RouterProvider } from 'react-router'

import { ActivityLogProvider } from '@/features/activity-log/ActivityLogProvider'
import { ArtProvider } from '@/features/art/ArtProvider'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { BalancesProvider } from '@/features/balances/BalancesProvider'
import { CardsProvider } from '@/features/cards/CardsProvider'
import { CharactersProvider } from '@/features/characters/CharactersProvider'
import { DefinitionsProvider } from '@/features/definitions/DefinitionsProvider'
import { DiceProvider } from '@/features/dice/DiceProvider'
import { DrawsProvider } from '@/features/draws/DrawsProvider'
import { HoldingsProvider } from '@/features/hands/HoldingsProvider'
import { PacksProvider } from '@/features/packs/PacksProvider'
import { PlayerNotesProvider } from '@/features/player-notes/PlayerNotesProvider'
import { SetsProvider } from '@/features/sets/SetsProvider'
import { StatsProvider } from '@/features/stats/StatsProvider'
import { TableProvider } from '@/features/table/TableProvider'
import { TrueWordsProvider } from '@/features/true-words/TrueWordsProvider'
import { UsersProvider } from '@/features/users/UsersProvider'

import { routes } from './routes'

const router = createBrowserRouter(routes)

/**
 * Composition root: the built pictures, the auth session, then the user profiles, the characters, the party purse,
 * the sets (with their pictures), the cards, the open holdings, the table's lock, the open pack, the record sources of
 * the log and the statistics, the draws, the True Words, the notes' source, the DM's definition steps and the dice channel, then
 * the router.
 */
export function App() {
  return (
    <ArtProvider>
      <AuthProvider>
        <UsersProvider>
          <CharactersProvider>
            <BalancesProvider>
              <SetsProvider>
                <CardsProvider>
                  <HoldingsProvider>
                    <TableProvider>
                      <PacksProvider>
                        <ActivityLogProvider>
                          <StatsProvider>
                            <DrawsProvider>
                              <TrueWordsProvider>
                                <PlayerNotesProvider>
                                  <DefinitionsProvider>
                                    <DiceProvider>
                                      <RouterProvider router={router} />
                                    </DiceProvider>
                                  </DefinitionsProvider>
                                </PlayerNotesProvider>
                              </TrueWordsProvider>
                            </DrawsProvider>
                          </StatsProvider>
                        </ActivityLogProvider>
                      </PacksProvider>
                    </TableProvider>
                  </HoldingsProvider>
                </CardsProvider>
              </SetsProvider>
            </BalancesProvider>
          </CharactersProvider>
        </UsersProvider>
      </AuthProvider>
    </ArtProvider>
  )
}
