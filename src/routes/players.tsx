import { createFileRoute } from '@tanstack/react-router'
import PlayerManagement from '../components/PlayerManagement'

export const Route = createFileRoute('/players')({
  component: PlayerManagement,
})
