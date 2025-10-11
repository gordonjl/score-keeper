import { assign, setup } from 'xstate'
import {
  gameEnded,
  initialize,
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
// XState machine is now a pure state flow controller
// All game data lives in LiveStore and is queried by components
export type Context = {
  // Game configuration (needed for guards/actions)
  gameId: string | null
  matchId: string | null
  maxPoints: number
  winBy: number

  // LiveStore integration (needed to emit events)
  store: Store<typeof schema> | null
}

// ===== Events =====
export type Events =
  | {
      type: 'INITIALIZE'
      gameId: string
      matchId: string
      maxPoints: number
      winBy: number
    }
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
    initialize: assign(initialize),
    rallyWon,
    toggleServeSide,
    undo,
  },
  guards: {
    gameEnded,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5SwI4FcCGsAWBxDAtmALIYDG2AlgHZgDEAqgHIAiA8gNoAMAuoqAAcA9rEoAXSkOr8QAD0QAWAEwAaEAE9EADgCMAOgCsAXyNrUmHPiKkKNMHupCxAYSkAzSlDQAnSHVwAgsQAogD6ADJsASzBLNx8SCDCohJSMvIISlz6CjoKXABsSgZqmgjK+lpKSgCcAMw6NcUKBgYA7MamIOZYeIQk5FS0ehRgZADWNFAAymIYYmABbgve4UIYEHTxMsniktKJGQXKegotDcWliloFegV1Slp1BnVauk8FJmbovVYDtsNRhMprN5otlmBVutNhwdAlBCI9mlDohjkpTucdJcNIp8ncHk8Xm8dB8vt0fpZ+jYhvZyBIAG70ABKAXC4QAmqEAOpsJjbRK7VIHUBHApcO7YsrVAx6aoFdrZWp1GrnMk9SnWQZ2PR0yiMugAFTYuFw4TC02CTIAauaAJIxfkIlL7dLaWp6GpteVFEo4hA6ApaPRaLg1LQ1AxPOrR6MKNUUvqagG0sgM+hmg2OpKIoWuhDhhR6No6UN1DpXf0kvR1UPhyMxmNxrrqxP-GkjbBjcZbXg7HMulEINEYl5Y31lZWF+6PZ6vd51T7NhN-anaoHd2Hw7PO5Ei1EnM6jyWIOoKIPTwlzkkL+MWVur4YYADuGD21CgrmoHm8BHm+zozi8gAYraTLEKEgQhKEbA2kyWaCgOe7+lwLRFiS5Z+sqNT4jORLzouXSOBAcAyC2K5arQfY7sKciIAAtAUFYMbevxUhR9iOC47ieD4kBUUiNEZMoFaHrKNQRlwWQGGeBhcHULEam2a6dsC76ggsSwrGsGz8bmg75OKKpHuOuIyrUElSTJckKfe7E6qmepgLpiG0fmbx3IeFwmZkbTiko9xyWKTRYkoCjyUud7kcmHZds5u6uQY7oKMFWgYVKvmGNJvlKB0qXhoUNlRe2z6vhI76ft+v56U6Al5k8haet6x7lFw4o6ASs7EqSEWsUm7ZkEIBACAANmACxxYJiBYm0bSGL5XkVsqQZvLhV7dSYQA */
  id: 'squashGameMachine',
  initial: 'notConfigured',
  context: ({ input }) => ({
    gameId: null,
    matchId: null,
    maxPoints: 15,
    winBy: 1,
    store: input.store,
  }),
  on: {
    UNDO: {
      actions: ['undo'],
    },
  },
  states: {
    notConfigured: {
      on: {
        INITIALIZE: {
          target: 'active',
          actions: ['initialize'],
        },
      },
    },
    active: {
      always: [
        {
          guard: 'gameEnded',
          target: 'awaitingConfirmation',
        },
      ],
      on: {
        RALLY_WON: {
          actions: ['rallyWon'],
        },
        TOGGLE_SERVE_SIDE: {
          actions: ['toggleServeSide'],
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
