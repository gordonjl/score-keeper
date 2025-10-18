import { useForm } from '@tanstack/react-form'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useStore } from '@livestore/react'
import { Either, Schema as S } from 'effect'
import { Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLiveStoreMatch } from '../contexts/LiveStoreMatchContext'
import { matchById$ } from '../livestore/squash-queries'
import { events } from '../livestore/schema'
import type { PlayerName } from '../machines/squashMachine.types'

// Effect Schema for setup form (no Zod)
const Team = S.Literal('A', 'B')
const PlayerRow = S.Literal(1 as const, 2 as const)

type SetupSearch = {
  teamA?: string
  teamB?: string
  A1?: string
  A2?: string
  B1?: string
  B2?: string
}

export const Route = createFileRoute('/match/$matchId/setup')({
  component: SetupRoute,
  validateSearch: (search: Record<string, unknown>): SetupSearch => {
    return {
      teamA: search.teamA as string | undefined,
      teamB: search.teamB as string | undefined,
      A1: search.A1 as string | undefined,
      A2: search.A2 as string | undefined,
      B1: search.B1 as string | undefined,
      B2: search.B2 as string | undefined,
    }
  },
})

function SetupRoute() {
  const { matchId } = Route.useParams()
  const { store } = useStore()
  const { actor, isLoading } = useLiveStoreMatch()
  const searchParams = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const [submitError, setSubmitError] = useState<string | null>(null)
  const hasPopulatedForm = useRef(false)

  // Query match data from LiveStore
  const match = useQuery(matchById$(matchId))

  const form = useForm({
    defaultValues: {
      A1First: '',
      A1Last: '',
      A2First: '',
      A2Last: '',
      B1First: '',
      B1Last: '',
      B2First: '',
      B2Last: '',
      teamAFirstServer: 1 as 1 | 2,
      teamBFirstServer: 1 as 1 | 2,
      firstServingTeam: 'A' as 'A' | 'B',
    },
    onSubmit: ({ value }) => {
      const payload = {
        A1First: value.A1First,
        A1Last: value.A1Last,
        A2First: value.A2First,
        A2Last: value.A2Last,
        B1First: value.B1First,
        B1Last: value.B1Last,
        B2First: value.B2First,
        B2Last: value.B2Last,
        teamAFirstServer: value.teamAFirstServer,
        teamBFirstServer: value.teamBFirstServer,
        firstServingTeam: value.firstServingTeam,
      }

      const BasicSchema = S.Struct({
        A1First: S.Trim,
        A1Last: S.Trim,
        A2First: S.Trim,
        A2Last: S.Trim,
        B1First: S.Trim,
        B1Last: S.Trim,
        B2First: S.Trim,
        B2Last: S.Trim,
        teamAFirstServer: PlayerRow,
        teamBFirstServer: PlayerRow,
        firstServingTeam: Team,
      })
      const parseResult = S.decodeUnknownEither(BasicSchema)(payload)

      if (Either.isLeft(parseResult)) {
        setSubmitError('Invalid form. Please check required fields.')
        return
      }

      const parsed = parseResult.right

      // Validate: for each player, require at least one of first/last
      const missing: Array<string> = []
      const check = (first: string, last: string, label: string) => {
        if (first.trim() === '' && last.trim() === '') missing.push(label)
      }
      check(parsed.A1First, parsed.A1Last, 'Team A - Player 1')
      check(parsed.A2First, parsed.A2Last, 'Team A - Player 2')
      check(parsed.B1First, parsed.B1Last, 'Team B - Player 1')
      check(parsed.B2First, parsed.B2Last, 'Team B - Player 2')
      if (missing.length) {
        setSubmitError(`Enter a first or last name for: ${missing.join(', ')}`)
        return
      }
      setSubmitError(null)

      // Keep player positions fixed - teamAFirstServer/teamBFirstServer are used
      // by getOrderedRows() to determine display order, not to swap data
      const build = (first: string, last: string): PlayerName => ({
        firstName: first.trim(),
        lastName: last.trim(),
        fullName: `${first.trim()} ${last.trim()}`.trim(),
      })

      const A1 = build(parsed.A1First, parsed.A1Last)
      const A2 = build(parsed.A2First, parsed.A2Last)
      const B1 = build(parsed.B1First, parsed.B1Last)
      const B2 = build(parsed.B2First, parsed.B2Last)

      if (!actor) return

      // 1. Emit matchSetup event to LiveStore
      store.commit(
        events.matchSetup({
          matchId,
          playerA1: {
            firstName: A1.firstName,
            lastName: A1.lastName,
          },
          playerA2: {
            firstName: A2.firstName,
            lastName: A2.lastName,
          },
          playerB1: {
            firstName: B1.firstName,
            lastName: B1.lastName,
          },
          playerB2: {
            firstName: B2.firstName,
            lastName: B2.lastName,
          },
          timestamp: new Date(),
        }),
      )

      // 2. Emit gameStarted event to LiveStore
      const gameId = crypto.randomUUID()
      store.commit(
        events.gameStarted({
          gameId,
          matchId,
          gameNumber: 1,
          firstServingTeam: parsed.firstServingTeam,
          firstServingPlayer: 1,
          firstServingSide: 'R',
          teamAFirstServer: parsed.teamAFirstServer,
          teamBFirstServer: parsed.teamBFirstServer,
          maxPoints: 15,
          winBy: 1,
          timestamp: new Date(),
        }),
      )

      // 3. Update machine UI state
      actor.send({ type: 'START_GAME', gameId })

      // 4. Navigate to the game
      void navigate({
        to: '/match/$matchId/game/$gameNumber',
        params: { matchId, gameNumber: '1' },
      })
    },
  })

  // Populate form with search params (priority) or existing match data
  useEffect(() => {
    if (hasPopulatedForm.current) return

    // Priority 1: Search params (from "Start New Match (Same Teams)")
    if (
      searchParams.A1 &&
      searchParams.A2 &&
      searchParams.B1 &&
      searchParams.B2
    ) {
      const parse = (full: string) => {
        const parts = full.trim().split(/\s+/)
        const last = parts.pop() ?? ''
        const first = parts.join(' ')
        return { first, last }
      }
      const a1 = parse(searchParams.A1)
      const a2 = parse(searchParams.A2)
      const b1 = parse(searchParams.B1)
      const b2 = parse(searchParams.B2)
      form.setFieldValue('A1First', a1.first)
      form.setFieldValue('A1Last', a1.last)
      form.setFieldValue('A2First', a2.first)
      form.setFieldValue('A2Last', a2.last)
      form.setFieldValue('B1First', b1.first)
      form.setFieldValue('B1Last', b1.last)
      form.setFieldValue('B2First', b2.first)
      form.setFieldValue('B2Last', b2.last)
      hasPopulatedForm.current = true
    }
    // Priority 2: Existing match data from LiveStore
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    else if (match?.playerA1FirstName) {
      form.setFieldValue('A1First', match.playerA1FirstName)
      form.setFieldValue('A1Last', match.playerA1LastName)
      form.setFieldValue('A2First', match.playerA2FirstName)
      form.setFieldValue('A2Last', match.playerA2LastName)
      form.setFieldValue('B1First', match.playerB1FirstName)
      form.setFieldValue('B1Last', match.playerB1LastName)
      form.setFieldValue('B2First', match.playerB2FirstName)
      form.setFieldValue('B2Last', match.playerB2LastName)
      hasPopulatedForm.current = true
    }
  }, [match, searchParams, form])

  if (isLoading || !actor) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-base-200 to-base-300 py-4 px-4">
      <div className="max-w-4xl mx-auto pb-4">
        <div className="text-center mb-2">
          <h1 className="text-xl sm:text-2xl font-bold">Setup Match</h1>
        </div>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            void form.handleSubmit()
          }}
        >
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-3 sm:p-4">
              <h2 className="card-title text-base mb-2">Players</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Team A Column */}
                <div className="space-y-2">
                  <div className="badge badge-primary badge-lg w-full">
                    Team A
                  </div>
                  <div className="space-y-1">
                    <div className="label pb-0">
                      <span className="label-text font-semibold">Player 1</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <form.Field name="A1First">
                        {(field) => (
                          <input
                            className="input input-bordered input-sm w-full"
                            placeholder="First name"
                            value={field.state.value}
                            onChange={(e) =>
                              field.handleChange(e.currentTarget.value)
                            }
                            tabIndex={1}
                          />
                        )}
                      </form.Field>
                      <form.Field name="A1Last">
                        {(field) => (
                          <input
                            className="input input-bordered input-sm w-full"
                            placeholder="Last name"
                            value={field.state.value}
                            onChange={(e) =>
                              field.handleChange(e.currentTarget.value)
                            }
                            tabIndex={2}
                          />
                        )}
                      </form.Field>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="label pb-0">
                      <span className="label-text font-semibold">Player 2</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <form.Field name="A2First">
                        {(field) => (
                          <input
                            className="input input-bordered input-sm w-full"
                            placeholder="First name"
                            value={field.state.value}
                            onChange={(e) =>
                              field.handleChange(e.currentTarget.value)
                            }
                            tabIndex={3}
                          />
                        )}
                      </form.Field>
                      <form.Field name="A2Last">
                        {(field) => (
                          <input
                            className="input input-bordered input-sm w-full"
                            placeholder="Last name"
                            value={field.state.value}
                            onChange={(e) =>
                              field.handleChange(e.currentTarget.value)
                            }
                            tabIndex={4}
                          />
                        )}
                      </form.Field>
                    </div>
                  </div>
                </div>

                {/* Team B Column */}
                <div className="space-y-2">
                  <div className="badge badge-secondary badge-lg w-full">
                    Team B
                  </div>
                  <div className="space-y-1">
                    <div className="label pb-0">
                      <span className="label-text font-semibold">Player 1</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <form.Field name="B1First">
                        {(field) => (
                          <input
                            className="input input-bordered input-sm w-full"
                            placeholder="First name"
                            value={field.state.value}
                            onChange={(e) =>
                              field.handleChange(e.currentTarget.value)
                            }
                            tabIndex={5}
                          />
                        )}
                      </form.Field>
                      <form.Field name="B1Last">
                        {(field) => (
                          <input
                            className="input input-bordered input-sm w-full"
                            placeholder="Last name"
                            value={field.state.value}
                            onChange={(e) =>
                              field.handleChange(e.currentTarget.value)
                            }
                            tabIndex={6}
                          />
                        )}
                      </form.Field>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="label pb-0">
                      <span className="label-text font-semibold">Player 2</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <form.Field name="B2First">
                        {(field) => (
                          <input
                            className="input input-bordered input-sm w-full"
                            placeholder="First name"
                            value={field.state.value}
                            onChange={(e) =>
                              field.handleChange(e.currentTarget.value)
                            }
                            tabIndex={7}
                          />
                        )}
                      </form.Field>
                      <form.Field name="B2Last">
                        {(field) => (
                          <input
                            className="input input-bordered input-sm w-full"
                            placeholder="Last name"
                            value={field.state.value}
                            onChange={(e) =>
                              field.handleChange(e.currentTarget.value)
                            }
                            tabIndex={8}
                          />
                        )}
                      </form.Field>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-3 sm:p-4">
              <h2 className="card-title text-base mb-2">
                First Server Designation
              </h2>
              <form.Subscribe
                selector={(state) => ({
                  A1First: state.values.A1First,
                  A1Last: state.values.A1Last,
                  A2First: state.values.A2First,
                  A2Last: state.values.A2Last,
                  B1First: state.values.B1First,
                  B1Last: state.values.B1Last,
                  B2First: state.values.B2First,
                  B2Last: state.values.B2Last,
                  teamAFirstServer: state.values.teamAFirstServer,
                  teamBFirstServer: state.values.teamBFirstServer,
                  firstServingTeam: state.values.firstServingTeam,
                })}
              >
                {({
                  A1First,
                  A1Last,
                  A2First,
                  A2Last,
                  B1First,
                  B1Last,
                  B2First,
                  B2Last,
                  teamAFirstServer,
                  teamBFirstServer,
                  firstServingTeam,
                }) => {
                  const A1 = `${A1First} ${A1Last}`.trim()
                  const A2 = `${A2First} ${A2Last}`.trim()
                  const B1 = `${B1First} ${B1Last}`.trim()
                  const B2 = `${B2First} ${B2Last}`.trim()
                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Team A First Server */}
                      <div className="space-y-2">
                        <div className="font-semibold text-sm sm:text-base">
                          {A1 && A2 ? `${A1} & ${A2}` : 'Team A'} - Who serves
                          first on hand-in?
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <label className="label cursor-pointer flex-1 flex-col gap-2 p-4 border-2 border-base-300 rounded-lg hover:bg-base-200 hover:border-primary transition-all">
                            <span className="label-text font-semibold">
                              {A1 || 'A1'}
                            </span>
                            <input
                              type="radio"
                              name="teamAFirstServer"
                              className="radio radio-primary"
                              checked={teamAFirstServer === 1}
                              onChange={() =>
                                form.setFieldValue('teamAFirstServer', 1)
                              }
                            />
                          </label>
                          <label className="label cursor-pointer flex-1 flex-col gap-2 p-4 border-2 border-base-300 rounded-lg hover:bg-base-200 hover:border-primary transition-all">
                            <span className="label-text font-semibold">
                              {A2 || 'A2'}
                            </span>
                            <input
                              type="radio"
                              name="teamAFirstServer"
                              className="radio radio-primary"
                              checked={teamAFirstServer === 2}
                              onChange={() =>
                                form.setFieldValue('teamAFirstServer', 2)
                              }
                            />
                          </label>
                        </div>
                      </div>

                      {/* Team B First Server */}
                      <div className="space-y-2">
                        <div className="font-semibold text-sm sm:text-base">
                          {B1 && B2 ? `${B1} & ${B2}` : 'Team B'} - Who serves
                          first on hand-in?
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <label className="label cursor-pointer flex-1 flex-col gap-2 p-4 border-2 border-base-300 rounded-lg hover:bg-base-200 hover:border-primary transition-all">
                            <span className="label-text font-semibold">
                              {B1 || 'B1'}
                            </span>
                            <input
                              type="radio"
                              name="teamBFirstServer"
                              className="radio radio-primary"
                              checked={teamBFirstServer === 1}
                              onChange={() =>
                                form.setFieldValue('teamBFirstServer', 1)
                              }
                            />
                          </label>
                          <label className="label cursor-pointer flex-1 flex-col gap-2 p-4 border-2 border-base-300 rounded-lg hover:bg-base-200 hover:border-primary transition-all">
                            <span className="label-text font-semibold">
                              {B2 || 'B2'}
                            </span>
                            <input
                              type="radio"
                              name="teamBFirstServer"
                              className="radio radio-primary"
                              checked={teamBFirstServer === 2}
                              onChange={() =>
                                form.setFieldValue('teamBFirstServer', 2)
                              }
                            />
                          </label>
                        </div>
                      </div>

                      {/* Which Team Serves First Overall */}
                      <div className="lg:col-span-2 space-y-2">
                        <div className="font-semibold text-sm sm:text-base text-center">
                          Which team serves first at 0-0?
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-lg mx-auto">
                          <label className="label cursor-pointer flex-1 flex-col gap-2 p-4 border-2 border-base-300 rounded-lg hover:bg-base-200 hover:border-primary transition-all">
                            <span className="label-text font-bold">
                              {A1 && A2 ? `${A1} & ${A2}` : 'Team A'}
                            </span>
                            <input
                              type="radio"
                              name="firstServingTeam"
                              className="radio radio-primary"
                              checked={firstServingTeam === 'A'}
                              onChange={() =>
                                form.setFieldValue('firstServingTeam', 'A')
                              }
                            />
                          </label>
                          <label className="label cursor-pointer flex-1 flex-col gap-2 p-4 border-2 border-base-300 rounded-lg hover:bg-base-200 hover:border-primary transition-all">
                            <span className="label-text font-bold">
                              {B1 && B2 ? `${B1} & ${B2}` : 'Team B'}
                            </span>
                            <input
                              type="radio"
                              name="firstServingTeam"
                              className="radio radio-primary"
                              checked={firstServingTeam === 'B'}
                              onChange={() =>
                                form.setFieldValue('firstServingTeam', 'B')
                              }
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  )
                }}
              </form.Subscribe>
            </div>
          </div>

          {submitError ? (
            <div className="alert alert-error shadow-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{submitError}</span>
            </div>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => void navigate({ to: '/' })}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary gap-2">
              <Play className="w-4 h-4" />
              Start Game
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
