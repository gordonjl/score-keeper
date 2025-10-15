import { useQuery, useStore } from '@livestore/react'
import { Edit2, Link as LinkIcon, Plus, Trash2, User } from 'lucide-react'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { usePermissions } from '../hooks/usePermissions'
import { events } from '../livestore/schema'
import { activePlayers$ } from '../livestore/player-queries'

type Player = {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  linkedUserId: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

type PlayerFormData = {
  firstName: string
  lastName: string
  email: string
  phone: string
}

const PlayerManagement = () => {
  const { can } = usePermissions()
  const { store } = useStore()
  const activePlayers = useQuery(activePlayers$)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [formData, setFormData] = useState<PlayerFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  })

  const canManagePlayers = can('user.view') // Reusing user.view permission for now

  const handleOpenAddModal = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
    })
    setEditingPlayer(null)
    setIsAddModalOpen(true)
  }

  const handleOpenEditModal = (player: Player) => {
    setFormData({
      firstName: player.firstName,
      lastName: player.lastName,
      email: player.email ?? '',
      phone: player.phone ?? '',
    })
    setEditingPlayer(player)
    setIsAddModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsAddModalOpen(false)
    setEditingPlayer(null)
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingPlayer) {
      // Update existing player
      store.commit(
        events.playerUpdated({
          playerId: editingPlayer.id,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email || null,
          phone: formData.phone || null,
          timestamp: new Date(),
        }),
      )
    } else {
      // Create new player
      const playerId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      store.commit(
        events.playerCreated({
          playerId,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email || null,
          phone: formData.phone || null,
          timestamp: new Date(),
        }),
      )
    }

    handleCloseModal()
  }

  const handleDeletePlayer = (playerId: string) => {
    if (confirm('Are you sure you want to delete this player?')) {
      store.commit(
        events.playerDeleted({
          playerId,
          timestamp: new Date(),
        }),
      )
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

  if (!canManagePlayers) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-warning">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 shrink-0 stroke-current"
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
          <span>You don't have permission to view players.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-bold">Player Management</h1>
          <p className="text-base-content/70">
            Manage players for matches and games
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/players/link" className="btn btn-secondary gap-2">
            <LinkIcon className="h-5 w-5" />
            Link Players
          </Link>
          <button
            onClick={handleOpenAddModal}
            className="btn btn-primary gap-2"
          >
            <Plus className="h-5 w-5" />
            Add Player
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats mb-8 w-full shadow">
        <div className="stat">
          <div className="stat-figure text-primary">
            <User className="h-8 w-8" />
          </div>
          <div className="stat-title">Total Players</div>
          <div className="stat-value text-primary">{activePlayers.length}</div>
          <div className="stat-desc">Active player profiles</div>
        </div>

        <div className="stat">
          <div className="stat-title">Linked to Accounts</div>
          <div className="stat-value text-success">
            {activePlayers.filter((p) => p.linkedUserId).length}
          </div>
        </div>

        <div className="stat">
          <div className="stat-title">Unlinked</div>
          <div className="stat-value text-warning">
            {activePlayers.filter((p) => !p.linkedUserId).length}
          </div>
        </div>
      </div>

      {/* Players Table */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Account Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activePlayers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <User className="h-12 w-12 text-base-content/30" />
                        <p className="text-base-content/70">No players found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  activePlayers.map((player) => (
                    <tr key={player.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="avatar placeholder">
                            <div className="bg-neutral text-neutral-content w-12 rounded-full">
                              <span className="text-xl">
                                {player.firstName[0]}
                                {player.lastName[0]}
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="font-bold">
                              {player.firstName} {player.lastName}
                            </div>
                            <div className="text-sm opacity-50">
                              {player.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-sm">{player.email ?? '—'}</span>
                      </td>
                      <td>
                        <span className="text-sm">{player.phone ?? '—'}</span>
                      </td>
                      <td>
                        {player.linkedUserId ? (
                          <span className="badge badge-success badge-sm gap-1">
                            <LinkIcon className="h-3 w-3" />
                            Linked
                          </span>
                        ) : (
                          <span className="badge badge-warning badge-sm">
                            Unlinked
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="text-sm">
                          {formatDate(player.createdAt)}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenEditModal(player)}
                            className="btn btn-ghost btn-xs"
                            title="Edit player"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePlayer(player.id)}
                            className="btn btn-ghost btn-xs text-error"
                            title="Delete player"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Player Modal */}
      {isAddModalOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="mb-4 text-lg font-bold">
              {editingPlayer ? 'Edit Player' : 'Add New Player'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">First Name</span>
                </label>
                <input
                  type="text"
                  placeholder="John"
                  className="input input-bordered"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Last Name</span>
                </label>
                <input
                  type="text"
                  placeholder="Doe"
                  className="input input-bordered"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
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
                  placeholder="player@example.com"
                  className="input input-bordered"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              <div className="form-control mb-6">
                <label className="label">
                  <span className="label-text">Phone</span>
                </label>
                <input
                  type="tel"
                  placeholder="(555) 123-4567"
                  className="input input-bordered"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
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
                  {editingPlayer ? 'Update' : 'Create'}
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

export default PlayerManagement
