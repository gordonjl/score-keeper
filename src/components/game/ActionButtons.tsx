import { useSelector } from '@xstate/react'
import type { ActorRefFrom } from 'xstate'
import type { squashGameMachine } from '../../machines/squashGameMachine'

type ActionButtonsProps = {
  actorRef: ActorRefFrom<typeof squashGameMachine>
}

export const ActionButtons = ({ actorRef }: ActionButtonsProps) => {
  // Use a single selector for all state this component needs
  const { isGameOver, isActive, isAwaitingConfirmation, hasHistory } =
    useSelector(actorRef, (s) => ({
      isGameOver: s.status === 'done',
      isActive: s.matches('active'),
      isAwaitingConfirmation: s.matches('awaitingConfirmation'),
      hasHistory: s.context.history.length > 0,
    }))

  const canLet = !isGameOver && isActive && !isAwaitingConfirmation
  // Can undo if there's history (which means at least one rally was played)
  const canUndo = hasHistory

  const onLet = () => {
    actorRef.send({ type: 'LET' })
  }

  const onUndo = () => {
    actorRef.send({ type: 'UNDO' })
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
