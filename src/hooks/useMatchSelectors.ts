import { useSelector } from '@xstate/react'
import type { ActorRefFrom } from 'xstate'
import type { matchMachine } from '../machines/matchMachine'

/**
 * Hook to expose matchMachine state to components using useSelector() for fine-grained reactivity.
 *
 * Following XState best practices:
 * - Uses useSelector() for each piece of state (fine-grained reactivity)
 * - Only re-renders when selected state changes
 * - Avoids getSnapshot() which bypasses reactivity
 */
export const useMatchSelectors = (actor: ActorRefFrom<typeof matchMachine>) => {
  const players = useSelector(actor, (s) => s.context.players)
  const games = useSelector(actor, (s) => s.context.games)
  const isMatchComplete = useSelector(actor, (s) => s.matches('matchComplete'))

  return {
    players,
    games,
    isMatchComplete,
  }
}
