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

export const getOrderedRows = (firstServingTeam: 'A' | 'B'): Array<RowKey> => {
  return firstServingTeam === 'A'
    ? ['A1', 'A2', 'B1', 'B2']
    : ['B1', 'B2', 'A1', 'A2']
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
