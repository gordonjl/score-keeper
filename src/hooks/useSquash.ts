import { SquashMachineContext } from '../contexts/SquashMachineContext'
import { serveAnnouncement } from '../machines/squashMachine'
import type {
  ActivityGrid,
  PlayerNameMap,
  RowKey,
  Side,
} from '../machines/squashMachine'

// Select minimal, stable primitives to avoid unnecessary re-renders.
// Use in components: const col = useCurrentColumn()
export const useCurrentColumn = (): number =>
  SquashMachineContext.useSelector(
    (s) => s.context.score[s.context.server.team],
  )

export const useServerRowKey = (): RowKey =>
  SquashMachineContext.useSelector(
    (s) => `${s.context.server.team}${s.context.server.player}` as RowKey,
  )

export const useNextLogicalRowKey = (): RowKey =>
  SquashMachineContext.useSelector((s) => {
    const { server } = s.context
    if (server.handIndex === 0) {
      return `${server.team}${server.player === 1 ? 2 : 1}` as RowKey
    }
    const t = server.team === 'A' ? 'B' : 'A'
    return `${t}1` as RowKey
  })

export const useServeAnnouncement = (): string =>
  SquashMachineContext.useSelector((s) => serveAnnouncement(s.context))

export const useScoreTuple = (): readonly [number, number] =>
  SquashMachineContext.useSelector(
    (s) => [s.context.score.A, s.context.score.B] as const,
  )

export const useGrid = (): ActivityGrid =>
  SquashMachineContext.useSelector((s) => s.context.grid)

export const usePlayers = (): PlayerNameMap =>
  SquashMachineContext.useSelector((s) => s.context.players)

export const useServerSide = (): Side =>
  SquashMachineContext.useSelector((s) => s.context.server.side)
