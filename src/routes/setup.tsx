import { useForm } from '@tanstack/react-form'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Schema as S } from 'effect'
import { useState } from 'react'
import { SquashMachineContext } from '../contexts/SquashMachineContext'

// Effect Schema for setup form (no Zod)
const Team = S.Literal('A', 'B')
const PlayerRow = S.Literal(1 as const, 2 as const)
const Side = S.Literal('R', 'L')

const FirstServerSchema = S.Struct({
  team: Team,
  player: PlayerRow,
  side: Side,
})

// Trim is a transformer schema that removes whitespace from both ends
// We compose it with a minLength filter to ensure non-empty strings
const NonEmptyTrimmedString = S.Trim.pipe(S.minLength(1))

const SetupSchema = S.Struct({
  teamA: NonEmptyTrimmedString,
  teamB: NonEmptyTrimmedString,
  A1: NonEmptyTrimmedString,
  A2: NonEmptyTrimmedString,
  B1: NonEmptyTrimmedString,
  B2: NonEmptyTrimmedString,
  firstServer: FirstServerSchema,
  maxPoints: S.NumberFromString.pipe(S.int(), S.greaterThanOrEqualTo(1)),
})

export const Route = createFileRoute('/setup')({
  component: SetupRoute,
})

function SetupRoute() {
  const actorRef = SquashMachineContext.useActorRef()
  const navigate = useNavigate()

  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      teamA: '',
      teamB: '',
      A1: '',
      A2: '',
      B1: '',
      B2: '',
      firstServer: {
        team: 'A' as 'A' | 'B',
        player: 1 as 1 | 2,
        side: 'R' as 'R' | 'L',
      },
      maxPoints: '15',
    },
    onSubmit: ({ value }) => {
      // Build unknown payload to validate
      const payload = {
        teamA: value.teamA,
        teamB: value.teamB,
        A1: value.A1,
        A2: value.A2,
        B1: value.B1,
        B2: value.B2,
        firstServer: value.firstServer,
        maxPoints: value.maxPoints,
      }
      // Use decodeUnknownSync for synchronous validation
      let parsed: S.Schema.Type<typeof SetupSchema>
      try {
        parsed = S.decodeUnknownSync(SetupSchema)(payload)
      } catch (error) {
        setSubmitError('Invalid form. Please check required fields.')
        return
      }
      setSubmitError(null)
      actorRef.send({
        type: 'SETUP_TEAMS',
        players: {
          A1: parsed.A1,
          A2: parsed.A2,
          B1: parsed.B1,
          B2: parsed.B2,
          teamA: parsed.teamA,
          teamB: parsed.teamB,
        },
      })
      actorRef.send({
        type: 'START_GAME',
        firstServer: parsed.firstServer,
        maxPoints: parsed.maxPoints,
        winBy: 1, // strictly win-by-1
      })
      navigate({ to: '/game' })
    },
  })

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
        <fieldset className="card bg-base-100 shadow p-4">
          <legend className="card-title mb-2">Teams</legend>
          <form.Field name="teamA">
            {(field) => (
              <label className="form-control w-full mb-2">
                <span className="label-text">Team A</span>
                <input
                  className="input input-bordered"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.currentTarget.value)}
                />
              </label>
            )}
          </form.Field>
          <form.Field name="teamB">
            {(field) => (
              <label className="form-control w-full">
                <span className="label-text">Team B</span>
                <input
                  className="input input-bordered"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.currentTarget.value)}
                />
              </label>
            )}
          </form.Field>
        </fieldset>

        <fieldset className="card bg-base-100 shadow p-4">
          <legend className="card-title mb-2">Players</legend>
          <div className="grid grid-cols-2 gap-2">
            <form.Field name="A1">
              {(field) => (
                <label className="form-control">
                  <span className="label-text">A1</span>
                  <input
                    className="input input-bordered"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.currentTarget.value)}
                  />
                </label>
              )}
            </form.Field>
            <form.Field name="A2">
              {(field) => (
                <label className="form-control">
                  <span className="label-text">A2</span>
                  <input
                    className="input input-bordered"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.currentTarget.value)}
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
                    onChange={(e) => field.handleChange(e.currentTarget.value)}
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
                    onChange={(e) => field.handleChange(e.currentTarget.value)}
                  />
                </label>
              )}
            </form.Field>
          </div>
        </fieldset>

        <fieldset className="card bg-base-100 shadow p-4 md:col-span-2">
          <legend className="card-title mb-2">Start</legend>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <label className="form-control">
              <span className="label-text">Team</span>
              <select
                className="select select-bordered"
                value={form.state.values.firstServer.team}
                onChange={(e) =>
                  form.setFieldValue('firstServer', {
                    ...form.state.values.firstServer,
                    team: e.currentTarget.value as 'A' | 'B',
                  })
                }
              >
                <option value="A">A</option>
                <option value="B">B</option>
              </select>
            </label>
            <label className="form-control">
              <span className="label-text">Player</span>
              <select
                className="select select-bordered"
                value={form.state.values.firstServer.player}
                onChange={(e) =>
                  form.setFieldValue('firstServer', {
                    ...form.state.values.firstServer,
                    player: Number(e.currentTarget.value) as 1 | 2,
                  })
                }
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </label>
            <label className="form-control">
              <span className="label-text">Side</span>
              <select
                className="select select-bordered"
                value={form.state.values.firstServer.side}
                onChange={(e) =>
                  form.setFieldValue('firstServer', {
                    ...form.state.values.firstServer,
                    side: e.currentTarget.value as 'R' | 'L',
                  })
                }
              >
                <option value="R">Right</option>
                <option value="L">Left</option>
              </select>
            </label>
            <form.Field name="maxPoints">
              {(field) => (
                <label className="form-control">
                  <span className="label-text">Max Points</span>
                  <input
                    className="input input-bordered"
                    inputMode="numeric"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.currentTarget.value)}
                  />
                </label>
              )}
            </form.Field>
          </div>
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
