import { SessionIdSymbol } from '@livestore/livestore'
import { useClientDocument } from '@livestore/react'
import { tables } from '../livestore/schema'

export type Permission =
  | 'user.view'
  | 'user.assign-role'
  | 'match.create'
  | 'match.edit'
  | 'match.delete'
  | 'match.view'
  | 'game.start'
  | 'game.score'
  | 'game.undo'
  | 'game.complete'
  | 'game.view'

const rolePermissions: Record<string, Array<Permission>> = {
  admin: [
    'user.view',
    'user.assign-role',
    'match.create',
    'match.edit',
    'match.delete',
    'match.view',
    'game.start',
    'game.score',
    'game.undo',
    'game.complete',
    'game.view',
  ],
  staff: [
    'user.view',
    'match.create',
    'match.edit',
    'match.delete',
    'match.view',
    'game.start',
    'game.score',
    'game.undo',
    'game.complete',
    'game.view',
  ],
  member: ['match.view', 'game.view'],
  anonymous: [],
}

export const usePermissions = () => {
  const [currentUser] = useClientDocument(tables.currentUser, SessionIdSymbol)

  const can = (permission: Permission): boolean => {
    const role = currentUser.role ?? 'anonymous'
    return rolePermissions[role]?.includes(permission) ?? false
  }

  const canAny = (...permissions: Array<Permission>): boolean => {
    return permissions.some((permission) => can(permission))
  }

  const canAll = (...permissions: Array<Permission>): boolean => {
    return permissions.every((permission) => can(permission))
  }

  const isAdmin = currentUser.role === 'admin'
  const isStaff = currentUser.role === 'staff'
  const isMember = currentUser.role === 'member'
  const isAuthenticated = currentUser.role !== 'anonymous'

  return {
    can,
    canAny,
    canAll,
    isAdmin,
    isStaff,
    isMember,
    isAuthenticated,
    role: currentUser.role,
    userId: currentUser.userId,
  }
}
