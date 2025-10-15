import { useQuery, useStore } from '@livestore/react'
import { Edit2, Plus, Trash2, UserCircle } from 'lucide-react'
import { useState } from 'react'
import { usePermissions } from '../hooks/usePermissions'
import { events } from '../livestore/schema'
import { activeUsers$ } from '../livestore/user-queries'

type User = {
  id: string
  githubUsername: string
  githubEmail: string | null
  githubAvatarUrl: string | null
  displayName: string | null
  role: string
  createdAt: Date
  updatedAt: Date
  lastLoginAt: Date | null
  deletedAt: Date | null
}

type UserFormData = {
  githubUsername: string
  githubEmail: string
  displayName: string
  role: 'admin' | 'staff' | 'member'
}

const UserManagement = () => {
  const { can, isAdmin } = usePermissions()
  const { store } = useStore()
  const activeUsers = useQuery(activeUsers$)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<UserFormData>({
    githubUsername: '',
    githubEmail: '',
    displayName: '',
    role: 'member',
  })

  const canManageUsers = can('user.view')
  const canAssignRoles = can('user.assign-role')

  const handleOpenAddModal = () => {
    setFormData({
      githubUsername: '',
      githubEmail: '',
      displayName: '',
      role: 'member',
    })
    setEditingUser(null)
    setIsAddModalOpen(true)
  }

  const handleOpenEditModal = (user: User) => {
    setFormData({
      githubUsername: user.githubUsername,
      githubEmail: user.githubEmail ?? '',
      displayName: user.displayName ?? '',
      role: user.role as 'admin' | 'staff' | 'member',
    })
    setEditingUser(user)
    setIsAddModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsAddModalOpen(false)
    setEditingUser(null)
    setFormData({
      githubUsername: '',
      githubEmail: '',
      displayName: '',
      role: 'member',
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingUser) {
      // Update existing user
      store.commit(
        events.userUpdated({
          userId: editingUser.id,
          githubUsername: formData.githubUsername,
          githubEmail: formData.githubEmail || null,
          displayName: formData.displayName || null,
          role: formData.role,
          timestamp: new Date(),
        }),
      )
    } else {
      // Create new user
      const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      store.commit(
        events.userRegistered({
          userId,
          githubUsername: formData.githubUsername,
          githubEmail: formData.githubEmail || null,
          githubAvatarUrl: null,
          displayName: formData.displayName || null,
          role: formData.role,
          timestamp: new Date(),
        }),
      )
    }

    handleCloseModal()
  }

  const handleDeleteUser = (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      store.commit(
        events.userDeleted({
          userId,
          timestamp: new Date(),
        }),
      )
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'badge-error'
      case 'staff':
        return 'badge-warning'
      case 'member':
        return 'badge-info'
      default:
        return 'badge-ghost'
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (!canManageUsers) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-warning">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>You don't have permission to view users.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">User Management</h1>
          <p className="text-base-content/70">
            Manage users, roles, and permissions
          </p>
        </div>
        {canAssignRoles && (
          <button
            onClick={handleOpenAddModal}
            className="btn btn-primary gap-2"
          >
            <Plus className="w-5 h-5" />
            Add User
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="stats shadow mb-8 w-full">
        <div className="stat">
          <div className="stat-figure text-primary">
            <UserCircle className="w-8 h-8" />
          </div>
          <div className="stat-title">Total Users</div>
          <div className="stat-value text-primary">{activeUsers.length}</div>
          <div className="stat-desc">Active accounts</div>
        </div>

        <div className="stat">
          <div className="stat-title">Admins</div>
          <div className="stat-value text-error">
            {activeUsers.filter((u) => u.role === 'admin').length}
          </div>
        </div>

        <div className="stat">
          <div className="stat-title">Staff</div>
          <div className="stat-value text-warning">
            {activeUsers.filter((u) => u.role === 'staff').length}
          </div>
        </div>

        <div className="stat">
          <div className="stat-title">Members</div>
          <div className="stat-value text-info">
            {activeUsers.filter((u) => u.role === 'member').length}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>User</th>
                  <th>GitHub Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Last Login</th>
                  <th>Created</th>
                  {canAssignRoles && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {activeUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canAssignRoles ? 7 : 6}
                      className="text-center py-8"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <UserCircle className="w-12 h-12 text-base-content/30" />
                        <p className="text-base-content/70">No users found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  activeUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="avatar">
                            <div className="mask mask-squircle w-12 h-12">
                              {user.githubAvatarUrl ? (
                                <img
                                  src={user.githubAvatarUrl}
                                  alt={user.displayName ?? user.githubUsername}
                                />
                              ) : (
                                <div className="bg-base-300 w-full h-full flex items-center justify-center">
                                  <UserCircle className="w-8 h-8 text-base-content/50" />
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="font-bold">
                              {user.displayName ?? user.githubUsername}
                            </div>
                            <div className="text-sm opacity-50">{user.id}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="font-mono text-sm">
                          @{user.githubUsername}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm">
                          {user.githubEmail ?? '—'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${getRoleBadgeColor(user.role)} badge-sm`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm">
                          {formatDate(user.lastLoginAt)}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm">
                          {formatDate(user.createdAt)}
                        </span>
                      </td>
                      {canAssignRoles && (
                        <td>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOpenEditModal(user)}
                              className="btn btn-ghost btn-xs"
                              title="Edit user"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="btn btn-ghost btn-xs text-error"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      {isAddModalOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {editingUser ? 'Edit User' : 'Add New User'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">GitHub Username</span>
                </label>
                <input
                  type="text"
                  placeholder="username"
                  className="input input-bordered"
                  value={formData.githubUsername}
                  onChange={(e) =>
                    setFormData({ ...formData, githubUsername: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Email</span>
                </label>
                <input
                  type="email"
                  placeholder="user@example.com"
                  className="input input-bordered"
                  value={formData.githubEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, githubEmail: e.target.value })
                  }
                />
              </div>

              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Display Name</span>
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  className="input input-bordered"
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData({ ...formData, displayName: e.target.value })
                  }
                />
              </div>

              <div className="form-control mb-6">
                <label className="label">
                  <span className="label-text">Role</span>
                </label>
                <select
                  className="select select-bordered"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as 'admin' | 'staff' | 'member',
                    })
                  }
                  disabled={!isAdmin}
                >
                  <option value="member">Member</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
                <label className="label">
                  <span className="label-text-alt">
                    {!isAdmin && 'Only admins can change roles'}
                  </span>
                </label>
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={handleCloseModal}>close</button>
          </form>
        </dialog>
      )}
    </div>
  )
}

export default UserManagement
