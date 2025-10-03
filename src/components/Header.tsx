import { Link } from '@tanstack/react-router'
import { Trophy } from 'lucide-react'

export default function Header() {
  return (
    <header className="navbar bg-base-100 shadow-lg sticky top-0 z-50">
      <div className="navbar-start">
        <Link to="/" className="btn btn-ghost text-xl gap-2">
          <Trophy className="w-6 h-6" />
          <span className="hidden sm:inline">Squash Score Keeper</span>
          <span className="sm:hidden">Squash</span>
        </Link>
      </div>
      <div className="navbar-center hidden md:flex">
        <div className="text-sm text-base-content/60">
          PAR-15 Doubles Scoring
        </div>
      </div>
      <div className="navbar-end">
        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h7"
              />
            </svg>
          </div>
          <ul
            tabIndex={0}
            className="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow"
          >
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/setup">New Match</Link>
            </li>
            <li>
              <a href="/support" target="_blank" rel="noopener noreferrer">Support</a>
            </li>
          </ul>
        </div>
      </div>
    </header>
  )
}
