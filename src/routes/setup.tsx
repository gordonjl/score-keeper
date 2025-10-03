import { useForm } from '@tanstack/react-form'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Schema as S } from 'effect'
import { useState } from 'react'
import { SquashMachineContext } from '../contexts/SquashMachineContext'

// Effect Schema for setup form (no Zod)
const Team = S.Literal('A', 'B')
const PlayerRow = S.Literal(1 as const, 2 as const)

const FirstServerSchema = S.Struct({
  team: Team,
  player: PlayerRow,
})

// Trim is a transformer schema that removes whitespace from both ends
// We compose it with a minLength filter to ensure non-empty strings
const NonEmptyTrimmedString = S.Trim.pipe(S.minLength(1))

const SetupSchema = S.Struct({
  A1: NonEmptyTrimmedString,
  A2: NonEmptyTrimmedString,
  B1: NonEmptyTrimmedString,
  B2: NonEmptyTrimmedString,
  firstServer: FirstServerSchema,
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
      A1: '',
      A2: '',
      B1: '',
      B2: '',
      firstServer: {
        team: 'A' as 'A' | 'B',
        player: 1 as 1 | 2,
      },
    },
    onSubmit: ({ value }) => {
      // Build unknown payload to validate
      const payload = {
        A1: value.A1,
        A2: value.A2,
        B1: value.B1,
        B2: value.B2,
        firstServer: value.firstServer,
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
          teamA: 'Team A',
          teamB: 'Team B',
        },
      })
      actorRef.send({
        type: 'START_GAME',
        firstServer: {
          ...parsed.firstServer,
          side: 'R', // Always start from right side
        },
        maxPoints: 15, // PAR-15 scoring
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
        <fieldset className="card bg-base-100 shadow p-4 md:col-span-2">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <form.Field name="firstServer.team">
              {(field) => (
                <label className="form-control">
                  <span className="label-text">Team</span>
                  <select
                    className="select select-bordered"
                    value={field.state.value}
                    onChange={(e) => {
                      field.handleChange(e.currentTarget.value as 'A' | 'B')
                      // Reset player to 1 when team changes
                      form.setFieldValue('firstServer.player', 1)
                    }}
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                  </select>
                </label>
              )}
            </form.Field>
            <form.Field name="firstServer.player">
              {(field) => (
                <label className="form-control">
                  <span className="label-text">First Server</span>
                  <select
                    className="select select-bordered"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(Number(e.currentTarget.value) as 1 | 2)}
                  >
                    {form.state.values.firstServer.team === 'A' ? (
                      <>
                        <option value={1}>
                          {form.state.values.A1 || 'A1'}
                        </option>
                        <option value={2}>
                          {form.state.values.A2 || 'A2'}
                        </option>
                      </>
                    ) : (
                      <>
                        <option value={1}>
                          {form.state.values.B1 || 'B1'}
                        </option>
                        <option value={2}>
                          {form.state.values.B2 || 'B2'}
                        </option>
                      </>
                    )}
                  </select>
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
