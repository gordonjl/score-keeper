import { assign, sendTo, setup, spawnChild } from 'xstate'

import { squashMachine } from './squashMachine'
import type { PlayerName, PlayerNameMap, Team } from './squashMachine'

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
  currentGameId: string | null
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
  },
  actors: {
    squashGame: squashMachine,
  },
  actions: {
    setupMatch: assign(({ event }) => {
      if (event.type !== 'SETUP_MATCH') return {}
      return {
        players: event.players,
        teamAFirstServer: event.teamAFirstServer,
        teamBFirstServer: event.teamBFirstServer,
        games: [],
        currentGameId: null,
      }
    }),
    spawnGameActor: spawnChild('squashGame', {
      id: ({ context }) => `game-${context.games.length + 1}`,
      syncSnapshot: true,
    }),
    updatePlayersAndGameId: assign(({ context, event }) => {
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
        currentGameId: `game-${context.games.length + 1}`,
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
      currentGameId: null,
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
      A1: { firstName: '', lastName: '', fullName: '' },
      A2: { firstName: '', lastName: '', fullName: '' },
      B1: { firstName: '', lastName: '', fullName: '' },
      B2: { firstName: '', lastName: '', fullName: '' },
      teamA: 'Team A',
      teamB: 'Team B',
    },
    teamAFirstServer: 1,
    teamBFirstServer: 1,
    games: [],
    currentGameId: null,
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
      entry: [
        'spawnGameActor',
        'updatePlayersAndGameId',
        {
          type: 'setupGameTeams',
          params: ({ context }) => ({
            gameId: `game-${context.games.length + 1}`,
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
              gameId: `game-${context.games.length + 1}`,
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
