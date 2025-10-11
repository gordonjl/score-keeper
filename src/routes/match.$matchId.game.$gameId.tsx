import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from '@xstate/react'
import { useLiveStoreMatch } from '../contexts/LiveStoreMatchContext'
import { useSquashGameMachine } from '../hooks/useSquashGameMachine'
import { useMatchSelectors } from '../hooks/useMatchSelectors'
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
import { getCurrentGameId } from '../machines/matchMachine'
import type { GameResult } from '../machines/matchMachine'
import type { PlayerName } from '../machines/squashMachine'

export const Route = createFileRoute('/match/$matchId/game/$gameId')({
  component: GameRouteWrapper,
})

// Wrapper component that conditionally renders based on game actor existence
function GameRouteWrapper() {
  const { matchId } = Route.useParams()
  const navigate = useNavigate({ from: Route.fullPath })
  const { actor, isLoading } = useLiveStoreMatch()

  // Use selectors for reactive match state
  const { games, isMatchComplete } = actor
    ? useMatchSelectors(actor)
    : { games: [], isMatchComplete: false }

  // If match is complete, redirect to summary
  useEffect(() => {
    if (isMatchComplete) {
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

  // GameRoute maintains a stable machine that handles gameId changes via events
  // No need to remount - the machine resets itself when route params change
  return <GameRoute matchGames={games} />
}

// Main component that requires a game actor
function GameRoute({ matchGames }: { matchGames: Array<GameResult> }) {
  const { matchId, gameId } = Route.useParams()
  const navigate = useNavigate({ from: Route.fullPath })
  const { actor: matchActorRef } = useLiveStoreMatch()
  const [showNextGameSetup, setShowNextGameSetup] = useState(false)

  // Use selector for reactive match players
  const matchPlayers = matchActorRef
    ? useMatchSelectors(matchActorRef).players
    : {
        A1: { firstName: 'A1', lastName: 'Player', fullName: 'A1 Player' },
        A2: { firstName: 'A2', lastName: 'Player', fullName: 'A2 Player' },
        B1: { firstName: 'B1', lastName: 'Player', fullName: 'B1 Player' },
        B2: { firstName: 'B2', lastName: 'Player', fullName: 'B2 Player' },
        teamA: 'Team A',
        teamB: 'Team B',
      }

  // Use squashGameMachine hook to create and manage machine
  const { actorRef } = useSquashGameMachine(gameId, matchPlayers)

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
    isGameOver: s.matches('complete'),
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
    const gamesWonA = matchGames.filter(
      (g) => g.status === 'completed' && g.winner === 'A',
    ).length
    const gamesWonB = matchGames.filter(
      (g) => g.status === 'completed' && g.winner === 'B',
    ).length
    const currentGameNumber =
      matchGames.length > 0
        ? Math.max(...matchGames.map((g) => g.gameNumber))
        : 1
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
  }, [matchGames, scoreA, scoreB])

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
              const finalScore = { A: scoreA, B: scoreB }
              const winner: 'A' | 'B' = scoreA > scoreB ? 'A' : 'B'
              matchActorRef?.send({
                type: 'GAME_COMPLETED',
                winner,
                finalScore,
              })

              // If match is complete, navigate to summary immediately
              if (gameStats.willCompleteMatch) {
                navigate({ to: '/match/$matchId/summary', params: { matchId } })
              }
            }}
            onNextGame={() => {
              setShowNextGameSetup(true)
            }}
          />
        )}

        {showNextGameSetup && (
          <NextGameSetup
            isFirstGame={false}
            lastWinner={gameStats.currentWinner as 'A' | 'B'}
            players={matchPlayers}
            onCancel={() => setShowNextGameSetup(false)}
            onStartGame={(config) => {
              // Confirm game over and record result
              actorRef.send({ type: 'CONFIRM_GAME_OVER' })
              const finalScore = { A: scoreA, B: scoreB }
              const winner: 'A' | 'B' = scoreA > scoreB ? 'A' : 'B'
              matchActorRef?.send({
                type: 'GAME_COMPLETED',
                winner,
                finalScore,
              })

              // Start new game immediately
              const pick = (
                name: string,
                p1: PlayerName,
                p2: PlayerName,
              ): PlayerName => (name === p1.fullName ? p1 : p2)
              const reordered = {
                A1: pick(config.players.A1, matchPlayers.A1, matchPlayers.A2),
                A2: pick(config.players.A2, matchPlayers.A1, matchPlayers.A2),
                B1: pick(config.players.B1, matchPlayers.B1, matchPlayers.B2),
                B2: pick(config.players.B2, matchPlayers.B1, matchPlayers.B2),
              }
              matchActorRef?.send({
                type: 'START_NEW_GAME',
                firstServingTeam: config.firstServingTeam,
                players: reordered,
                teamASide: config.teamASide,
                teamBSide: config.teamBSide,
              })

              // Get the new game ID and navigate to it
              if (matchActorRef) {
                const snapshot = matchActorRef.getSnapshot()
                const newGameId = getCurrentGameId(snapshot)
                if (newGameId) {
                  navigate({
                    to: '/match/$matchId/game/$gameId',
                    params: { matchId, gameId: newGameId },
                  })
                }
              }

              setShowNextGameSetup(false)
            }}
          />
        )}

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
