import { assign, PromiseActorLogic, setup, fromPromise } from 'xstate'
import { LogLevel, String as S } from 'effect'
import { logToConsole } from '../../../utils/stateMachines'

type SplitCopyMachineEvents =
  | {
      type: 'INIT'
      payload: {
        originalCause: string
        originalCorrection: string
      }
    }
  | {
      type: 'COPY'
      payload: {
        field: 'editedCause' | 'editedCorrection'
      }
    }
  | {
      type: 'EDIT'
      payload: {
        field: 'editedCause' | 'editedCorrection'
        text: string
      }
    }

type ActorLogic = {
  copyToClipboard: PromiseActorLogic<void, { text: string }>
}

type SplitCopyMachineContext = {
  editedCause: string
  editedCorrection: string
  originalCause: string
  originalCorrection: string
  storyModified: boolean
  causeErrorMessage: string
  correctionErrorMessage: string
  causeSuccessMessage: string
  correctionSuccessMessage: string
  activeField: 'editedCause' | 'editedCorrection' | null
}

export const splitCopyMachine = setup({
  types: {
    events: {} as SplitCopyMachineEvents,
    context: {} as SplitCopyMachineContext,
  },
  actors: {
    copyToClipboard: fromPromise(({ input }: { input: { text: string } }) =>
      navigator.clipboard.writeText(input.text),
    ),
  } as ActorLogic,
  actions: {
    sendStory: () => {
      throw new Error('Provide sendStory function when instantiating machine.')
    },
    saveSession: () => {
      throw new Error(
        'Provide saveSession function when instantiating machine.',
      )
    },
    resizeEditors: () => {},
    focusEditor: () => {},
    logToConsole,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5SwA4BsCWAXAwgexQE8BZAQwGMALDAOzADoMI0wBiASQDl2AVAbQAMAXUSgUeWNgx4aokAA9EAdgEBOegBZVAVlUaNAZlVLtAJgAcpgDQhCiAIyH6ppY4BsA01u3nLAXz8bVExcAhIKajpGZjYcAHkABQBNQREkEHFJLGlZdMUEFXVvPUNjM3MbOwRtDW1Ncx17R1rTUwMAoPRsfCIyKloGJhZWAFEAEV5UuUypGTl8+2N6ewEBNwN7NxqNRZrKxFM3c2W3C1U2g3MPAzcOkGDusL7IhnIw2ihWCBlBmgA3PAAawYD1CvQiA3obyIHwQtAB5FI2RkqSm6RmyNyoHyGnWziU+gsblUBiUWza+wKBlM9BuFiU5jJSi82juoJ64X6UWhhA+rDAACcBXgBfR0EiAGYigC29HZTwh3PeNCgcP+eERmNRwmmElmWIUiA89k0NQMNzMpgE5gEGkp5h8mi0Nu2TS87TuNDwEDgcnl4K5YF1WRy8wcWmWq3Wm1dOjttkQ2jqSlctVWKbWpkcbK6YM5L2iLGD+rD1ST9A8JN8pj0nmMlP0SmcvlUrYE2jcjlU6xzIQ5z0hPI+xcxpaaHeWNXs23MtXsBnjVV0AnoqhtlnsVodAhMAQCQA */
  id: 'splitCopyMachine',
  initial: 'idle',
  context: () => ({
    editedCause: '',
    editedCorrection: '',
    originalCause: '',
    originalCorrection: '',
    storyModified: false,
    causeErrorMessage: '',
    correctionErrorMessage: '',
    causeSuccessMessage: '',
    correctionSuccessMessage: '',
    activeField: null,
  }),
  states: {
    idle: {
      on: {
        INIT: {
          description:
            'Updates the (original cause and correction) context in the state machine, prepares the editors, call apis to save the session and the story and copies the Cause to the clipboard.',
          actions: [
            assign(({ event }) => ({
              originalCause: event.payload.originalCause,
              originalCorrection: event.payload.originalCorrection,
              activeField: 'editedCause',
            })),
            'focusEditor',
            'resizeEditors',
            'sendStory',
            'saveSession',
          ],
          target: 'copying',
        },
        COPY: {
          description:
            'Calls the api to save the story and copies the (cause/correction) to the clipboard.',
          actions: [
            assign(({ event }) => ({
              activeField: event.payload.field,
            })),
            'sendStory',
          ],
          target: 'copying',
        },
        EDIT: {
          description:
            'Updates the (cause/correction) context in the state machine.',
          actions: [
            assign(({ event, context }) => ({
              activeField: event.payload.field,
              editedCause:
                event.payload.field === 'editedCause'
                  ? S.toUpperCase(event.payload.text)
                  : context.editedCause,
              editedCorrection:
                event.payload.field === 'editedCorrection'
                  ? S.toUpperCase(event.payload.text)
                  : context.editedCorrection,
            })),
            // calculate storyModified after assignments
            assign(({ event, context }) => ({
              storyModified:
                event.payload.text === '' ||
                (context.originalCause !== context.editedCause &&
                  context.editedCause !== '') ||
                (context.originalCorrection !== context.editedCorrection &&
                  context.editedCorrection !== ''),
            })),
          ],
          target: 'idle',
        },
      },
    },
    copying: {
      invoke: {
        src: 'copyToClipboard',
        input: ({ context }) => {
          return {
            text:
              context.activeField === 'editedCause'
                ? context.editedCause || context.originalCause
                : context.editedCorrection || context.originalCorrection,
          }
        },
        onDone: {
          actions: [
            assign(({ context }) => ({
              causeSuccessMessage:
                context.activeField === 'editedCause'
                  ? 'The cause text was copied'
                  : '',
              correctionSuccessMessage:
                context.activeField === 'editedCorrection'
                  ? 'The correction text was copied'
                  : '',
              causeErrorMessage: '',
              correctionErrorMessage: '',
              activeField: null,
            })),
          ],
          target: 'idle',
        },
        onError: {
          actions: [
            {
              type: 'logToConsole',
              params: ({ event, context }) => ({
                message: `Failed to copy ${context.activeField}: ${event.error}`,
                type: LogLevel.Error,
              }),
            },
            assign(({ context }) => ({
              causeErrorMessage:
                context.activeField === 'editedCause'
                  ? 'Failed to copy cause'
                  : '',
              correctionErrorMessage:
                context.activeField === 'editedCorrection'
                  ? 'Failed to copy correction'
                  : '',
              causeSuccessMessage: '',
              correctionSuccessMessage: '',
              activeField: null,
            })),
          ],
          target: 'idle',
        },
      },
    },
  },
})
