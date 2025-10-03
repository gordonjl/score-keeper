import { StageEnum } from '@pencilwrench/shared'
import { assign, log, setup, type PromiseActorLogic } from 'xstate'

type CommentModalMachineEvents =
  | {
      type: 'OPEN'
      payload: {
        stage?: StageEnum
      }
    }
  | {
      type: 'CLOSE'
    }
  | {
      type: 'ERROR'
      payload: {
        error: string
      }
    }
  | {
      type: 'SUBMIT'
      payload: {
        comment: string
        stage: StageEnum
      }
    }

type CommentModalMachineContext = {
  sessionId: string
  defaultStage: StageEnum
  comment: string
  stage: StageEnum
  error?: string
}

type CommentModalMachineInput = {
  sessionId: string
  defaultStage: StageEnum
}

type SubmitCommentInput = {
  sessionId: string
  comment: string
  stage: StageEnum
}

type Actors = {
  submitComment: PromiseActorLogic<unknown, SubmitCommentInput>
}

export const commentModalMachine = setup({
  types: {
    events: {} as CommentModalMachineEvents,
    context: {} as CommentModalMachineContext,
    input: {} as CommentModalMachineInput,
  },
  actors: {} as Actors,
  actions: {
    reset: assign(() => ({
      comment: '',
      error: undefined,
    })),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QGMD2BbdYB2AXAsqhAIYA2+xyAFgJbZgB0ypqskAxAPIAKAogHIBtAAwBdRKAAOrGrhqpsEkAA9EAFgBMAZgYAOAKwA2fRt26AjBoCcw4VoA0IAJ6IAtNqsMTVq2t+HdQwB2fTV9AF9wxzRMHAIiMgpqOkZIWToodgBhABlOAGVeEXEkEGlYdIUlVQQtfV0GQystQ20tTSbbfUcXBFdLNQYtSyDNUzqgjVbI6IwsPEISckpaegY0uWxM-IBVACF8AEkAFWKlcsrFUpqtK30GNWHzE10g8zUw-QdnRA1he5aXyCLTUumGanMMxAMXm8SWSVWqQg6S27F4ACV0Zx0WdShc5FVrohDMFGgYzOYglYgsYtBoeohzO9GsJXkZhBpzIZNHUoTC4otEisUgxYABXABG6Fkm0yEAUjDoADdUABrRj8hYJZbJNbiqUyjIIZWoZDEAnYYq4qQyC3VYnmBo0tR2YHAx1mBm1KzmBjaEyPVoQ3TWNR8uYC7UIkX66W4WXsMAAJyTqCTDEkpHNADM0+gmBGtfDhXrJXHZcbsCqzRarWJzrb5FdQDVLDpWS62V8QySrF6WhoGEFh81bFpx1zdOHYkWhbrGLGZRxrWVG4SW4ggrphAxzMJuaznmphxogl73MOh2pDMJmiFIlEQNgiHAlJq4XPEQ2KnaiQgQgwHasiE3ZTE054ujuhiWK0rL-FobxaNOsKCjqiJMCwbAQN+lz2rUZgMFYFi3C6B7NLo57DDoTJTH825AuYSGPu+qHRmsGwZDhv4bt6gzBBo14gX4+ghIYXrXoR1haIEImCX8YbMYWH5oTGZaGlsXFNnhdSDJMLrtMIYSWCG-ajH6wzCCEW76EyjoKbMM7KWxC5qfGkCaeuKibgEejcn8Xx3ERLRegCuh+K8YIiSYt5WA+4RAA */
  id: 'commentModalMachine',
  initial: 'closed',
  context: ({ input }) => ({
    sessionId: input.sessionId,
    defaultStage: input.defaultStage,
    comment: '',
    stage: input.defaultStage,
    error: undefined,
  }),
  states: {
    closed: {
      on: {
        OPEN: {
          target: 'editing',
          actions: assign(({ event }) => ({
            stage: event.payload.stage,
          })),
        },
      },
    },
    editing: {
      on: {
        CLOSE: {
          target: 'closed',
          actions: 'reset',
        },
        SUBMIT: {
          target: 'submitting',
          actions: assign(({ event }) => ({
            comment: event.payload.comment,
            stage: event.payload.stage,
          })),
        },
        ERROR: {
          description: 'Validation errors',
          target: 'editing',
          actions: [
            assign(({ event }) => ({
              error: event.payload.error,
            })),
            log(({ event, context }) => ({
              errorMessage: `Failed to submit comment: ${event.payload.error}\nContext: ${JSON.stringify(context)}`,
            })),
          ],
        },
      },
    },
    submitting: {
      invoke: {
        src: 'submitComment',
        input: ({ context }) => {
          return {
            sessionId: context.sessionId,
            comment: context.comment,
            stage: context.stage,
          }
        },
        onDone: {
          target: 'submitted',
        },
        onError: {
          target: 'editing',
          actions: [
            assign(() => ({
              error: 'Something went wrong. Comment could not be submitted.',
            })),
            log(({ event, context }) => ({
              errorMessage: `Failed to submit comment: ${event.error}`,
              context,
            })),
          ],
        },
      },
    },
    submitted: {
      always: {
        target: 'closed',
        actions: 'reset',
      },
    },
  },
})

export type CommentModalMachine = typeof commentModalMachine
