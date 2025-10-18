import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useClientDocument, useQuery, useStore } from '@livestore/react'
import { SessionIdSymbol } from '@livestore/livestore'
import { Calendar, CheckCircle2, Clock, Play, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { DeleteMatchModal } from '../components/modals/DeleteMatchModal'
import { NextGameSetup } from '../components/game/NextGameSetup'
import { events, tables } from '../livestore/schema'
import { gamesByMatch$, nonArchivedMatches$ } from '../livestore/squash-queries'

// ============================================================================
// TYPES
// ============================================================================

type Match = {
  id: string
  status: string
  createdAt: Date
  playerA1FirstName: string
  playerA1LastName: string
  playerA2FirstName: string
  playerA2LastName: string
  playerB1FirstName: string
  playerB1LastName: string
  playerB2FirstName: string
  playerB2LastName: string
}

type Game = {
  id: string
  gameNumber: number
  status: string
  winner: string | null
  scoreA: number
  scoreB: number
}

type MatchStats = {
  gamesWonA: number
  gamesWonB: number
  totalGames: number
  hasInProgressGame: boolean
  inProgressGameNumber: number | null
  matchStatus: 'in_progress' | 'completed' | 'not_started'
}

// ============================================================================
// PURE FUNCTIONS
// ============================================================================

const formatPlayerName = (firstName: string, lastName: string): string =>
  `${firstName} ${lastName}`

const formatTeamName = (
  player1FirstName: string,
  player1LastName: string,
  player2FirstName: string,
  player2LastName: string,
): string => {
  const hasNames =
    player1FirstName || player1LastName || player2FirstName || player2LastName
  if (!hasNames) return 'Team (Names not set)'
  return `${formatPlayerName(player1FirstName, player1LastName)} & ${formatPlayerName(player2FirstName, player2LastName)}`
}

const computeMatchStats = (games: ReadonlyArray<Game>): MatchStats => {
  const completedGames = games.filter((g) => g.status === 'completed')
  const inProgressGame = games.find((g) => g.status === 'in_progress')

  const gamesWonA = completedGames.filter((g) => g.winner === 'A').length
  const gamesWonB = completedGames.filter((g) => g.winner === 'B').length

  const matchStatus: MatchStats['matchStatus'] =
    games.length === 0
      ? 'not_started'
      : gamesWonA >= 3 || gamesWonB >= 3
        ? 'completed'
        : 'in_progress'

  return {
    gamesWonA,
    gamesWonB,
    totalGames: completedGames.length,
    hasInProgressGame: inProgressGame !== undefined,
    inProgressGameNumber: inProgressGame?.gameNumber ?? null,
    matchStatus,
  }
}

// ============================================================================
// COMPONENTS
// ============================================================================

type GameIndicatorProps = {
  readonly gameNumber: number
  readonly game: Game | undefined
  readonly isInProgress: boolean
}

const GameIndicator = ({
  gameNumber,
  game,
  isInProgress,
}: GameIndicatorProps) => {
  const winner = game?.winner
  const scoreA = game?.scoreA ?? 0
  const scoreB = game?.scoreB ?? 0

  const bgColor = isInProgress
    ? 'bg-warning'
    : winner === 'A'
      ? 'bg-primary'
      : winner === 'B'
        ? 'bg-secondary'
        : 'bg-base-content/5'

  const textColor = isInProgress
    ? 'text-warning-content'
    : winner
      ? 'text-base-100'
      : 'text-base-content/25'

  const tooltipText = game
    ? `Game ${gameNumber}: ${scoreA}-${scoreB}${isInProgress ? ' (In Progress)' : winner ? ` - Team ${winner} won` : ''}`
    : `Game ${gameNumber} - Not played`

  const borderColor = isInProgress ? 'ring-2 ring-warning/50' : ''

  return (
    <div
      className={`relative w-10 h-10 rounded-md flex flex-col items-center justify-center text-[10px] font-bold transition-all ${bgColor} ${textColor} ${borderColor} ${!game ? 'opacity-30' : 'shadow-sm hover:scale-105'}`}
      title={tooltipText}
    >
      <div className="text-[8px] opacity-60 absolute top-0.5">{gameNumber}</div>
      <div className="font-black">{game ? `${scoreA}-${scoreB}` : '—'}</div>
    </div>
  )
}

type GameIndicatorsProps = {
  readonly games: ReadonlyArray<Game>
  readonly stats: MatchStats
}

const GameIndicators = ({ games, stats }: GameIndicatorsProps) => {
  const maxGames = 5
  const indicators = Array.from({ length: maxGames }, (_, i) => {
    const gameNumber = i + 1
    const game = games.find((g) => g.gameNumber === gameNumber)

    return (
      <GameIndicator
        key={gameNumber}
        gameNumber={gameNumber}
        game={game}
        isInProgress={
          game?.status === 'in_progress' &&
          stats.inProgressGameNumber === gameNumber
        }
      />
    )
  })

  return <div className="flex gap-1.5 overflow-x-auto">{indicators}</div>
}

type MatchStatusBadgeProps = {
  readonly status: MatchStats['matchStatus']
  readonly hasInProgressGame: boolean
}

const MatchStatusBadge = ({
  status,
  hasInProgressGame,
}: MatchStatusBadgeProps) => {
  const config =
    status === 'completed'
      ? {
          icon: CheckCircle2,
          text: 'Done',
          className: 'badge-success',
        }
      : hasInProgressGame
        ? {
            icon: Clock,
            text: 'Live',
            className: 'badge-warning',
          }
        : {
            icon: Play,
            text: 'Ready',
            className: 'badge-info',
          }

  const Icon = config.icon

  return (
    <div className={`badge badge-sm ${config.className} gap-1 font-semibold`}>
      <Icon className="w-3 h-3" />
      {config.text}
    </div>
  )
}

type MatchCardProps = {
  readonly match: Match
  readonly games: ReadonlyArray<Game>
  readonly onDelete: (matchId: string) => void
  readonly onStartFirstGame: (matchId: string) => void
}

const MatchCard = ({
  match,
  games,
  onDelete,
  onStartFirstGame,
}: MatchCardProps) => {
  const stats = computeMatchStats(games)
  const teamAName = formatTeamName(
    match.playerA1FirstName,
    match.playerA1LastName,
    match.playerA2FirstName,
    match.playerA2LastName,
  )
  const teamBName = formatTeamName(
    match.playerB1FirstName,
    match.playerB1LastName,
    match.playerB2FirstName,
    match.playerB2LastName,
  )

  const isTeamAWinner =
    stats.matchStatus === 'completed' && stats.gamesWonA >= 3
  const isTeamBWinner =
    stats.matchStatus === 'completed' && stats.gamesWonB >= 3

  // Check if match has been set up (has player names)
  const hasPlayerNames =
    match.playerA1FirstName ||
    match.playerA1LastName ||
    match.playerB1FirstName ||
    match.playerB1LastName

  // Determine if we should show a button instead of a link
  // Only show button for starting first game when no games exist AND no game in progress
  const shouldStartFirstGame =
    hasPlayerNames && stats.totalGames === 0 && !stats.hasInProgressGame

  // Link logic: configure page if not set up, in-progress game if exists, otherwise summary
  const linkTo = !hasPlayerNames
    ? '/match/$matchId/configure'
    : stats.hasInProgressGame
      ? '/match/$matchId/game/$gameNumber'
      : '/match/$matchId/summary'

  const linkParams = stats.hasInProgressGame
    ? { matchId: match.id, gameNumber: String(stats.inProgressGameNumber) }
    : { matchId: match.id }

  const buttonText = !hasPlayerNames
    ? 'Configure Match'
    : stats.hasInProgressGame
      ? 'Go to Game'
      : stats.totalGames === 0
        ? 'Start First Game'
        : 'View Details'
  const ButtonIcon =
    stats.hasInProgressGame || shouldStartFirstGame ? Play : null

  return (
    <div className="group relative bg-gradient-to-br from-base-200 to-base-300 rounded-xl p-4 hover:shadow-xl transition-all duration-300 border border-base-300/50 hover:border-primary/20">
      {/* Compact header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-base-content/50">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {new Date(match.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
          <div className="h-3 w-px bg-base-content/10" />
          <MatchStatusBadge
            status={stats.matchStatus}
            hasInProgressGame={stats.hasInProgressGame}
          />
        </div>
        <button
          onClick={(e) => {
            e.preventDefault()
            onDelete(match.id)
          }}
          className="transition-opacity btn btn-xs btn-ghost btn-circle text-error hover:bg-error/10"
          aria-label="Delete match"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Score display - horizontal layout */}
      <div className="flex items-center justify-between mb-3 bg-base-100/50 rounded-lg p-3">
        <div className="flex-1">
          <div className="text-[9px] text-base-content/40 uppercase tracking-wider font-bold mb-1">
            Team A
          </div>
          <div
            className={`font-bold text-sm truncate ${
              isTeamAWinner ? 'text-primary' : 'text-base-content'
            }`}
          >
            {teamAName}
          </div>
        </div>

        <div className="flex items-center gap-3 px-4">
          <div
            className={`text-3xl font-black tabular-nums ${
              isTeamAWinner ? 'text-primary' : 'text-base-content/40'
            }`}
          >
            {stats.gamesWonA}
          </div>
          <div className="text-base-content/20 font-bold">-</div>
          <div
            className={`text-3xl font-black tabular-nums ${
              isTeamBWinner ? 'text-primary' : 'text-base-content/40'
            }`}
          >
            {stats.gamesWonB}
          </div>
        </div>

        <div className="flex-1 text-right">
          <div className="text-[9px] text-base-content/40 uppercase tracking-wider font-bold mb-1">
            Team B
          </div>
          <div
            className={`font-bold text-sm truncate ${
              isTeamBWinner ? 'text-primary' : 'text-base-content'
            }`}
          >
            {teamBName}
          </div>
        </div>
      </div>

      {/* Games and action row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <GameIndicators games={games} stats={stats} />
        </div>
        {shouldStartFirstGame ? (
          <button
            onClick={(e) => {
              e.preventDefault()
              onStartFirstGame(match.id)
            }}
            className="btn btn-sm btn-primary gap-1.5 shadow-md hover:shadow-lg transition-shadow"
          >
            {ButtonIcon && <ButtonIcon className="w-4 h-4" />}
            <span className="font-semibold text-xs">{buttonText}</span>
          </button>
        ) : (
          <Link
            to={linkTo}
            params={linkParams}
            className="btn btn-sm btn-primary gap-1.5 shadow-md hover:shadow-lg transition-shadow"
          >
            {ButtonIcon && <ButtonIcon className="w-4 h-4" />}
            <span className="font-semibold text-xs">{buttonText}</span>
          </Link>
        )}
      </div>
    </div>
  )
}

const EmptyState = () => (
  <div className="text-center py-12">
    <p className="text-base-content/60">
      No matches found. Start a new match to get started!
    </p>
  </div>
)

const MatchesHeader = () => (
  <div className="flex justify-between items-center mb-6">
    <h1 className="text-3xl font-bold">Match History</h1>
    <Link to="/" className="btn btn-primary">
      <Play className="w-4 h-4 mr-2" />
      New Match
    </Link>
  </div>
)

type MatchWithGamesProps = {
  readonly match: Match
  readonly onDelete: (matchId: string) => void
  readonly onStartFirstGame: (matchId: string) => void
}

const MatchWithGames = ({
  match,
  onDelete,
  onStartFirstGame,
}: MatchWithGamesProps) => {
  const games = useQuery(gamesByMatch$(match.id))

  return (
    <MatchCard
      match={match}
      games={games}
      onDelete={onDelete}
      onStartFirstGame={onStartFirstGame}
    />
  )
}

type MatchesListProps = {
  readonly matches: ReadonlyArray<Match>
  readonly onDelete: (matchId: string) => void
  readonly onStartFirstGame: (matchId: string) => void
}

const MatchesList = ({
  matches,
  onDelete,
  onStartFirstGame,
}: MatchesListProps) => (
  <div className="grid gap-4">
    {matches.map((match) => (
      <MatchWithGames
        key={match.id}
        match={match}
        onDelete={onDelete}
        onStartFirstGame={onStartFirstGame}
      />
    ))}
  </div>
)

// ============================================================================
// ROUTE
// ============================================================================

export const Route = createFileRoute('/matches')({
  component: MatchesListRoute,
})

function MatchesListRoute() {
  const { store } = useStore()
  const navigate = useNavigate({ from: Route.fullPath })
  const matches = useQuery(nonArchivedMatches$)
  const [gameSetupMatchId, setGameSetupMatchId] = useState<string | null>(null)

  // Use LiveStore client document for modal state (persists across refreshes)
  const [modalState, updateModalState] = useClientDocument(
    tables.modalState,
    SessionIdSymbol,
  )

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const hasMatches = matches && matches.length > 0

  const handleDeleteClick = (matchId: string) => {
    const match = matches.find((m) => m.id === matchId)
    if (!match) return

    const teamAName = formatTeamName(
      match.playerA1FirstName,
      match.playerA1LastName,
      match.playerA2FirstName,
      match.playerA2LastName,
    )
    const teamBName = formatTeamName(
      match.playerB1FirstName,
      match.playerB1LastName,
      match.playerB2FirstName,
      match.playerB2LastName,
    )

    updateModalState({
      ...modalState,
      deleteModal: {
        isOpen: true,
        matchId,
        teamAName,
        teamBName,
      },
    })
  }

  const handleDeleteConfirm = () => {
    if (!modalState.deleteModal.matchId) return

    store.commit(
      events.matchArchived({
        matchId: modalState.deleteModal.matchId,
        timestamp: new Date(),
      }),
    )

    updateModalState({
      ...modalState,
      deleteModal: {
        isOpen: false,
        matchId: null,
        teamAName: '',
        teamBName: '',
      },
    })
  }

  const handleDeleteCancel = () => {
    updateModalState({
      ...modalState,
      deleteModal: {
        isOpen: false,
        matchId: null,
        teamAName: '',
        teamBName: '',
      },
    })
  }

  const handleStartFirstGame = (matchId: string) => {
    setGameSetupMatchId(matchId)
  }

  const handleGameSetupCancel = () => {
    setGameSetupMatchId(null)
  }

  const handleGameSetupStart = (config: {
    firstServingTeam: 'A' | 'B'
    players: { A1: string; A2: string; B1: string; B2: string }
    teamASide: 'R' | 'L'
    teamBSide: 'R' | 'L'
    teamAFirstServer: 1 | 2
    teamBFirstServer: 1 | 2
  }) => {
    if (!gameSetupMatchId) return

    const match = matches.find((m) => m.id === gameSetupMatchId)
    if (!match) return

    // Use the teamAFirstServer and teamBFirstServer from the modal
    // These indicate which player position serves first for each team
    const firstServingPlayer =
      config.firstServingTeam === 'A'
        ? config.teamAFirstServer
        : config.teamBFirstServer

    const gameId = crypto.randomUUID()
    store.commit(
      events.gameStarted({
        gameId,
        matchId: gameSetupMatchId,
        gameNumber: 1,
        firstServingTeam: config.firstServingTeam,
        firstServingPlayer,
        firstServingSide: 'R',
        teamAFirstServer: config.teamAFirstServer,
        teamBFirstServer: config.teamBFirstServer,
        maxPoints: 15,
        winBy: 1,
        timestamp: new Date(),
      }),
    )

    setGameSetupMatchId(null)

    // Navigate to the game
    void navigate({
      to: '/match/$matchId/game/$gameNumber',
      params: { matchId: gameSetupMatchId, gameNumber: '1' },
    })
  }

  // Get match for game setup modal
  const gameSetupMatch = gameSetupMatchId
    ? matches.find((m) => m.id === gameSetupMatchId)
    : null

  return (
    <div className="container mx-auto p-4">
      <MatchesHeader />
      {hasMatches ? (
        <MatchesList
          matches={matches}
          onDelete={handleDeleteClick}
          onStartFirstGame={handleStartFirstGame}
        />
      ) : (
        <EmptyState />
      )}
      <DeleteMatchModal
        isOpen={modalState.deleteModal.isOpen}
        teamAName={modalState.deleteModal.teamAName}
        teamBName={modalState.deleteModal.teamBName}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
      {gameSetupMatch && (
        <NextGameSetup
          key={gameSetupMatchId}
          isFirstGame={true}
          lastWinner="A"
          players={{
            A1: {
              firstName: gameSetupMatch.playerA1FirstName,
              lastName: gameSetupMatch.playerA1LastName,
              fullName:
                `${gameSetupMatch.playerA1FirstName} ${gameSetupMatch.playerA1LastName}`.trim(),
            },
            A2: {
              firstName: gameSetupMatch.playerA2FirstName,
              lastName: gameSetupMatch.playerA2LastName,
              fullName:
                `${gameSetupMatch.playerA2FirstName} ${gameSetupMatch.playerA2LastName}`.trim(),
            },
            B1: {
              firstName: gameSetupMatch.playerB1FirstName,
              lastName: gameSetupMatch.playerB1LastName,
              fullName:
                `${gameSetupMatch.playerB1FirstName} ${gameSetupMatch.playerB1LastName}`.trim(),
            },
            B2: {
              firstName: gameSetupMatch.playerB2FirstName,
              lastName: gameSetupMatch.playerB2LastName,
              fullName:
                `${gameSetupMatch.playerB2FirstName} ${gameSetupMatch.playerB2LastName}`.trim(),
            },
            teamA:
              `${gameSetupMatch.playerA1FirstName} ${gameSetupMatch.playerA1LastName} & ${gameSetupMatch.playerA2FirstName} ${gameSetupMatch.playerA2LastName}`.trim(),
            teamB:
              `${gameSetupMatch.playerB1FirstName} ${gameSetupMatch.playerB1LastName} & ${gameSetupMatch.playerB2FirstName} ${gameSetupMatch.playerB2LastName}`.trim(),
          }}
          onCancel={handleGameSetupCancel}
          onStartGame={handleGameSetupStart}
        />
      )}
    </div>
  )
}
