import {  usePermissions } from '../../hooks/usePermissions'
import { useAuth } from '../../contexts/AuthContext'
import type {Permission} from '../../hooks/usePermissions';
import type {ReactNode} from 'react';

type ProtectedActionProps = {
  children: ReactNode
  requires: Permission
  fallback?: ReactNode
  showLoginPrompt?: boolean
}

export const ProtectedAction = ({
  children,
  requires,
  fallback,
  showLoginPrompt = false,
}: ProtectedActionProps) => {
  const { can, isAuthenticated } = usePermissions()
  const { login } = useAuth()

  if (can(requires)) {
    return <>{children}</>
  }

  if (!isAuthenticated && showLoginPrompt) {
    return (
      <button onClick={login} className="btn btn-sm btn-primary">
        Login to continue
      </button>
    )
  }

  return fallback ? <>{fallback}</> : null
}
