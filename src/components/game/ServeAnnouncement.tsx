import { useMemo } from 'react'
import { queryDb } from '@livestore/livestore'
import { useQuery } from '@livestore/react'

import {
  gameById$,
  gamesByMatch$,
  matchById$,
} from '../../livestore/squash-queries'
import { squashTables } from '../../livestore/tables'
import { generateServeAnnouncement } from './serve-announcement-utils'

type ServeAnnouncementProps = {
  gameId: string
}

export const ServeAnnouncement = ({ gameId }: ServeAnnouncementProps) => {
  // Query game and match data from LiveStore
  const game = useQuery(gameById$(gameId))
  const match = useQuery(matchById$(game.matchId))
  const games = useQuery(gamesByMatch$(game.matchId))

  // Query all rallies
  const rallies = useQuery(
    queryDb(() => squashTables.rallies.where({ deletedAt: null }), {
      label: 'all-rallies',
    }),
  )

  // Generate announcement from current data
  const announcement = useMemo(
    () => generateServeAnnouncement({ game, match, games, rallies }),
    [game, match, games, rallies],
  )

  return (
    <div className="alert mb-4">
      <span className="font-medium">{announcement}</span>
    </div>
  )
}
