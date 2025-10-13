import { useSelector } from '@xstate/react'
import { useQuery } from '@livestore/react'
import { gameById$, matchById$ } from '../../livestore/squash-queries'
import type { ActorRefFrom } from 'xstate'
import type { Game, squashGameMachine } from '../../machines/squashGameMachine'

type RallyButtonsProps = {
  actorRef: ActorRefFrom<typeof squashGameMachine>
}

// Inner component that only renders when gameId is available
const RallyButtonsContent = ({
  gameId,
  actorRef,
}: {
  gameId: string
  actorRef: ActorRefFrom<typeof squashGameMachine>
}) => {
  // Get state from machine
  const { isGameOver, isAwaitingConfirmation } = useSelector(actorRef, (s) => ({
    isGameOver: s.status === 'done',
    isAwaitingConfirmation: s.matches('awaitingConfirmation'),
  }))

  // Query game data from LiveStore (only called when gameId is valid)
  const game = useQuery(gameById$(gameId)) as Game

  // Query match for player names
  const match = useQuery(matchById$(game.matchId)) as {
    playerA1FirstName: string
    playerA2FirstName: string
    playerB1FirstName: string
    playerB2FirstName: string
  }

  const isDisabled = isGameOver || isAwaitingConfirmation

  const onRallyWon = (winner: 'A' | 'B') => {
    actorRef.send({ type: 'RALLY_WON', winner, game })
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      <button
        className="btn btn-primary flex-1 btn-lg shadow-lg hover:shadow-xl transition-all"
        onClick={() => onRallyWon('A')}
        disabled={isDisabled}
      >
        <div className="flex flex-col items-center gap-1">
          <span className="font-bold">
            {`${match.playerA1FirstName} & ${match.playerA2FirstName}`}
          </span>
          <span className="text-xs opacity-80">Won Rally</span>
        </div>
      </button>
      <button
        className="btn btn-primary flex-1 btn-lg shadow-lg hover:shadow-xl transition-all"
        onClick={() => onRallyWon('B')}
        disabled={isDisabled}
      >
        <div className="flex flex-col items-center gap-1">
          <span className="font-bold">
            {`${match.playerB1FirstName} & ${match.playerB2FirstName}`}
          </span>
          <span className="text-xs opacity-80">Won Rally</span>
        </div>
      </button>
    </div>
  )
}

// Wrapper component that checks for gameId before rendering
export const RallyButtons = ({ actorRef }: RallyButtonsProps) => {
  // Get gameId from machine context
  const gameId = useSelector(actorRef, (s) => s.context.gameId)

  // Show loading state if game not loaded yet
  if (!gameId) {
    return (
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <button className="btn btn-primary flex-1 btn-lg shadow-lg" disabled>
          <span className="loading loading-spinner loading-sm"></span>
        </button>
        <button className="btn btn-primary flex-1 btn-lg shadow-lg" disabled>
          <span className="loading loading-spinner loading-sm"></span>
        </button>
      </div>
    )
  }

  // Render content component with valid gameId
  return <RallyButtonsContent gameId={gameId} actorRef={actorRef} />
}
