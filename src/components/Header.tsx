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

  const closeDrawer = () => {
    const drawerToggle = document.getElementById(
      'header-drawer',
    ) as HTMLInputElement | null
    if (drawerToggle) {
      drawerToggle.checked = false
    }
  }

  return (
    <>
      <div className="drawer drawer-end z-50">
        <input
          id="header-drawer"
          type="checkbox"
          className="drawer-toggle"
          aria-label="Toggle navigation menu"
        />
        <div className="drawer-content">
          {/* Navbar */}
          <header className="navbar bg-base-100 shadow-lg sticky top-0 z-40 border-b border-base-300">
            <div className="navbar-start">
              <Link to="/" className="btn btn-ghost text-base sm:text-xl gap-2">
                <img
                  src="/pcs_shield.png"
                  alt="PCS Logo"
                  className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
                />
                <span className="hidden sm:inline">Squash Score Keeper</span>
                <span className="sm:hidden">Squash</span>
              </Link>
            </div>
            <div className="navbar-center hidden lg:flex">
              <div className="badge badge-ghost badge-md lg:badge-lg">
                PAR-15 Doubles Scoring
              </div>
            </div>
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
              {/* Hamburger menu button - visible on all screens */}
              <label
                htmlFor="header-drawer"
                className="btn btn-ghost btn-circle btn-sm sm:btn-md drawer-button"
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
            </div>
          </header>
        </div>
        {/* Drawer sidebar */}
        <div className="drawer-side">
          <label
            htmlFor="header-drawer"
            aria-label="Close menu"
            className="drawer-overlay"
          />
          <ul className="menu bg-base-100 min-h-full w-72 sm:w-80 p-4 gap-1">
            {/* Drawer header */}
            <li className="menu-title">
              <span className="text-lg font-bold">Navigation</span>
            </li>
            <li>
              <Link to="/" onClick={closeDrawer}>
                Home
              </Link>
            </li>
            <li>
              <Link to="/matches" onClick={closeDrawer}>
                All Matches
              </Link>
            </li>
            {can('user.view') && (
              <>
                <li className="menu-title mt-4">
                  <span>Management</span>
                </li>
                <li>
                  <Link to="/players" onClick={closeDrawer}>
                    Player Management
                  </Link>
                </li>
                <li>
                  <Link to="/users" onClick={closeDrawer}>
                    User Management
                  </Link>
                </li>
              </>
            )}
            <li className="menu-title mt-4">
              <span>Referee Tools</span>
            </li>
            <li>
              <button
                onClick={() => {
                  updateModalState({
                    ...modalState,
                    letStrokeModal: { isOpen: true },
                  })
                  closeDrawer()
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
                  closeDrawer()
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
                onClick={closeDrawer}
              >
                Hardball Rules (PDF)
              </a>
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
    </>
  )
}
