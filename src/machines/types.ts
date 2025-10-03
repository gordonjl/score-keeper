// Shared types for match and game machines

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
