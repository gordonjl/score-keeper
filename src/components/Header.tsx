import { Link } from '@tanstack/react-router'
import { Moon, Sun, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function Header() {
  const [theme, setTheme] = useState<'pcsquash' | 'pcsquash-dark'>('pcsquash')

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setTheme(mq.matches ? 'pcsquash-dark' : 'pcsquash')
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'pcsquash' ? 'pcsquash-dark' : 'pcsquash'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  return (
    <header className="navbar bg-base-100 shadow-lg sticky top-0 z-50 border-b border-base-300">
      <div className="navbar-start">
        <Link to="/" className="btn btn-ghost text-xl gap-2">
          <Trophy className="w-6 h-6 text-primary" />
          <span className="hidden sm:inline">Squash Score Keeper</span>
          <span className="sm:hidden">Squash</span>
        </Link>
      </div>
      <div className="navbar-center hidden md:flex">
        <div className="badge badge-ghost badge-lg">PAR-15 Doubles Scoring</div>
      </div>
      <div className="navbar-end gap-2">
        <button
          onClick={toggleTheme}
          className="btn btn-ghost btn-circle"
          aria-label="Toggle theme"
        >
          {theme === 'pcsquash' ? (
            <Moon className="w-5 h-5" />
          ) : (
            <Sun className="w-5 h-5" />
          )}
        </button>
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
            className="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow-xl border border-base-300"
          >
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/setup">New Match</Link>
            </li>
            <li>
              <a href="/support" target="_blank" rel="noopener noreferrer">
                Support
              </a>
            </li>
          </ul>
        </div>
      </div>
    </header>
  )
}
