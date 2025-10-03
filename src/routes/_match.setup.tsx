import { useForm } from '@tanstack/react-form'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Either, Schema as S } from 'effect'
import { useEffect, useState } from 'react'
import { Play } from 'lucide-react'
import { MatchMachineContext } from '../contexts/MatchMachineContext'

// Effect Schema for setup form (no Zod)
const Team = S.Literal('A', 'B')
const PlayerRow = S.Literal(1 as const, 2 as const)

// Trim is a transformer schema that removes whitespace from both ends
// We compose it with a minLength filter to ensure non-empty strings
const NonEmptyTrimmedString = S.Trim.pipe(S.minLength(1))

const SetupSchema = S.Struct({
  A1: NonEmptyTrimmedString,
  A2: NonEmptyTrimmedString,
  B1: NonEmptyTrimmedString,
  B2: NonEmptyTrimmedString,
  teamAFirstServer: PlayerRow,
  teamBFirstServer: PlayerRow,
  firstServingTeam: Team,
})

type SetupSearch = {
  teamA?: string
  teamB?: string
  A1?: string
  A2?: string
  B1?: string
  B2?: string
}

export const Route = createFileRoute('/_match/setup')({
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
  const actorRef = MatchMachineContext.useActorRef()
  const matchData = MatchMachineContext.useSelector((s) => ({
    players: s.context.players,
    teamAFirstServer: s.context.teamAFirstServer,
    teamBFirstServer: s.context.teamBFirstServer,
  }))
  const navigate = useNavigate()
  const searchParams = Route.useSearch()

  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      A1: '',
      A2: '',
      B1: '',
      B2: '',
      teamAFirstServer: 1 as 1 | 2,
      teamBFirstServer: 1 as 1 | 2,
      firstServingTeam: 'A' as 'A' | 'B',
    },
    onSubmit: ({ value }) => {
      // Build unknown payload to validate
      const payload = {
        A1: value.A1,
        A2: value.A2,
        B1: value.B1,
        B2: value.B2,
        teamAFirstServer: value.teamAFirstServer,
        teamBFirstServer: value.teamBFirstServer,
        firstServingTeam: value.firstServingTeam,
      }

      const parseResult = S.decodeUnknownEither(SetupSchema)(payload)

      if (Either.isLeft(parseResult)) {
        setSubmitError('Invalid form. Please check required fields.')
        return
      }

      setSubmitError(null)
      const parsed = parseResult.right

      // Reorder players so first servers are in row 1
      const A1 = parsed.teamAFirstServer === 1 ? parsed.A1 : parsed.A2
      const A2 = parsed.teamAFirstServer === 1 ? parsed.A2 : parsed.A1
      const B1 = parsed.teamBFirstServer === 1 ? parsed.B1 : parsed.B2
      const B2 = parsed.teamBFirstServer === 1 ? parsed.B2 : parsed.B1

      const players = {
        A1,
        A2,
        B1,
        B2,
        teamA: `${A1} & ${A2}`,
        teamB: `${B1} & ${B2}`,
      }

      // Setup the match
      actorRef.send({
        type: 'SETUP_MATCH',
        players,
        teamAFirstServer: parsed.teamAFirstServer,
        teamBFirstServer: parsed.teamBFirstServer,
      })

      // Start the first game
      actorRef.send({
        type: 'START_NEW_GAME',
        firstServingTeam: parsed.firstServingTeam,
      })

      navigate({ to: '/game' })
    },
  })

  // Populate form with search params (priority) or existing match data on mount
  useEffect(() => {
    console.log('Setup: Search params:', searchParams)
    console.log('Setup: Match data:', matchData)

    // Priority 1: Search params (from "Start New Match (Same Teams)")
    if (
      searchParams.A1 &&
      searchParams.A2 &&
      searchParams.B1 &&
      searchParams.B2
    ) {
      console.log('Setup: Populating form from search params')
      form.setFieldValue('A1', searchParams.A1)
      form.setFieldValue('A2', searchParams.A2)
      form.setFieldValue('B1', searchParams.B1)
      form.setFieldValue('B2', searchParams.B2)
    }
    // Priority 2: Existing match context data
    else if (matchData.players.A1) {
      console.log('Setup: Populating form with existing data')
      form.setFieldValue('A1', matchData.players.A1)
      form.setFieldValue('A2', matchData.players.A2)
      form.setFieldValue('B1', matchData.players.B1)
      form.setFieldValue('B2', matchData.players.B2)
      form.setFieldValue('teamAFirstServer', matchData.teamAFirstServer)
      form.setFieldValue('teamBFirstServer', matchData.teamBFirstServer)
    } else {
      console.log('Setup: No existing match data found')
    }
  }, [matchData, searchParams, form])

  return (
    <div className="min-h-full bg-gradient-to-br from-base-200 to-base-300 py-4 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Setup Match</h1>
        </div>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-4 sm:p-6">
              <h2 className="card-title text-lg mb-3">Players</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Team A Column */}
                <div className="space-y-3">
                  <div className="badge badge-primary badge-lg w-full">
                    Team A
                  </div>
                  <form.Field name="A1">
                    {(field) => (
                      <div className="form-control">
                        <label className="label py-1">
                          <span className="label-text font-semibold">
                            Player 1
                          </span>
                        </label>
                        <input
                          className="input input-bordered"
                          placeholder="Enter player name"
                          value={field.state.value}
                          onChange={(e) =>
                            field.handleChange(e.currentTarget.value)
                          }
                          tabIndex={1}
                        />
                      </div>
                    )}
                  </form.Field>
                  <form.Field name="A2">
                    {(field) => (
                      <div className="form-control">
                        <label className="label py-1">
                          <span className="label-text font-semibold">
                            Player 2
                          </span>
                        </label>
                        <input
                          className="input input-bordered"
                          placeholder="Enter player name"
                          value={field.state.value}
                          onChange={(e) =>
                            field.handleChange(e.currentTarget.value)
                          }
                          tabIndex={2}
                        />
                      </div>
                    )}
                  </form.Field>
                </div>

                {/* Team B Column */}
                <div className="space-y-3">
                  <div className="badge badge-secondary badge-lg w-full">
                    Team B
                  </div>
                  <form.Field name="B1">
                    {(field) => (
                      <div className="form-control">
                        <label className="label py-1">
                          <span className="label-text font-semibold">
                            Player 1
                          </span>
                        </label>
                        <input
                          className="input input-bordered"
                          placeholder="Enter player name"
                          value={field.state.value}
                          onChange={(e) =>
                            field.handleChange(e.currentTarget.value)
                          }
                          tabIndex={3}
                        />
                      </div>
                    )}
                  </form.Field>
                  <form.Field name="B2">
                    {(field) => (
                      <div className="form-control">
                        <label className="label py-1">
                          <span className="label-text font-semibold">
                            Player 2
                          </span>
                        </label>
                        <input
                          className="input input-bordered"
                          placeholder="Enter player name"
                          value={field.state.value}
                          onChange={(e) =>
                            field.handleChange(e.currentTarget.value)
                          }
                          tabIndex={4}
                        />
                      </div>
                    )}
                  </form.Field>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-4 sm:p-6">
              <h2 className="card-title text-lg mb-3">
                First Server Designation
              </h2>
              <form.Subscribe
                selector={(state) => ({
                  A1: state.values.A1,
                  A2: state.values.A2,
                  B1: state.values.B1,
                  B2: state.values.B2,
                  teamAFirstServer: state.values.teamAFirstServer,
                  teamBFirstServer: state.values.teamBFirstServer,
                  firstServingTeam: state.values.firstServingTeam,
                })}
              >
                {({
                  A1,
                  A2,
                  B1,
                  B2,
                  teamAFirstServer,
                  teamBFirstServer,
                  firstServingTeam,
                }) => (
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
                )}
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
              onClick={() => navigate({ to: '/' })}
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
