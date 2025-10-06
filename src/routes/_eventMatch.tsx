import { ClientOnly, Outlet, createFileRoute } from '@tanstack/react-router'
import { EventSourcedMatchProvider } from '../contexts/EventSourcedMatchContext'
import type { MatchId } from '../db/types'

export const Route = createFileRoute('/_eventMatch')({
  component: EventMatchLayout,
})

const EventMatchContent = ({ matchId }: { readonly matchId: MatchId }) => (
  <EventSourcedMatchProvider matchId={matchId}>
    <Outlet />
  </EventSourcedMatchProvider>
)

const EventMatchProviderClient = () => {
  // Get matchId from route params or create new match
  // For now, we'll need to pass this from a parent route
  // This is a placeholder - actual implementation will depend on routing structure
  
  const matchId = 'placeholder' as MatchId // TODO: Get from route params

  return <EventMatchContent matchId={matchId} />
}

function EventMatchLayout() {
  return (
    <ClientOnly fallback={null}>
      <EventMatchProviderClient />
    </ClientOnly>
  )
}
