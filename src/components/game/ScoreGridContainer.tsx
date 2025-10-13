import { useCallback, useMemo } from 'react'
import { useSelector } from '@xstate/react'
import { useQuery } from '@livestore/react'
import { gameById$, ralliesByGame$ } from '../../livestore/squash-queries'
import { getOrderedRows } from './utils'
import { ScoreTable } from './ScoreTable'
import {
  buildGridFromRallies,
  initialGrid,
  rowKey as makeRowKey,
  writeCell,
} from './score-grid-utils'
import type { RallyData } from './score-grid-utils'
import type { ActorRefFrom } from 'xstate'
import type { squashGameMachine } from '../../machines/squashGameMachine'
import type { RowKey, Server } from '../../machines/squashMachine.types'

type ScoreGridContainerProps = {
  gameId: string
  actorRef: ActorRefFrom<typeof squashGameMachine>
  firstServingTeam: 'A' | 'B'
  playerLabels: Record<string, string>
}

const MAX_COLS = 15

export const ScoreGridContainer = ({
  gameId,
  actorRef,
  firstServingTeam,
  playerLabels,
}: ScoreGridContainerProps) => {
  // Combined selector for machine state
  const machineState = useSelector(actorRef, (s) => ({
    isGameOver: s.status === 'done',
  }))

  // Query game data and rallies from LiveStore
  const gameData = useQuery(gameById$(gameId))
  const ralliesData = useQuery(ralliesByGame$(gameId))

  // Extract server state from game
  const server: Server = useMemo(
    () => ({
      team: gameData.currentServerTeam,
      player: gameData.currentServerPlayer,
      side: gameData.currentServerSide,
      handIndex: gameData.currentServerHandIndex,
    }),
    [
      gameData.currentServerTeam,
      gameData.currentServerPlayer,
      gameData.currentServerSide,
      gameData.currentServerHandIndex,
    ],
  )

  // Build grid from rallies
  const grid = useMemo(() => {
    if (ralliesData.length === 0) {
      // No rallies yet - show current server position
      return writeCell(
        initialGrid(),
        makeRowKey(server.team, server.player),
        0,
        server.side,
      )
    }

    // Map rallies to processable format
    const processableRallies: Array<RallyData> = ralliesData.map((rally) => ({
      winner: rally.winner,
      rallyNumber: rally.rallyNumber,
      serverTeam: rally.serverTeam,
      serverPlayer: rally.serverPlayer,
      serverSide: rally.serverSide,
      serverHandIndex: rally.serverHandIndex,
    }))

    // Get initial server from first rally
    const firstRally = processableRallies[0]
    const initialServer: Server = {
      team: firstRally.serverTeam,
      player: firstRally.serverPlayer,
      side: firstRally.serverSide,
      handIndex: 0,
    }

    return buildGridFromRallies(processableRallies, initialServer, false)
  }, [ralliesData, server.team, server.player, server.side])

  // Compute derived values
  const rows = useMemo(
    () => getOrderedRows(firstServingTeam),
    [firstServingTeam],
  )

  const serverRowKey = `${server.team}${server.player}` as RowKey
  const serverScore = server.team === 'A' ? gameData.scoreA : gameData.scoreB

  // Stable callback for toggling serve side
  const onToggleServeSide = useCallback(() => {
    actorRef.send({ type: 'TOGGLE_SERVE_SIDE', game: gameData })
  }, [actorRef, gameData])

  return (
    <ScoreTable
      grid={grid}
      rows={rows}
      playerLabels={playerLabels}
      serverRowKey={serverRowKey}
      serverScore={serverScore}
      handIndex={server.handIndex}
      isGameOver={machineState.isGameOver}
      onToggleServeSide={onToggleServeSide}
      maxCols={MAX_COLS}
    />
  )
}
