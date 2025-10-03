import { useSelector } from '@xstate/react'
import { toWords } from './utils'
import type { RowKey } from '../../machines/squashMachine'

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
  const serverName = gameState.players[serverRowKey] || serverRowKey
  const sideName = gameState.server.side === 'R' ? 'Right' : 'Left'
  const announcement = `${scorePhrase}, ${serverName} to Serve from the ${sideName}`

  return {
    ...gameState,
    scoreA,
    scoreB,
    serverRowKey,
    announcement,
  }
}
