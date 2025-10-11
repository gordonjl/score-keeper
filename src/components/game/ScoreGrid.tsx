import { useMemo } from 'react'
import { useSelector } from '@xstate/react'
import { useStore } from '@livestore/react'
import { gameById$, ralliesByGame$ } from '../../livestore/squash-queries'
import { getOrderedRows } from './utils'
import type { ActorRefFrom } from 'xstate'
import type { Game, squashGameMachine } from '../../machines/squashGameMachine'
import type {
  ActivityGrid,
  Cell,
  PlayerRow,
  RowKey,
  Score,
  Server,
  Side,
  Team,
} from '../../machines/squashMachine.types'

type ScoreGridProps = {
  actorRef: ActorRefFrom<typeof squashGameMachine>
  firstServingTeam: 'A' | 'B'
  playerLabels: Record<string, string>
}

const MAX_COLS = 15

// ===== Grid Building Utilities =====
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

const rowKey = (team: Team, player: PlayerRow): RowKey => `${team}${player}`

const flip = (side: Side): Side => (side === 'R' ? 'L' : 'R')

const otherTeam = (team: Team): Team => (team === 'A' ? 'B' : 'A')

const colForTeamServe = (score: Score, team: Team): number => score[team]

type RallyState = {
  score: Score
  server: Server
  grid: ActivityGrid
  firstHandUsed: boolean
}

type RallyData = {
  winner: Team
  rallyNumber: number
  serverTeam: Team
  serverPlayer: PlayerRow
  serverSide: Side
  serverHandIndex: 0 | 1
}

/**
 * Process a single rally and return the next grid state.
 * Pure function that takes current state and rally data.
 */
const processRally = (state: RallyState, rally: RallyData): RallyState => {
  const cur = state.server
  const col = colForTeamServe(state.score, cur.team)
  const currentRow = rowKey(cur.team, cur.player)
  const winner = rally.winner

  // Server won the rally
  if (winner === cur.team) {
    const nextScore: Score = {
      ...state.score,
      [winner]: state.score[winner] + 1,
    }
    const nextServer: Server = { ...cur, side: flip(cur.side) }
    const nextCol = nextScore[cur.team]
    const nextGrid = writeCell(state.grid, currentRow, nextCol, nextServer.side)

    return {
      score: nextScore,
      server: nextServer,
      grid: nextGrid,
      firstHandUsed: state.firstHandUsed,
    }
  }

  // Receiving team won - add slash to current cell
  const existingCell = state.grid[currentRow][col]
  const slashedCell: Cell = `${existingCell}/` as Cell
  const gridWithSlash = writeCell(state.grid, currentRow, col, slashedCell)

  const nextScore: Score = {
    A: winner === 'A' ? state.score.A + 1 : state.score.A,
    B: winner === 'B' ? state.score.B + 1 : state.score.B,
  }

  // First-hand exception at 0-0
  const isStartOfGame = state.score.A === 0 && state.score.B === 0
  if (isStartOfGame && !state.firstHandUsed) {
    const partnerRow = rowKey(cur.team, cur.player === 1 ? 2 : 1)
    const gridWithPartnerSlash = writeCell(gridWithSlash, partnerRow, 0, '/')

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
      score: nextScore,
      server: nextServer,
      grid: finalGrid,
      firstHandUsed: true,
    }
  }

  // First hand lost (not start of game)
  if (cur.handIndex === 0 && !state.firstHandUsed) {
    const partnerRow = rowKey(cur.team, cur.player === 1 ? 2 : 1)
    const gridWithPartnerSlash = writeCell(gridWithSlash, partnerRow, col, '/')

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
    const nextCol = state.score[cur.team]
    const finalGrid = writeCell(
      gridWithX,
      rowKey(partner.team, partner.player),
      nextCol,
      partner.side,
    )

    return {
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
    score: nextScore,
    server: nextServer,
    grid: finalGrid,
    firstHandUsed: true,
  }
}

/**
 * Build grid from rallies by replaying them sequentially.
 */
const buildGridFromRallies = (
  rallies: ReadonlyArray<RallyData>,
  initialServer: Server,
  firstHandUsed: boolean,
): ActivityGrid => {
  // Write initial serve position to column 0
  const gridWithInitialServe = writeCell(
    initialGrid(),
    rowKey(initialServer.team, initialServer.player),
    0,
    initialServer.side,
  )

  const initialState: RallyState = {
    grid: gridWithInitialServe,
    score: { A: 0, B: 0 },
    server: initialServer,
    firstHandUsed,
  }

  // Replay all rallies
  const finalState = rallies.reduce(
    (state, rally) => processRally(state, rally),
    initialState,
  )

  return finalState.grid
}

// Inner component that only renders when gameId is available
const ScoreGridContent = ({
  gameId,
  firstServingTeam,
  playerLabels,
  actorRef,
}: ScoreGridProps & { gameId: string }) => {
  const { store } = useStore()

  // Get isGameOver from machine context
  const isGameOver = useSelector(actorRef, (s) => s.status === 'done')

  // Query game data and rallies from LiveStore (only called when gameId is valid)
  const gameData = store.useQuery(gameById$(gameId)) as Game
  const ralliesData = store.useQuery(ralliesByGame$(gameId))

  // Extract game state from LiveStore
  const scoreA = gameData.scoreA
  const scoreB = gameData.scoreB
  const server: Server = {
    team: gameData.currentServerTeam as Team,
    player: gameData.currentServerPlayer as PlayerRow,
    side: gameData.currentServerSide as Side,
    handIndex: gameData.currentServerHandIndex as 0 | 1,
  }

  // Build grid from rallies
  const grid = useMemo(() => {
    if (ralliesData.length === 0) {
      // No rallies yet - show current server position from game state
      return writeCell(
        initialGrid(),
        rowKey(server.team, server.player),
        0,
        server.side,
      )
    }

    // Map rallies to the format needed for processing
    const processableRallies: Array<RallyData> = ralliesData.map((rally) => ({
      winner: rally.winner as Team,
      rallyNumber: rally.rallyNumber,
      serverTeam: rally.serverTeam as Team,
      serverPlayer: rally.serverPlayer as PlayerRow,
      serverSide: rally.serverSide as Side,
      serverHandIndex: rally.serverHandIndex as 0 | 1,
    }))

    // Get initial server from first rally or use game context
    const firstRally = processableRallies[0]
    const initialServer: Server = {
      team: firstRally.serverTeam,
      player: firstRally.serverPlayer,
      side: firstRally.serverSide,
      handIndex: 0,
    }

    // When replaying rallies, always start with firstHandUsed: false
    // The flag will be computed correctly during replay
    return buildGridFromRallies(processableRallies, initialServer, false)
  }, [
    gameId,
    ralliesData,
    firstServingTeam,
    server.side,
    server.team,
    server.player,
  ])

  // Compute derived values
  const rows = useMemo(
    () => getOrderedRows(firstServingTeam),
    [firstServingTeam],
  )
  const serverRowKey = `${server.team}${server.player}` as RowKey
  const serverTeam = server.team
  const handIndex = server.handIndex

  const onToggleServeSide = () => {
    actorRef.send({ type: 'TOGGLE_SERVE_SIDE', game: gameData })
  }
  const renderCell = (row: RowKey, col: number) => {
    const cell = grid[row][col]
    // Highlight the cell at the current server's position
    // Use the serving team's score as the column
    const serverScore = serverTeam === 'A' ? scoreA : scoreB
    const isActive = row === serverRowKey && col === serverScore

    // Cell is clickable only at hand-in (handIndex === 0 AND this is the first serve of the hand)
    // We check if the previous column is empty to determine if this is truly the first serve
    const prevCol = (serverTeam === 'A' ? scoreA : scoreB) - 1
    const isFirstServeOfHand = prevCol < 0 || !grid[serverRowKey][prevCol]
    const isClickable =
      isActive && handIndex === 0 && isFirstServeOfHand && !isGameOver

    // Check if this is a merged X cell
    const teamRowKey = (row.startsWith('A') ? 'A' : 'B') as RowKey
    const teamCell = grid[teamRowKey][col]
    const isTopOfTeam = row === 'A1' || row === 'B1'
    const isBottomOfTeam = row === 'A2' || row === 'B2'

    // If top row has X, merge with bottom
    if (isTopOfTeam && teamCell === 'X') {
      return (
        <td
          key={`${row}-${col}`}
          rowSpan={2}
          className={`border border-base-300 p-0.5 sm:p-1 text-center text-xs sm:text-sm min-w-[28px] sm:min-w-[32px] ${
            isActive ? 'bg-primary/20 font-bold' : ''
          }`}
        >
          X
        </td>
      )
    }

    // If bottom row and top has X, skip rendering (already merged)
    if (isBottomOfTeam && grid[teamRowKey][col] === 'X') {
      return null
    }

    const handleClick = () => {
      if (isClickable) {
        onToggleServeSide()
      }
    }

    return (
      <td
        key={`${row}-${col}`}
        onClick={handleClick}
        className={`border border-base-300 p-0.5 sm:p-1 text-center text-xs sm:text-sm min-w-[28px] sm:min-w-[32px] ${
          isActive ? 'bg-primary/20 font-bold' : ''
        } ${isClickable ? 'cursor-pointer hover:bg-primary/40' : ''}`}
        title={isClickable ? 'Click to toggle R/L' : ''}
      >
        {cell || ''}
      </td>
    )
  }

  return (
    <div className="card bg-base-100 shadow-xl mb-4 border border-base-300">
      <div className="card-body p-2 sm:p-4">
        <div className="overflow-x-auto -mx-2 sm:mx-0 rounded-lg">
          <table className="table table-xs w-full">
            <thead>
              <tr>
                <th className="border border-base-300 p-1 text-center sticky left-0 bg-base-200 z-10 min-w-[60px] sm:min-w-[80px] font-bold">
                  <span className="text-[10px] sm:text-xs">Player</span>
                </th>
                {Array.from({ length: MAX_COLS }, (_, i) => (
                  <th
                    key={i}
                    className="border border-base-300 p-1 text-center text-[10px] sm:text-xs min-w-[28px] sm:min-w-[32px] bg-base-200 font-bold"
                  >
                    {i}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row}>
                  <td className="border border-base-300 p-1 font-bold sticky left-0 bg-base-200 z-10">
                    <div className="flex flex-col">
                      <span className="text-[10px] sm:text-xs text-primary font-semibold">
                        {row}
                      </span>
                      <span className="text-xs sm:text-sm truncate max-w-[50px] sm:max-w-[70px]">
                        {playerLabels[row]}
                      </span>
                    </div>
                  </td>
                  {Array.from({ length: MAX_COLS }, (_, col) =>
                    renderCell(row, col),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Wrapper component that checks for gameId before rendering
export const ScoreGrid = ({
  actorRef,
  firstServingTeam,
  playerLabels,
}: ScoreGridProps) => {
  // Get gameId from machine context
  const gameId = useSelector(actorRef, (s) => s.context.gameId)

  // Show loading state if game not loaded yet
  if (!gameId) {
    return (
      <div className="card bg-base-100 shadow-xl mb-4 border border-base-300">
        <div className="card-body p-2 sm:p-4">
          <div className="flex justify-center items-center">
            <span className="loading loading-spinner loading-sm"></span>
          </div>
        </div>
      </div>
    )
  }

  // Render content component with valid gameId
  return (
    <ScoreGridContent
      gameId={gameId}
      actorRef={actorRef}
      firstServingTeam={firstServingTeam}
      playerLabels={playerLabels}
    />
  )
}
