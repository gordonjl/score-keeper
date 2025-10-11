import { useSelector } from '@xstate/react'
import { toWords } from './utils'
import type { ActorRefFrom } from 'xstate'
import type { squashGameMachine } from '../../machines/squashGameMachine'

type ServeAnnouncementProps = {
  actorRef: ActorRefFrom<typeof squashGameMachine>
}

export const ServeAnnouncement = ({ actorRef }: ServeAnnouncementProps) => {
  // Use a single selector for all state needed for announcement
  const { score, server, players } = useSelector(actorRef, (s) => ({
    score: s.context.score,
    server: s.context.server,
    players: s.context.players,
  }))

  // Compute announcement
  const serverRowKey = `${server.team}${server.player}` as const
  const serverScore = score[server.team]
  const receiverTeam = server.team === 'A' ? 'B' : 'A'
  const receiverScore = score[receiverTeam]
  const scorePhrase =
    serverScore === receiverScore
      ? `${toWords(serverScore)} All`
      : `${toWords(serverScore)}–${toWords(receiverScore)}`

  const serverPlayer = players[serverRowKey]
  const serverName =
    serverPlayer.lastName || serverPlayer.firstName || serverRowKey
  const sideName = server.side === 'R' ? 'Right' : 'Left'
  const announcement = `${scorePhrase}, ${serverName} to Serve from the ${sideName}`

  return (
    <div className="alert mb-4">
      <span className="font-medium">{announcement}</span>
    </div>
  )
}
