import { setup } from 'xstate'
import {
  gameEnded,
  rallyWon,
  toggleServeSide,
  undo,
} from './squashGameMachine.actions'
import type { Store } from '@livestore/livestore'
import type { schema } from '../livestore/schema'
import type { Team } from './squashMachine.types'

// ===== LiveStore Game Type =====
export type Game = {
  id: string
  matchId: string
  gameNumber: number
  status: string
  scoreA: number
  scoreB: number
  winner: string | null
  maxPoints: number
  winBy: number
  createdAt: Date
  completedAt: Date | null
  // Initial server (immutable)
  firstServingTeam: string
  firstServingPlayer: number
  firstServingSide: string
  // Current server state (updated after each rally)
  currentServerTeam: string
  currentServerPlayer: number
  currentServerSide: string
  currentServerHandIndex: number
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
  /** @xstate-layout N4IgpgJg5mDOIC5SwI4FcCGsAWBxDAtmALIYDG2AlgHZgDEAqgHIAiA8gNoAMAuoqAAcA9rEoAXSkOr8QAD0QAWAEwAaEAE9EADgCMAOgCsAXyNrUmHPiKkKNMHupCxAYSkAzSlDQAnSHVwAgsQAogD6ADJsASzBLNx8SCDCohJSMvIISlz6CjoKXABsSgZqmgjK+lpKSgCcAMw6NcUKBgYA7MamIOZYeIQk5FS0ehRgZADWNFAAymIYYmABbgve4UIYEHTxMsniktKJGQXKegotDcWliloFegV1Slp1BnVauk8FJmbovVYDtsNRhMprN5otlmBVutNhwdAlBCI9mlDohjkpTucdJcNIp8ncHk8Xm8dB8vt0fpZ+jYhvZyBIAG70ABKAXC4QAmqEAOpsJjbRK7VIHUBHApcO7YsrVAx6aoFdrZWp1GrnMk9SnWQZ2QZ0yiMugAFTYuFw4TC02CTIAauaAJIxfkIlL7dLaWp6GpteVFEo4hA6ApaPRaLg1LQ1AxPOrR6MKNUUvqagG0sgM+hmg2OpKIoWuhDhhR6No6UN1DpXf0kvR1UPhyMxmNxrrqxP-GkjbBjcZbXg7HMulEnM6jyWIOoKIPTwlzkkL+MWVur4YYADuGD21CgrmoHm8BHm+zozi8gAYraTLEKEgQhKEbA2kyWaCgOe7+lwLRFiS5Z+sqNT4jORLzouXSOBAcAyC2K5arQfY7sKciIAAtAUFYMbevxUhR9iOC47ieD4kBUUiNEZMoFaHrKNQRlwWQGGeBhcHULEam2a6dsC76ggsSwrGsGz8bmg75OKKpHuOuIyrUElSTJckKfe7E6qmepgLpiG0fmbx3IeFwmZkbTiko9xyWKTRYkoCjyUud7kcmHZds5u6uQY7oKMFWgYVKvmGNJvlKB0qXhoUNlRe2z6vhI76ft+v56U6Al5k8haet6x7lFw4o6ASs7EqSEWsUm7ZkEIBACAANmACxxYJiBYm0bSGL5XkVsqQZvLhV7dSYQA */
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
