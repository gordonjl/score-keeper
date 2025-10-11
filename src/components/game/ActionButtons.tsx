import { useStore } from '@livestore/react'
import { useSelector } from '@xstate/react'
import { gameById$, ralliesByGame$ } from '../../livestore/squash-queries'
import type { ActorRefFrom } from 'xstate'
import type { Game, squashGameMachine } from '../../machines/squashGameMachine'

type ActionButtonsProps = {
  actorRef: ActorRefFrom<typeof squashGameMachine>
}

// Inner component that only renders when gameId is available
const ActionButtonsContent = ({
  gameId,
  actorRef,
}: {
  gameId: string
  actorRef: ActorRefFrom<typeof squashGameMachine>
}) => {
  const { store } = useStore()

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
  const game = store.useQuery(gameById$(gameId)) as Game
  const rallies = store.useQuery(ralliesByGame$(gameId))

  const canLet = !isGameOver && isActive && !isAwaitingConfirmation
  // Can undo if there are rallies (which means at least one rally was played)
  const canUndo = rallies.length > 0

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

// Wrapper component that checks for gameId before rendering
export const ActionButtons = ({ actorRef }: ActionButtonsProps) => {
  // Get gameId from machine context
  const gameId = useSelector(actorRef, (s) => s.context.gameId)

  // Show loading state if game not loaded yet
  if (!gameId) {
    return (
      <div className="flex gap-3 flex-wrap">
        <button className="btn btn-outline btn-neutral shadow-md" disabled>
          Let
        </button>
        <button className="btn btn-warning shadow-md" disabled>
          Undo
        </button>
      </div>
    )
  }

  // Render content component with valid gameId
  return <ActionButtonsContent gameId={gameId} actorRef={actorRef} />
}
