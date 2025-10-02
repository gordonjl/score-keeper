import { createActorContext } from '@xstate/react'
import { squashMachine } from '../machines/squashMachine'

// XState v5: create a React Context that provides an interpreter for the machine
// Usage:
// - const [state, send] = SquashMachineContext.useActor()
// - const value = SquashMachineContext.useSelector((s) => s.context.score)
// - const actorRef = SquashMachineContext.useActorRef()
export const SquashMachineContext = createActorContext(squashMachine)
