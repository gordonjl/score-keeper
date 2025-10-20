import type { PlayerRow, Side, Team } from '../../machines/squashMachine.types'

// ===== Types =====
type GameData = {
  id: string
  matchId: string
  currentServerTeam: Team
  currentServerPlayer: PlayerRow
  currentServerSide: Side
  currentServerHandIndex: 0 | 1
  scoreA: number
  scoreB: number
  maxPoints: number
  winBy: number
  status: string
  winner: Team | null
}

type RallyData = {
  gameId: string
  serverTeam: string
  serverPlayer: number
  scoreABefore: number
  scoreBBefore: number
  deletedAt: Date | null
}

type MatchData = {
  playerA1FirstName: string
  playerA1LastName: string
  playerA2FirstName: string
  playerA2LastName: string
  playerB1FirstName: string
  playerB1LastName: string
  playerB2FirstName: string
  playerB2LastName: string
  bestOf?: number
}

// ===== Public API =====
export type ServeAnnouncementInput = {
  game: GameData
  match: MatchData
  games: ReadonlyArray<GameData>
  rallies: ReadonlyArray<RallyData>
}

// ===== Helpers =====
const toWords = (num: number): string => {
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
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
    'Twenty',
  ]
  return words[num] || num.toString()
}

const getServerName = (
  serverTeam: Team,
  serverPlayer: PlayerRow,
  match: MatchData,
): string => {
  const serverRowKey = `${serverTeam}${serverPlayer}` as const

  switch (serverRowKey) {
    case 'A1':
      return match.playerA1LastName || match.playerA1FirstName
    case 'A2':
      return match.playerA2LastName || match.playerA2FirstName
    case 'B1':
      return match.playerB1LastName || match.playerB1FirstName
    case 'B2':
      return match.playerB2LastName || match.playerB2FirstName
    default:
      return ''
  }
}

const computeHasServedBefore = (
  matchId: string,
  serverTeam: Team,
  serverPlayer: PlayerRow,
  games: ReadonlyArray<GameData>,
  rallies: ReadonlyArray<RallyData>,
): boolean => {
  // Get game IDs for this match
  const gameIds = new Set(
    games.filter((g) => g.matchId === matchId).map((g) => g.id),
  )

  // Filter rallies to only those in this match
  const matchRallies = rallies.filter((rally) => gameIds.has(rally.gameId))

  // Check if this player has served before
  return matchRallies.some(
    (rally) =>
      rally.serverTeam === serverTeam && rally.serverPlayer === serverPlayer,
  )
}

const isGameBall = (game: GameData): boolean => {
  const { scoreA, scoreB, maxPoints, winBy } = game
  const higherScore = Math.max(scoreA, scoreB)
  const lowerScore = Math.min(scoreA, scoreB)

  // Check if either team is one point away from winning
  // Win condition: reach maxPoints AND lead by at least winBy
  if (higherScore >= maxPoints - 1) {
    // If already at or above maxPoints, need to be winBy ahead
    if (higherScore >= maxPoints) {
      return higherScore - lowerScore === winBy - 1
    }
    // One point away from maxPoints, and either:
    // - Already have required lead, or
    // - Will have required lead with one more point
    return higherScore - lowerScore >= winBy - 1
  }

  return false
}

const isMatchBall = (
  game: GameData,
  games: ReadonlyArray<GameData>,
  match: MatchData,
): boolean => {
  // First check if this is game ball
  if (!isGameBall(game)) {
    return false
  }

  // Count completed games won by each team
  const completedGames = games.filter((g) => g.status === 'completed')
  const gamesWonA = completedGames.filter((g) => g.winner === 'A').length
  const gamesWonB = completedGames.filter((g) => g.winner === 'B').length

  // Determine which team is ahead in the current game
  const leadingTeam = game.scoreA > game.scoreB ? 'A' : 'B'
  const leadingTeamGamesWon = leadingTeam === 'A' ? gamesWonA : gamesWonB

  // Check if winning this game would win the match
  // Default to best of 5 if not specified
  const bestOf = match.bestOf ?? 5
  const gamesToWin = Math.ceil(bestOf / 2)
  return leadingTeamGamesWon + 1 >= gamesToWin
}

/**
 * Generate a serve announcement for the current game state.
 *
 * @param input - Game, match, games, and rallies data
 * @returns Formatted serve announcement string
 */
export const generateServeAnnouncement = (
  input: ServeAnnouncementInput,
): string => {
  const { game, match, games, rallies } = input

  // Compute server name
  const serverName = getServerName(
    game.currentServerTeam,
    game.currentServerPlayer,
    match,
  )

  // Check if this player has served before in the match
  const hasServedBefore = computeHasServedBefore(
    game.matchId,
    game.currentServerTeam,
    game.currentServerPlayer,
    games,
    rallies,
  )

  // Compute score phrase
  const serverScore = game.currentServerTeam === 'A' ? game.scoreA : game.scoreB
  const receiverScore =
    game.currentServerTeam === 'A' ? game.scoreB : game.scoreA
  const scorePhrase =
    serverScore === receiverScore
      ? `${toWords(serverScore)} All`
      : `${toWords(serverScore)}–${toWords(receiverScore)}`

  // Determine if this is hand out (first serve of hand)
  // Hand out = handIndex 0 (first server) AND first serve at this score
  // BUT NOT the very first serve of the game (0-0, no rallies yet)
  const prevScore = serverScore - 1
  const gameRallies = rallies.filter(
    (r) => r.gameId === game.id && !r.deletedAt,
  )
  const hasServedAtPrevScore =
    prevScore >= 0 &&
    gameRallies.some((r) => {
      const rallyServerScore =
        r.serverTeam === 'A' ? r.scoreABefore : r.scoreBBefore
      return (
        r.serverTeam === game.currentServerTeam &&
        rallyServerScore === prevScore
      )
    })
  const isFirstServeOfHand = prevScore < 0 || !hasServedAtPrevScore
  const isVeryFirstServe =
    serverScore === 0 && receiverScore === 0 && gameRallies.length === 0
  const isHandOut =
    game.currentServerHandIndex === 0 && isFirstServeOfHand && !isVeryFirstServe

  // Very first serve of the match
  if (isVeryFirstServe) {
    return '"Love All"'
  }

  const sideName = game.currentServerSide === 'R' ? 'Right' : 'Left'

  // Build base announcement
  // Format: "Hand Out, Score" or "Score, from the Side"
  const baseAnnouncement = isHandOut
    ? hasServedBefore
      ? `${scorePhrase}, Choice`
      : `${scorePhrase}, ${serverName} to Serve. Choice`
    : hasServedBefore
      ? `${scorePhrase}, ${sideName}`
      : `${scorePhrase}, ${serverName} to Serve from the ${sideName}`

  // Add game/match ball suffix
  const suffix = isMatchBall(game, games, match)
    ? ', Match Ball'
    : isGameBall(game)
      ? ', Game Ball'
      : ''

  return `"${baseAnnouncement}${suffix}"`
}
