import { LogIn, LogOut, User } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'

export const LoginButton = () => {
  const { user, login, logout, isLoading } = useAuth()
  const { role } = usePermissions()

  if (isLoading) {
    return <div className="loading loading-spinner loading-sm"></div>
  }

  if (user) {
    return (
      <div className="dropdown dropdown-end">
        <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
          <div className="w-10 rounded-full">
            {user.user_metadata.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="User avatar" />
            ) : (
              <User className="w-6 h-6" />
            )}
          </div>
        </label>
        <ul
          tabIndex={0}
          className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52"
        >
          <li className="menu-title">
            <span>{user.email}</span>
            <span className="badge badge-sm badge-primary">{role}</span>
          </li>
          <li>
            <button onClick={logout}>
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </li>
        </ul>
      </div>
    )
  }

  return (
    <button onClick={login} className="btn btn-primary btn-sm">
      <LogIn className="w-4 h-4" />
      Login
    </button>
  )
}
