import { TeamRows } from './TeamRows'
import type {
  ActivityGrid,
  RowKey,
  Team,
} from '../../machines/squashMachine.types'

type ScoreTableProps = {
  grid: ActivityGrid
  rows: ReadonlyArray<RowKey>
  playerLabels: Record<string, string>
  serverRowKey: RowKey
  serverScore: number
  handIndex: 0 | 1
  isGameOver: boolean
  onToggleServeSide: () => void
  maxCols: number
}

type TeamPair = {
  team: Team
  player1: RowKey
  player2: RowKey
}

/**
 * Group consecutive rows into team pairs.
 * Rows come in order like ['A1', 'A2', 'B1', 'B2'] or ['B2', 'B1', 'A1', 'A2']
 * We need to identify which consecutive pairs belong to the same team.
 */
const groupRowsIntoTeamPairs = (
  rows: ReadonlyArray<RowKey>,
): Array<TeamPair> => {
  const pairs: Array<TeamPair> = []

  for (let i = 0; i < rows.length - 1; i += 2) {
    const player1 = rows[i]
    const player2 = rows[i + 1]

    const team = player1.startsWith('A') ? 'A' : 'B'

    pairs.push({
      team,
      player1,
      player2,
    })
  }

  return pairs
}

export const ScoreTable = ({
  grid,
  rows,
  playerLabels,
  serverRowKey,
  serverScore,
  handIndex,
  isGameOver,
  onToggleServeSide,
  maxCols,
}: ScoreTableProps) => {
  const teamPairs = groupRowsIntoTeamPairs(rows)

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
                {Array.from({ length: maxCols }, (_, i) => (
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
              {teamPairs.map((pair) => (
                <TeamRows
                  key={pair.team}
                  team={pair.team}
                  player1Key={pair.player1}
                  player2Key={pair.player2}
                  grid={grid}
                  playerLabels={playerLabels}
                  serverRowKey={serverRowKey}
                  serverScore={serverScore}
                  handIndex={handIndex}
                  isGameOver={isGameOver}
                  onToggleServeSide={onToggleServeSide}
                  maxCols={maxCols}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
