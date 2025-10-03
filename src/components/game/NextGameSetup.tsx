import { useState } from 'react'

type Team = 'A' | 'B'

type PlayerPositions = {
  A1: string
  A2: string
  B1: string
  B2: string
}

type NextGameSetupProps = {
  isFirstGame: boolean
  lastWinner: Team
  players: {
    A1: string
    A2: string
    B1: string
    B2: string
    teamA: string
    teamB: string
  }
  onCancel: () => void
  onStartGame: (config: {
    firstServingTeam: Team
    players: PlayerPositions
  }) => void
}

export const NextGameSetup = ({
  isFirstGame,
  lastWinner,
  players,
  onCancel,
  onStartGame,
}: NextGameSetupProps) => {
  // Default serving team based on rules:
  // - First game: already determined by racquet spin (handled at match setup)
  // - Subsequent games: losing team serves (but winners can opt to serve)
  const defaultServingTeam: Team = isFirstGame
    ? 'A' // This won't actually be used for first game
    : lastWinner === 'A'
      ? 'B'
      : 'A'

  const [firstServingTeam, setFirstServingTeam] =
    useState<Team>(defaultServingTeam)

  // Track player positions (allow swapping within teams)
  const [teamAPositions, setTeamAPositions] = useState<{
    rightWall: string
    leftWall: string
  }>({
    rightWall: players.A1,
    leftWall: players.A2,
  })

  const [teamBPositions, setTeamBPositions] = useState<{
    rightWall: string
    leftWall: string
  }>({
    rightWall: players.B1,
    leftWall: players.B2,
  })

  const handleSwapTeamA = () => {
    setTeamAPositions({
      rightWall: teamAPositions.leftWall,
      leftWall: teamAPositions.rightWall,
    })
  }

  const handleSwapTeamB = () => {
    setTeamBPositions({
      rightWall: teamBPositions.leftWall,
      leftWall: teamBPositions.rightWall,
    })
  }

  const handleStartGame = () => {
    onStartGame({
      firstServingTeam,
      players: {
        A1: teamAPositions.rightWall,
        A2: teamAPositions.leftWall,
        B1: teamBPositions.rightWall,
        B2: teamBPositions.leftWall,
      },
    })
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-4">Setup Next Game</h3>

        {/* Serving Team Selection */}
        <div className="card bg-base-200 p-4 mb-4">
          <h4 className="font-semibold mb-3">Who serves first?</h4>
          <div className="flex gap-3 justify-center">
            <label className="label cursor-pointer flex-col gap-2 p-4 border-2 border-base-300 rounded-lg hover:bg-base-300 flex-1">
              <span className="label-text font-bold">{players.teamA}</span>
              {lastWinner === 'A' && !isFirstGame && (
                <span className="text-xs text-success">(Last Winner)</span>
              )}
              <input
                type="radio"
                name="firstServingTeam"
                className="radio radio-primary"
                checked={firstServingTeam === 'A'}
                onChange={() => setFirstServingTeam('A')}
              />
            </label>
            <label className="label cursor-pointer flex-col gap-2 p-4 border-2 border-base-300 rounded-lg hover:bg-base-300 flex-1">
              <span className="label-text font-bold">{players.teamB}</span>
              {lastWinner === 'B' && !isFirstGame && (
                <span className="text-xs text-success">(Last Winner)</span>
              )}
              <input
                type="radio"
                name="firstServingTeam"
                className="radio radio-primary"
                checked={firstServingTeam === 'B'}
                onChange={() => setFirstServingTeam('B')}
              />
            </label>
          </div>
          {!isFirstGame && (
            <p className="text-xs text-base-content/70 mt-2 text-center">
              {lastWinner === 'A' ? players.teamA : players.teamB} won the last
              game. Typically, the losing team serves first.
            </p>
          )}
        </div>

        {/* Player Positions */}
        <div className="card bg-base-200 p-4 mb-4">
          <h4 className="font-semibold mb-3">Player Positions</h4>
          <div className="text-xs text-base-content/70 mb-3">
            Teams can choose to swap which side players play on.
          </div>

          {/* Team A Positions */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm">{players.teamA}</span>
              <button
                type="button"
                className="btn btn-xs btn-ghost"
                onClick={handleSwapTeamA}
              >
                Swap Sides
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-base-100 p-2 rounded text-center">
                <div className="text-xs text-base-content/70">Right Wall</div>
                <div className="font-medium">{teamAPositions.rightWall}</div>
              </div>
              <div className="bg-base-100 p-2 rounded text-center">
                <div className="text-xs text-base-content/70">Left Wall</div>
                <div className="font-medium">{teamAPositions.leftWall}</div>
              </div>
            </div>
          </div>

          {/* Team B Positions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm">{players.teamB}</span>
              <button
                type="button"
                className="btn btn-xs btn-ghost"
                onClick={handleSwapTeamB}
              >
                Swap Sides
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-base-100 p-2 rounded text-center">
                <div className="text-xs text-base-content/70">Right Wall</div>
                <div className="font-medium">{teamBPositions.rightWall}</div>
              </div>
              <div className="bg-base-100 p-2 rounded text-center">
                <div className="text-xs text-base-content/70">Left Wall</div>
                <div className="font-medium">{teamBPositions.leftWall}</div>
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
