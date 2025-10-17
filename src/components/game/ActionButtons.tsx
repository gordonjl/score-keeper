import { useQuery } from '@livestore/react'
import { useSelector } from '@xstate/react'
import { gameById$, ralliesByGame$ } from '../../livestore/squash-queries'
import type { ActorRefFrom } from 'xstate'
import type { squashGameMachine } from '../../machines/squashGameMachine'

type ActionButtonsProps = {
  actorRef: ActorRefFrom<typeof squashGameMachine>
  gameId: string
}

export const ActionButtons = ({ actorRef, gameId }: ActionButtonsProps) => {
  // Get state from machine
  const { isGameOver, isActive, isAwaitingConfirmation } = useSelector(
    actorRef,
    (s) => ({
      isGameOver: s.status === 'done',
      isActive: s.matches('active'),
      isAwaitingConfirmation: s.matches('awaitingConfirmation'),
    }),
  )

  // Query game and rallies from LiveStore (only called when gameId is valid)
  const game = useQuery(gameById$(gameId))
  const rallies = useQuery(ralliesByGame$(gameId))

  const canLet = !isGameOver && isActive && !isAwaitingConfirmation
  // Can undo if there are rallies (which means at least one rally was played)
  const canUndo = rallies.length > 0

  // Don't use useCallback - we want to capture the latest game state
  const onLet = () => {
    actorRef.send({ type: 'LET' })
  }

  const onUndo = () => {
    actorRef.send({ type: 'UNDO', game })
  }

  return (
    <div className="flex gap-3 flex-wrap">
      <button
        className="btn btn-outline btn-neutral shadow-md hover:shadow-lg transition-all"
        onClick={onLet}
        disabled={!canLet}
      >
        Let
      </button>
      <button
        className="btn btn-warning shadow-md hover:shadow-lg transition-all"
        onClick={onUndo}
        disabled={!canUndo}
      >
        Undo
      </button>
    </div>
  )
}
