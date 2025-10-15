import { createFileRoute } from '@tanstack/react-router'
import PlayerUserLink from '../components/PlayerUserLink'

export const Route = createFileRoute('/players/link')({
  component: PlayerUserLink,
})
