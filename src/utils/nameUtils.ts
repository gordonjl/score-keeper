import type { PlayerName } from '../machines/squashMachine.types'

/**
 * Creates a PlayerName object from first and last names
 */
export const createPlayerName = (
  firstName: string,
  lastName: string,
): PlayerName => ({
  firstName: firstName.trim(),
  lastName: lastName.trim(),
  fullName: `${firstName.trim()} ${lastName.trim()}`,
})

/**
 * Gets the last name only for display in score sheets and announcements
 */
export const getLastName = (player: PlayerName): string => player.lastName

/**
 * Gets first initial + last name (e.g., "J. Gordon")
 */
export const getShortName = (player: PlayerName): string =>
  `${player.firstName.charAt(0)}. ${player.lastName}`

/**
 * Gets full name for display in headers and summaries
 */
export const getFullName = (player: PlayerName): string => player.fullName

/**
 * Truncates a name to a maximum length with ellipsis
 */
export const truncateName = (name: string, maxLength: number): string => {
  if (name.length <= maxLength) return name
  return `${name.substring(0, maxLength - 1)}…`
}
