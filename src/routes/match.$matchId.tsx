import { ClientOnly, Outlet, createFileRoute } from '@tanstack/react-router'
import { EventSourcedMatchProvider } from '../contexts/EventSourcedMatchContext'
import type { MatchId } from '../db/types'

export const Route = createFileRoute('/match/$matchId')({
  component: MatchLayout,
})

function MatchLayout() {
  const { matchId } = Route.useParams()

  return (
    <ClientOnly fallback={null}>
      <EventSourcedMatchProvider matchId={matchId as MatchId}>
        <Outlet />
      </EventSourcedMatchProvider>
    </ClientOnly>
  )
}
