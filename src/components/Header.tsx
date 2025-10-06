import { Link } from '@tanstack/react-router'
import { Moon, Sun, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ACTIVE_MATCH_KEY } from '../utils/matchPersistence'
import { LetStrokeModal } from './modals/LetStrokeModal'
import { TimersModal } from './modals/TimersModal'

export default function Header() {
  const [theme, setTheme] = useState<'pcsquash' | 'pcsquash-dark'>('pcsquash')
  const [isLetStrokeModalOpen, setIsLetStrokeModalOpen] = useState(false)
  const [isTimersModalOpen, setIsTimersModalOpen] = useState(false)
  const [hasActiveGame, setHasActiveGame] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setTheme(mq.matches ? 'pcsquash-dark' : 'pcsquash')
  }, [])

  // Check for active game in localStorage
  useEffect(() => {
    const checkActiveGame = () => {
      try {
        const persistedState = localStorage.getItem(ACTIVE_MATCH_KEY)
        if (persistedState) {
          const state = JSON.parse(persistedState)
          // Check if there's an active game (inGame state)
          setHasActiveGame(state?.value === 'inGame')
        } else {
          setHasActiveGame(false)
        }
      } catch {
        setHasActiveGame(false)
      }
    }

    checkActiveGame()

    // Listen for storage events to update when match state changes
    window.addEventListener('storage', checkActiveGame)
    // Also check periodically in case localStorage changes in same tab
    const interval = setInterval(checkActiveGame, 1000)

    return () => {
      window.removeEventListener('storage', checkActiveGame)
      clearInterval(interval)
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'pcsquash' ? 'pcsquash-dark' : 'pcsquash'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  const closeDropdown = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
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
              <Link to="/" onClick={closeDropdown}>
                Home
              </Link>
            </li>
            {hasActiveGame && (
              <li>
                <Link to="/game" onClick={closeDropdown}>
                  Current Game
                </Link>
              </li>
            )}
            <li>
              Referee Tools
              <ul>
                <li>
                  <button
                    onClick={() => {
                      setIsLetStrokeModalOpen(true)
                      closeDropdown()
                    }}
                  >
                    Let/Stroke Helper
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setIsTimersModalOpen(true)
                      closeDropdown()
                    }}
                  >
                    Timers & Conduct
                  </button>
                </li>
                <li>
                  <a
                    href="https://ussquash.org/wp-content/uploads/2024/11/2024-Hardball-Squash-Doubles-Rules.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Hardball Rules (PDF)
                  </a>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
      <LetStrokeModal
        isOpen={isLetStrokeModalOpen}
        onClose={() => setIsLetStrokeModalOpen(false)}
      />
      <TimersModal
        isOpen={isTimersModalOpen}
        onClose={() => setIsTimersModalOpen(false)}
      />
    </header>
  )
}
