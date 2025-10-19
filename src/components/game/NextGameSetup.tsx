import { useClientDocument } from '@livestore/react'
import { SessionIdSymbol } from '@livestore/livestore'
import { useEffect } from 'react'
import { tables } from '../../livestore/schema'

type Team = 'A' | 'B'
type Side = 'R' | 'L'

type PlayerPositions = {
  A1: string
  A2: string
  B1: string
  B2: string
}

type PlayerName = { firstName: string; lastName: string; fullName: string }

type NextGameSetupProps = {
  isFirstGame: boolean
  lastWinner: Team
  players: {
    A1: PlayerName
    A2: PlayerName
    B1: PlayerName
    B2: PlayerName
    teamA: string
    teamB: string
  }
  onCancel: () => void
  onStartGame: (config: {
    firstServingTeam: Team
    players: PlayerPositions
    teamASide: Side
    teamBSide: Side
    teamAFirstServer: 1 | 2
    teamBFirstServer: 1 | 2
  }) => void | Promise<void>
}

export const NextGameSetup = ({
  isFirstGame,
  lastWinner,
  players,
  onCancel,
  onStartGame,
}: NextGameSetupProps) => {
  // Use LiveStore client document for form state (persists across refreshes)
  const [setupState, updateSetupState] = useClientDocument(
    tables.nextGameSetupState,
    SessionIdSymbol,
  )

  // Initialize serving team and first servers when component mounts or lastWinner changes
  useEffect(() => {
    const defaultServingTeam: Team = isFirstGame ? 'A' : lastWinner
    const needsUpdate =
      setupState.firstServingTeam !== defaultServingTeam ||
      setupState.teamAFirstServer !== 1 ||
      setupState.teamBFirstServer !== 1

    if (needsUpdate) {
      updateSetupState({
        ...setupState,
        firstServingTeam: defaultServingTeam,
        teamAFirstServer: 1,
        teamBFirstServer: 1,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFirstGame, lastWinner])

  const handleStartGame = () => {
    // Keep player positions fixed - teamAFirstServer/teamBFirstServer are passed
    // to the game and used by getOrderedRows() to determine display order
    const gamePlayers: PlayerPositions = {
      A1: players.A1.fullName,
      A2: players.A2.fullName,
      B1: players.B1.fullName,
      B2: players.B2.fullName,
    }

    // Default both teams to start serving from right side
    // Side can be toggled during gameplay by clicking the cell
    void onStartGame({
      firstServingTeam: setupState.firstServingTeam,
      players: gamePlayers,
      teamASide: 'R',
      teamBSide: 'R',
      teamAFirstServer: setupState.teamAFirstServer,
      teamBFirstServer: setupState.teamBFirstServer,
    })
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl p-4 sm:p-6">
        <h3 className="font-bold text-base sm:text-lg mb-3 sm:mb-4">
          {isFirstGame ? 'Setup First Game' : 'Setup Next Game'}
        </h3>

        {/* Serving Team Selection */}
        <h4 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3">
          Who serves first?
        </h4>
        <div className="flex gap-2 sm:gap-3 justify-center">
          <label className="label cursor-pointer flex-col gap-1 sm:gap-2 p-2 sm:p-4 border-2 border-base-300 rounded-lg hover:bg-base-300 flex-1 min-w-0">
            <span
              className="label-text font-bold text-xs sm:text-sm line-clamp-2 leading-tight text-center"
              title={players.teamA}
            >
              {players.teamA}
            </span>
            {!isFirstGame && lastWinner === 'A' && (
              <span className="text-xs text-success">(Last Winner)</span>
            )}
            <input
              type="radio"
              name="firstServingTeam"
              className="radio radio-primary"
              checked={setupState.firstServingTeam === 'A'}
              onChange={() =>
                updateSetupState({ ...setupState, firstServingTeam: 'A' })
              }
            />
          </label>
          <label className="label cursor-pointer flex-col gap-1 sm:gap-2 p-2 sm:p-4 border-2 border-base-300 rounded-lg hover:bg-base-300 flex-1 min-w-0">
            <span
              className="label-text font-bold text-xs sm:text-sm line-clamp-2 leading-tight text-center"
              title={players.teamB}
            >
              {players.teamB}
            </span>
            {!isFirstGame && lastWinner === 'B' && (
              <span className="text-xs text-success">(Last Winner)</span>
            )}
            <input
              type="radio"
              name="firstServingTeam"
              className="radio radio-primary"
              checked={setupState.firstServingTeam === 'B'}
              onChange={() =>
                updateSetupState({ ...setupState, firstServingTeam: 'B' })
              }
            />
          </label>
        </div>
        {!isFirstGame && (
          <p className="text-xs text-base-content/70 mt-2 text-center">
            {lastWinner === 'A' ? players.teamA : players.teamB} won the last
            game.
          </p>
        )}

        {/* First Server Designation */}
        <div className="card bg-base-200 p-3 sm:p-4 mb-3 sm:mb-4">
          <h4 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3">
            First Server Designation
          </h4>
          <div className="text-[10px] sm:text-xs text-base-content/70 mb-2 sm:mb-3">
            Who serves first on hand-in for each team?
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Team A First Server */}
            <div className="space-y-2">
              <div
                className="font-semibold text-xs sm:text-sm line-clamp-1"
                title={players.teamA}
              >
                {players.teamA}
              </div>
              <div className="flex gap-2">
                <label className="label cursor-pointer flex-1 flex-col gap-1 sm:gap-2 p-2 sm:p-3 border border-base-300 rounded-lg hover:bg-base-300 min-w-0">
                  <span
                    className="label-text font-semibold text-[10px] sm:text-xs line-clamp-2 leading-tight text-center"
                    title={players.A1.fullName}
                  >
                    {players.A1.fullName}
                  </span>
                  <input
                    type="radio"
                    name="teamAFirstServer"
                    className="radio radio-primary"
                    checked={setupState.teamAFirstServer === 1}
                    onChange={() =>
                      updateSetupState({ ...setupState, teamAFirstServer: 1 })
                    }
                  />
                </label>
                <label className="label cursor-pointer flex-1 flex-col gap-1 sm:gap-2 p-2 sm:p-3 border border-base-300 rounded-lg hover:bg-base-300 min-w-0">
                  <span
                    className="label-text font-semibold text-[10px] sm:text-xs line-clamp-2 leading-tight text-center"
                    title={players.A2.fullName}
                  >
                    {players.A2.fullName}
                  </span>
                  <input
                    type="radio"
                    name="teamAFirstServer"
                    className="radio radio-primary"
                    checked={setupState.teamAFirstServer === 2}
                    onChange={() =>
                      updateSetupState({ ...setupState, teamAFirstServer: 2 })
                    }
                  />
                </label>
              </div>
            </div>

            {/* Team B First Server */}
            <div className="space-y-2">
              <div
                className="font-semibold text-xs sm:text-sm line-clamp-1"
                title={players.teamB}
              >
                {players.teamB}
              </div>
              <div className="flex gap-2">
                <label className="label cursor-pointer flex-1 flex-col gap-1 sm:gap-2 p-2 sm:p-3 border border-base-300 rounded-lg hover:bg-base-300 min-w-0">
                  <span
                    className="label-text font-semibold text-[10px] sm:text-xs line-clamp-2 leading-tight text-center"
                    title={players.B1.fullName}
                  >
                    {players.B1.fullName}
                  </span>
                  <input
                    type="radio"
                    name="teamBFirstServer"
                    className="radio radio-primary"
                    checked={setupState.teamBFirstServer === 1}
                    onChange={() =>
                      updateSetupState({ ...setupState, teamBFirstServer: 1 })
                    }
                  />
                </label>
                <label className="label cursor-pointer flex-1 flex-col gap-1 sm:gap-2 p-2 sm:p-3 border border-base-300 rounded-lg hover:bg-base-300 min-w-0">
                  <span
                    className="label-text font-semibold text-[10px] sm:text-xs line-clamp-2 leading-tight text-center"
                    title={players.B2.fullName}
                  >
                    {players.B2.fullName}
                  </span>
                  <input
                    type="radio"
                    name="teamBFirstServer"
                    className="radio radio-primary"
                    checked={setupState.teamBFirstServer === 2}
                    onChange={() =>
                      updateSetupState({ ...setupState, teamBFirstServer: 2 })
                    }
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="modal-action gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm sm:btn-md"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm sm:btn-md"
            onClick={handleStartGame}
          >
            Start Game
          </button>
        </div>
      </div>
    </dialog>
  )
}
