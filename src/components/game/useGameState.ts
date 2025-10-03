import { useSelector } from '@xstate/react'
import { toWords } from './utils'
import type { PlayerName, RowKey } from '../../machines/squashMachine'

// Helper to get display name: prefer lastName, fallback to firstName, then default
const getDisplayName = (
  player: PlayerName | undefined,
  defaultName: string,
): string => {
  if (!player) return defaultName
  const lastName = player.lastName.trim()
  const firstName = player.firstName.trim()
  if (lastName) return lastName
  if (firstName) return firstName
  return defaultName
}

export const useGameState = (gameActor: any) => {
  const gameState = useSelector(gameActor, (s: any) => ({
    score: s.context.score,
    grid: s.context.grid,
    players: s.context.players,
    server: s.context.server,
    history: s.context.history,
    isGameOver: s.matches('gameOver'),
    isAwaitingConfirmation: s.matches('awaitingConfirmation'),
    isIdle: s.matches('idle'),
  }))

  const scoreA = gameState.score.A
  const scoreB = gameState.score.B
  const serverRowKey =
    `${gameState.server.team}${gameState.server.player}` as RowKey

  // Serve announcement
  const serverScore = gameState.score[gameState.server.team]
  const receiverTeam = gameState.server.team === 'A' ? 'B' : 'A'
  const receiverScore = gameState.score[receiverTeam]
  const scorePhrase =
    serverScore === receiverScore
      ? `${toWords(serverScore)} All`
      : `${toWords(serverScore)}–${toWords(receiverScore)}`
  // Use last name (or first name if last is empty) for announcements
  const serverName = getDisplayName(
    gameState.players[serverRowKey],
    serverRowKey,
  )
  const sideName = gameState.server.side === 'R' ? 'Right' : 'Left'
  const announcement = `${scorePhrase}, ${serverName} to Serve from the ${sideName}`

  // Build compact row labels for ScoreGrid using last names (or first names as fallback)
  const playerRowLabels: Record<RowKey, string> = {
    A1: getDisplayName(gameState.players.A1, 'A1'),
    A2: getDisplayName(gameState.players.A2, 'A2'),
    B1: getDisplayName(gameState.players.B1, 'B1'),
    B2: getDisplayName(gameState.players.B2, 'B2'),
  }

  // Full names for tooltips
  const playerFullNames: Record<RowKey, string> = {
    A1: gameState.players.A1?.fullName ?? 'A1',
    A2: gameState.players.A2?.fullName ?? 'A2',
    B1: gameState.players.B1?.fullName ?? 'B1',
    B2: gameState.players.B2?.fullName ?? 'B2',
  }

  return {
    ...gameState,
    scoreA,
    scoreB,
    serverRowKey,
    announcement,
    playerRowLabels,
    playerFullNames,
  }
}
