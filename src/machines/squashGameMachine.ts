import { setup } from 'xstate'
import {
  gameEnded,
  rallyWon,
  toggleServeSide,
  undo,
} from './squashGameMachine.actions'
import type { Store } from '@livestore/livestore'
import type { schema } from '../livestore/schema'
import type { PlayerRow, Side, Team } from './squashMachine.types'

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
  // Current server state (updated after each rally)
  currentServerTeam: Team
  currentServerPlayer: PlayerRow
  currentServerSide: Side
  currentServerHandIndex: 0 | 1
  firstHandUsed: boolean
}

// ===== Context =====
// XState machine is a pure UI flow controller
// Context only holds the store reference - NO game data or configuration
export type Context = {
  // LiveStore integration (needed to emit events)
  store: Store<typeof schema> | null
}

// ===== Events =====
export type Events =
  | { type: 'INITIALIZE'; game: Game }
  | { type: 'RALLY_WON'; winner: Team; game: Game }
  | { type: 'TOGGLE_SERVE_SIDE'; game: Game }
  | { type: 'CONFIRM_GAME_OVER' }
  | { type: 'LET' }
  | { type: 'UNDO'; game: Game }

// ===== State Machine =====
export const squashGameMachine = setup({
  types: {
    events: {} as Events,
    context: {} as Context,
    input: {} as {
      store: Store<typeof schema> | null
    },
  },
  actions: {
    rallyWon,
    toggleServeSide,
    undo,
  },
  guards: {
    gameEnded,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5SwI4FcCGsAWBxDAtmALIYDG2AlgHZgDEAqgHIAiA8gNoAMAuoqAAcA9rEoAXSkOr8QAD0QB2AIxKAdAA4AnFwCsmpQs06AzHvUAaEAE9ESgEwBfB5dSYc+IqQo0wq6kLEAYSkAM0ooNAAnSDoASSZYgBVYgEEAGViALQBRbj4kEGFRCSkZeQQ7LgA2VQAWOyV1KqquQx0lPUsbBHq7VSUuTTsh5q51LR1apxd0LDxCEnIqWlVyCQA3egAldLSATQB9AHU2JjyZIvFJaQLyluNVY20dF-Va4wU7F67EWurVKrGOwKYwDBrqYzNKrTECuOYeRbeFZrSibOg7NL7Y6nDhKfKCERXUq3RDGP79dQKWpVWr2YEKKqaH4IIHqVTaKp2L7KHSM2oKHQwuHuBZeZa+FFoxJsXC4NLZA4AZWyWwAagrFbEWLleBdCSUbqBypDaqouNT1NV3lUlEMlMy7ED2SZ7FUTE8aVV1ELZiLPEsfKsyBt6PLEucCpcDWVfnY2Qp1PYuCaXpCOszGn1ai6GgNlPoFD63PN-UiJQB3DBXahQYLUMKRAgYA10QKnABisS2xAOuBSxAVbHVWwjBOK1xjCAGQzNoMak2M1TszPqmkeenpWk0oJ0jhh-ggcBkwpLiPFevHxKNiAAtPbrIhNKajIvNPpEyCuK0i-DRQGVv4QShOEUSQBeRKGnIvwKCuXIAoMwx2KM4xGFMziwr6p5ioGkpgOB0Ykj0cHKGMlqJlwSicrosFruoehArUWhUnYjE-n6Z44ZW1a1sBjbNhOkb6gJ14IOMahxiohgcpUxgWA+RG0Rur4UZUvJsVh-6+GQQgEAIAA2YBiHhgmXpB5RKECDxaLotS1G+HwdFUsFsi026UQYNqVLoThOEAA */
  id: 'squashGameMachine',
  initial: 'notConfigured',
  context: ({ input }) => ({
    store: input.store,
  }),
  on: {
    UNDO: {
      actions: [
        {
          type: 'undo',
          params: ({ event }) => ({ game: event.game }),
        },
      ],
    },
  },
  states: {
    notConfigured: {
      on: {
        INITIALIZE: {
          target: 'active',
          // No action needed - just transition
        },
      },
    },
    active: {
      on: {
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
          actions: [
            {
              type: 'toggleServeSide',
              params: ({ event }) => ({ game: event.game }),
            },
          ],
        },
        LET: {},
      },
    },
    awaitingConfirmation: {
      on: {
        CONFIRM_GAME_OVER: {
          target: 'complete',
        },
      },
    },
    complete: {
      type: 'final',
      // Machine lifecycle now managed by React - new game = new machine instance
    },
  },
})
