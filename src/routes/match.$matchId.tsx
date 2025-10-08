import { ClientOnly, Outlet, createFileRoute } from '@tanstack/react-router'
import { LiveStoreMatchProvider } from '../contexts/LiveStoreMatchContext'
import type { MatchId } from '../db/types'

export const Route = createFileRoute('/match/$matchId')({
  component: MatchRoute,
})

function MatchRoute() {
  const { matchId } = Route.useParams()

  return (
    <ClientOnly fallback={null}>
      <LiveStoreMatchProvider matchId={matchId as MatchId}>
        <Outlet />
      </LiveStoreMatchProvider>
    </ClientOnly>
  )
}
