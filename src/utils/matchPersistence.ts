export const ACTIVE_MATCH_KEY = 'squash-match-active'
const ARCHIVED_MATCHES_KEY = 'squash-matches-archived'

export const archiveCurrentMatch = () => {
  try {
    const activeMatch = localStorage.getItem(ACTIVE_MATCH_KEY)
    if (!activeMatch) {
      return
    }

    // Get existing archived matches
    const archivedMatchesJson = localStorage.getItem(ARCHIVED_MATCHES_KEY)
    const archivedMatches = archivedMatchesJson
      ? JSON.parse(archivedMatchesJson)
      : []

    // Add timestamp to the archived match
    const archivedMatch = {
      data: JSON.parse(activeMatch),
      archivedAt: new Date().toISOString(),
    }

    // Append to archived matches
    archivedMatches.push(archivedMatch)

    // Save back to localStorage
    localStorage.setItem(ARCHIVED_MATCHES_KEY, JSON.stringify(archivedMatches))

    // Remove active match
    localStorage.removeItem(ACTIVE_MATCH_KEY)
  } catch (error) {
    console.error('Failed to archive match:', error)
  }
}
