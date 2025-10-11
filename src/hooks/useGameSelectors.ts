import { useSelector } from '@xstate/react'
import { toWords } from '../components/game/utils'
import type { ActorRefFrom } from 'xstate'
import type { squashGameMachine } from '../machines/squashGameMachine'
import type { RowKey } from '../machines/squashMachine.types'

/**
 * Hook to expose squashGameMachine state to components using useSelector() for fine-grained reactivity.
 *
 * Following XState best practices:
 * - Uses useSelector() for each piece of state (fine-grained reactivity)
 * - Only re-renders when selected state changes
 * - Computes derived values (announcement, serverRowKey)
 */
export const useGameSelectors = (
  actor: ActorRefFrom<typeof squashGameMachine>,
) => {
  // Individual selectors for fine-grained reactivity
  const score = useSelector(actor, (s) => s.context.score)
  const grid = useSelector(actor, (s) => s.context.grid)
  const players = useSelector(actor, (s) => s.context.players)
  const server = useSelector(actor, (s) => s.context.server)
  const rallyCount = useSelector(actor, (s) => s.context.rallyCount)

  // State checks
  const isGameOver = useSelector(actor, (s) => s.status === 'done')
  const isAwaitingConfirmation = useSelector(actor, (s) =>
    s.matches('awaitingConfirmation'),
  )
  const isActive = useSelector(actor, (s) => s.matches('active'))

  // Derived values
  const scoreA = score.A
  const scoreB = score.B
  const serverRowKey = `${server.team}${server.player}` as RowKey

  // Serve announcement
  const serverScore = score[server.team]
  const receiverTeam = server.team === 'A' ? 'B' : 'A'
  const receiverScore = score[receiverTeam]
  const scorePhrase =
    serverScore === receiverScore
      ? `${toWords(serverScore)} All`
      : `${toWords(serverScore)}–${toWords(receiverScore)}`

  const serverPlayer = players[serverRowKey]
  const serverName =
    serverPlayer.lastName || serverPlayer.firstName || serverRowKey
  const sideName = server.side === 'R' ? 'Right' : 'Left'
  const announcement = `${scorePhrase}, ${serverName} to Serve from the ${sideName}`

  return {
    score,
    scoreA,
    scoreB,
    grid,
    players,
    server,
    serverRowKey,
    rallyCount,
    isGameOver,
    isAwaitingConfirmation,
    isActive,
    announcement,
  }
}
