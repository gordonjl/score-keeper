import { useSelector } from '@xstate/react'
import { ScoreGridContainer } from './ScoreGridContainer'
import type { ActorRefFrom } from 'xstate'
import type { squashGameMachine } from '../../machines/squashGameMachine'

type ScoreGridProps = {
  actorRef: ActorRefFrom<typeof squashGameMachine>
  firstServingTeam: 'A' | 'B'
  playerLabels: Record<string, string>
}

export const ScoreGrid = ({
  actorRef,
  firstServingTeam,
  playerLabels,
}: ScoreGridProps) => {
  // Get gameId from machine context
  const gameId = useSelector(actorRef, (s) => s.context.gameId)

  // Show loading state if game not loaded yet
  if (!gameId) {
    return (
      <div className="card bg-base-100 shadow-xl mb-4 border border-base-300">
        <div className="card-body p-2 sm:p-4">
          <div className="flex justify-center items-center">
            <span className="loading loading-spinner loading-sm"></span>
          </div>
        </div>
      </div>
    )
  }

  // Render container with valid gameId
  return (
    <ScoreGridContainer
      gameId={gameId}
      actorRef={actorRef}
      firstServingTeam={firstServingTeam}
      playerLabels={playerLabels}
    />
  )
}
