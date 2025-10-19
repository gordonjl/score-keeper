import { useEffect, useMemo, useState } from 'react'
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

  // Animation state for announcement updates
  const [animate, setAnimate] = useState(false)

  // Trigger subtle animation when announcement changes
  useEffect(() => {
    setAnimate(true)
    const timer = setTimeout(() => setAnimate(false), 400)
    return () => clearTimeout(timer)
  }, [announcement])

  return (
    <div
      className="alert bg-primary text-primary-content shadow-lg mb-4 border-2 border-primary transition-all duration-300"
      style={{
        boxShadow: animate
          ? '0 0 0 3px rgba(45, 212, 191, 0.2), 0 0 25px rgba(45, 212, 191, 0.3), 0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          : undefined,
      }}
    >
      <div className="flex-1 text-center">
        <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold">
          {announcement}
        </span>
      </div>
    </div>
  )
}
