import { assign, setup } from 'xstate'

// ===== Types =====
export type Team = 'A' | 'B'
export type PlayerRow = 1 | 2
export type Side = 'R' | 'L'
export type RowKey = 'A1' | 'A2' | 'B1' | 'B2'
export type Cell = '' | 'R' | 'L' | 'R/' | 'L/' | 'X' | '/'

export type PlayerNameMap = {
  A1: string
  A2: string
  B1: string
  B2: string
  teamA: string
  teamB: string
}

export type Score = {
  A: number
  B: number
}

export type Server = {
  team: Team
  player: PlayerRow
  side: Side
  handIndex: 0 | 1 // 0 = first hand in a team hand, 1 = second hand
}

export type ActivityGrid = {
  A1: Array<Cell>
  A2: Array<Cell>
  B1: Array<Cell>
  B2: Array<Cell>
  A: Array<Cell> // merged team row for X marks
  B: Array<Cell>
}

export type Snapshot = {
  score: Score
  server: Server
  grid: ActivityGrid
  firstHandUsed: boolean
}

export type Context = {
  players: PlayerNameMap
  score: Score
  server: Server
  maxPoints: number
  winBy: number
  grid: ActivityGrid
  firstHandUsed: boolean // relevant only at 0–0 for the initial serving team
  history: Array<Snapshot>
}

export type Events =
  | { type: 'SETUP_TEAMS'; players: PlayerNameMap }
  | {
      type: 'START_GAME'
      firstServer: { team: Team; player: PlayerRow; side: Side }
      maxPoints?: number
      winBy?: number
    }
  | { type: 'RALLY_WON'; winner: Team }
  | { type: 'CLICK_ROW'; row: RowKey }
  | { type: 'TOGGLE_SERVE_SIDE' }
  | { type: 'CONFIRM_GAME_OVER' }
  | { type: 'LET' }
  | { type: 'UNDO' }
  | { type: 'RESET' }

// ===== Helpers =====
export const otherTeam = (t: Team): Team => (t === 'A' ? 'B' : 'A')
export const flip = (s: Side): Side => (s === 'R' ? 'L' : 'R')
export const rowKey = (team: Team, player: PlayerRow): RowKey =>
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

const colForTeamServe = (ctx: Context, team: Team) => ctx.score[team]

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
  next[key as keyof ActivityGrid][col] = value
  return next
}

const popSnapshot = (ctx: Context): Partial<Context> => {
  const prev = ctx.history.at(-1)
  if (!prev) return {}
  return {
    score: prev.score,
    server: prev.server,
    grid: prev.grid,
    firstHandUsed: prev.firstHandUsed,
    history: ctx.history.slice(0, -1),
  }
}

const toScoreWords = (n: number) => {
  const words = [
    'Love',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
  ]
  return words[n] ?? String(n)
}

export const serveAnnouncement = (ctx: Context): string => {
  const { server, score, players } = ctx
  const serverScore = score[server.team]
  const receiverScore = score[otherTeam(server.team)]
  const serverWords = toScoreWords(serverScore)
  const receiverWords = toScoreWords(receiverScore)
  // Server's score first, then receiver's score
  const scorePhrase =
    serverScore === receiverScore
      ? `${serverWords} All`
      : `${serverWords}–${receiverWords}`
  const who =
    players[rowKey(server.team, server.player)] ||
    `${server.team}${server.player}`
  const side = server.side === 'R' ? 'Right' : 'Left'
  return `${scorePhrase}, ${who} to Serve from the ${side}`
}

// ===== Machine =====
export const squashMachine = setup({
  types: {
    context: {} as Context,
    events: {} as Events,
  },
  actions: {
    assignTeams: assign((_, { players }: { players: PlayerNameMap }) => ({
      players,
    })),

    startGame: assign(
      (
        { context },
        params: {
          firstServer: { team: Team; player: PlayerRow; side: Side }
          maxPoints?: number
          winBy?: number
        },
      ) => {
        const server: Server = {
          team: params.firstServer.team,
          player: params.firstServer.player,
          side: params.firstServer.side,
          handIndex: 0 as const,
        }
        // Pre-write R/L for first serve at column 0
        const grid = writeCell(
          initialGrid(),
          rowKey(server.team, server.player),
          0,
          server.side,
        )
        return {
          score: { A: 0, B: 0 },
          server,
          maxPoints: params.maxPoints ?? context.maxPoints,
          winBy: params.winBy ?? context.winBy,
          grid,
          firstHandUsed: false,
          history: [],
        }
      },
    ),

    snapshot: assign(({ context }) => ({
      history: [
        ...context.history,
        {
          score: { ...context.score },
          server: { ...context.server },
          grid: JSON.parse(JSON.stringify(context.grid)) as ActivityGrid,
          firstHandUsed: context.firstHandUsed,
        },
      ],
    })),

    // Pre-fill R/L in the current server row at the current column.
    // Disallowed if clicking any other row.
    clickRow: assign(({ context }, { row }: { row: RowKey }) => {
      const currentRow = rowKey(context.server.team, context.server.player)
      if (row !== currentRow) return {}
      const col = colForTeamServe(context, context.server.team)
      const value: Cell = context.server.side
      const nextGrid = writeCell(context.grid, currentRow, col, value)
      return { grid: nextGrid }
    }),

    // Toggle serve side (R <-> L) when starting a new hand
    // Only allowed when handIndex === 0
    toggleServeSide: assign(({ context }) => {
      if (context.server.handIndex !== 0) return {}
      const newSide = flip(context.server.side)
      const col = colForTeamServe(context, context.server.team)
      const currentRow = rowKey(context.server.team, context.server.player)
      const nextGrid = writeCell(context.grid, currentRow, col, newSide)
      return {
        server: { ...context.server, side: newSide },
        grid: nextGrid,
      }
    }),

    rallyWon: assign(({ context }, { winner }: { winner: Team }) => {
      const cur = context.server
      // Column where this serve was recorded
      const col = colForTeamServe(context, cur.team)
      let grid = context.grid

      // If server won, R/L is already written, just update score and flip side
      if (winner === cur.team) {
        // Increment server team score
        const nextScore: Score = {
          ...context.score,
          [winner]: context.score[winner] + 1,
        }
        // Next server is same player, flip side
        const nextServer: Server = { ...cur, side: flip(cur.side) }
        // Pre-write the next serve R/L
        const nextCol = nextScore[cur.team]
        grid = writeCell(
          grid,
          rowKey(cur.team, cur.player),
          nextCol,
          nextServer.side,
        )
        return { score: nextScore, server: nextServer, grid }
      } else {
        // Receiving team won
        // Add slash to existing R/L in server row at current column
        const existingCell = grid[rowKey(cur.team, cur.player)][col]
        const v: Cell = (existingCell + '/') as Cell
        grid = writeCell(grid, rowKey(cur.team, cur.player), col, v)

        // First-hand exception at 0–0 for the very first server
        const isStartOfGame = context.score.A === 0 && context.score.B === 0
        if (isStartOfGame && !context.firstHandUsed) {
          // Partner did not serve → mark '/' in partner row at col 0 per convention
          const partnerRow = rowKey(cur.team, cur.player === 1 ? 2 : 1)
          grid = writeCell(grid, partnerRow, 0, '/')
          const nextScore: Score = {
            ...context.score,
            [winner]: context.score[winner] + 1,
          }
          // Hand-out to other team
          const t = otherTeam(cur.team)
          const nextServer: Server = {
            team: t,
            player: 1,
            side: 'R',
            handIndex: 0,
          }
          // Pre-write R/L for the new server
          const nextCol = nextScore[t]
          grid = writeCell(grid, rowKey(t, 1), nextCol, nextServer.side)
          return {
            score: nextScore,
            server: nextServer,
            grid,
            firstHandUsed: true,
          }
        }

        // Not start-of-game exception
        const nextScore: Score = {
          ...context.score,
          [winner]: context.score[winner] + 1,
        }

        // Check if this is the first hand - if so, immediate hand-out (no partner)
        if (cur.handIndex === 0 && !context.firstHandUsed) {
          // First hand lost -> mark partner with / at current column
          const partnerRow = rowKey(cur.team, cur.player === 1 ? 2 : 1)
          grid = writeCell(grid, partnerRow, col, '/')
          // Hand-out to other team
          const t = otherTeam(cur.team)
          const nextServer: Server = {
            team: t,
            player: 1,
            side: 'R',
            handIndex: 0,
          }
          // Pre-write R/L for the new server
          const nextCol = nextScore[t]
          grid = writeCell(grid, rowKey(t, 1), nextCol, nextServer.side)
          return {
            score: nextScore,
            server: nextServer,
            grid,
            firstHandUsed: true,
          }
        } else if (cur.handIndex === 0) {
          // Not first hand, partner still to serve (second hand)
          // Write X on winner team at their new column
          const xCol = nextScore[winner]
          grid = writeCell(grid, winner, xCol, 'X')
          const partner: Server = {
            team: cur.team,
            player: cur.player === 1 ? 2 : 1,
            side: flip(cur.side),
            handIndex: 1,
          }
          // Pre-write R/L for the partner
          const nextCol = context.score[cur.team]
          grid = writeCell(
            grid,
            rowKey(partner.team, partner.player),
            nextCol,
            partner.side,
          )
          return {
            score: nextScore,
            server: partner,
            grid,
            firstHandUsed: true,
          }
        } else {
          // Second hand lost → hand-out to other team
          const t = otherTeam(cur.team)
          const nextServer: Server = {
            team: t,
            player: 1,
            side: 'R',
            handIndex: 0,
          }
          // Pre-write R/L for the new server
          const nextCol = nextScore[t]
          grid = writeCell(grid, rowKey(t, 1), nextCol, nextServer.side)
          return {
            score: nextScore,
            server: nextServer,
            grid,
            firstHandUsed: true,
          }
        }
      }
    }),

    undoOnce: assign(({ context }) => popSnapshot(context)),
  },
  guards: {
    gameEnded: ({ context }) => {
      const { A, B } = context.score
      const target = context.maxPoints
      if (A < target && B < target) return false
      return Math.abs(A - B) >= context.winBy
    },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5SwI4FcCGsAWBaCA9mgEYA2cAxAKoByAIgPIDaADALqKgAOBsAlgBc+BAHacQAD0QBmAOwA6AIwsArABYAbAA5ZKgDQgAnjI0r5LAJxzTAJhU6tFlhoC+Lg6kw58RMpQBKAKIAyoEAKqwcSCA8-EKi4lIIuBqK5po6+kaIKorS8tJaNkWyug4Wim4e6Fh4hCTksPJ8EOQUoWFUAAoA+mGBAIIAssGR4rGCwmLRSTYa+bIW2roGxghqWlryThpzKnblzlUgnrU+DXDyAE5gGBCG7WED-mE9AOLDgWPRE-HToEl1Pl9tI1HIsmsNlsdnsDrJHEd3Ccat56n4mnwRF1SBgHv4BgAZAkATR6AHUGDRvtxeJMEjMcvN5LIWNJFHZVog8ix5CpjqdUb5Gs0sTiHgBhAkASXFAGkev4GGTqTFaX9EogtIoFKyYRDEDYbAoNIsWUb7PCdvyUXUhZdMdjcRQCeEVb8phqEA55FppDZWez9etdttlNrFCoWIdXEiBbaLk0AMbYMCJgDWFDdao9DIQQN5NlB4M5XrUvOtXnj6PkydTGaYiiiNLiOYBOTBBaLK2yCDsaRhtgtCJjSJEBAgcHEcfO6PG2fpbeSygs6WWQZSFbOaOFLXIc5bC8kXK0PJsS0yJdyNgKRRKZUtlVjNpnwpudzWzbp-yP62kZhULJshyPZXjexRGvejiPtUlYvvaoq4vuX6erIahlmodjwoGJZyGkEa7IO0aboKCY1im6ZIequZgjyAEBsBayFiuxTsoRlqIjBW52k0UAYAAtmADAAG5gFclGtj+shzOY6hriWWrlm4LhAA */
  id: 'squash-doubles',
  initial: 'idle',
  context: () => ({
    players: {
      A1: 'A1',
      A2: 'A2',
      B1: 'B1',
      B2: 'B2',
      teamA: 'Team A',
      teamB: 'Team B',
    },
    score: { A: 0, B: 0 },
    server: { team: 'A', player: 1, side: 'R', handIndex: 0 as const },
    maxPoints: 15,
    winBy: 1,
    grid: initialGrid(),
    firstHandUsed: false,
    history: [],
  }),
  on: {
    UNDO: { actions: 'undoOnce', target: '.inPlay' },
    RESET: { target: '.idle' },
  },
  states: {
    idle: {
      on: {
        SETUP_TEAMS: {
          actions: [
            {
              type: 'assignTeams',
              params: ({ event: { players } }) => ({ players }),
            },
          ],
          target: 'ready',
        },
      },
    },
    ready: {
      on: {
        START_GAME: {
          actions: [
            {
              type: 'startGame',
              params: ({ event: { firstServer, maxPoints, winBy } }) => ({
                firstServer,
                maxPoints,
                winBy,
              }),
            },
          ],
          target: 'inPlay',
        },
      },
    },
    inPlay: {
      on: {
        RALLY_WON: {
          actions: [
            'snapshot',
            {
              type: 'rallyWon',
              params: ({ event: { winner } }) => ({ winner }),
            },
          ],
          target: 'check',
        },
        CLICK_ROW: {
          actions: [
            { type: 'clickRow', params: ({ event: { row } }) => ({ row }) },
          ],
        },
        TOGGLE_SERVE_SIDE: {
          actions: ['toggleServeSide'],
        },
        LET: {},
      },
    },
    check: {
      always: [
        { guard: 'gameEnded', target: 'awaitingConfirmation' },
        { target: 'inPlay' },
      ],
    },
    awaitingConfirmation: {
      on: {
        CONFIRM_GAME_OVER: { target: 'gameOver' },
        // UNDO is handled globally and will transition back to inPlay
      },
    },
    gameOver: { type: 'final' },
  },
})

// (Intentionally no exported selectors here. Use SquashMachineContext.useSelector in custom hooks.)
