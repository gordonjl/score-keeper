import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Play, Target, Trophy, Users } from 'lucide-react'
import { useState } from 'react'
import { useCreateLiveStoreMatch } from '../contexts/LiveStoreMatchContext'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const { createMatch } = useCreateLiveStoreMatch()
  const [isStarting, setIsStarting] = useState(false)
  const navigate = useNavigate({ from: Route.fullPath })

  const handleStartNewMatch = () => {
    setIsStarting(true)
    const playerNames = ['Player 1', 'Player 2', 'Player 3', 'Player 4']
    const matchId = createMatch(playerNames)

    void navigate({ to: '/match/$matchId/configure', params: { matchId } })
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-base-200 to-base-300">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 lg:py-12 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex flex-col items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="relative p-4 sm:p-6 rounded-2xl bg-base-100 shadow-2xl border border-base-300">
              <img
                src="/pcs_shield.png"
                alt="PCS Shield"
                className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 object-contain"
              />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent px-4">
              Squash Score Keeper
            </h1>
          </div>
          <p className="text-base sm:text-lg md:text-xl text-base-content/70 max-w-2xl mx-auto mb-6 sm:mb-8 px-4">
            Professional scoring system for doubles squash matches using PAR-15
            rules
          </p>
          <button
            onClick={handleStartNewMatch}
            disabled={isStarting}
            className="btn btn-primary btn-md sm:btn-lg gap-2 shadow-xl hover:shadow-2xl transition-all w-full max-w-xs sm:w-auto"
          >
            {isStarting ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                <span>Creating Match...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Start New Match</span>
              </>
            )}
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
          <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all border border-base-300 hover:border-primary/50">
            <div className="card-body items-center text-center p-4 sm:p-6">
              <div className="bg-primary/10 p-4 sm:p-5 rounded-full mb-3 sm:mb-4 border-2 border-primary/20">
                <Users className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
              </div>
              <h2 className="card-title text-primary text-base sm:text-lg">
                Doubles Tracking
              </h2>
              <p className="text-xs sm:text-sm text-base-content/70">
                Track all four players with automatic serve rotation and
                hand-in/hand-out management
              </p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all border border-base-300 hover:border-primary/50">
            <div className="card-body items-center text-center p-4 sm:p-6">
              <div className="bg-accent/10 p-4 sm:p-5 rounded-full mb-3 sm:mb-4 border-2 border-accent/20">
                <Target className="w-8 h-8 sm:w-10 sm:h-10 text-accent" />
              </div>
              <h2 className="card-title text-accent text-base sm:text-lg">
                PAR-15 Scoring
              </h2>
              <p className="text-xs sm:text-sm text-base-content/70">
                Official PAR-15 scoring rules with automatic game and match
                completion detection
              </p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all border border-base-300 hover:border-primary/50 sm:col-span-2 lg:col-span-1">
            <div className="card-body items-center text-center p-4 sm:p-6">
              <div className="bg-success/10 p-4 sm:p-5 rounded-full mb-3 sm:mb-4 border-2 border-success/20">
                <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-success" />
              </div>
              <h2 className="card-title text-success text-base sm:text-lg">
                Match History
              </h2>
              <p className="text-xs sm:text-sm text-base-content/70">
                Complete game-by-game breakdown with detailed scoring grid and
                statistics
              </p>
            </div>
          </div>
        </div>

        {/* Quick Start Guide */}
        <div className="mt-8 sm:mt-12 max-w-3xl mx-auto">
          <div className="card bg-base-100 shadow-xl border border-base-300">
            <div className="card-body p-4 sm:p-6">
              <h2 className="card-title text-xl sm:text-2xl mb-4 sm:mb-6 text-primary">
                Quick Start
              </h2>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex gap-3 sm:gap-4 items-start p-3 sm:p-4 bg-base-200 rounded-lg border border-base-300">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold flex-shrink-0 text-sm sm:text-base">
                    1
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base sm:text-lg mb-1">
                      Enter Player Names
                    </h3>
                    <p className="text-xs sm:text-sm text-base-content/70">
                      Add all four players and assign them to right/left wall
                      positions
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 sm:gap-4 items-start p-3 sm:p-4 bg-base-200 rounded-lg border border-base-300">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold flex-shrink-0 text-sm sm:text-base">
                    2
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base sm:text-lg mb-1">
                      Set First Servers
                    </h3>
                    <p className="text-xs sm:text-sm text-base-content/70">
                      Choose which player serves first for each team at hand-in
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 sm:gap-4 items-start p-3 sm:p-4 bg-base-200 rounded-lg border border-base-300">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold flex-shrink-0 text-sm sm:text-base">
                    3
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base sm:text-lg mb-1">
                      Start Playing
                    </h3>
                    <p className="text-xs sm:text-sm text-base-content/70">
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
