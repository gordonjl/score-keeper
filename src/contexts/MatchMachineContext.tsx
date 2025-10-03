import { createActorContext } from '@xstate/react'
import { matchMachine } from '../machines/matchMachine'

export const MatchMachineContext = createActorContext(matchMachine)
