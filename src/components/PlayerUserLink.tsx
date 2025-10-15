import { useQuery, useStore } from '@livestore/react'
import { Link as LinkIcon, Unlink, User } from 'lucide-react'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { usePermissions } from '../hooks/usePermissions'
import { events } from '../livestore/schema'
import { activePlayers$ } from '../livestore/player-queries'
import { activeUsers$ } from '../livestore/user-queries'

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

const PlayerUserLink = () => {
  const { can } = usePermissions()
  const { store } = useStore()
  const activePlayers = useQuery(activePlayers$)
  const activeUsers = useQuery(activeUsers$)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string>('')

  const canManagePlayers = can('user.view') // Reusing user.view permission

  const handleLinkPlayer = () => {
    if (!selectedPlayer || !selectedUserId) return

    store.commit(
      events.playerLinkedToUser({
        playerId: selectedPlayer.id,
        userId: selectedUserId,
        timestamp: new Date(),
      }),
    )

    setSelectedPlayer(null)
    setSelectedUserId('')
  }

  const handleUnlinkPlayer = (playerId: string) => {
    if (
      confirm('Are you sure you want to unlink this player from their account?')
    ) {
      store.commit(
        events.playerUnlinkedFromUser({
          playerId,
          timestamp: new Date(),
        }),
      )
    }
  }

  const getUserById = (userId: string) =>
    activeUsers.find((u) => u.id === userId)

  const linkedPlayers = activePlayers.filter((p) => p.linkedUserId)
  const unlinkedPlayers = activePlayers.filter((p) => !p.linkedUserId)

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
          <span>You don't have permission to link players.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <Link to="/players" className="btn btn-ghost btn-sm">
            ← Back to Players
          </Link>
        </div>
        <h1 className="mb-2 text-4xl font-bold">Link Players to Accounts</h1>
        <p className="text-base-content/70">
          Connect player profiles to user accounts for authentication and access
          control
        </p>
      </div>

      {/* Stats */}
      <div className="stats mb-8 w-full shadow">
        <div className="stat">
          <div className="stat-figure text-success">
            <LinkIcon className="h-8 w-8" />
          </div>
          <div className="stat-title">Linked Players</div>
          <div className="stat-value text-success">{linkedPlayers.length}</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-warning">
            <User className="h-8 w-8" />
          </div>
          <div className="stat-title">Unlinked Players</div>
          <div className="stat-value text-warning">
            {unlinkedPlayers.length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Unlinked Players - Link Form */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <User className="h-6 w-6" />
              Unlinked Players
            </h2>
            <p className="text-sm text-base-content/70">
              Select a player and link them to a user account
            </p>

            {unlinkedPlayers.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-base-content/60">
                  All players are linked to accounts!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Select Player</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={selectedPlayer?.id ?? ''}
                    onChange={(e) => {
                      const player = unlinkedPlayers.find(
                        (p) => p.id === e.target.value,
                      )
                      setSelectedPlayer(player ?? null)
                    }}
                  >
                    <option value="">Choose a player...</option>
                    {unlinkedPlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.firstName} {player.lastName}
                        {player.email && ` (${player.email})`}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedPlayer && (
                  <>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Link to User Account</span>
                      </label>
                      <select
                        className="select select-bordered"
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                      >
                        <option value="">Choose a user account...</option>
                        {activeUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.displayName ?? user.githubUsername} (@
                            {user.githubUsername})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleLinkPlayer}
                      disabled={!selectedUserId}
                      className="btn btn-success btn-block gap-2"
                    >
                      <LinkIcon className="h-5 w-5" />
                      Link Player to Account
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Linked Players - View and Unlink */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <LinkIcon className="h-6 w-6" />
              Linked Players
            </h2>
            <p className="text-sm text-base-content/70">
              Currently linked player-user connections
            </p>

            {linkedPlayers.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-base-content/60">No players linked yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {linkedPlayers.map((player) => {
                  const user = player.linkedUserId
                    ? getUserById(player.linkedUserId)
                    : null
                  return (
                    <div
                      key={player.id}
                      className="flex items-center justify-between rounded-lg border border-base-300 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="avatar placeholder">
                          <div className="bg-neutral text-neutral-content w-10 rounded-full">
                            <span className="text-sm">
                              {player.firstName[0]}
                              {player.lastName[0]}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="font-bold text-sm">
                            {player.firstName} {player.lastName}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-base-content/60">
                            <LinkIcon className="h-3 w-3" />
                            {user ? (
                              <span>
                                {user.displayName ?? user.githubUsername}
                              </span>
                            ) : (
                              <span className="text-error">User not found</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnlinkPlayer(player.id)}
                        className="btn btn-ghost btn-xs text-error"
                        title="Unlink player"
                      >
                        <Unlink className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlayerUserLink
