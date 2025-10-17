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
    // Reorder players based on who serves first on hand-in
    // The first server becomes A1/B1 for this game
    const gamePlayers: PlayerPositions = {
      A1:
        setupState.teamAFirstServer === 1
          ? players.A1.fullName
          : players.A2.fullName,
      A2:
        setupState.teamAFirstServer === 1
          ? players.A2.fullName
          : players.A1.fullName,
      B1:
        setupState.teamBFirstServer === 1
          ? players.B1.fullName
          : players.B2.fullName,
      B2:
        setupState.teamBFirstServer === 1
          ? players.B2.fullName
          : players.B1.fullName,
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
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-4">
          {isFirstGame ? 'Setup First Game' : 'Setup Next Game'}
        </h3>

        {/* Serving Team Selection */}
        <h4 className="font-semibold mb-3">Who serves first?</h4>
        <div className="flex gap-3 justify-center">
          <label className="label cursor-pointer flex-col gap-2 p-4 border-2 border-base-300 rounded-lg hover:bg-base-300 flex-1">
            <span className="label-text font-bold">{players.teamA}</span>
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
          <label className="label cursor-pointer flex-col gap-2 p-4 border-2 border-base-300 rounded-lg hover:bg-base-300 flex-1">
            <span className="label-text font-bold">{players.teamB}</span>
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
        <div className="card bg-base-200 p-4 mb-4">
          <h4 className="font-semibold mb-3">First Server Designation</h4>
          <div className="text-xs text-base-content/70 mb-3">
            Who serves first on hand-in for each team?
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Team A First Server */}
            <div className="space-y-2">
              <div className="font-semibold text-sm">{players.teamA}</div>
              <div className="flex gap-2">
                <label className="label cursor-pointer flex-1 flex-col gap-2 p-3 border border-base-300 rounded-lg hover:bg-base-300">
                  <span className="label-text font-semibold">
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
                <label className="label cursor-pointer flex-1 flex-col gap-2 p-3 border border-base-300 rounded-lg hover:bg-base-300">
                  <span className="label-text font-semibold">
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
              <div className="font-semibold text-sm">{players.teamB}</div>
              <div className="flex gap-2">
                <label className="label cursor-pointer flex-1 flex-col gap-2 p-3 border border-base-300 rounded-lg hover:bg-base-300">
                  <span className="label-text font-semibold">
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
                <label className="label cursor-pointer flex-1 flex-col gap-2 p-3 border border-base-300 rounded-lg hover:bg-base-300">
                  <span className="label-text font-semibold">
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
        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleStartGame}
          >
            Start Game
          </button>
        </div>
      </div>
    </dialog>
  )
}
