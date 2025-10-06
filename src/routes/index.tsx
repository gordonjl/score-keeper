import { createFileRoute } from '@tanstack/react-router'
import { Play, Target, Trophy, Users } from 'lucide-react'
import { useState } from 'react'
import { useCreateEventSourcedMatch } from '../contexts/EventSourcedMatchContext'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const { createMatch, isCreating, error } = useCreateEventSourcedMatch()
  const [isStarting, setIsStarting] = useState(false)

  const handleStartNewMatch = async () => {
    setIsStarting(true)
    const playerNames = ['Player 1', 'Player 2', 'Player 3', 'Player 4']
    const matchId = await createMatch(playerNames)

    if (matchId) {
      // Navigate using string path with matchId interpolated
      window.location.href = `/match/${matchId}/setup`
    } else {
      setIsStarting(false)
    }
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-base-200 to-base-300">
      <div className="container mx-auto px-4 py-8 sm:py-12 lg:py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex flex-col items-center gap-6 mb-8">
            <div className="relative p-6 rounded-2xl bg-base-100 shadow-2xl border border-base-300">
              <img
                src="/pcs_shield.png"
                alt="PCS Shield"
                className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 object-contain"
              />
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Squash Score Keeper
            </h1>
          </div>
          <p className="text-lg sm:text-xl text-base-content/70 max-w-2xl mx-auto mb-8">
            Professional scoring system for doubles squash matches using PAR-15
            rules
          </p>
          <button
            onClick={handleStartNewMatch}
            disabled={isCreating || isStarting}
            className="btn btn-primary btn-lg gap-2 shadow-xl hover:shadow-2xl transition-all"
          >
            {isCreating || isStarting ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Creating Match...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Start New Match
              </>
            )}
          </button>
          {error && (
            <div className="alert alert-error max-w-md mx-auto mt-4">
              <span>Error creating match: {error}</span>
            </div>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all border border-base-300 hover:border-primary/50">
            <div className="card-body items-center text-center">
              <div className="bg-primary/10 p-5 rounded-full mb-4 border-2 border-primary/20">
                <Users className="w-10 h-10 text-primary" />
              </div>
              <h2 className="card-title text-primary">Doubles Tracking</h2>
              <p className="text-sm text-base-content/70">
                Track all four players with automatic serve rotation and
                hand-in/hand-out management
              </p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all border border-base-300 hover:border-primary/50">
            <div className="card-body items-center text-center">
              <div className="bg-accent/10 p-5 rounded-full mb-4 border-2 border-accent/20">
                <Target className="w-10 h-10 text-accent" />
              </div>
              <h2 className="card-title text-accent">PAR-15 Scoring</h2>
              <p className="text-sm text-base-content/70">
                Official PAR-15 scoring rules with automatic game and match
                completion detection
              </p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all border border-base-300 hover:border-primary/50">
            <div className="card-body items-center text-center">
              <div className="bg-success/10 p-5 rounded-full mb-4 border-2 border-success/20">
                <Trophy className="w-10 h-10 text-success" />
              </div>
              <h2 className="card-title text-success">Match History</h2>
              <p className="text-sm text-base-content/70">
                Complete game-by-game breakdown with detailed scoring grid and
                statistics
              </p>
            </div>
          </div>
        </div>

        {/* Quick Start Guide */}
        <div className="mt-12 max-w-3xl mx-auto">
          <div className="card bg-base-100 shadow-xl border border-base-300">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-6 text-primary">
                Quick Start
              </h2>
              <div className="space-y-4">
                <div className="flex gap-4 items-start p-4 bg-base-200 rounded-lg border border-base-300">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">
                      Enter Player Names
                    </h3>
                    <p className="text-sm text-base-content/70">
                      Add all four players and assign them to right/left wall
                      positions
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 items-start p-4 bg-base-200 rounded-lg border border-base-300">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">
                      Set First Servers
                    </h3>
                    <p className="text-sm text-base-content/70">
                      Choose which player serves first for each team at hand-in
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 items-start p-4 bg-base-200 rounded-lg border border-base-300">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">Start Playing</h3>
                    <p className="text-sm text-base-content/70">
                      Track each rally and let the app handle all scoring rules
                      automatically
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
