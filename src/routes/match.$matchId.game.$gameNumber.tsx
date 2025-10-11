import { useStore } from '@livestore/react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useSelector } from '@xstate/react'
import { useEffect, useMemo, useState } from 'react'
import { ActionButtons } from '../components/game/ActionButtons'
import { GameOverConfirmation } from '../components/game/GameOverConfirmation'
import { MatchProgress } from '../components/game/MatchProgress'
import { MatchSummary } from '../components/game/MatchSummary'
import { NextGameSetup } from '../components/game/NextGameSetup'
import { RallyButtons } from '../components/game/RallyButtons'
import { ScoreGrid } from '../components/game/ScoreGrid'
import { ScoreHeader } from '../components/game/ScoreHeader'
import { ServeAnnouncement } from '../components/game/ServeAnnouncement'
import { determineFirstServingTeam } from '../components/game/utils'
import { useLiveStoreMatch } from '../contexts/LiveStoreMatchContext'
import { useSquashGameMachine } from '../hooks/useSquashGameMachine'
import { events } from '../livestore/schema'
import { gamesByMatch$, matchById$ } from '../livestore/squash-queries'

export const Route = createFileRoute('/match/$matchId/game/$gameNumber')({
  component: GameRouteWrapper,
})

// Wrapper component that conditionally renders based on game actor existence
function GameRouteWrapper() {
  const { matchId, gameNumber } = Route.useParams()
  console.log('🎁 [GameRouteWrapper] Rendered with params:', {
    matchId,
    gameNumber,
  })
  const navigate = useNavigate({ from: Route.fullPath })
  const { store } = useStore()
  const { isLoading } = useLiveStoreMatch()

  // Query games from LiveStore
  const games = store.useQuery(gamesByMatch$(matchId))
  const gamesDetails = games.map((g) => ({
    id: g.id,
    gameNumber: g.gameNumber,
    status: g.status,
    winner: g.winner,
    scoreA: g.scoreA,
    scoreB: g.scoreB,
  }))
  console.log('🎮 [GameRouteWrapper] Games query result:', gamesDetails)
  console.log('🎮 [GameRouteWrapper] Unique game IDs:', [...new Set(games.map(g => g.id))])
  console.log('🎮 [GameRouteWrapper] Game numbers:', games.map(g => g.gameNumber))

  // Check if match is complete (3 games won)
  const gamesWonA = games.filter(
    (g) => g.status === 'completed' && g.winner === 'A',
  ).length
  const gamesWonB = games.filter(
    (g) => g.status === 'completed' && g.winner === 'B',
  ).length
  const isMatchComplete = gamesWonA >= 3 || gamesWonB >= 3
  console.log('🏁 [GameRouteWrapper] Match status:', {
    gamesWonA,
    gamesWonB,
    isMatchComplete,
  })

  // If match is complete, redirect to summary
  useEffect(() => {
    if (isMatchComplete) {
      console.log(
        '🏆 [GameRouteWrapper] Match complete, redirecting to summary',
      )
      navigate({ to: '/match/$matchId/summary', params: { matchId } })
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
  console.log('🎯 [GameRoute] Rendered with params:', {
    matchId,
    gameNumberStr,
    gameNumber,
    gameNumberType: typeof gameNumber,
    isNaN: Number.isNaN(gameNumber),
  })
  const navigate = useNavigate({ from: Route.fullPath })
  const { store } = useStore()
  const { actor: matchActorRef } = useLiveStoreMatch()
  const [showNextGameSetup, setShowNextGameSetup] = useState(false)

  // Query data from LiveStore
  const match = store.useQuery(matchById$(matchId))
  const games = store.useQuery(gamesByMatch$(matchId))

  // Build players from match data
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const matchPlayers = match
    ? {
        A1: {
          firstName: match.playerA1FirstName,
          lastName: match.playerA1LastName,
          fullName:
            `${match.playerA1FirstName} ${match.playerA1LastName}`.trim(),
        },
        A2: {
          firstName: match.playerA2FirstName,
          lastName: match.playerA2LastName,
          fullName:
            `${match.playerA2FirstName} ${match.playerA2LastName}`.trim(),
        },
        B1: {
          firstName: match.playerB1FirstName,
          lastName: match.playerB1LastName,
          fullName:
            `${match.playerB1FirstName} ${match.playerB1LastName}`.trim(),
        },
        B2: {
          firstName: match.playerB2FirstName,
          lastName: match.playerB2LastName,
          fullName:
            `${match.playerB2FirstName} ${match.playerB2LastName}`.trim(),
        },
        teamA: `${match.playerA1FirstName} ${match.playerA1LastName} & ${match.playerA2FirstName} ${match.playerA2LastName}`,
        teamB: `${match.playerB1FirstName} ${match.playerB1LastName} & ${match.playerB2FirstName} ${match.playerB2LastName}`,
      }
    : {
        A1: { firstName: 'A1', lastName: 'Player', fullName: 'A1 Player' },
        A2: { firstName: 'A2', lastName: 'Player', fullName: 'A2 Player' },
        B1: { firstName: 'B1', lastName: 'Player', fullName: 'B1 Player' },
        B2: { firstName: 'B2', lastName: 'Player', fullName: 'B2 Player' },
        teamA: 'Team A',
        teamB: 'Team B',
      }

  // Use squashGameMachine hook to create and manage machine
  const { actorRef, game } = useSquashGameMachine(
    matchId,
    gameNumber,
    matchPlayers,
  )
  const gameId = game.id

  // Only select state that the route component DIRECTLY uses for its own logic
  // Use a single selector to get multiple values efficiently
  const {
    isGameOver,
    isAwaitingConfirmation,
    scoreA,
    scoreB,
    teamAName,
    teamBName,
    grid,
  } = useSelector(actorRef, (s) => ({
    isGameOver: s.status === 'done', // XState v5: Use status === 'done' for final state
    isAwaitingConfirmation: s.matches('awaitingConfirmation'),
    scoreA: s.context.score.A,
    scoreB: s.context.score.B,
    teamAName: s.context.players.teamA,
    teamBName: s.context.players.teamB,
    grid: s.context.grid,
  }))

  // Computed values needed by route component for conditional logic
  const firstServingTeam = useMemo(
    () => determineFirstServingTeam(grid),
    [grid],
  )

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
    const currentWinner = scoreA > scoreB ? 'A' : 'B'
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
        {matchActorRef && (
          <ScoreHeader
            gameActorRef={actorRef}
            matchActorRef={matchActorRef}
            firstServingTeam={firstServingTeam}
          />
        )}

        <ServeAnnouncement actorRef={actorRef} />

        <ScoreGrid
          actorRef={actorRef}
          firstServingTeam={firstServingTeam}
          playerLabels={matchPlayerRowLabels}
        />

        <RallyButtons actorRef={actorRef} />

        <ActionButtons actorRef={actorRef} />

        {isAwaitingConfirmation && !showNextGameSetup && (
          <GameOverConfirmation
            actorRef={actorRef}
            winnerTeam={winnerTeam}
            willCompleteMatch={gameStats.willCompleteMatch}
            onCancel={() => actorRef.send({ type: 'UNDO' })}
            onConfirm={() => {
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

              // Update machine UI state
              matchActorRef?.send({ type: 'GAME_COMPLETED', gameId })

              // Check if match is complete and navigate
              if (gameStats.willCompleteMatch) {
                matchActorRef?.send({ type: 'END_MATCH' })
                navigate({ to: '/match/$matchId/summary', params: { matchId } })
              }
            }}
            onNextGame={() => {
              setShowNextGameSetup(true)
            }}
          />
        )}

        {showNextGameSetup && (() => {
          console.log('📺 [GameRoute] Rendering NextGameSetup modal, showNextGameSetup=', showNextGameSetup)
          return <NextGameSetup
            isFirstGame={false}
            lastWinner={gameStats.currentWinner as 'A' | 'B'}
            players={matchPlayers}
            onCancel={() => {
              console.log('❌ [NextGameSetup] onCancel called')
              setShowNextGameSetup(false)
            }}
            onStartGame={async (config) => {
              console.log(
                '🎬 [GameRoute] onStartGame callback START - config:',
                config,
              )

              // Hide the dialog immediately
              setShowNextGameSetup(false)

              // Confirm game over and record result
              actorRef.send({ type: 'CONFIRM_GAME_OVER' })
              const winner: 'A' | 'B' = scoreA > scoreB ? 'A' : 'B'

              console.log('📝 [NextGameSetup] Completing game:', {
                gameId,
                gameNumber,
                winner,
                scoreA,
                scoreB,
              })

              // Emit gameCompleted event to LiveStore
              await store.commit(
                events.gameCompleted({
                  gameId,
                  matchId,
                  winner,
                  finalScoreA: scoreA,
                  finalScoreB: scoreB,
                  timestamp: new Date(),
                }),
              )
              console.log('✅ [NextGameSetup] Game completed event committed')

              matchActorRef?.send({ type: 'GAME_COMPLETED', gameId })

              // Create new game in LiveStore
              const newGameId = crypto.randomUUID()
              
              // Calculate next game number based on the HIGHEST game number, not games.length
              // This is more robust in case games get out of sync
              const maxGameNumber = games.length > 0 
                ? Math.max(...games.map(g => g.gameNumber))
                : 0
              const newGameNumber = maxGameNumber + 1

              console.log('🆕 [NextGameSetup] Creating new game:', {
                newGameId,
                newGameNumber,
                maxGameNumber,
                gamesLength: games.length,
                existingGames: games.map(g => ({ id: g.id, gameNumber: g.gameNumber, status: g.status, winner: g.winner })),
              })
              
              console.log('📝 [NextGameSetup] About to commit gameStarted event with gameNumber:', newGameNumber)

              await store.commit(
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
              console.log('✅ [NextGameSetup] New game started event committed')

              // Give LiveStore a brief moment to propagate the event
              // This is a workaround for LiveStore query cache staleness
              await new Promise(resolve => setTimeout(resolve, 50))

              // Update machine UI state and navigate
              matchActorRef?.send({ type: 'START_GAME', gameId: newGameId })
              console.log('🚀 [NextGameSetup] About to navigate:', {
                to: '/match/$matchId/game/$gameNumber',
                params: { matchId, gameNumber: String(newGameNumber) },
                matchId,
                newGameNumber,
                newGameId,
              })
              const navigateResult = navigate({
                to: '/match/$matchId/game/$gameNumber',
                params: { matchId, gameNumber: String(newGameNumber) },
              })
              console.log(
                '✅ [NextGameSetup] Navigation called, result:',
                navigateResult,
              )
            }}
          />
        })()}

        {isGameOver && !showNextGameSetup && matchActorRef && (
          <MatchSummary
            matchActorRef={matchActorRef}
            currentWinner={winnerTeam}
            onStartNewGame={() => {
              setShowNextGameSetup(true)
            }}
            onEndMatch={() => {
              matchActorRef.send({ type: 'END_MATCH' })
              // Match is automatically persisted in IndexedDB
              navigate({ to: '/' })
            }}
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
