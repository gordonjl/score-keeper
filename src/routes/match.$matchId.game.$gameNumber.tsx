import { useClientDocument, useQuery, useStore } from '@livestore/react'
import { SessionIdSymbol } from '@livestore/livestore'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useSelector } from '@xstate/react'
import { useCallback, useEffect, useMemo } from 'react'
import { ActionButtons } from '../components/game/ActionButtons'
import { GameOverConfirmation } from '../components/game/GameOverConfirmation'
import { MatchProgress } from '../components/game/MatchProgress'
import { MatchSummary } from '../components/game/MatchSummary'
import { NextGameSetup } from '../components/game/NextGameSetup'
import { RallyButtons } from '../components/game/RallyButtons'
import { ScoreGrid } from '../components/game/ScoreGrid'
import { ScoreHeader } from '../components/game/ScoreHeader'
import { ServeAnnouncement } from '../components/game/ServeAnnouncement'
import { useLiveStoreMatch } from '../contexts/LiveStoreMatchContext'
import { useSquashGameMachine } from '../hooks/useSquashGameMachine'
import { events, tables } from '../livestore/schema'
import { gamesByMatch$, matchById$ } from '../livestore/squash-queries'

function GameErrorComponent({ error }: { error: Error }) {
  const navigate = useNavigate()

  useEffect(() => {
    console.error('Game route error - match or game not found:', error)
    // Redirect to home if match/game not found
    const timer = setTimeout(() => {
      void navigate({ to: '/' })
    }, 2000)
    return () => clearTimeout(timer)
  }, [error, navigate])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Game Not Found</h1>
        <p className="mb-4">Redirecting to home...</p>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/match/$matchId/game/$gameNumber')({
  component: GameRouteWrapper,
  errorComponent: GameErrorComponent,
})

// Wrapper component that conditionally renders based on game actor existence
function GameRouteWrapper() {
  const { matchId, gameNumber } = Route.useParams()
  const navigate = useNavigate({ from: Route.fullPath })
  const { isLoading } = useLiveStoreMatch()

  // Query games from LiveStore
  const games = useQuery(gamesByMatch$(matchId))

  // Check if match is complete (3 games won)
  const gamesWonA = games.filter(
    (g) => g.status === 'completed' && g.winner === 'A',
  ).length
  const gamesWonB = games.filter(
    (g) => g.status === 'completed' && g.winner === 'B',
  ).length
  const isMatchComplete = gamesWonA >= 3 || gamesWonB >= 3

  // If match is complete, redirect to summary
  useEffect(() => {
    if (isMatchComplete) {
      void navigate({ to: '/match/$matchId/summary', params: { matchId } })
    }
  }, [isMatchComplete, matchId, navigate])

  // Show loading while initializing
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4">Loading match...</p>
        </div>
      </div>
    )
  }

  // Conditionally render GameRoute only when not complete
  if (isMatchComplete) {
    return <div className="p-4">Loading...</div>
  }

  // Force remount when gameNumber changes by using it as a key
  return <GameRoute key={`game-${matchId}-${gameNumber}`} />
}

// Main component that requires a game actor
function GameRoute() {
  const { matchId, gameNumber: gameNumberStr } = Route.useParams()
  const gameNumber = Number.parseInt(gameNumberStr, 10)
  const navigate = useNavigate({ from: Route.fullPath })
  const { store } = useStore()
  const { actor: matchActorRef } = useLiveStoreMatch()

  // Use LiveStore client document for next game setup state
  const [nextGameSetupState, updateNextGameSetupState] = useClientDocument(
    tables.nextGameSetupState,
    SessionIdSymbol,
  )

  // Query data from LiveStore
  const match = useQuery(matchById$(matchId))
  const games = useQuery(gamesByMatch$(matchId))

  // Build players from match data

  const matchPlayers = useMemo(
    () => ({
      A1: {
        firstName: match.playerA1FirstName,
        lastName: match.playerA1LastName,
        fullName: `${match.playerA1FirstName} ${match.playerA1LastName}`.trim(),
      },
      A2: {
        firstName: match.playerA2FirstName,
        lastName: match.playerA2LastName,
        fullName: `${match.playerA2FirstName} ${match.playerA2LastName}`.trim(),
      },
      B1: {
        firstName: match.playerB1FirstName,
        lastName: match.playerB1LastName,
        fullName: `${match.playerB1FirstName} ${match.playerB1LastName}`.trim(),
      },
      B2: {
        firstName: match.playerB2FirstName,
        lastName: match.playerB2LastName,
        fullName: `${match.playerB2FirstName} ${match.playerB2LastName}`.trim(),
      },
      teamA: `${match.playerA1FirstName} ${match.playerA1LastName} & ${match.playerA2FirstName} ${match.playerA2LastName}`,
      teamB: `${match.playerB1FirstName} ${match.playerB1LastName} & ${match.playerB2FirstName} ${match.playerB2LastName}`,
    }),
    [match],
  )

  // Use squashGameMachine hook to create and manage machine
  const { actorRef, game } = useSquashGameMachine(matchId, gameNumber)
  const gameId = game.id

  // Only select state that the route component DIRECTLY uses for its own logic
  const { isGameOver, isAwaitingConfirmation } = useSelector(actorRef, (s) => ({
    isGameOver: s.status === 'done', // XState v5: Use status === 'done' for final state
    isAwaitingConfirmation: s.matches('awaitingConfirmation'),
  }))

  // Get score and team names from LiveStore (source of truth)
  const scoreA = game.scoreA
  const scoreB = game.scoreB
  const teamAName = `${match.playerA1FirstName} & ${match.playerA2FirstName}`
  const teamBName = `${match.playerB1FirstName} & ${match.playerB2FirstName}`

  // Get firstServingTeam from game data (source of truth)
  const firstServingTeam = game.firstServingTeam

  const winnerTeam = useMemo(
    () => (scoreA > scoreB ? teamAName : teamBName),
    [scoreA, scoreB, teamAName, teamBName],
  )

  const matchPlayerRowLabels = useMemo(
    () => ({
      A1: matchPlayers.A1.lastName || matchPlayers.A1.firstName || 'A1',
      A2: matchPlayers.A2.lastName || matchPlayers.A2.firstName || 'A2',
      B1: matchPlayers.B1.lastName || matchPlayers.B1.firstName || 'B1',
      B2: matchPlayers.B2.lastName || matchPlayers.B2.firstName || 'B2',
    }),
    [matchPlayers],
  )

  // Memoized game statistics
  const gameStats = useMemo(() => {
    const gamesWonA = games.filter(
      (g) => g.status === 'completed' && g.winner === 'A',
    ).length
    const gamesWonB = games.filter(
      (g) => g.status === 'completed' && g.winner === 'B',
    ).length
    const currentGameNumber =
      games.length > 0 ? Math.max(...games.map((g) => g.gameNumber)) : 1
    const currentWinner: 'A' | 'B' = scoreA > scoreB ? 'A' : 'B'
    const willCompleteMatch =
      (currentWinner === 'A' && gamesWonA + 1 >= 3) ||
      (currentWinner === 'B' && gamesWonB + 1 >= 3)

    return {
      gamesWonA,
      gamesWonB,
      currentGameNumber,
      currentWinner,
      willCompleteMatch,
    }
  }, [games, scoreA, scoreB])

  // Memoized handlers to prevent unnecessary re-renders
  const handleGameOverCancel = useCallback(() => {
    actorRef.send({ type: 'UNDO', game })
  }, [actorRef, game])

  const handleGameOverConfirm = useCallback(() => {
    actorRef.send({ type: 'CONFIRM_GAME_OVER' })
    const winner: 'A' | 'B' = scoreA > scoreB ? 'A' : 'B'

    // Emit gameCompleted event to LiveStore (fire-and-forget)
    store.commit(
      events.gameCompleted({
        gameId,
        matchId,
        winner,
        finalScoreA: scoreA,
        finalScoreB: scoreB,
        timestamp: new Date(),
      }),
    )

    // Update machine UI state
    matchActorRef?.send({ type: 'GAME_COMPLETED', gameId })

    // Check if match is complete and navigate
    if (gameStats.willCompleteMatch) {
      matchActorRef?.send({ type: 'END_MATCH' })
      void navigate({ to: '/match/$matchId/summary', params: { matchId } })
    }
  }, [
    actorRef,
    scoreA,
    scoreB,
    store,
    gameId,
    matchId,
    matchActorRef,
    gameStats.willCompleteMatch,
    navigate,
  ])

  const handleNextGameClick = useCallback(() => {
    updateNextGameSetupState({
      ...nextGameSetupState,
      isOpen: true,
    })
  }, [nextGameSetupState, updateNextGameSetupState])

  const handleNextGameCancel = useCallback(() => {
    updateNextGameSetupState({
      ...nextGameSetupState,
      isOpen: false,
    })
  }, [nextGameSetupState, updateNextGameSetupState])

  const handleNextGameStart = useCallback(
    async (config: {
      firstServingTeam: 'A' | 'B'
      players: { A1: string; A2: string; B1: string; B2: string }
      teamASide: 'R' | 'L'
      teamBSide: 'R' | 'L'
    }) => {
      // Hide the dialog immediately
      updateNextGameSetupState({
        ...nextGameSetupState,
        isOpen: false,
      })

      // Confirm game over and record result
      actorRef.send({ type: 'CONFIRM_GAME_OVER' })
      const winner: 'A' | 'B' = scoreA > scoreB ? 'A' : 'B'

      // Emit gameCompleted event to LiveStore
      store.commit(
        events.gameCompleted({
          gameId,
          matchId,
          winner,
          finalScoreA: scoreA,
          finalScoreB: scoreB,
          timestamp: new Date(),
        }),
      )

      matchActorRef?.send({ type: 'GAME_COMPLETED', gameId })

      // Create new game in LiveStore
      const newGameId = crypto.randomUUID()

      // Calculate next game number based on the highest game number
      const maxGameNumber =
        games.length > 0 ? Math.max(...games.map((g) => g.gameNumber)) : 0
      const newGameNumber = maxGameNumber + 1

      store.commit(
        events.gameStarted({
          gameId: newGameId,
          matchId,
          gameNumber: newGameNumber,
          firstServingTeam: config.firstServingTeam,
          firstServingPlayer: 1,
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          firstServingSide: config.teamASide || 'R',
          maxPoints: 15,
          winBy: 1,
          timestamp: new Date(),
        }),
      )

      // Give LiveStore a brief moment to propagate the event
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Update machine UI state and navigate
      matchActorRef?.send({ type: 'START_GAME', gameId: newGameId })
      void navigate({
        to: '/match/$matchId/game/$gameNumber',
        params: { matchId, gameNumber: String(newGameNumber) },
      })
    },
    [
      nextGameSetupState,
      updateNextGameSetupState,
      actorRef,
      scoreA,
      scoreB,
      store,
      gameId,
      matchId,
      matchActorRef,
      games,
      navigate,
    ],
  )

  const handleStartNewGame = useCallback(() => {
    updateNextGameSetupState({
      ...nextGameSetupState,
      isOpen: true,
    })
  }, [nextGameSetupState, updateNextGameSetupState])

  const handleEndMatch = useCallback(() => {
    matchActorRef?.send({ type: 'END_MATCH' })
    // Match is automatically persisted in IndexedDB
    void navigate({ to: '/' })
  }, [matchActorRef, navigate])

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-2 sm:p-4 max-w-full mx-auto bg-gradient-to-br from-base-200 to-base-300 min-h-full">
      {/* Match Progress Sidebar - Desktop */}
      {matchActorRef && (
        <div className="hidden lg:block lg:w-80 flex-shrink-0">
          <MatchProgress
            matchActorRef={matchActorRef}
            isGameInProgress={!isGameOver}
          />
        </div>
      )}

      {/* Main Game Area */}
      <div className="flex-1 min-w-0">
        <ScoreHeader
          gameId={gameId}
          matchId={matchId}
          firstServingTeam={firstServingTeam}
        />

        <ServeAnnouncement key={gameId} gameId={gameId} />

        <ScoreGrid
          actorRef={actorRef}
          gameId={gameId}
          firstServingTeam={firstServingTeam}
          playerLabels={matchPlayerRowLabels}
        />

        <RallyButtons actorRef={actorRef} gameId={gameId} />

        <ActionButtons actorRef={actorRef} gameId={gameId} />

        {isAwaitingConfirmation && !nextGameSetupState.isOpen && (
          <GameOverConfirmation
            gameId={gameId}
            winnerTeam={winnerTeam}
            willCompleteMatch={gameStats.willCompleteMatch}
            onCancel={handleGameOverCancel}
            onConfirm={handleGameOverConfirm}
            onNextGame={handleNextGameClick}
          />
        )}

        {nextGameSetupState.isOpen && (
          <NextGameSetup
            isFirstGame={false}
            lastWinner={gameStats.currentWinner}
            players={matchPlayers}
            onCancel={handleNextGameCancel}
            onStartGame={handleNextGameStart}
          />
        )}

        {isGameOver && !nextGameSetupState.isOpen && matchActorRef && (
          <MatchSummary
            matchActorRef={matchActorRef}
            currentWinner={winnerTeam}
            onStartNewGame={handleStartNewGame}
            onEndMatch={handleEndMatch}
          />
        )}
      </div>

      {/* Match Progress - Mobile (Collapsible) */}
      {matchActorRef && (
        <div className="lg:hidden">
          <details className="collapse collapse-arrow bg-base-200">
            <summary className="collapse-title font-medium">
              Match Progress (Game {gameStats.currentGameNumber})
            </summary>
            <div className="collapse-content">
              <MatchProgress
                matchActorRef={matchActorRef}
                isGameInProgress={!isGameOver}
              />
            </div>
          </details>
        </div>
      )}
    </div>
  )
}
