import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ActionButtons } from '../components/game/ActionButtons'
import { GameOverConfirmation } from '../components/game/GameOverConfirmation'
import { MatchProgress } from '../components/game/MatchProgress'
import { MatchSummary } from '../components/game/MatchSummary'
import { NextGameSetup } from '../components/game/NextGameSetup'
import { RallyButtons } from '../components/game/RallyButtons'
import { ScoreGrid } from '../components/game/ScoreGrid'
import { ScoreHeader } from '../components/game/ScoreHeader'
import { ServeAnnouncement } from '../components/game/ServeAnnouncement'
import { useGameState } from '../components/game/useGameState'
import {
  determineFirstServingTeam,
  getOrderedRows,
} from '../components/game/utils'
import { MatchMachineContext } from '../contexts/MatchMachineContext'
import type { PlayerName } from '../machines/squashMachine'

export const Route = createFileRoute('/_match/game')({
  component: GameRouteWrapper,
})

// Wrapper component that conditionally renders based on game actor existence
function GameRouteWrapper() {
  const navigate = useNavigate()
  const matchData = MatchMachineContext.useSelector((s) => ({
    currentGameActor: s.context.currentGameActor,
    games: s.context.games,
    isMatchComplete: s.matches('matchComplete'),
  }))

  const gameActor = matchData.currentGameActor

  // If match is complete, redirect to summary
  useEffect(() => {
    if (matchData.isMatchComplete) {
      navigate({ to: '/summary' })
    }
  }, [matchData.isMatchComplete, navigate])

  // If no game actor, redirect to setup
  useEffect(() => {
    if (!gameActor && !matchData.isMatchComplete) {
      navigate({ to: '/setup', search: {} })
    }
  }, [gameActor, matchData.isMatchComplete, navigate])

  // Conditionally render GameRoute only when actor exists
  if (!gameActor || matchData.isMatchComplete) {
    return <div className="p-4">Loading...</div>
  }

  return <GameRoute gameActor={gameActor} matchGames={matchData.games} />
}

// Main component that requires a game actor
function GameRoute({
  gameActor,
  matchGames,
}: {
  gameActor: any
  matchGames: Array<any>
}) {
  const navigate = useNavigate()
  const matchActorRef = MatchMachineContext.useActorRef()
  const [showNextGameSetup, setShowNextGameSetup] = useState(false)
  const [matchStartTime] = useState(Date.now())

  // Use custom hook to get all game state
  const {
    scoreA,
    scoreB,
    grid,
    players,
    server,
    serverRowKey,
    history,
    isGameOver,
    isAwaitingConfirmation,
    isIdle,
    announcement,
    playerRowLabels,
  } = useGameState(gameActor)

  // Get match context for next game setup
  const matchPlayers = MatchMachineContext.useSelector((s) => s.context.players)

  // Determine which team served first
  const firstServingTeam = determineFirstServingTeam(grid)
  const rows = getOrderedRows(firstServingTeam)

  // Display teams in order: first-serving team on left/top
  const topTeam = firstServingTeam === 'A' ? 'teamA' : 'teamB'
  const bottomTeam = firstServingTeam === 'A' ? 'teamB' : 'teamA'
  const topScore = firstServingTeam === 'A' ? scoreA : scoreB
  const bottomScore = firstServingTeam === 'A' ? scoreB : scoreA
  const winnerTeam = scoreA > scoreB ? players.teamA : players.teamB

  // Strictly typed team name map for ScoreHeader
  const teamNames: Record<'teamA' | 'teamB', string> = {
    teamA: players.teamA,
    teamB: players.teamB,
  }

  // Calculate games won
  const gamesWonA = matchGames.filter((g) => g.winner === 'A').length
  const gamesWonB = matchGames.filter((g) => g.winner === 'B').length
  const currentGameNumber = matchGames.length + 1

  // Check if this game will complete the match (one team will have 3 wins)
  const currentWinner = scoreA > scoreB ? 'A' : 'B'
  const willCompleteMatch =
    (currentWinner === 'A' && gamesWonA + 1 >= 3) ||
    (currentWinner === 'B' && gamesWonB + 1 >= 3)

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-2 sm:p-4 max-w-full mx-auto bg-gradient-to-br from-base-200 to-base-300 min-h-full">
      {/* Match Progress Sidebar - Desktop */}
      <div className="hidden lg:block lg:w-80 flex-shrink-0">
        <MatchProgress
          games={matchGames}
          currentGameNumber={currentGameNumber}
          players={{ teamA: matchPlayers.teamA, teamB: matchPlayers.teamB }}
          matchStartTime={matchStartTime}
          isGameInProgress={!isGameOver}
        />
      </div>

      {/* Main Game Area */}
      <div className="flex-1 min-w-0">
        <ScoreHeader
          topTeam={topTeam}
          bottomTeam={bottomTeam}
          topScore={topScore}
          bottomScore={bottomScore}
          players={teamNames}
          currentGameNumber={currentGameNumber}
          gamesWonA={gamesWonA}
          gamesWonB={gamesWonB}
        />

        <ServeAnnouncement announcement={announcement} />

        <ScoreGrid
          rows={rows}
          players={playerRowLabels}
          grid={grid}
          serverRowKey={serverRowKey}
          scoreA={scoreA}
          scoreB={scoreB}
          serverTeam={server.team}
          handIndex={server.handIndex}
          isGameOver={isGameOver}
          onToggleServeSide={() =>
            gameActor.send({ type: 'TOGGLE_SERVE_SIDE' })
          }
        />

        <RallyButtons
          firstServingTeam={firstServingTeam}
          players={{
            A1: players.A1.fullName,
            A2: players.A2.fullName,
            B1: players.B1.fullName,
            B2: players.B2.fullName,
          }}
          isDisabled={isGameOver || isAwaitingConfirmation}
          onRallyWon={(winner) => gameActor.send({ type: 'RALLY_WON', winner })}
        />

        <ActionButtons
          canLet={!isGameOver && !isIdle && !isAwaitingConfirmation}
          canUndo={history.length > 0}
          onLet={() => gameActor.send({ type: 'LET' })}
          onUndo={() => gameActor.send({ type: 'UNDO' })}
        />

        {isAwaitingConfirmation && !showNextGameSetup && (
          <GameOverConfirmation
            winnerTeam={winnerTeam}
            scoreA={scoreA}
            scoreB={scoreB}
            willCompleteMatch={willCompleteMatch}
            onCancel={() => gameActor.send({ type: 'UNDO' })}
            onConfirm={() => {
              gameActor.send({ type: 'CONFIRM_GAME_OVER' })
              const finalScore = { A: scoreA, B: scoreB }
              const winner: 'A' | 'B' = scoreA > scoreB ? 'A' : 'B'
              matchActorRef.send({ type: 'GAME_COMPLETED', winner, finalScore })

              // If match is complete, navigate to summary immediately
              if (willCompleteMatch) {
                navigate({ to: '/summary' })
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
            lastWinner={scoreA > scoreB ? 'A' : 'B'}
            players={matchPlayers}
            onCancel={() => setShowNextGameSetup(false)}
            onStartGame={(config) => {
              // Confirm game over and record result
              gameActor.send({ type: 'CONFIRM_GAME_OVER' })
              const finalScore = { A: scoreA, B: scoreB }
              const winner: 'A' | 'B' = scoreA > scoreB ? 'A' : 'B'
              matchActorRef.send({ type: 'GAME_COMPLETED', winner, finalScore })

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
              matchActorRef.send({
                type: 'START_NEW_GAME',
                firstServingTeam: config.firstServingTeam,
                players: reordered,
                teamASide: config.teamASide,
                teamBSide: config.teamBSide,
              })
              setShowNextGameSetup(false)
            }}
          />
        )}

        {isGameOver && !showNextGameSetup && (
          <MatchSummary
            games={matchGames}
            players={{ teamA: players.teamA, teamB: players.teamB }}
            currentGameNumber={matchGames.length}
            currentWinner={winnerTeam}
            onStartNewGame={() => {
              setShowNextGameSetup(true)
            }}
            onEndMatch={() => {
              matchActorRef.send({ type: 'END_MATCH' })
              navigate({ to: '/' })
            }}
          />
        )}
      </div>

      {/* Match Progress - Mobile (Collapsible) */}
      <div className="lg:hidden">
        <details className="collapse collapse-arrow bg-base-200">
          <summary className="collapse-title font-medium">
            Match Progress (Game {currentGameNumber})
          </summary>
          <div className="collapse-content">
            <MatchProgress
              games={matchGames}
              currentGameNumber={currentGameNumber}
              players={matchPlayers}
              matchStartTime={matchStartTime}
              isGameInProgress={!isGameOver}
            />
          </div>
        </details>
      </div>
    </div>
  )
}
