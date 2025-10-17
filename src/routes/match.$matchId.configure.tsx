import { useForm } from '@tanstack/react-form'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useStore } from '@livestore/react'
import { Either, Schema as S } from 'effect'
import { Save } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { matchById$ } from '../livestore/squash-queries'
import { events } from '../livestore/schema'

type ConfigureSearch = {
  A1?: string
  A2?: string
  B1?: string
  B2?: string
}

export const Route = createFileRoute('/match/$matchId/configure')({
  component: ConfigureRoute,
  validateSearch: (search: Record<string, unknown>): ConfigureSearch => {
    return {
      A1: search.A1 as string | undefined,
      A2: search.A2 as string | undefined,
      B1: search.B1 as string | undefined,
      B2: search.B2 as string | undefined,
    }
  },
})

function ConfigureRoute() {
  const { matchId } = Route.useParams()
  const { store } = useStore()
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

      // Emit matchSetup event to LiveStore (without serving info)
      store.commit(
        events.matchSetup({
          matchId,
          playerA1: {
            firstName: parsed.A1First.trim(),
            lastName: parsed.A1Last.trim(),
          },
          playerA2: {
            firstName: parsed.A2First.trim(),
            lastName: parsed.A2Last.trim(),
          },
          playerB1: {
            firstName: parsed.B1First.trim(),
            lastName: parsed.B1Last.trim(),
          },
          playerB2: {
            firstName: parsed.B2First.trim(),
            lastName: parsed.B2Last.trim(),
          },
          timestamp: new Date(),
        }),
      )

      // Navigate back to matches list
      void navigate({ to: '/matches' })
    },
  })

  // Populate form with search params (priority) or existing match data
  useEffect(() => {
    if (hasPopulatedForm.current) return

    // Priority 1: Search params (from copying previous match)
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

  return (
    <div className="bg-gradient-to-br from-base-200 to-base-300 py-4 px-4 min-h-screen">
      <div className="max-w-4xl mx-auto pb-4">
        <div className="text-center mb-4">
          <h1 className="text-xl sm:text-2xl font-bold">Configure Match</h1>
          <p className="text-sm text-base-content/70 mt-2">
            Enter player names. You'll set serving details when you start the
            first game.
          </p>
        </div>
        <form
          className="space-y-4"
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
              onClick={() => void navigate({ to: '/matches' })}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary gap-2">
              <Save className="w-4 h-4" />
              Save Match
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
