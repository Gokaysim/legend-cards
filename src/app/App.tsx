import { createBrowserRouter, RouterProvider } from 'react-router'

import { AccessProvider } from '@/features/access/AccessProvider'
import { ActivityLogProvider } from '@/features/activity-log/ActivityLogProvider'
import { ArtProvider } from '@/features/art/ArtProvider'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { BalancesProvider } from '@/features/balances/BalancesProvider'
import { CardsProvider } from '@/features/cards/CardsProvider'
import { CharactersProvider } from '@/features/characters/CharactersProvider'
import { CombatProvider } from '@/features/combat/CombatProvider'
import { DefinitionsProvider } from '@/features/definitions/DefinitionsProvider'
import { DiceProvider } from '@/features/dice/DiceProvider'
import { DrawsProvider } from '@/features/draws/DrawsProvider'
import { HoldingsProvider } from '@/features/hands/HoldingsProvider'
import { PacksProvider } from '@/features/packs/PacksProvider'
import { LoreProvider } from '@/features/lore/LoreProvider'
import { PlayerNotesProvider } from '@/features/player-notes/PlayerNotesProvider'
import { SetsProvider } from '@/features/sets/SetsProvider'
import { StatsProvider } from '@/features/stats/StatsProvider'
import { TableProvider } from '@/features/table/TableProvider'
import { TrueWordsProvider } from '@/features/true-words/TrueWordsProvider'
import { UsersProvider } from '@/features/users/UsersProvider'

import { routes } from './routes'

const router = createBrowserRouter(routes)

/**
 * Composition root: the built pictures, the auth session (with the access list check), then the user profiles, the
 * DM's access list, the characters, the party purse, the sets (with their pictures), the cards, the open holdings,
 * the table's lock, the open pack, the record sources of the log and the statistics, the draws, the True Words, the
 * notes' source, the cards' lore, the DM's definition steps and the dice channel, then the router.
 */
export function App() {
  return (
    <ArtProvider>
      <AuthProvider>
        <UsersProvider>
          <AccessProvider>
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
                                    <LoreProvider>
                                      <DefinitionsProvider>
                                        <DiceProvider>
                                          <CombatProvider>
                                            <RouterProvider router={router} />
                                          </CombatProvider>
                                        </DiceProvider>
                                      </DefinitionsProvider>
                                    </LoreProvider>
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
          </AccessProvider>
        </UsersProvider>
      </AuthProvider>
    </ArtProvider>
  )
}
