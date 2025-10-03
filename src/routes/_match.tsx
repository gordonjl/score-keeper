import { Outlet, createFileRoute } from '@tanstack/react-router'
import { MatchMachineContext } from '../contexts/MatchMachineContext'

export const Route = createFileRoute('/_match')({
  component: MatchLayout,
})

function MatchLayout() {
  return (
    <MatchMachineContext.Provider>
      <Outlet />
    </MatchMachineContext.Provider>
  )
}
