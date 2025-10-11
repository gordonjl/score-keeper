import { assign, setup } from 'xstate'
import {
  configureGameState,
  gameEnded,
  rallyWon,
  snapshot,
  toggleServeSide,
  undoOnce,
} from './squashGameMachine.actions'
import type { Snapshot } from './squashGameMachine.actions'
import type { Store } from '@livestore/livestore'
import type { schema } from '../livestore/schema'
import type { PlayerNameMap, Score, Server, Team } from './squashMachine.types'

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
export type Context = {
  // Configuration (from Game)
  gameId: string | null
  matchId: string | null
  maxPoints: number
  winBy: number

  // Players (passed in, not from Game)
  players: PlayerNameMap

  // Game state (UI state machine manages this)
  score: Score
  server: Server
  firstHandUsed: boolean

  // History for undo
  history: Array<Snapshot>

  // LiveStore integration
  store: Store<typeof schema> | null
}

// ===== Events =====
export type Events =
  | {
      type: 'GAME_LOADED'
      game: Game
      players: PlayerNameMap
    }
  | { type: 'RALLY_WON'; winner: Team }
  | { type: 'TOGGLE_SERVE_SIDE' }
  | { type: 'CONFIRM_GAME_OVER' }
  | { type: 'LET' }
  | { type: 'UNDO' }

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
    configureGameState: assign(
      (
        { context },
        params: {
          game: Game
          players: PlayerNameMap
        },
      ) => configureGameState(context, params),
    ),
    snapshot: assign(({ context }) => snapshot(context)),
    toggleServeSide: assign(({ context }) => toggleServeSide(context)),
    rallyWon: assign(({ context }, params: { winner: Team }) =>
      rallyWon(context, params),
    ),
    undoOnce: assign(({ context }) => undoOnce(context)),
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
    players: {
      A1: { firstName: 'A1', lastName: 'Player', fullName: 'A1 Player' },
      A2: { firstName: 'A2', lastName: 'Player', fullName: 'A2 Player' },
      B1: { firstName: 'B1', lastName: 'Player', fullName: 'B1 Player' },
      B2: { firstName: 'B2', lastName: 'Player', fullName: 'B2 Player' },
      teamA: 'Team A',
      teamB: 'Team B',
    },
    score: { A: 0, B: 0 },
    server: { team: 'A', player: 1, side: 'R', handIndex: 0 as const },
    firstHandUsed: false,
    history: [],
    store: input.store,
    rallyCount: 0,
  }),
  on: {
    UNDO: {
      actions: ['undoOnce'],
      target: '.active',
    },
  },
  states: {
    notConfigured: {
      on: {
        GAME_LOADED: {
          target: 'checkingStateAfterLoad',
          actions: {
            type: 'configureGameState',
            params: ({ event }) => ({
              game: event.game,
              players: event.players,
            }),
          },
        },
      },
    },
    checkingStateAfterLoad: {
      always: [
        {
          guard: {
            type: 'gameEnded',
            params: ({ context }) => ({
              score: context.score,
              maxPoints: context.maxPoints,
              winBy: context.winBy,
            }),
          },
          target: 'awaitingConfirmation',
        },
        { target: 'active' },
      ],
    },
    active: {
      on: {
        RALLY_WON: {
          actions: [
            'snapshot',
            {
              type: 'rallyWon',
              params: ({ event }) => ({ winner: event.winner }),
            },
          ],
          target: 'check',
        },
        TOGGLE_SERVE_SIDE: {
          actions: ['toggleServeSide'],
        },
        LET: {},
      },
    },
    check: {
      always: [
        {
          guard: {
            type: 'gameEnded',
            params: ({ context }) => ({
              score: context.score,
              maxPoints: context.maxPoints,
              winBy: context.winBy,
            }),
          },
          target: 'awaitingConfirmation',
        },
        { target: 'active' },
      ],
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
