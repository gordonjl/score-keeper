import { createFileRoute } from '@tanstack/react-router'
import UserManagement from '../components/UserManagement'

export const Route = createFileRoute('/users')({
  component: UserManagement,
})
