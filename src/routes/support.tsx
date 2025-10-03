import { createFileRoute } from '@tanstack/react-router'
import { LetStrokeDecision } from '../components/support/LetStrokeDecision'
import { Timers } from '../components/support/Timers'
import { ConductWarnings } from '../components/support/ConductWarnings'

export const Route = createFileRoute('/support')({
  component: SupportComponent,
})

function SupportComponent() {
  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-4">Referee & Scorer Support</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Quick Links</h2>
          <ul className="menu bg-base-200 w-full rounded-box">
            <li>
              <a href="https://www.ussquash.com/" target="_blank" rel="noopener noreferrer">
                US Squash Official Website
              </a>
            </li>
            <li>
              <a href="/2024-Hardball-Squash-Doubles-Rules.pdf" target="_blank" rel="noopener noreferrer">
                2024 Hardball Squash Doubles Rules
              </a>
            </li>
          </ul>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Decision Tool</h2>
            <LetStrokeDecision />
          </div>
          <div>
            <Timers />
          </div>
          <div>
            <ConductWarnings />
          </div>
        </div>
      </div>
    </div>
  )
}
