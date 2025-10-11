// ===== Shared Types for Squash Game =====
export type Team = 'A' | 'B'
export type PlayerRow = 1 | 2
export type Side = 'R' | 'L'
export type RowKey = 'A1' | 'A2' | 'B1' | 'B2'
export type Cell = '' | 'R' | 'L' | 'R/' | 'L/' | 'X' | '/'

export type PlayerName = {
  firstName: string
  lastName: string
  fullName: string // computed: "firstName lastName"
}

export type PlayerNameMap = {
  A1: PlayerName
  A2: PlayerName
  B1: PlayerName
  B2: PlayerName
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

// ===== Helper Functions =====
export const otherTeam = (t: Team): Team => (t === 'A' ? 'B' : 'A')
export const flip = (s: Side): Side => (s === 'R' ? 'L' : 'R')
export const rowKey = (team: Team, player: PlayerRow): RowKey =>
  `${team}${player}` as RowKey
