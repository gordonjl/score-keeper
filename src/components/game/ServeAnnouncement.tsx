import { useQuery } from '@livestore/react'
import { useSelector } from '@xstate/react'
import { gameById$, matchById$ } from '../../livestore/squash-queries'
import { toWords } from './utils'
import type { ActorRefFrom } from 'xstate'
import type { Game, squashGameMachine } from '../../machines/squashGameMachine'

type ServeAnnouncementProps = {
  actorRef: ActorRefFrom<typeof squashGameMachine>
}

// Inner component that only renders when gameId is available
const ServeAnnouncementContent = ({ gameId }: { gameId: string }) => {
  // Query game and match data from LiveStore (only called when gameId is valid)
  const game = useQuery(gameById$(gameId)) as Game
  const match = useQuery(matchById$(game.matchId))

  // Get server and score from LiveStore
  const server = {
    team: game.currentServerTeam as 'A' | 'B',
    player: game.currentServerPlayer as 1 | 2,
    side: game.currentServerSide as 'R' | 'L',
  }
  const scoreA = game.scoreA
  const scoreB = game.scoreB

  // Compute announcement
  const serverRowKey = `${server.team}${server.player}` as const
  const serverScore = server.team === 'A' ? scoreA : scoreB
  const receiverScore = server.team === 'A' ? scoreB : scoreA
  const scorePhrase =
    serverScore === receiverScore
      ? `${toWords(serverScore)} All`
      : `${toWords(serverScore)}–${toWords(receiverScore)}`

  // Get server name from match data
  const serverName =
    serverRowKey === 'A1'
      ? match.playerA1LastName || match.playerA1FirstName
      : serverRowKey === 'A2'
        ? match.playerA2LastName || match.playerA2FirstName
        : serverRowKey === 'B1'
          ? match.playerB1LastName || match.playerB1FirstName
          : match.playerB2LastName || match.playerB2FirstName
  const sideName = server.side === 'R' ? 'Right' : 'Left'
  const announcement = `${scorePhrase}, ${serverName} to Serve from the ${sideName}`

  return (
    <div className="alert mb-4">
      <span className="font-medium">{announcement}</span>
    </div>
  )
}

// Wrapper component that checks for gameId before rendering
export const ServeAnnouncement = ({ actorRef }: ServeAnnouncementProps) => {
  // Get gameId from machine context
  const gameId = useSelector(actorRef, (s) => s.context.gameId)

  // Show loading state if game not loaded yet
  if (!gameId) {
    return (
      <div className="alert mb-4">
        <span className="loading loading-spinner loading-sm"></span>
      </div>
    )
  }

  // Render content component with valid gameId
  return <ServeAnnouncementContent gameId={gameId} />
}
