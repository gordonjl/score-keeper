import {
  formatTeamNameAbbreviated,
  formatTeamNameFull,
} from '../../utils/nameUtils'

type MatchData = {
  playerA1FirstName: string
  playerA1LastName: string
  playerA2FirstName: string
  playerA2LastName: string
  playerB1FirstName: string
  playerB1LastName: string
  playerB2FirstName: string
  playerB2LastName: string
}

/**
 * Get a player's display name, preferring last name over first name
 */
const getPlayerName = (firstName: string, lastName: string): string =>
  lastName || firstName

/**
 * Get formatted team names for display (full names)
 * Prefers last names, falls back to first names if last name is empty
 */
export const getTeamNames = (match: MatchData) => ({
  teamA: `${getPlayerName(match.playerA1FirstName, match.playerA1LastName)} & ${getPlayerName(match.playerA2FirstName, match.playerA2LastName)}`,
  teamB: `${getPlayerName(match.playerB1FirstName, match.playerB1LastName)} & ${getPlayerName(match.playerB2FirstName, match.playerB2LastName)}`,
})

/**
 * Get abbreviated team names for responsive display (e.g., "J. Gordon & M. Smith")
 */
export const getTeamNamesAbbreviated = (match: MatchData) => ({
  teamA: formatTeamNameAbbreviated(
    match.playerA1FirstName,
    match.playerA1LastName,
    match.playerA2FirstName,
    match.playerA2LastName,
  ),
  teamB: formatTeamNameAbbreviated(
    match.playerB1FirstName,
    match.playerB1LastName,
    match.playerB2FirstName,
    match.playerB2LastName,
  ),
})

/**
 * Get full team names for display
 */
export const getTeamNamesFull = (match: MatchData) => ({
  teamA: formatTeamNameFull(
    match.playerA1FirstName,
    match.playerA1LastName,
    match.playerA2FirstName,
    match.playerA2LastName,
  ),
  teamB: formatTeamNameFull(
    match.playerB1FirstName,
    match.playerB1LastName,
    match.playerB2FirstName,
    match.playerB2LastName,
  ),
})

/**
 * Get ultra-compact team names for very small screens (e.g., "biggles & busver")
 * Truncates last names to 7 characters max
 */
export const getTeamNamesCompact = (match: MatchData) => {
  const truncate = (name: string, maxLen: number = 7) =>
    name.length > maxLen ? name.substring(0, maxLen) : name

  const player1A = getPlayerName(
    match.playerA1FirstName,
    match.playerA1LastName,
  )
  const player2A = getPlayerName(
    match.playerA2FirstName,
    match.playerA2LastName,
  )
  const player1B = getPlayerName(
    match.playerB1FirstName,
    match.playerB1LastName,
  )
  const player2B = getPlayerName(
    match.playerB2FirstName,
    match.playerB2LastName,
  )

  return {
    teamA: `${truncate(player1A)} & ${truncate(player2A)}`,
    teamB: `${truncate(player1B)} & ${truncate(player2B)}`,
  }
}
