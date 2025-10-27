import { useQuery } from '@livestore/react'
import { useSelector } from '@xstate/react'
import { useCallback } from 'react'
import { gameById$, matchById$ } from '../../livestore/squash-queries'
import { getTeamNames, getTeamNamesAbbreviated } from './match-utils'
import type { ActorRefFrom } from 'xstate'
import type { squashGameMachine } from '../../machines/squashGameMachine'

type RallyButtonsProps = {
  actorRef: ActorRefFrom<typeof squashGameMachine>
  gameId: string
}

type RallyButtonProps = {
  handleClick: () => void
  teamNames: string
  teamNamesAbbreviated: string
  isDisabled: boolean
}

const RallyButton = ({
  handleClick,
  teamNames,
  teamNamesAbbreviated,
  isDisabled,
}: RallyButtonProps) => {
  return (
    <button
      className="btn btn-primary flex-1 btn-md sm:btn-lg shadow-lg hover:shadow-xl transition-all min-h-[4rem] sm:min-h-[5rem]"
      onClick={handleClick}
      disabled={isDisabled}
    >
      <div className="flex flex-col items-center gap-0.5 sm:gap-1 w-full px-2">
        <span
          className="font-bold text-xs sm:text-sm lg:text-base line-clamp-2 leading-tight text-center max-w-full"
          title={teamNames}
        >
          <span className="lg:hidden">{teamNamesAbbreviated}</span>
          <span className="hidden lg:inline">{teamNames}</span>
        </span>
        <span className="text-[10px] sm:text-xs opacity-80">Won Rally</span>
      </div>
    </button>
  )
}

export const RallyButtons = ({ actorRef, gameId }: RallyButtonsProps) => {
  // Get state from machine
  const { isGameOver, isAwaitingConfirmation } = useSelector(actorRef, (s) => ({
    isGameOver: s.status === 'done',
    isAwaitingConfirmation: s.matches('awaitingConfirmation'),
  }))

  // Query game data from LiveStore
  const game = useQuery(gameById$(gameId))

  // Query match for player names
  const match = useQuery(matchById$(game.matchId))
  const teamNames = getTeamNames(match)
  const teamNamesAbbr = getTeamNamesAbbreviated(match)

  const isDisabled = isGameOver || isAwaitingConfirmation

  const onRallyWon = useCallback(
    (winner: 'A' | 'B') => {
      actorRef.send({ type: 'RALLY_WON', winner, game })
    },
    [actorRef, game],
  )

  const handleClickA = useCallback(() => onRallyWon('A'), [onRallyWon])
  const handleClickB = useCallback(() => onRallyWon('B'), [onRallyWon])

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 ">
      <RallyButton
        handleClick={handleClickA}
        teamNames={teamNames.teamA}
        teamNamesAbbreviated={teamNamesAbbr.teamA}
        isDisabled={isDisabled}
      />
      <RallyButton
        handleClick={handleClickB}
        teamNames={teamNames.teamB}
        teamNamesAbbreviated={teamNamesAbbr.teamB}
        isDisabled={isDisabled}
      />
    </div>
  )
}
