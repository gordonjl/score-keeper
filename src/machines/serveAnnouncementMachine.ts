import { assign, setup } from 'xstate'
import type { PlayerRow, Side, Team } from './squashMachine.types'

// ===== Types =====
type GameData = {
  id: string
  matchId: string
  currentServerTeam: Team
  currentServerPlayer: PlayerRow
  currentServerSide: Side
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

// ===== Context =====
type Context = {
  game: GameData
  match: MatchData
  games: ReadonlyArray<GameData>
  rallies: ReadonlyArray<RallyData>
  serverName: string
  hasServedBefore: boolean
  announcement: string
}

// ===== Input =====
type Input = {
  game: GameData
  match: MatchData
  games: ReadonlyArray<GameData>
  rallies: ReadonlyArray<RallyData>
}

// ===== Events =====
type Events = {
  type: 'UPDATE'
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

const computeAnnouncement = (context: Context): string => {
  const { game, match, games, serverName, hasServedBefore } = context

  // Compute score phrase
  const serverScore = game.currentServerTeam === 'A' ? game.scoreA : game.scoreB
  const receiverScore =
    game.currentServerTeam === 'A' ? game.scoreB : game.scoreA
  const scorePhrase =
    serverScore === receiverScore
      ? `${toWords(serverScore)} All`
      : `${toWords(serverScore)}–${toWords(receiverScore)}`

  // Compute side name
  const sideName = game.currentServerSide === 'R' ? 'Right' : 'Left'

  // Build base announcement
  let announcement = hasServedBefore
    ? `${scorePhrase}, from the ${sideName}`
    : `${scorePhrase}, ${serverName} to Serve from the ${sideName}`

  // Add game/match ball suffix
  if (isMatchBall(game, games, match)) {
    announcement += ', Match Ball'
  } else if (isGameBall(game)) {
    announcement += ', Game Ball'
  }

  return announcement
}

// ===== State Machine =====
export const serveAnnouncementMachine = setup({
  types: {
    context: {} as Context,
    input: {} as Input,
    events: {} as Events,
  },
  actions: {
    updateContext: assign(
      (
        _,
        params: {
          game: GameData
          match: MatchData
          games: ReadonlyArray<GameData>
          rallies: ReadonlyArray<RallyData>
        },
      ) => ({
        game: params.game,
        match: params.match,
        games: params.games,
        rallies: params.rallies,
        serverName: getServerName(
          params.game.currentServerTeam,
          params.game.currentServerPlayer,
          params.match,
        ),
        hasServedBefore: computeHasServedBefore(
          params.game.matchId,
          params.game.currentServerTeam,
          params.game.currentServerPlayer,
          params.games,
          params.rallies,
        ),
      }),
    ),
    computeAnnouncement: assign(({ context }) => ({
      announcement: computeAnnouncement(context),
    })),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5SzAJwG5gIIDscHsBXHAYzAFswcAXAOgEMTqBLTAYgFUAFAESwBUAogH0AyoIBKANUkBtAAwBdRKAAO+WMxb4cKkAA9EAFgBMAGhABPRAEYTADloBWea-kA2dzfvynTgOwAvsEWBBBweigY2HhEpBRU1Hrqmtq6SAaIALTuFtYIWU60AJylZeVl9u4hIFGYuATEZJQ0DEysYMkaWsw6eoYIpSVOAMx2I-L2pUbuI8V5iCZO7iUeJv4jJvLrNv7FTsHBQA */
  id: 'serveAnnouncement',
  initial: 'active',
  context: ({ input }) => ({
    game: input.game,
    match: input.match,
    games: input.games,
    rallies: input.rallies,
    serverName: getServerName(
      input.game.currentServerTeam,
      input.game.currentServerPlayer,
      input.match,
    ),
    hasServedBefore: computeHasServedBefore(
      input.game.matchId,
      input.game.currentServerTeam,
      input.game.currentServerPlayer,
      input.games,
      input.rallies,
    ),
    announcement: '',
  }),
  entry: 'computeAnnouncement',
  states: {
    active: {
      on: {
        UPDATE: {
          actions: [
            {
              type: 'updateContext',
              params: ({ event }) => ({
                game: event.game,
                match: event.match,
                games: event.games,
                rallies: event.rallies,
              }),
            },
            'computeAnnouncement',
          ],
        },
      },
    },
  },
})
