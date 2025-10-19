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

/**
 * Abbreviates a full name to first initial + last name (e.g., "John Gordon" -> "J. Gordon")
 * If no last name is provided, returns the full first name (e.g., "John" -> "John")
 * Useful for responsive layouts where space is limited
 */
export const abbreviateName = (firstName: string, lastName: string): string => {
  const firstNameTrimmed = firstName.trim()
  const lastNameTrimmed = lastName.trim()

  // If no last name, return full first name
  if (!lastNameTrimmed) {
    return firstNameTrimmed
  }

  // If no first name, return last name
  if (!firstNameTrimmed) {
    return lastNameTrimmed
  }

  // Both names present: abbreviate to initial + last name
  const firstInitial = firstNameTrimmed.charAt(0)
  return `${firstInitial}. ${lastNameTrimmed}`
}

/**
 * Formats a team name with abbreviated player names for responsive display
 * e.g., "J. Gordon & M. Smith"
 */
export const formatTeamNameAbbreviated = (
  player1FirstName: string,
  player1LastName: string,
  player2FirstName: string,
  player2LastName: string,
): string => {
  const hasNames =
    player1FirstName || player1LastName || player2FirstName || player2LastName
  if (!hasNames) return 'Team (Names not set)'

  const player1 = abbreviateName(player1FirstName, player1LastName)
  const player2 = abbreviateName(player2FirstName, player2LastName)
  return `${player1} & ${player2}`
}

/**
 * Formats a full team name
 * e.g., "John Gordon & Mike Smith"
 */
export const formatTeamNameFull = (
  player1FirstName: string,
  player1LastName: string,
  player2FirstName: string,
  player2LastName: string,
): string => {
  const hasNames =
    player1FirstName || player1LastName || player2FirstName || player2LastName
  if (!hasNames) return 'Team (Names not set)'

  const player1 = `${player1FirstName.trim()} ${player1LastName.trim()}`.trim()
  const player2 = `${player2FirstName.trim()} ${player2LastName.trim()}`.trim()
  return `${player1} & ${player2}`
}
