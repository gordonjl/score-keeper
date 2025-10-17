import { useEffect } from 'react'
import { queryDb } from '@livestore/livestore'
import { useMachine, useSelector } from '@xstate/react'
import { useQuery } from '@livestore/react'

import {
  gameById$,
  gamesByMatch$,
  matchById$,
} from '../../livestore/squash-queries'
import { squashTables } from '../../livestore/tables'
import { serveAnnouncementMachine } from '../../machines/serveAnnouncementMachine'

type ServeAnnouncementProps = {
  gameId: string
}

export const ServeAnnouncement = ({ gameId }: ServeAnnouncementProps) => {
  // Query game and match data from LiveStore
  const game = useQuery(gameById$(gameId))
  const match = useQuery(matchById$(game.matchId))
  const games = useQuery(gamesByMatch$(game.matchId))

  // Query all rallies (machine will filter to match)
  const rallies = useQuery(
    queryDb(() => squashTables.rallies.where({ deletedAt: null }), {
      label: 'all-rallies',
    }),
  )

  // Initialize state machine
  const [, send, announcementActorRef] = useMachine(serveAnnouncementMachine, {
    input: {
      game,
      match,
      games,
      rallies,
    },
  })

  // Update machine when game, match, games, or rallies change
  useEffect(() => {
    send({
      type: 'UPDATE',
      game,
      match,
      games,
      rallies,
    })
  }, [send, game, match, games, rallies])

  const announcement = useSelector(
    announcementActorRef,
    (state) => state.context.announcement,
  )

  return (
    <div className="alert mb-4">
      <span className="font-medium">{announcement}</span>
    </div>
  )
}
