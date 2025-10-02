import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content text-center">
        <div className="max-w-md">
          <h1 className="text-5xl font-bold">Squash Score Keeper</h1>
          <p className="py-6">Track scores for doubles squash matches using PAR-15 scoring.</p>
          <Link to="/setup" className="btn btn-primary">
            Start New Match
          </Link>
        </div>
      </div>
    </div>
  )
}
