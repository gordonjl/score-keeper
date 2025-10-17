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
 * Get formatted team names for display
 * Prefers last names, falls back to first names if last name is empty
 */
export const getTeamNames = (match: MatchData) => ({
  teamA: `${getPlayerName(match.playerA1FirstName, match.playerA1LastName)} & ${getPlayerName(match.playerA2FirstName, match.playerA2LastName)}`,
  teamB: `${getPlayerName(match.playerB1FirstName, match.playerB1LastName)} & ${getPlayerName(match.playerB2FirstName, match.playerB2LastName)}`,
})
