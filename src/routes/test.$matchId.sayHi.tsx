import { Link, createFileRoute } from '@tanstack/react-router'
import { useActor, useSelector } from '@xstate/react'
import { useEffect } from 'react'
import { v4 as uuid } from 'uuid'
import { assign, setup } from 'xstate'

export const Route = createFileRoute('/test/$matchId/sayHi')({
  component: RouteComponent,
})

const mySillyMachine = setup({
  types: {
    context: {} as { val1: string | undefined; matchId: string | undefined },
    events: {} as { type: 'NEW_DATA_LOADED'; matchId: string },
  },
  actions: {
    assignNewData: assign((_, params: { matchId: string }) => ({
      matchId: params.matchId,
    })),
  },
}).createMachine({
  context: () => ({
    val1: undefined,
    matchId: undefined,
  }),
  initial: 'ready',
  states: {
    ready: {
      on: {
        NEW_DATA_LOADED: {
          actions: {
            type: 'assignNewData',
            params: ({ event }) => ({ matchId: event.matchId }),
          },
        },
      },
    },
  },
})

function RouteComponent() {
  const { matchId } = Route.useParams()
  return <MachineHost matchId={matchId} />
}

function MachineHost({ matchId }: { matchId: string }) {
  const [, send, actor] = useActor(mySillyMachine)

  useEffect(() => {
    send({ type: 'NEW_DATA_LOADED', matchId })
  }, [matchId])

  const machineState = useSelector(actor, (s) => ({ ...s.context }))

  return (
    <div>
      Hi. my context is {JSON.stringify(machineState)}
      <div>
        <Link to="/test/$matchId/sayHi" params={{ matchId: uuid() }}>
          Back to this page!
        </Link>
        <div>here's the matchid i got from the route: {matchId}</div>
      </div>
    </div>
  )
}
