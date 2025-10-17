import { useMemo } from 'react'
import { queryDb } from '@livestore/livestore'
import { useQuery } from '@livestore/react'

import { gamesByMatch$ } from '../livestore/squash-queries'
import { squashTables } from '../livestore/tables'
import type { PlayerRow, Team } from '../machines/squashMachine.types'

/**
 * Hook to check if a player has served before in the match
 * This checks all rallies across all games in the match
 */
export const useHasPlayerServedBefore = (
  matchId: string,
  team: Team,
  player: PlayerRow,
) => {
  // Get all games for this match
  const games = useQuery(gamesByMatch$(matchId))

  // Query all rallies (we'll filter in useMemo)
  const allRallies = useQuery(
    queryDb(() => squashTables.rallies.where({ deletedAt: null }), {
      label: 'all-rallies',
    }),
  )

  return useMemo(() => {
    // Get game IDs for this match
    const gameIds = new Set(games.map((g) => g.id))

    // Filter rallies to only those in this match
    const matchRallies = allRallies.filter((rally) => gameIds.has(rally.gameId))

    // Check if this player has served before
    return matchRallies.some(
      (rally) => rally.serverTeam === team && rally.serverPlayer === player,
    )
  }, [allRallies, games, team, player])
}
