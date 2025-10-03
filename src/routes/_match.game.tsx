import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { MatchMachineContext } from '../contexts/MatchMachineContext'
import { useGameState } from '../components/game/useGameState'
import { determineFirstServingTeam, getOrderedRows } from '../components/game/utils'
import { ScoreHeader } from '../components/game/ScoreHeader'
import { ServeAnnouncement } from '../components/game/ServeAnnouncement'
import { ScoreGrid } from '../components/game/ScoreGrid'
import { RallyButtons } from '../components/game/RallyButtons'
import { ActionButtons } from '../components/game/ActionButtons'
import { GameOverConfirmation } from '../components/game/GameOverConfirmation'
import { MatchSummary } from '../components/game/MatchSummary'

export const Route = createFileRoute('/_match/game')({
  component: GameRouteWrapper,
})

// Wrapper component that conditionally renders based on game actor existence
function GameRouteWrapper() {
  const navigate = useNavigate()
  const matchData = MatchMachineContext.useSelector((s) => ({
    currentGameActor: s.context.currentGameActor,
    games: s.context.games,
  }))
  
  const gameActor = matchData.currentGameActor
  
  // If no game actor, redirect to setup
  useEffect(() => {
    if (!gameActor) {
      navigate({ to: '/setup' })
    }
  }, [gameActor, navigate])
  
  // Conditionally render GameRoute only when actor exists
  if (!gameActor) {
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
  } = useGameState(gameActor)

  // Determine which team served first
  const firstServingTeam = determineFirstServingTeam(grid)
  const rows = getOrderedRows(firstServingTeam)

  // Display teams in order: first-serving team on left/top
  const topTeam = firstServingTeam === 'A' ? 'teamA' : 'teamB'
  const bottomTeam = firstServingTeam === 'A' ? 'teamB' : 'teamA'
  const topScore = firstServingTeam === 'A' ? scoreA : scoreB
  const bottomScore = firstServingTeam === 'A' ? scoreB : scoreA
  const winnerTeam = scoreA > scoreB ? players.teamA : players.teamB

  return (
    <div className="p-4 max-w-full mx-auto">
      <ScoreHeader
        topTeam={topTeam}
        bottomTeam={bottomTeam}
        topScore={topScore}
        bottomScore={bottomScore}
        players={players}
      />

      <ServeAnnouncement announcement={announcement} />

      <ScoreGrid
        rows={rows}
        players={players}
        grid={grid}
        serverRowKey={serverRowKey}
        scoreA={scoreA}
        scoreB={scoreB}
        serverTeam={server.team}
        handIndex={server.handIndex}
        isGameOver={isGameOver}
        onToggleServeSide={() => gameActor.send({ type: 'TOGGLE_SERVE_SIDE' })}
      />

      <RallyButtons
        firstServingTeam={firstServingTeam}
        players={players}
        isDisabled={isGameOver || isAwaitingConfirmation}
        onRallyWon={(winner) =>
          gameActor.send({ type: 'RALLY_WON', winner })
        }
      />

      <ActionButtons
        canLet={!isGameOver && !isIdle && !isAwaitingConfirmation}
        canUndo={history.length > 0}
        onLet={() => gameActor.send({ type: 'LET' })}
        onUndo={() => gameActor.send({ type: 'UNDO' })}
      />

      {isAwaitingConfirmation && (
        <GameOverConfirmation
          winnerTeam={winnerTeam}
          scoreA={scoreA}
          scoreB={scoreB}
          onCancel={() => gameActor.send({ type: 'UNDO' })}
          onConfirm={() => {
            gameActor.send({ type: 'CONFIRM_GAME_OVER' })
            const finalScore = { A: scoreA, B: scoreB }
            const winner: 'A' | 'B' = scoreA > scoreB ? 'A' : 'B'
            matchActorRef.send({ type: 'GAME_COMPLETED', winner, finalScore })
          }}
        />
      )}

      {isGameOver && (
        <MatchSummary
          games={matchGames}
          players={players}
          currentGameNumber={matchGames.length}
          currentWinner={winnerTeam}
          onStartNewGame={() => {
            const lastGame = matchGames[matchGames.length - 1]
            const nextServingTeam: 'A' | 'B' = lastGame.winner === 'A' ? 'B' : 'A'
            matchActorRef.send({
              type: 'START_NEW_GAME',
              firstServingTeam: nextServingTeam,
            })
          }}
          onEndMatch={() => {
            matchActorRef.send({ type: 'END_MATCH' })
            navigate({ to: '/' })
          }}
        />
      )}
    </div>
  )
}
