import { setup } from 'xstate'
import {
  gameEnded,
  needsSecondTeamFirstServer,
  needsSecondTeamFirstServerOnInit,
  rallyWon,
  setSecondTeamFirstServer,
  toggleServeSide,
  undo,
} from './squashGameMachine.actions'
import type { PlayerRow, Side, Team } from './squashMachine.types'
import type { useStore } from '@livestore/react'

// ===== LiveStore Game Type =====
// This type represents the narrowed game data returned from queries
export type Game = {
  id: string
  matchId: string
  gameNumber: number
  status: string
  scoreA: number
  scoreB: number
  winner: Team | null
  maxPoints: number
  winBy: number
  createdAt: Date
  completedAt: Date | null
  // Initial server (immutable)
  firstServingTeam: Team
  firstServingPlayer: PlayerRow
  firstServingSide: Side
  // First server for each team (set when team first serves)
  teamAFirstServer: PlayerRow | null
  teamBFirstServer: PlayerRow | null
  // Current server state (updated after each rally)
  currentServerTeam: Team
  currentServerPlayer: PlayerRow
  currentServerSide: Side
  currentServerHandIndex: 0 | 1
  firstHandUsed: boolean
}

// ===== Context =====
// XState machine is a pure UI flow controller
// Context holds the store reference and game identity
export type Context = {
  // LiveStore integration (needed to emit events)
  // Accepts the store type from useStore() which includes ReactApi
  store: ReturnType<typeof useStore>['store']
  // Game identity (immutable for this actor's lifetime)
  gameId: string
}

// ===== Events =====
export type Events =
  | { type: 'INITIALIZE'; game: Game }
  | { type: 'RALLY_WON'; winner: Team; game: Game }
  | { type: 'TOGGLE_SERVE_SIDE'; game: Game }
  | { type: 'CONFIRM_GAME_OVER' }
  | { type: 'LET' }
  | { type: 'UNDO'; game: Game }
  | {
      type: 'SECOND_TEAM_FIRST_SERVER_SET'
      game: Game
      team: Team
      firstServer: 1 | 2
    }

// ===== State Machine =====
export const squashGameMachine = setup({
  types: {
    events: {} as Events,
    context: {} as Context,
    input: {} as {
      store: ReturnType<typeof useStore>['store']
      gameId: string
    },
  },
  actions: {
    rallyWon,
    toggleServeSide,
    undo,
    setSecondTeamFirstServer,
  },
  guards: {
    canToggleServeSide: (_, params: { game: Game }) => {
      return params.game.currentServerHandIndex === 0
    },
    gameEnded: gameEnded,
    needsSecondTeamFirstServer: needsSecondTeamFirstServer,
    needsSecondTeamFirstServerOnInit: needsSecondTeamFirstServerOnInit,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5SwI4FcCGsAWBxDAtmALIYDG2AlgHZgB05ALpQG5gDEASgIIAyvATQD6AdQDyAOQDaABgC6iUAAcA9rErMV1RSAAeiACwBmAIx0ATEYPWDATgCs5gBwyT5+wBoQAT0MmAbHTG5v5ORk7mBk4mJrZGAL7xXqiYOPhEpBQ09EysHDz8wuLSJgpIIKrqmtrl+gjGZpY2do4ubp4+iOaWdI7+4QDsMvYyTgNGA06JyehYeIQk5FS0DGTMbFx8gqKSUuZlymoalFo6dQ50Mk32Y1b2trb+Jl6+CEaRdLYyTwP+Bs7mGS2cbTEApObpRZZFa5DYAFTEuFwvAAokIAMoozgANTR6IAkgARFGyA4VI7VM6GcwvLrOIL2IyjOy2SwBUHgtILTLLHJrPLsACqEkJYlJOkqx1OtUQJgGBkuwP8tliIweRiMtIQJlMnwe6vs9j+3WcHNmXIyS2yq3WHFRcPF5UllJl2rCdH8QIMMn+Tn89gG4y10V6MjDblsESNhpMZtS80t0PoMEYzGoUHRYDIWggcLAhAAYpQAE6wRiZ4tsYvsTEAYUkhKEcJR3GIQgL+M46LhGKxuM4vYd8glFJONVAdUc5l6k3McqcRqBDi1bgGl3GJmiAzcEVZ5jjEO5VphAHcMMd07WtAAzEsEDDVdj1iQdzht3CttFifuOw5VMdUtqEYMu80YGP4AyRh0rzGEYdBRk4Dz+KEVgBP4B4WlCvIMGeF5QFe1C3sW96PsKoq-uS-7ShOiDjE4lwmAGrIuI8fxaqYtifJB9yWE4iGbgkoLUCoEBwDonIJlh2QjlR456IgAC0-hakpGGSTy1qwmAMlSnJdRymu9jGGG-xAoxkFav8gRGDxEF+gYJgyFY6FJGC5rqceyZgKmNAZlmOZ5oWJZlhWVY6S6NEIE4USXEZkHKl6Tmap0CCRGYDmPHx7yOWh+6uRJkIaae55pvhN53g+AFOqO1HyVFyqfN6gJhoCDnQYYVh0KBzEmMYYxxAMamFZ5dDZgQSgADbedp1WyYBOpPF1Poqjc4GhAMNIpbB673KMkaPOBUyJPEQA */
  id: 'squashGameMachine',
  initial: 'active',
  context: ({ input }) => ({
    store: input.store,
    gameId: input.gameId,
  }),
  states: {
    active: {
      on: {
        INITIALIZE: [
          {
            guard: {
              type: 'gameEnded',
              params: ({ event }) => ({
                game: event.game,
                isInitialize: true,
              }),
            },
            target: 'complete',
          },
          {
            guard: {
              type: 'needsSecondTeamFirstServerOnInit',
              params: ({ event }) => ({
                game: event.game,
              }),
            },
            target: 'gettingSecondTeamFirstServer',
          },
        ],
        RALLY_WON: [
          {
            guard: {
              type: 'gameEnded',
              params: ({ event }) => ({
                game: event.game,
                winner: event.winner,
              }),
            },
            target: 'awaitingConfirmation',
            actions: [
              {
                type: 'rallyWon',
                params: ({ event }) => ({
                  game: event.game,
                  winner: event.winner,
                }),
              },
            ],
          },
          {
            guard: {
              type: 'needsSecondTeamFirstServer',
              params: ({ event }) => ({
                game: event.game,
                winner: event.winner,
              }),
            },
            target: 'gettingSecondTeamFirstServer',
            actions: [
              {
                type: 'rallyWon',
                params: ({ event }) => ({
                  game: event.game,
                  winner: event.winner,
                }),
              },
            ],
          },
          {
            actions: [
              {
                type: 'rallyWon',
                params: ({ event }) => ({
                  game: event.game,
                  winner: event.winner,
                }),
              },
            ],
          },
        ],
        TOGGLE_SERVE_SIDE: {
          guard: {
            type: 'canToggleServeSide',
            params: ({ event }) => ({ game: event.game }),
          },
          actions: [
            {
              type: 'toggleServeSide',
              params: ({ event }) => ({ game: event.game }),
            },
          ],
        },
        UNDO: {
          actions: [
            {
              type: 'undo',
              params: ({ event }) => ({ game: event.game }),
            },
          ],
        },
        LET: {},
      },
    },
    gettingSecondTeamFirstServer: {
      on: {
        SECOND_TEAM_FIRST_SERVER_SET: {
          target: 'active',
          actions: [
            {
              type: 'setSecondTeamFirstServer',
              params: ({ event }) => ({
                game: event.game,
                team: event.team,
                firstServer: event.firstServer,
              }),
            },
          ],
        },
      },
    },
    awaitingConfirmation: {
      on: {
        CONFIRM_GAME_OVER: {
          target: 'complete',
        },
        UNDO: {
          target: 'active',
          actions: [
            {
              type: 'undo',
              params: ({ event }) => ({ game: event.game }),
            },
          ],
        },
      },
    },
    complete: {
      type: 'final',
      // Machine lifecycle now managed by React - new game = new machine instance
    },
  },
})
