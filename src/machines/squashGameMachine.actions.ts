import { events } from '../livestore/schema'
import { flip } from './squashMachine.types'
import type {
  PlayerNameMap,
  PlayerRow,
  Score,
  Server,
  Side,
  Team,
} from './squashMachine.types'
import type { Context, Game } from './squashGameMachine'

// ===== Helper Functions =====
// Re-export helpers for convenience
export { flip }

export const otherTeam = (team: Team): Team => (team === 'A' ? 'B' : 'A')

// ===== Core Rally Logic =====
/**
 * Pure function that processes a single rally and returns the next game state.
 * Simplified - no longer manages grid (now handled in ScoreGrid component).
 */
type RallyState = {
  score: Score
  server: Server
  firstHandUsed: boolean
}

const processRally = (state: RallyState, winner: Team): RallyState => {
  const cur = state.server

  // Server won the rally
  if (winner === cur.team) {
    const nextScore: Score = {
      ...state.score,
      [winner]: state.score[winner] + 1,
    }
    const nextServer: Server = { ...cur, side: flip(cur.side) }

    return {
      score: nextScore,
      server: nextServer,
      firstHandUsed: state.firstHandUsed,
    }
  }

  // Receiving team won
  const nextScore: Score = {
    A: winner === 'A' ? state.score.A + 1 : state.score.A,
    B: winner === 'B' ? state.score.B + 1 : state.score.B,
  }

  // First-hand exception at 0-0
  const isStartOfGame = state.score.A === 0 && state.score.B === 0
  if (isStartOfGame && !state.firstHandUsed) {
    const t = otherTeam(cur.team)
    const nextServer: Server = {
      team: t,
      player: 1,
      side: 'R',
      handIndex: 0,
    }

    return {
      score: nextScore,
      server: nextServer,
      firstHandUsed: true,
    }
  }

  // First hand lost (not start of game)
  if (cur.handIndex === 0 && !state.firstHandUsed) {
    const t = otherTeam(cur.team)
    const nextServer: Server = {
      team: t,
      player: 1,
      side: 'R',
      handIndex: 0,
    }

    return {
      score: nextScore,
      server: nextServer,
      firstHandUsed: true,
    }
  }

  // First hand lost, partner serves (second hand)
  if (cur.handIndex === 0) {
    const partner: Server = {
      team: cur.team,
      player: cur.player === 1 ? 2 : 1,
      side: flip(cur.side),
      handIndex: 1,
    }

    return {
      score: nextScore,
      server: partner,
      firstHandUsed: true,
    }
  }

  // Second hand lost - hand-out to other team
  const t = otherTeam(cur.team)
  const nextServer: Server = {
    team: t,
    player: 1,
    side: 'R',
    handIndex: 0,
  }

  return {
    score: nextScore,
    server: nextServer,
    firstHandUsed: true,
  }
}

// ===== Snapshot for History =====
export type Snapshot = {
  score: Score
  server: Server
  firstHandUsed: boolean
}

// ===== Actions =====
export const configureGameState = (
  _context: Context,
  params: {
    game: Game
    players: PlayerNameMap
    rallyCount: number
  },
): Partial<Context> => {
  const { game, players, rallyCount } = params

  // Read current server state directly from game table (no replay needed!)
  const server: Server = {
    team: game.currentServerTeam as Team,
    player: game.currentServerPlayer as PlayerRow,
    side: game.currentServerSide as Side,
    handIndex: game.currentServerHandIndex as 0 | 1,
  }

  return {
    gameId: game.id,
    matchId: game.matchId,
    maxPoints: game.maxPoints,
    winBy: game.winBy,
    players,
    score: { A: game.scoreA, B: game.scoreB },
    server,
    firstHandUsed: game.firstHandUsed,
    history: [],
    rallyCount,
  }
}

export const snapshot = (context: Context): Partial<Context> => ({
  history: [
    ...context.history,
    {
      score: { ...context.score },
      server: { ...context.server },
      firstHandUsed: context.firstHandUsed,
    },
  ],
})

export const toggleServeSide = (context: Context): Partial<Context> => {
  if (context.server.handIndex !== 0) return {}

  const newSide = flip(context.server.side)

  return {
    server: { ...context.server, side: newSide },
  }
}

export const rallyWon = (
  context: Context,
  params: { winner: Team },
): Partial<Context> => {
  const { winner } = params
  const rallyNumber = context.rallyCount + 1

  // Emit LiveStore rallyWon event
  if (context.store && context.gameId) {
    context.store.commit(
      events.rallyWon({
        rallyId: crypto.randomUUID(),
        gameId: context.gameId,
        rallyNumber,
        winner,
        serverTeam: context.server.team,
        serverPlayer: context.server.player,
        serverSide: context.server.side,
        serverHandIndex: context.server.handIndex,
        scoreABefore: context.score.A,
        scoreBBefore: context.score.B,
        scoreAAfter: winner === 'A' ? context.score.A + 1 : context.score.A,
        scoreBAfter: winner === 'B' ? context.score.B + 1 : context.score.B,
        timestamp: new Date(),
      }),
    )
  }

  // Process rally using pure function
  const nextState = processRally(
    {
      score: context.score,
      server: context.server,
      firstHandUsed: context.firstHandUsed,
    },
    winner,
  )

  return {
    ...nextState,
    rallyCount: rallyNumber,
  }
}

export const undoOnce = (context: Context): Partial<Context> => {
  const prev = context.history.at(-1)
  if (!prev) return {}

  // Emit LiveStore rallyUndone event
  if (context.store && context.gameId && context.rallyCount > 0) {
    context.store.commit(
      events.rallyUndone({
        gameId: context.gameId,
        rallyId: '', // LiveStore materializer will find the last rally
        timestamp: new Date(),
      }),
    )
  }

  return {
    score: prev.score,
    server: prev.server,
    firstHandUsed: prev.firstHandUsed,
    history: context.history.slice(0, -1),
    rallyCount: Math.max(0, context.rallyCount - 1),
  }
}

export const resetGameState = (): Partial<Context> => ({
  gameId: null,
  matchId: null,
  maxPoints: 15,
  winBy: 1,
  players: {
    A1: { firstName: 'A1', lastName: 'Player', fullName: 'A1 Player' },
    A2: { firstName: 'A2', lastName: 'Player', fullName: 'A2 Player' },
    B1: { firstName: 'B1', lastName: 'Player', fullName: 'B1 Player' },
    B2: { firstName: 'B2', lastName: 'Player', fullName: 'B2 Player' },
    teamA: 'Team A',
    teamB: 'Team B',
  },
  score: { A: 0, B: 0 },
  server: {
    team: 'A' as Team,
    player: 1 as PlayerRow,
    side: 'R' as Side,
    handIndex: 0 as const,
  },
  firstHandUsed: false,
  history: [],
  rallyCount: 0,
})

// ===== Guards =====
export const gameEnded = (
  _: unknown,
  params: {
    score: Score
    maxPoints: number
    winBy: number
  },
) => {
  const { score, maxPoints, winBy } = params
  const { A, B } = score
  if (A < maxPoints && B < maxPoints) return false
  return Math.abs(A - B) >= winBy
}
