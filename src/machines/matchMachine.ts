import { assign, sendTo, setup, spawnChild } from 'xstate'
import { events } from '../livestore/schema'
import { squashMachine } from './squashMachine'
import type { MatchId } from '../db/types'
import type { PlayerName, PlayerNameMap, Team } from './squashMachine'

// Match-level types
export type GameResult = {
  winner: Team | null // null if game is in progress
  finalScore: { A: number; B: number } | null // null if game is in progress
  gameNumber: number
  status: 'in_progress' | 'completed'
}

export type MatchContext = {
  players: PlayerNameMap
  teamAFirstServer: 1 | 2
  teamBFirstServer: 1 | 2
  games: Array<GameResult>
  matchId: MatchId | null // Track match ID for persistence
  store: any | null // LiveStore instance for event emission
}

// Derived selector: currentGameId is games.length when in inGame state, null otherwise
export const getCurrentGameId = (snapshot: {
  value: unknown
  context: MatchContext
}): string | null => {
  // Check if we're in the inGame state
  if (typeof snapshot.value === 'string' && snapshot.value === 'inGame') {
    return `${snapshot.context.games.length}`
  }
  if (
    typeof snapshot.value === 'object' &&
    snapshot.value !== null &&
    'inGame' in snapshot.value
  ) {
    return `${snapshot.context.games.length}`
  }
  return null
}

export type MatchEvents =
  | {
      type: 'SETUP_MATCH'
      players: PlayerNameMap
      teamAFirstServer: 1 | 2
      teamBFirstServer: 1 | 2
    }
  | {
      type: 'START_NEW_GAME'
      firstServingTeam: Team
      players?: {
        A1: PlayerName
        A2: PlayerName
        B1: PlayerName
        B2: PlayerName
      }
      teamASide?: 'R' | 'L'
      teamBSide?: 'R' | 'L'
    }
  | {
      type: 'GAME_COMPLETED'
      winner: Team
      finalScore: { A: number; B: number }
    }
  | { type: 'END_MATCH' }
  | { type: 'RESET' }

export const matchMachine = setup({
  types: {
    context: {} as MatchContext,
    events: {} as MatchEvents,
    input: {} as {
      matchId?: MatchId
      store?: any
      // Restoration data from LiveStore
      existingGames?: Array<GameResult>
      hasPlayers?: boolean
      currentGameId?: string
    },
  },
  actors: {
    squashGame: squashMachine,
  },
  actions: {
    setupMatch: assign(({ event, context }) => {
      if (event.type !== 'SETUP_MATCH') return {}

      // Emit LiveStore event
      if (context.store && context.matchId) {
        context.store.commit(
          events.matchSetup({
            matchId: context.matchId,
            playerA1: {
              firstName: event.players.A1.firstName,
              lastName: event.players.A1.lastName,
            },
            playerA2: {
              firstName: event.players.A2.firstName,
              lastName: event.players.A2.lastName,
            },
            playerB1: {
              firstName: event.players.B1.firstName,
              lastName: event.players.B1.lastName,
            },
            playerB2: {
              firstName: event.players.B2.firstName,
              lastName: event.players.B2.lastName,
            },
            teamAFirstServer: event.teamAFirstServer,
            teamBFirstServer: event.teamBFirstServer,
            timestamp: new Date(),
          }),
        )
      }

      return {
        players: event.players,
        teamAFirstServer: event.teamAFirstServer,
        teamBFirstServer: event.teamBFirstServer,
        games: [],
        matchId: context.matchId, // Preserve matchId
        store: context.store, // Preserve store
      }
    }),
    spawnGameActor: spawnChild('squashGame', {
      id: ({ context }) => `${context.games.length + 1}`,
      syncSnapshot: true,
      input: ({ context }) => ({
        matchId: context.matchId ?? undefined,
        gameId: `${context.games.length + 1}`, // Just use the game number
        store: context.store ?? undefined,
      }),
    }),
    updatePlayers: assign(({ context, event }) => {
      if (event.type !== 'START_NEW_GAME') return {}

      // Use updated player positions if provided, otherwise use existing
      const players = event.players
        ? {
            A1: event.players.A1,
            A2: event.players.A2,
            B1: event.players.B1,
            B2: event.players.B2,
            teamA: `${event.players.A1.fullName} & ${event.players.A2.fullName}`,
            teamB: `${event.players.B1.fullName} & ${event.players.B2.fullName}`,
          }
        : context.players
      return {
        players,
      }
    }),
    setupGameTeams: sendTo(
      (_, params: { gameId: string }) => params.gameId,
      (_, params: { players: PlayerNameMap }) => ({
        type: 'SETUP_TEAMS',
        players: params.players,
      }),
    ),
    startGame: sendTo(
      (_, params: { gameId: string }) => params.gameId,
      (
        _,
        params: {
          firstServingTeam: Team
          teamASide?: 'R' | 'L'
          teamBSide?: 'R' | 'L'
        },
      ) => {
        // Determine which side the first server starts from
        const firstServerSide =
          params.firstServingTeam === 'A'
            ? params.teamASide || 'R'
            : params.teamBSide || 'R'

        return {
          type: 'START_GAME',
          firstServer: {
            team: params.firstServingTeam,
            player: 1, // Always player 1 since we reordered
            side: firstServerSide,
          },
          maxPoints: 15,
          winBy: 1,
        }
      },
    ),
    createGameEntry: assign(({ context, event }) => {
      if (event.type !== 'START_NEW_GAME') return {}

      // Emit LiveStore gameStarted event
      if (context.store && context.matchId) {
        const gameNumber = context.games.length + 1
        // Generate globally unique gameId
        const gameId = crypto.randomUUID()

        // Determine first server side
        const firstServerSide = event.teamASide || event.teamBSide || 'R'

        context.store.commit(
          events.gameStarted({
            gameId,
            matchId: context.matchId,
            gameNumber,
            firstServingTeam: event.firstServingTeam,
            firstServingPlayer: 1, // Always player 1 after reordering
            firstServingSide: firstServerSide,
            maxPoints: 15,
            winBy: 1,
            timestamp: new Date(),
          }),
        )
      }

      return {
        games: [
          ...context.games,
          {
            winner: null,
            finalScore: null,
            gameNumber: context.games.length + 1,
            status: 'in_progress' as const,
          },
        ],
      }
    }),
    recordGameResult: assign(({ context, event }) => {
      if (event.type !== 'GAME_COMPLETED') return {}

      // Emit LiveStore gameCompleted event
      if (context.store && context.matchId) {
        const gameId = `${context.games.length}` // Just use the game number as string

        context.store.commit(
          events.gameCompleted({
            gameId,
            matchId: context.matchId,
            winner: event.winner,
            finalScoreA: event.finalScore.A,
            finalScoreB: event.finalScore.B,
            timestamp: new Date(),
          }),
        )
      }

      // Update the last game (which should be in_progress) with the result
      const updatedGames = [...context.games]
      const lastGameIndex = updatedGames.length - 1
      if (lastGameIndex >= 0) {
        updatedGames[lastGameIndex] = {
          ...updatedGames[lastGameIndex],
          winner: event.winner,
          finalScore: event.finalScore,
          status: 'completed' as const,
        }
      }
      return {
        games: updatedGames,
      }
    }),
  },
  guards: {
    isMatchComplete: ({ context, event }) => {
      if (event.type !== 'GAME_COMPLETED') return false

      // Count current wins from completed games only
      const gamesWonA = context.games.filter(
        (g) => g.status === 'completed' && g.winner === 'A',
      ).length
      const gamesWonB = context.games.filter(
        (g) => g.status === 'completed' && g.winner === 'B',
      ).length

      // Check if adding this game will result in 3 wins
      const newGamesWonA = event.winner === 'A' ? gamesWonA + 1 : gamesWonA
      const newGamesWonB = event.winner === 'B' ? gamesWonB + 1 : gamesWonB

      return newGamesWonA >= 3 || newGamesWonB >= 3
    },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5SwI4FcCGsAWBaCA9mgEYA2cAxAKoByAIgPIDaADALqKgAOBsAlgBc+BAHacQAD0QBmAOwA6AIwsArABYAbAA5ZKgDQgAnjI0r5LAJxzTAJhU6tFlhoC+Lg6kw58RMpQBKAKIAyoEAKqwcSCA8-EKi4lIIuBqK5po6+kaIKorS8tJaNkWyug4Wim4e6Fh4hCTksPJ8EOQUoWFUAAoA+mGBAIIAssGR4rGCwmLRSTYa+bIW2roGxghqWlryThpzKnblzlUgnrU+DXDyAE5gGBCG7WED-mE9AOLDgWPRE-HToEl1Pl9tI1HIsmsNlsdnsDrJHEd3Cdat56n4mnwRF1SBgHv4BgAZAkATR6AHUGDRvtxeJMEjMcvN5LIWNJFHZVog8ix5CpjqdUb5Gs0sTiHgBhAkASXFAGkev4GGTqTFaX9EogtIoFKyYRDEDYbAoNIsWUb7PCdvyUXUhZdMdjcRQCeEVb8phqEA55FppDZWez9etdttlNrFCoWIdXEiBbaLk0AMbYMCJgDWFDdao9DIQQN5NlB4M5XrUvOtXnj6PkydTGaYii */
  id: 'matchMachine',
  initial: 'idle',
  context: ({ input }) => ({
    players: {
      A1: { firstName: '', lastName: '', fullName: '' },
      A2: { firstName: '', lastName: '', fullName: '' },
      B1: { firstName: '', lastName: '', fullName: '' },
      B2: { firstName: '', lastName: '', fullName: '' },
      teamA: 'Team A',
      teamB: 'Team B',
    },
    teamAFirstServer: 1,
    teamBFirstServer: 1,
    games: input.existingGames ?? [], // Restore from LiveStore
    matchId: input.matchId ?? null,
    store: input.store ?? null,
  }),
  states: {
    idle: {
      on: {
        SETUP_MATCH: {
          target: 'ready',
          actions: ['setupMatch'],
        },
      },
    },
    ready: {
      on: {
        START_NEW_GAME: {
          target: 'inGame',
        },
      },
    },
    inGame: {
      entry: [
        'spawnGameActor',
        'createGameEntry',
        'updatePlayers',
        {
          type: 'setupGameTeams',
          params: ({ context }) => ({
            gameId: `${context.games.length}`,
            players: context.players,
          }),
        },
        {
          type: 'startGame',
          params: ({ context, event }) => {
            if (event.type !== 'START_NEW_GAME') {
              throw new Error('Invalid event type for startGame')
            }
            return {
              gameId: `${context.games.length}`,
              firstServingTeam: event.firstServingTeam,
              teamASide: event.teamASide,
              teamBSide: event.teamBSide,
            }
          },
        },
      ],
      on: {
        GAME_COMPLETED: [
          {
            target: 'matchComplete',
            guard: 'isMatchComplete',
            actions: ['recordGameResult'],
          },
          {
            target: 'gameComplete',
            actions: ['recordGameResult'],
          },
        ],
      },
    },
    gameComplete: {
      on: {
        START_NEW_GAME: {
          target: 'inGame',
        },
        END_MATCH: {
          target: 'matchComplete',
        },
      },
    },
    matchComplete: {
      on: {
        RESET: {
          target: 'idle',
        },
      },
    },
  },
})
