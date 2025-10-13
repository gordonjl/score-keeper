import { ScoreGridContainer } from './ScoreGridContainer'
import type { ActorRefFrom } from 'xstate'
import type { squashGameMachine } from '../../machines/squashGameMachine'

type ScoreGridProps = {
  actorRef: ActorRefFrom<typeof squashGameMachine>
  gameId: string
  firstServingTeam: 'A' | 'B'
  playerLabels: Record<string, string>
}

export const ScoreGrid = ({
  actorRef,
  gameId,
  firstServingTeam,
  playerLabels,
}: ScoreGridProps) => {
  return (
    <ScoreGridContainer
      gameId={gameId}
      actorRef={actorRef}
      firstServingTeam={firstServingTeam}
      playerLabels={playerLabels}
    />
  )
}
