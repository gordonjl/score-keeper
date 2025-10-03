import { Link, createFileRoute } from '@tanstack/react-router'
import { Play, Target, Trophy, Users } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return (
    <div className="min-h-full bg-gradient-to-br from-base-200 to-base-300">
      <div className="container mx-auto px-4 py-8 sm:py-12 lg:py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="bg-primary/10 p-6 rounded-full">
              <Trophy className="w-16 h-16 sm:w-20 sm:h-20 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Squash Score Keeper
          </h1>
          <p className="text-lg sm:text-xl text-base-content/70 max-w-2xl mx-auto mb-8">
            Professional scoring system for doubles squash matches using PAR-15
            rules
          </p>
          <Link to="/setup" className="btn btn-primary btn-lg gap-2 shadow-lg">
            <Play className="w-5 h-5" />
            Start New Match
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
            <div className="card-body items-center text-center">
              <div className="bg-primary/10 p-4 rounded-full mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h2 className="card-title">Doubles Tracking</h2>
              <p className="text-sm text-base-content/70">
                Track all four players with automatic serve rotation and
                hand-in/hand-out management
              </p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
            <div className="card-body items-center text-center">
              <div className="bg-secondary/10 p-4 rounded-full mb-4">
                <Target className="w-8 h-8 text-secondary" />
              </div>
              <h2 className="card-title">PAR-15 Scoring</h2>
              <p className="text-sm text-base-content/70">
                Official PAR-15 scoring rules with automatic game and match
                completion detection
              </p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
            <div className="card-body items-center text-center">
              <div className="bg-accent/10 p-4 rounded-full mb-4">
                <Trophy className="w-8 h-8 text-accent" />
              </div>
              <h2 className="card-title">Match History</h2>
              <p className="text-sm text-base-content/70">
                Complete game-by-game breakdown with detailed scoring grid and
                statistics
              </p>
            </div>
          </div>
        </div>

        {/* Quick Start Guide */}
        <div className="mt-12 max-w-3xl mx-auto">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">Quick Start</h2>
              <div className="space-y-3">
                <div className="flex gap-4 items-start">
                  <div className="badge badge-primary badge-lg">1</div>
                  <div>
                    <h3 className="font-semibold">Enter Player Names</h3>
                    <p className="text-sm text-base-content/70">
                      Add all four players and assign them to right/left wall
                      positions
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="badge badge-primary badge-lg">2</div>
                  <div>
                    <h3 className="font-semibold">Set First Servers</h3>
                    <p className="text-sm text-base-content/70">
                      Choose which player serves first for each team at hand-in
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="badge badge-primary badge-lg">3</div>
                  <div>
                    <h3 className="font-semibold">Start Playing</h3>
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
