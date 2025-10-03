import { useForm } from '@tanstack/react-form'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Either, Schema as S } from 'effect'
import { useEffect, useState } from 'react'
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

export const Route = createFileRoute('/_match/setup')({
  component: SetupRoute,
})

function SetupRoute() {
  const actorRef = MatchMachineContext.useActorRef()
  const matchData = MatchMachineContext.useSelector((s) => ({
    players: s.context.players,
    teamAFirstServer: s.context.teamAFirstServer,
    teamBFirstServer: s.context.teamBFirstServer,
  }))
  const navigate = useNavigate()

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

  // Populate form with existing match data on mount
  useEffect(() => {
    console.log('Setup: Match data:', matchData)
    if (matchData.players.A1) {
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
  }, [matchData, form])

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Setup Match</h1>
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <fieldset className="card bg-base-100 shadow p-4 md:col-span-2">
          <legend className="card-title mb-2">Players</legend>
          <div className="grid grid-cols-2 gap-4">
            {/* Right Wall Column */}
            <div className="space-y-2">
              <div className="text-sm font-semibold text-base-content/70 text-center">
                Right Wall
              </div>
              <form.Field name="A1">
                {(field) => (
                  <label className="form-control">
                    <span className="label-text">A1</span>
                    <input
                      className="input input-bordered"
                      value={field.state.value}
                      onChange={(e) =>
                        field.handleChange(e.currentTarget.value)
                      }
                      tabIndex={1}
                    />
                  </label>
                )}
              </form.Field>
              <form.Field name="B1">
                {(field) => (
                  <label className="form-control">
                    <span className="label-text">B1</span>
                    <input
                      className="input input-bordered"
                      value={field.state.value}
                      onChange={(e) =>
                        field.handleChange(e.currentTarget.value)
                      }
                      tabIndex={3}
                    />
                  </label>
                )}
              </form.Field>
            </div>

            {/* Left Wall Column */}
            <div className="space-y-2">
              <div className="text-sm font-semibold text-base-content/70 text-center">
                Left Wall
              </div>
              <form.Field name="A2">
                {(field) => (
                  <label className="form-control">
                    <span className="label-text">A2</span>
                    <input
                      className="input input-bordered"
                      value={field.state.value}
                      onChange={(e) =>
                        field.handleChange(e.currentTarget.value)
                      }
                      tabIndex={2}
                    />
                  </label>
                )}
              </form.Field>
              <form.Field name="B2">
                {(field) => (
                  <label className="form-control">
                    <span className="label-text">B2</span>
                    <input
                      className="input input-bordered"
                      value={field.state.value}
                      onChange={(e) =>
                        field.handleChange(e.currentTarget.value)
                      }
                      tabIndex={4}
                    />
                  </label>
                )}
              </form.Field>
            </div>
          </div>
        </fieldset>

        <fieldset className="card bg-base-100 shadow p-4 md:col-span-2">
          <legend className="card-title mb-2">First Server Designation</legend>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Team A First Server */}
                <div className="space-y-2">
                  <div className="font-semibold">
                    {A1 && A2 ? `${A1} & ${A2}` : 'Team A'} - Who serves first
                    on hand-in?
                  </div>
                  <div className="flex gap-3">
                    <label className="label cursor-pointer flex-1 flex-col gap-2 p-4 border border-base-300 rounded-lg hover:bg-base-200">
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
                    <label className="label cursor-pointer flex-1 flex-col gap-2 p-4 border border-base-300 rounded-lg hover:bg-base-200">
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
                  <div className="font-semibold">
                    {B1 && B2 ? `${B1} & ${B2}` : 'Team B'} - Who serves first
                    on hand-in?
                  </div>
                  <div className="flex gap-3">
                    <label className="label cursor-pointer flex-1 flex-col gap-2 p-4 border border-base-300 rounded-lg hover:bg-base-200">
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
                    <label className="label cursor-pointer flex-1 flex-col gap-2 p-4 border border-base-300 rounded-lg hover:bg-base-200">
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
                <div className="md:col-span-2 space-y-2">
                  <div className="font-semibold">
                    Which team serves first at 0-0?
                  </div>
                  <div className="flex gap-3 justify-center">
                    <label className="label cursor-pointer flex-col gap-2 p-4 border-2 border-base-300 rounded-lg hover:bg-base-200">
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
                    <label className="label cursor-pointer flex-col gap-2 p-4 border-2 border-base-300 rounded-lg hover:bg-base-200">
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
        </fieldset>

        {submitError ? (
          <div className="alert alert-error md:col-span-2">{submitError}</div>
        ) : null}

        <div className="md:col-span-2 flex gap-2 justify-end">
          <button
            type="button"
            className="btn"
            onClick={() => navigate({ to: '/' })}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Start Game
          </button>
        </div>
      </form>
    </div>
  )
}
