import { SessionIdSymbol } from '@livestore/livestore'
import { useClientDocument } from '@livestore/react'
import { Link } from '@tanstack/react-router'
import { Moon, Sun } from 'lucide-react'
import { useEffect } from 'react'
import { usePermissions } from '../hooks/usePermissions'
import { tables } from '../livestore/schema'
import { LoginButton } from './auth/LoginButton'
import { LetStrokeModal } from './modals/LetStrokeModal'
import { TimersModal } from './modals/TimersModal'

export default function Header() {
  const { can } = usePermissions()

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

  return (
    <>
      <header className="navbar bg-base-100 shadow-lg sticky top-0 z-40 border-b border-base-300">
        {/* Navbar Start - Logo */}
        <div className="navbar-start">
          <Link to="/" className="btn btn-ghost text-base sm:text-xl gap-2">
            <img
              src="/pcs_shield.png"
              alt="PCS Logo"
              className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
            />
            <span className="hidden sm:inline">Squash Score Keeper</span>
            <span className="sm:hidden">Squash Score Keeper</span>
          </Link>
        </div>

        {/* Navbar Center - Menu items (visible on larger screens) */}
        <div className="navbar-center hidden md:flex">
          <ul className="menu menu-horizontal px-1 gap-1">
            <li>
              <Link to="/matches">All Matches</Link>
            </li>
            {can('user.view') && (
              <>
                <li>
                  <Link to="/players">Players</Link>
                </li>
                <li>
                  <Link to="/users">Users</Link>
                </li>
              </>
            )}
            <li>
              <details>
                <summary>Referee Tools</summary>
                <ul className="bg-base-100 rounded-box w-52 p-2 shadow-lg z-50">
                  <li>
                    <button
                      onClick={() =>
                        updateModalState({
                          ...modalState,
                          letStrokeModal: { isOpen: true },
                        })
                      }
                    >
                      Let/Stroke Helper
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() =>
                        updateModalState({
                          ...modalState,
                          timersModal: { isOpen: true },
                        })
                      }
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
              </details>
            </li>
          </ul>
        </div>

        {/* Navbar End - Actions */}
        <div className="navbar-end gap-1 sm:gap-2">
          <LoginButton />
          <button
            onClick={toggleTheme}
            className="btn btn-ghost btn-circle btn-sm sm:btn-md"
            aria-label="Toggle theme"
          >
            {theme === 'pcsquash' ? (
              <Moon className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <Sun className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </button>

          {/* Dropdown menu for smaller screens */}
          <div className="dropdown dropdown-end md:hidden">
            <label
              tabIndex={0}
              className="btn btn-ghost btn-circle btn-sm sm:btn-md"
              aria-label="Open menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 sm:h-5 sm:w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </label>
            <ul
              tabIndex={0}
              className="menu menu-sm dropdown-content bg-base-100 rounded-box mt-3 w-52 p-2 shadow-lg z-50"
            >
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>
                <Link to="/matches">All Matches</Link>
              </li>
              {can('user.view') && (
                <>
                  <li>
                    <Link to="/players">Players</Link>
                  </li>
                  <li>
                    <Link to="/users">Users</Link>
                  </li>
                </>
              )}
              <li className="menu-title">
                <span>Referee Tools</span>
              </li>
              <li>
                <button
                  onClick={() =>
                    updateModalState({
                      ...modalState,
                      letStrokeModal: { isOpen: true },
                    })
                  }
                >
                  Let/Stroke Helper
                </button>
              </li>
              <li>
                <button
                  onClick={() =>
                    updateModalState({
                      ...modalState,
                      timersModal: { isOpen: true },
                    })
                  }
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
          </div>
        </div>
      </header>
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
    </>
  )
}
