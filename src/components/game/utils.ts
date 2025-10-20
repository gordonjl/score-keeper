import type { RowKey } from '../../machines/squashMachine.types'

export const toWords = (n: number): string => {
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

export const getOrderedRows = (
  firstServingTeam: 'A' | 'B',
  teamAFirstServer: 1 | 2 | null,
  teamBFirstServer: 1 | 2 | null,
): Array<RowKey> => {
  // Default to player 1 if first server not yet set
  const teamAFirst = teamAFirstServer ?? 1
  const teamBFirst = teamBFirstServer ?? 1

  // Build team A rows based on who serves first
  const teamARows: Array<RowKey> =
    teamAFirst === 1 ? ['A1', 'A2'] : ['A2', 'A1']

  // Build team B rows based on who serves first
  const teamBRows: Array<RowKey> =
    teamBFirst === 1 ? ['B1', 'B2'] : ['B2', 'B1']

  // Return rows with first serving team on top
  return firstServingTeam === 'A'
    ? [...teamARows, ...teamBRows]
    : [...teamBRows, ...teamARows]
}

/**
 * Get display name for a player (prefer lastName, fallback to firstName)
 */
export const getPlayerDisplayName = (player: {
  firstName: string
  lastName: string
}): string => {
  return player.lastName || player.firstName
}
