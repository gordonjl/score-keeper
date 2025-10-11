import { assign, log, setup } from 'xstate'
import {
  configureGameState,
  gameEnded,
  initialGrid,
  rallyWon,
  resetGameState,
  snapshot,
  toggleServeSide,
  undoOnce,
} from './squashGameMachine.actions'
import type { Snapshot } from './squashGameMachine.actions'
import type { Store } from '@livestore/livestore'
import type { schema } from '../livestore/schema'
import type {
  ActivityGrid,
  PlayerNameMap,
  Score,
  Server,
  Team,
} from './squashMachine.types'

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
  firstServingTeam: string
  firstServingPlayer: number
  firstServingSide: string
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
  grid: ActivityGrid
  firstHandUsed: boolean

  // History for undo
  history: Array<Snapshot>

  // LiveStore integration
  store: Store<typeof schema> | null
  rallyCount: number
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
  | { type: 'RESET' }

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
      ({ context }, params: { game: Game; players: PlayerNameMap }) =>
        configureGameState(context, params),
    ),
    snapshot: assign(({ context }) => snapshot(context)),
    toggleServeSide: assign(({ context }) => toggleServeSide(context)),
    rallyWon: assign(({ context }, params: { winner: Team }) =>
      rallyWon(context, params),
    ),
    undoOnce: assign(({ context }) => undoOnce(context)),
    resetGameState: assign(() => resetGameState()),
  },
  guards: {
    gameEnded,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5SwI4FcCGsAWBxDAtmALIYDG2AlgHZgDEAqgHIAiA8gNoAMAuoqAAcA9rEoAXSkOr8QAD0QAWAEwAaEAE9EADgCMAOgCsAXyNrUmHPiKkKNegCUAogGVHAFW58kIYaIlSZeQRlNU0EJQUAdj1IrgBmHSVjUxBzLDxCEnIqWj1qITEAYSkAM0ooNAAnSDpcAEFiRwB9ABk2OpZHFk8ZX3FJaW8guIN9SJ0tcYBOBS0IpR0p0MQlCL0pyIA2A02kkzN0dKss21zyCQA3BzqWloBNJoB1NiYe7z7-QdBhqc29LSmXAMM1m80WywQcSUXHWSl+k2SBwsGWs2TsenOlCudDcbFwuBazVc9gAakSAJKdN6CET9AJDRAGHZ6CJTKYGZRKOKbKFaCE6AxKf5xEWisUihT7VKHSyZMAYsiXeiEjy8Xq0z6BRC7GFTLQKKECmZcrRxflcIXim0SqVpWWo06KihgMgAazo1J8WoGOshoxiE2moOU4I0igBehFwLikUR0uRx3l6NdHq9Oi8NL8foZAbGwcWoYWSwjwSN0ZGUzjCYdKJOCoxAHcMP1qFBitQypUCBhPnRCi8AGLk+zEJr1RpNNhk+zej6576ISLjdZs6sAzazI18suzaJcLSx+MmFL5CBwGR15No2ianP0pcIAC0mwhr-tMvrKdy+SKpXKKpIHvOkvjkRAJiFOFNiPDYFESHQuBmCEIi0Fl4kSWsvxvZ0lRVEDtTzTYdAUdYSK4JCkOUOJzRQgw4hiLQtwMc0bUlFJrzlW8XWwN13QIxdwPCGiYm2YEFGLCZdzCbkDBiAxIl0PYOOwrjcIwFs2w7ACez7QSF0fISdn0Vl2U5bleQhfdDFgmtPyTNTGzIIQCAEAAbMAxDAATDKCRD4n+YE4UmLhNiBKIrKYytj2SEwgA */
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
    grid: initialGrid(),
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
    RESET: {
      actions: [log('resetGameState'), 'resetGameState'],
      target: '.notConfigured',
    },
  },
  states: {
    notConfigured: {
      on: {
        GAME_LOADED: {
          target: 'active',
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
      // Not a final state - machine persists across games
      // Will be reset via RESET event when new game starts
    },
  },
})
