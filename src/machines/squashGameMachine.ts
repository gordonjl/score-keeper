import { assign, setup } from 'xstate'
import { events } from '../livestore/schema'
import type { Store } from '@livestore/livestore'
import type { schema } from '../livestore/schema'
import type {
  ActivityGrid,
  Cell,
  PlayerNameMap,
  PlayerRow,
  RowKey,
  Score,
  Server,
  Side,
  Team,
} from './squashMachine'

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
  createdAt: number
  completedAt: number | null
  firstServingTeam: string
  firstServingPlayer: number
  firstServingSide: string
}

// ===== Snapshot for History =====
type Snapshot = {
  score: Score
  server: Server
  grid: ActivityGrid
  firstHandUsed: boolean
}

// ===== Context =====
type Context = {
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
type Events =
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

// ===== Helper Functions =====
const otherTeam = (t: Team): Team => (t === 'A' ? 'B' : 'A')
const flip = (s: Side): Side => (s === 'R' ? 'L' : 'R')
const rowKey = (team: Team, player: PlayerRow): RowKey =>
  `${team}${player}` as RowKey

const makeEmptyCols = (n = 30): Array<Cell> =>
  Array.from({ length: n }, () => '')

const initialGrid = (cols = 30): ActivityGrid => ({
  A1: makeEmptyCols(cols),
  A2: makeEmptyCols(cols),
  B1: makeEmptyCols(cols),
  B2: makeEmptyCols(cols),
  A: makeEmptyCols(cols),
  B: makeEmptyCols(cols),
})

const writeCell = (
  grid: ActivityGrid,
  key: RowKey | 'A' | 'B',
  col: number,
  value: Cell,
): ActivityGrid => {
  const next: ActivityGrid = {
    A1: [...grid.A1],
    A2: [...grid.A2],
    B1: [...grid.B1],
    B2: [...grid.B2],
    A: [...grid.A],
    B: [...grid.B],
  }
  next[key][col] = value
  return next
}

const colForTeamServe = (score: Score, team: Team): number => score[team]

// ===== State Machine =====
export const squashGameMachine = setup({
  types: {
    events: {} as Events,
    context: {} as Context,
    input: {} as {
      matchId?: string
      gameId?: string
      store?: Store<typeof schema> | null
    },
  },
  actions: {
    configureGameState: assign(
      ({ context }, params: { game: Game; players: PlayerNameMap }) => {
        const { game, players } = params

        // TODO: Support resuming in-progress games by replaying rally events from LiveStore
        // For now, only support fresh games at 0-0
        if (game.scoreA !== 0 || game.scoreB !== 0) {
          console.warn(
            'Cannot resume in-progress game - starting fresh. Grid reconstruction not yet implemented.',
          )
        }

        // Initialize server from game data
        const server: Server = {
          team: game.firstServingTeam as Team,
          player: game.firstServingPlayer as PlayerRow,
          side: game.firstServingSide as Side,
          handIndex: 0 as const,
        }

        // Initialize grid with first serve pre-written
        const grid = writeCell(
          initialGrid(),
          rowKey(server.team, server.player),
          0,
          server.side,
        )

        return {
          gameId: game.id,
          matchId: game.matchId,
          maxPoints: game.maxPoints,
          winBy: game.winBy,
          players,
          score: { A: 0, B: 0 },
          server,
          grid,
          firstHandUsed: false,
          history: [],
          rallyCount: 0,
          store: context.store,
        }
      },
    ),

    snapshot: assign(({ context }) => ({
      history: [
        ...context.history,
        {
          score: { ...context.score },
          server: { ...context.server },
          grid: { ...context.grid },
          firstHandUsed: context.firstHandUsed,
        },
      ],
    })),

    toggleServeSide: assign(({ context }) => {
      if (context.server.handIndex !== 0) return {}

      const newSide = flip(context.server.side)
      const col = colForTeamServe(context.score, context.server.team)
      const currentRow = rowKey(context.server.team, context.server.player)
      const nextGrid = writeCell(context.grid, currentRow, col, newSide)

      return {
        server: { ...context.server, side: newSide },
        grid: nextGrid,
      }
    }),

    rallyWon: assign(({ context }, params: { winner: Team }) => {
      const { winner } = params
      const cur = context.server
      const col = colForTeamServe(context.score, cur.team)
      const rallyNumber = context.rallyCount + 1
      const currentRow = rowKey(cur.team, cur.player)

      // Start with current grid
      const updates: Partial<Context> = {
        rallyCount: rallyNumber,
      }

      // Emit LiveStore rallyWon event
      if (context.store && context.gameId) {
        context.store.commit(
          events.rallyWon({
            rallyId: crypto.randomUUID(),
            gameId: context.gameId,
            rallyNumber,
            winner,
            serverTeam: cur.team,
            serverPlayer: cur.player,
            serverSide: cur.side,
            serverHandIndex: cur.handIndex,
            scoreABefore: context.score.A,
            scoreBBefore: context.score.B,
            scoreAAfter: winner === 'A' ? context.score.A + 1 : context.score.A,
            scoreBAfter: winner === 'B' ? context.score.B + 1 : context.score.B,
            timestamp: new Date(),
          }),
        )
      }

      // Server won the rally
      if (winner === cur.team) {
        const nextScore: Score = {
          ...context.score,
          [winner]: context.score[winner] + 1,
        }
        const nextServer: Server = { ...cur, side: flip(cur.side) }
        const nextCol = nextScore[cur.team]
        const nextGrid = writeCell(
          context.grid,
          currentRow,
          nextCol,
          nextServer.side,
        )

        return {
          ...updates,
          score: nextScore,
          server: nextServer,
          grid: nextGrid,
        }
      }

      // Receiving team won - add slash to current cell
      const existingCell = context.grid[currentRow][col]
      const slashedCell: Cell = `${existingCell}/` as Cell
      const gridWithSlash = writeCell(
        context.grid,
        currentRow,
        col,
        slashedCell,
      )

      const nextScore: Score = {
        ...context.score,
        [winner]: context.score[winner] + 1,
      }

      // First-hand exception at 0-0
      const isStartOfGame = context.score.A === 0 && context.score.B === 0
      if (isStartOfGame && !context.firstHandUsed) {
        const partnerRow = rowKey(cur.team, cur.player === 1 ? 2 : 1)
        const gridWithPartnerSlash = writeCell(
          gridWithSlash,
          partnerRow,
          0,
          '/',
        )

        const t = otherTeam(cur.team)
        const nextServer: Server = {
          team: t,
          player: 1,
          side: 'R',
          handIndex: 0,
        }
        const nextCol = nextScore[t]
        const finalGrid = writeCell(
          gridWithPartnerSlash,
          rowKey(t, 1),
          nextCol,
          nextServer.side,
        )

        return {
          ...updates,
          score: nextScore,
          server: nextServer,
          grid: finalGrid,
          firstHandUsed: true,
        }
      }

      // First hand lost (not start of game)
      if (cur.handIndex === 0 && !context.firstHandUsed) {
        const partnerRow = rowKey(cur.team, cur.player === 1 ? 2 : 1)
        const gridWithPartnerSlash = writeCell(
          gridWithSlash,
          partnerRow,
          col,
          '/',
        )

        const t = otherTeam(cur.team)
        const nextServer: Server = {
          team: t,
          player: 1,
          side: 'R',
          handIndex: 0,
        }
        const nextCol = nextScore[t]
        const finalGrid = writeCell(
          gridWithPartnerSlash,
          rowKey(t, 1),
          nextCol,
          nextServer.side,
        )

        return {
          ...updates,
          score: nextScore,
          server: nextServer,
          grid: finalGrid,
          firstHandUsed: true,
        }
      }

      // First hand lost, partner serves (second hand)
      if (cur.handIndex === 0) {
        const xCol = nextScore[winner]
        const gridWithX = writeCell(gridWithSlash, winner, xCol, 'X')

        const partner: Server = {
          team: cur.team,
          player: cur.player === 1 ? 2 : 1,
          side: flip(cur.side),
          handIndex: 1,
        }
        const nextCol = context.score[cur.team]
        const finalGrid = writeCell(
          gridWithX,
          rowKey(partner.team, partner.player),
          nextCol,
          partner.side,
        )

        return {
          ...updates,
          score: nextScore,
          server: partner,
          grid: finalGrid,
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
      const nextCol = nextScore[t]
      const finalGrid = writeCell(
        gridWithSlash,
        rowKey(t, 1),
        nextCol,
        nextServer.side,
      )

      return {
        ...updates,
        score: nextScore,
        server: nextServer,
        grid: finalGrid,
        firstHandUsed: true,
      }
    }),

    undoOnce: assign(({ context }) => {
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
        grid: prev.grid,
        firstHandUsed: prev.firstHandUsed,
        history: context.history.slice(0, -1),
        rallyCount: Math.max(0, context.rallyCount - 1),
      }
    }),
  },
  guards: {
    gameEnded: (
      _,
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
    },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5SwI4FcCGsAWBxDAtmALIYDG2AlgHZgDEAqgHIAiA8gNoAMAuoqAAcA9rEoAXSkOr8QAD0QAWAEwAaEAE9EADgCMAOgCsAXyNrUmHPiKkKNegCUAogGVHAFW58kIYaIlSZeQRlNU0EJQUAdj1IrgBmHSVjUxBzLDxCEnIqWj1qITEAYSkAM0ooNAAnSDpcAEFiRwB9ABk2OpZHFk8ZX3FJaW8guIN9SJ0tcYBOBS0IpR0p0MQlCL0pyIA2A02kkzN0dKss21zyCQA3BzqWloBNJoB1NiYe7z7-QdBhqc29LSmXAMM1m80WywQcSUXHWSl+k2SBwsGWs2TsenOlCudDcbFwuBazVc9gAakSAJKdN6CET9AJDRAGHZ6CJTKYGZRKOKbKFaCE6AxKf5xEWisUihT7VKHSyZGw5MAYsiXeiEjy8Xq0z6BRC7GFTLQKKECmZcrRxflcIXim0SqVpWWo06KihgMgAazo1J8WoGOshoxiE2moOU4I0igBehFwLikUR0uRx3l6NdHq9Oi8NL8foZAbGwcWoYWSwjwSN0ZGUzjCYdKJOCoxAHcMP1qFBitQypUCBhPnRCi8AGLk+zEJr1RpNNhk+zej6576ISLjdZs6sAzazI18suzaJcLSx+MmFL5CBwGR15No2ianP0pcIAC0mwhr-tMvrKdy+SKpXKKpIHvOkvjkRAJiFOFNiPDYFESHQuBmCEIi0Fl4kSWsvxvZ0lRVEDtTzTYdAUdYSK4JCkOUOJzRQgw4hiLQtwMc0bUlFJrzlW8XWwN13QIxdwPCGiYm2YEFGLCZdzCbkDBiAxIl0PYOOwrjcIwFs2w7ACez7QSF0fISdn0Vl2U5bleQhfdDFgmtPyTNTGzIIQCAEAAbMAxDAATDKCRD4n+YE4UmLhNiBKIrKYytj2SEwgA */
  id: 'squashGameMachine',
  initial: 'notConfigured',
  context: ({ input }) => ({
    gameId: input.gameId ?? null,
    matchId: input.matchId ?? null,
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
    store: input.store ?? null,
    rallyCount: 0,
  }),
  on: {
    UNDO: {
      actions: ['undoOnce'],
      target: '.active',
    },
    RESET: {
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
      type: 'final',
    },
  },
})
