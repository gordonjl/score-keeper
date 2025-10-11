Here’s a tight implementation brief you can hand to an LLM to build the component the way you want it.

LLM Implementation Brief — React + XState “Controller Stays, Data Changes”

Goal

Implement a React component that owns a long-lived XState actor (via useMachine) and updates its data in response to route param changes (from TanStack Router) without remounting/restarting the actor. Treat route changes as events to the actor.

Why this behavior
• Keep side effects stable: sockets, debouncers, timers, in-flight requests, and subscriptions don’t reset on every URL tweak.
• Predictable lifecycle: the machine (feature controller) decides how to react to new data; React renders are just views.
• Testable transitions: route changes become explicit events (LOAD/NEW_DATA_LOADED) you can unit test.

When you would not want this
• If the machine models a session identity (e.g., “editing match X” where matchId defines which machine it is). In that case: remount or a supervisor that spawns a child per id.
• If you want a hard reset of context/effects on each param change (fresh slate UX).

Alternatives / Workarounds 1. Keyed remount (simple)
<MachineHost key={matchId} /> to force a new actor on id change. Trivial, but you lose continuity. 2. Supervisor → child-per-id (scalable)
A parent actor stops old child and spawns a new one on id change. Lets you cache past children if you want “back returns to previous state.” 3. Imperative restart (low-level)
Manually actorRef.stop() + .start() on param change. Easy to foot-gun; avoid unless you need that control.

Your preference (use this)
• Event-driven update: keep the same actor; on param change, send an event that updates context and triggers any loading you need.
• Event name: NEW_DATA_LOADED (or LOAD if it should fetch).
• Assign context with an assign action; do not rely on input after mount—input is only read at start.

⸻

Component Contract

Props / Inputs
• Reads matchId from TanStack Router params (Route.useParams()).
• On initial mount, seed the machine via input: { matchId, ... }.
• On subsequent param changes, do not remount; send event to actor.

Machine Requirements
• Types:
• context: at least { matchId: string; ... }
• input: same shape for initial seed
• events: { type: 'NEW_DATA_LOADED'; matchId: string } (and optionally LOAD with fetching)
• Behavior:
• On start: initialize context from input.
• On NEW_DATA_LOADED: update context.matchId (and any derived bits), remain in the same state or kick off a transition as needed.
• If fetching on change: handle LOAD → loading.invoke(fetch).onDone(assign).to(ready).

React Glue
• const [state, send, actor] = useMachine(machine, { input })
• useEffect(() => { if (state.context.matchId !== matchId) send({ type: 'NEW_DATA_LOADED', matchId }) }, [matchId, state.context.matchId, send])
• Use useSelector(actor, sel) to derive view data without extra renders.

⸻

Minimal Machine Example (no fetch)

import { setup, assign } from 'xstate'

export const matchController = setup({
types: {
context: {} as { matchId: string; val1: string },
input: {} as { matchId: string; val1: string },
events: {} as { type: 'NEW_DATA_LOADED'; matchId: string },
},
actions: {
assignNewData: ({ event }) =>
assign(({ context }) => ({
...context,
matchId: event.matchId,
})),
},
}).createMachine({
id: 'matchController',
context: ({ input }) => ({ matchId: input.matchId, val1: input.val1 }),
initial: 'ready',
states: {
ready: {
on: { NEW_DATA_LOADED: { actions: 'assignNewData' } },
},
},
})

Minimal Component Example

import { useEffect } from 'react'
import { useMachine, useSelector } from '@xstate/react'
import { Route } from './your-route-file'
import { matchController } from './machines/matchController'

export function RouteComponent() {
const { matchId } = Route.useParams()
return <MachineHost matchId={matchId} />
}

function MachineHost({ matchId }: { matchId: string }) {
const [state, send, actor] = useMachine(matchController, {
input: { val1: 'test', matchId },
})

useEffect(() => {
if (state.context.matchId !== matchId) {
send({ type: 'NEW_DATA_LOADED', matchId })
}
}, [matchId, state.context.matchId, send])

const ctx = useSelector(actor, s => s.context)
return <pre>{JSON.stringify(ctx, null, 2)}</pre>
}

⸻

If Fetch Is Required on Param Change (preferred shape)
• Rename event to LOAD to be semantically clear.
• Transition to loading, invoke fetch, then assign on done.

const machine = setup({
types: {
context: {} as { matchId: string; data?: unknown; error?: string },
input: {} as { matchId: string },
events: {} as { type: 'LOAD'; matchId: string },
},
guards: {},
actions: {
setMatchId: ({ event }) => assign(() => ({ matchId: event.matchId, error: undefined })),
setData: ({ event }) => assign(() => ({ data: event.output })),
setError: ({ event }) => assign(() => ({ error: String(event.error) })),
},
actors: {
fetchMatch: fromPromise(({ input, event }: any) =>
fetch(`/api/matches/${event.matchId}`).then(r => r.json())
),
},
}).createMachine({
initial: 'ready',
context: ({ input }) => ({ matchId: input.matchId }),
states: {
ready: {
on: { LOAD: { target: 'loading', actions: 'setMatchId' } },
},
loading: {
invoke: {
src: 'fetchMatch',
onDone: { target: 'ready', actions: 'setData' },
onError: { target: 'ready', actions: 'setError' },
},
},
},
})

React side:

useEffect(() => {
if (state.context.matchId !== matchId) {
send({ type: 'LOAD', matchId })
}
}, [matchId, state.context.matchId, send])

⸻

Do / Don’t

Do
• Treat router changes as events.
• Keep actor identity stable for feature controllers.
• Use assign to update context; keep transitions explicit.
• Use useSelector to minimize renders.

Don’t
• Assume input re-applies after mount (it does not).
• Remount by default; only do so if identity truly changed.
• Mix imperative .stop()/.start() unless you need that control.

⸻

Acceptance Criteria
• Initial render uses input.matchId.
• Changing matchId updates context.matchId without remount (verify via console or useRef mount counter).
• Optional: if LOAD is used, machine enters loading, then ready, and context.data reflects the new id’s payload.
• Side effects (e.g., a mock interval or websocket ref) remain intact across param changes.

⸻

Extensibility
• Later, introduce a supervisor if you need multiple concurrent sessions or cached children.
• Add guards if certain transitions should be ignored (e.g., duplicate matchId).
• Add a RESET event for manual hard resets while keeping the same actor identity.

⸻

Use this brief to guide the LLM: keep the actor alive, route changes → events, assign context or load as needed, and only remount when the route id is the session identity.
