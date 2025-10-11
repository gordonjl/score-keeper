import { useSelector } from '@xstate/react'
import { getPlayerDisplayName } from './utils'
import type { ActorRefFrom } from 'xstate'
import type { squashGameMachine } from '../../machines/squashGameMachine'

type RallyButtonsProps = {
  actorRef: ActorRefFrom<typeof squashGameMachine>
}

export const RallyButtons = ({ actorRef }: RallyButtonsProps) => {
  // Use a single selector for all state this component needs
  const { isGameOver, isAwaitingConfirmation, players } = useSelector(
    actorRef,
    (s) => ({
      isGameOver: s.matches('complete'),
      isAwaitingConfirmation: s.matches('awaitingConfirmation'),
      players: s.context.players,
    }),
  )

  const isDisabled = isGameOver || isAwaitingConfirmation

  const onRallyWon = (winner: 'A' | 'B') => {
    actorRef.send({ type: 'RALLY_WON', winner })
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      <button
        className="btn btn-primary flex-1 btn-lg shadow-lg hover:shadow-xl transition-all"
        onClick={() => onRallyWon('A')}
        disabled={isDisabled}
      >
        <div className="flex flex-col items-center gap-1">
          <span className="font-bold">{`${getPlayerDisplayName(players.A1)} & ${getPlayerDisplayName(players.A2)}`}</span>
          <span className="text-xs opacity-80">Won Rally</span>
        </div>
      </button>
      <button
        className="btn btn-primary flex-1 btn-lg shadow-lg hover:shadow-xl transition-all"
        onClick={() => onRallyWon('B')}
        disabled={isDisabled}
      >
        <div className="flex flex-col items-center gap-1">
          <span className="font-bold">{`${getPlayerDisplayName(players.B1)} & ${getPlayerDisplayName(players.B2)}`}</span>
          <span className="text-xs opacity-80">Won Rally</span>
        </div>
      </button>
    </div>
  )
}
