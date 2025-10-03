import { assign, createActor, setup } from 'xstate'
import { squashMachine } from './squashMachine'
import type { PlayerNameMap, Team } from './squashMachine'

// Match-level types
export type GameResult = {
  winner: Team
  finalScore: { A: number; B: number }
  gameNumber: number
}

export type MatchContext = {
  players: PlayerNameMap
  teamAFirstServer: 1 | 2
  teamBFirstServer: 1 | 2
  games: Array<GameResult>
  currentGameActor: ReturnType<typeof createActor<typeof squashMachine>> | null
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
        A1: string
        A2: string
        B1: string
        B2: string
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
  },
  actions: {
    setupMatch: assign(({ event }) => {
      if (event.type !== 'SETUP_MATCH') return {}
      return {
        players: event.players,
        teamAFirstServer: event.teamAFirstServer,
        teamBFirstServer: event.teamBFirstServer,
        games: [],
        currentGameActor: null,
      }
    }),
    recordGameResult: assign(({ context, event }) => {
      if (event.type !== 'GAME_COMPLETED') return {}
      return {
        games: [
          ...context.games,
          {
            winner: event.winner,
            finalScore: event.finalScore,
            gameNumber: context.games.length + 1,
          },
        ],
      }
    }),
    clearCurrentGame: assign(() => ({
      currentGameActor: null,
    })),
  },
  guards: {
    isMatchComplete: ({ context, event }) => {
      if (event.type !== 'GAME_COMPLETED') return false

      // Count current wins
      const gamesWonA = context.games.filter((g) => g.winner === 'A').length
      const gamesWonB = context.games.filter((g) => g.winner === 'B').length

      // Check if adding this game will result in 3 wins
      const newGamesWonA = event.winner === 'A' ? gamesWonA + 1 : gamesWonA
      const newGamesWonB = event.winner === 'B' ? gamesWonB + 1 : gamesWonB

      return newGamesWonA >= 3 || newGamesWonB >= 3
    },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QFsCGAXAxgCwHQEsIAbMAYgGUBRAFQFUAFAfQFkBBagYQAkBtABgC6iUAAcA9rHzp8YgHbCQAD0QB2ABwA2XCoCcGlQCYDAFgDMagIwbjxgDQgAnolM6ArLguuNB0wb6udC1NjAwBfUPs0LDwAJzBUCAcKalYAJWpGADlKAHVGAHFWZkp+ISQQcUlpOQVlBAt-Y1wNPh0DDUsDQzVjNXsnBGMLFVwdY1dTPg1zYw6DV3DIjBwCWXzUZDJC4sYOAHlmegAZGkoAEVKFSqkZeXK6htcmlraOiy6DHr7HREtcYx0gLUplcKg6vVMFkWICiKygGzAHDEyBEJHQZHIKXSWVyBSKJUEVwkNxq90QRj4uD4kIMFkBfE0xl03wGXSaximRg5Jg0rgMY2hsLw8M2SJRaLIlEyZxY7G4l3K12qd1AdQpVJpdJ0DOszP6iCGIzGEymMzmCwiMOWeCFYtRYHRpFSlCo1AVomJytqiACBmaHNcgeCelMGn1g2Go3Gk2mPXN4UtsjEEDgCiFRKqt29CAAtGGfrmtHxiyXS6WVILrQRiGAMySVUpVHw-bp9IHadMnnYC0M1P9o6a42p5pXorg4gkBh7M6TVYg3DpRrSVKYXBC1IHw73+xNAxYrHwQoHRyt8GsEXWvWT6u0LLhTCoAXw6bNefnWRNRpy+Oo1CpQSoP4nsKCJ2hKl5ZteIThu8WjRg05jFv+UzAbgtrIva6IQbOjaDCY-xTHSUz6ACOgsgaFh9jYfKgryq5chWCZAA */
  id: 'match',
  initial: 'idle',
  context: {
    players: {
      A1: '',
      A2: '',
      B1: '',
      B2: '',
      teamA: 'Team A',
      teamB: 'Team B',
    },
    teamAFirstServer: 1,
    teamBFirstServer: 1,
    games: [],
    currentGameActor: null,
  },
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
      entry: assign(({ context, event }) => {
        if (event.type !== 'START_NEW_GAME') return {}

        // Create a new game actor
        const gameActor = createActor(squashMachine)
        gameActor.start()

        // Use updated player positions if provided, otherwise use existing
        const players = event.players
          ? {
              A1: event.players.A1,
              A2: event.players.A2,
              B1: event.players.B1,
              B2: event.players.B2,
              teamA: `${event.players.A1} & ${event.players.A2}`,
              teamB: `${event.players.B1} & ${event.players.B2}`,
            }
          : context.players

        // Setup teams
        gameActor.send({
          type: 'SETUP_TEAMS',
          players,
        })

        // Start game
        // Determine which side the first server starts from
        const firstServerSide =
          event.firstServingTeam === 'A'
            ? event.teamASide || 'R'
            : event.teamBSide || 'R'

        gameActor.send({
          type: 'START_GAME',
          firstServer: {
            team: event.firstServingTeam,
            player: 1, // Always player 1 since we reordered
            side: firstServerSide,
          },
          maxPoints: 15,
          winBy: 1,
        })

        return {
          currentGameActor: gameActor,
          // Update context players if positions changed
          ...(event.players ? { players } : {}),
        }
      }),
      on: {
        GAME_COMPLETED: [
          {
            target: 'matchComplete',
            guard: 'isMatchComplete',
            actions: ['recordGameResult', 'clearCurrentGame'],
          },
          {
            target: 'gameComplete',
            actions: ['recordGameResult', 'clearCurrentGame'],
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
