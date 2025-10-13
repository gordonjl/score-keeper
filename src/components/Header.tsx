import { Link } from '@tanstack/react-router'
import { useClientDocument } from '@livestore/react'
import { SessionIdSymbol } from '@livestore/livestore'
import { Moon, Sun } from 'lucide-react'
import { useEffect } from 'react'
import { tables } from '../livestore/schema'
import { ClearStorageButton } from './support/ClearStorageButton'
import { LetStrokeModal } from './modals/LetStrokeModal'
import { TimersModal } from './modals/TimersModal'

export default function Header() {
  // Use LiveStore client documents for persistent state
  const [modalState, updateModalState] = useClientDocument(
    tables.modalState,
    SessionIdSymbol,
  )
  const [themePreference, updateThemePreference] = useClientDocument(
    tables.themePreference,
    SessionIdSymbol,
  )

  // Determine current theme from preference and system default
  const theme =
    themePreference.theme === 'system'
      ? typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'pcsquash-dark'
        : 'pcsquash'
      : themePreference.theme

  // Apply theme on mount and when preference changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    const newTheme = theme === 'pcsquash' ? 'pcsquash-dark' : 'pcsquash'
    updateThemePreference({ theme: newTheme })
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
          <img
            src="/pcs_shield.png"
            alt="PCS Logo"
            className="w-6 h-6 object-contain"
          />
          <span className="hidden sm:inline">Squash Score Keeper</span>
          <span className="sm:hidden">Squash</span>
        </Link>
      </div>
      <div className="navbar-center hidden md:flex">
        <div className="badge badge-ghost badge-lg">PAR-15 Doubles Scoring</div>
      </div>
      <div className="navbar-end gap-2">
        {import.meta.env.DEV && <ClearStorageButton />}
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
            <li>
              <Link to="/matches" onClick={closeDropdown}>
                All Matches
              </Link>
            </li>
            <li>
              Referee Tools
              <ul>
                <li>
                  <button
                    onClick={() => {
                      updateModalState({
                        ...modalState,
                        letStrokeModal: { isOpen: true },
                      })
                      closeDropdown()
                    }}
                  >
                    Let/Stroke Helper
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      updateModalState({
                        ...modalState,
                        timersModal: { isOpen: true },
                      })
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
        isOpen={modalState.letStrokeModal.isOpen}
        onClose={() =>
          updateModalState({
            ...modalState,
            letStrokeModal: { isOpen: false },
          })
        }
      />
      <TimersModal
        isOpen={modalState.timersModal.isOpen}
        onClose={() =>
          updateModalState({
            ...modalState,
            timersModal: { isOpen: false },
          })
        }
      />
    </header>
  )
}
