import { useState } from 'react'

type Team = 'A' | 'B'
type Side = 'R' | 'L'

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
    teamASide: Side
    teamBSide: Side
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

  // Track which player serves first on hand-in for each team (for this game)
  const [teamAFirstServer, setTeamAFirstServer] = useState<1 | 2>(1)
  const [teamBFirstServer, setTeamBFirstServer] = useState<1 | 2>(1)

  // Track court positions independently - which player is on right wall
  // Default: player 1 (A1/B1) starts on right wall
  const [teamARightWallPlayer, setTeamARightWallPlayer] = useState<1 | 2>(1)
  const [teamBRightWallPlayer, setTeamBRightWallPlayer] = useState<1 | 2>(1)

  const handleSwapTeamA = () => {
    setTeamARightWallPlayer(teamARightWallPlayer === 1 ? 2 : 1)
  }

  const handleSwapTeamB = () => {
    setTeamBRightWallPlayer(teamBRightWallPlayer === 1 ? 2 : 1)
  }

  const handleStartGame = () => {
    // Reorder players based on who serves first on hand-in
    // The first server becomes A1/B1 for this game
    const gamePlayers = {
      A1: teamAFirstServer === 1 ? players.A1 : players.A2,
      A2: teamAFirstServer === 1 ? players.A2 : players.A1,
      B1: teamBFirstServer === 1 ? players.B1 : players.B2,
      B2: teamBFirstServer === 1 ? players.B2 : players.B1,
    }

    // Determine which side the first server starts on
    // teamARightWallPlayer tells us which ORIGINAL player (1 or 2) is on right wall
    // teamAFirstServer tells us which ORIGINAL player (1 or 2) serves first
    // If they match, first server is on right ('R'), otherwise left ('L')
    const teamASide: Side =
      teamARightWallPlayer === teamAFirstServer ? 'R' : 'L'
    const teamBSide: Side =
      teamBRightWallPlayer === teamBFirstServer ? 'R' : 'L'

    onStartGame({
      firstServingTeam,
      players: gamePlayers,
      teamASide,
      teamBSide,
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
                  <span className="label-text font-semibold">{players.A1}</span>
                  <input
                    type="radio"
                    name="teamAFirstServer"
                    className="radio radio-primary"
                    checked={teamAFirstServer === 1}
                    onChange={() => setTeamAFirstServer(1)}
                  />
                </label>
                <label className="label cursor-pointer flex-1 flex-col gap-2 p-3 border border-base-300 rounded-lg hover:bg-base-300">
                  <span className="label-text font-semibold">{players.A2}</span>
                  <input
                    type="radio"
                    name="teamAFirstServer"
                    className="radio radio-primary"
                    checked={teamAFirstServer === 2}
                    onChange={() => setTeamAFirstServer(2)}
                  />
                </label>
              </div>
            </div>

            {/* Team B First Server */}
            <div className="space-y-2">
              <div className="font-semibold text-sm">{players.teamB}</div>
              <div className="flex gap-2">
                <label className="label cursor-pointer flex-1 flex-col gap-2 p-3 border border-base-300 rounded-lg hover:bg-base-300">
                  <span className="label-text font-semibold">{players.B1}</span>
                  <input
                    type="radio"
                    name="teamBFirstServer"
                    className="radio radio-primary"
                    checked={teamBFirstServer === 1}
                    onChange={() => setTeamBFirstServer(1)}
                  />
                </label>
                <label className="label cursor-pointer flex-1 flex-col gap-2 p-3 border border-base-300 rounded-lg hover:bg-base-300">
                  <span className="label-text font-semibold">{players.B2}</span>
                  <input
                    type="radio"
                    name="teamBFirstServer"
                    className="radio radio-primary"
                    checked={teamBFirstServer === 2}
                    onChange={() => setTeamBFirstServer(2)}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Player Court Positions */}
        <div className="card bg-base-200 p-4 mb-4">
          <h4 className="font-semibold mb-3">Player Court Positions</h4>
          <div className="text-xs text-base-content/70 mb-3">
            Which side does the first server start on?
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
                <div className="font-medium">
                  {teamARightWallPlayer === 1 ? players.A1 : players.A2}
                </div>
                {teamARightWallPlayer === teamAFirstServer && (
                  <div className="text-xs text-primary mt-1">First server</div>
                )}
              </div>
              <div className="bg-base-100 p-2 rounded text-center">
                <div className="text-xs text-base-content/70">Left Wall</div>
                <div className="font-medium">
                  {teamARightWallPlayer === 1 ? players.A2 : players.A1}
                </div>
                {teamARightWallPlayer !== teamAFirstServer && (
                  <div className="text-xs text-primary mt-1">First server</div>
                )}
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
                <div className="font-medium">
                  {teamBRightWallPlayer === 1 ? players.B1 : players.B2}
                </div>
                {teamBRightWallPlayer === teamBFirstServer && (
                  <div className="text-xs text-primary mt-1">First server</div>
                )}
              </div>
              <div className="bg-base-100 p-2 rounded text-center">
                <div className="text-xs text-base-content/70">Left Wall</div>
                <div className="font-medium">
                  {teamBRightWallPlayer === 1 ? players.B2 : players.B1}
                </div>
                {teamBRightWallPlayer !== teamBFirstServer && (
                  <div className="text-xs text-primary mt-1">First server</div>
                )}
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
