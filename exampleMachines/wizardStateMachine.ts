import {
  Choice,
  PartSchema,
  SelectedChoiceSchema,
  StageType,
  System,
  WizardContext,
  WizardInput,
  WizardInputSchema,
} from '@causeCorrection/types'
import {
  RepairCycle,
  RepairCycleSchema,
} from '@causeCorrection/types/RepairCycle.ts'
import { RepairOrder } from '@causeCorrection/types/RepairOrder'

import { encodeFromWizardInput } from '@causeCorrection/types/api/codecs/endpoints/sessions/update/encode'
import {
  CompositionSession,
  CompositionSessionUpdateOutput,
  LineStatusEnum,
} from '@pencilwrench/shared'
import { Array as A, LogLevel, pipe } from 'effect'
import { ActorRefFrom, assign, fromPromise, setup } from 'xstate'
import { log } from 'xstate/actions'
import { SelectedChoice } from '../types'
import { reorderArray } from '../utils/arrayUtils'
import { repairCycleMachine } from './repairCycleMachine'
import { logToConsole } from '../../../utils/stateMachines'

export type WizardEvents =
  | {
      type: 'SYSTEM_SELECTED'
      system: System
    }
  | { type: 'WIZARD_COMPLETE' }
  | {
      type: 'CHOICE_UPDATED'
      choice: SelectedChoice
    }
  | {
      type: 'CHOICE_REMOVED'
      choice: SelectedChoice
    }
  | {
      type: 'REPAIR_CYCLE_ADDED'
      repairCycle: RepairCycle
    }
  | {
      type: 'SET_CURRENT_REPAIR_CYCLE'
      repairCycleId: string
    }
  | {
      type: 'SET_STATUS'
      status: LineStatusEnum
    }
  | {
      type: 'SET_REPAIR_ORDER'
      repairOrder: RepairOrder | undefined
    }
  | {
      type: 'CHOICES_REORDERED'
      stage: Extract<StageType, 'initial'>
      sourceIndex: number
      destinationIndex: number
    }
  | {
      type: 'CHOICE_SELECTION_TOGGLED'
      choiceConfig: Choice
      stage: Extract<StageType, 'initial'>
    }
  | {
      type: 'SAVE_STORY'
      payload: {
        editedCause?: string
        editedCorrection?: string
        originalCause?: string
        originalCorrection?: string
        storyModified: boolean
      }
    }
  | { type: 'SUBMIT_HOLD'; repairOrder: RepairOrder }
  | { type: 'DISMISS_HOLD' }
  | { type: 'INITIATE_HOLD_FLOW' }
  | { type: 'SAVE_SESSION' }
  | { type: 'SET_IS_CUSTOM'; isCustom: boolean }

export type WizardStateMachineType = ActorRefFrom<typeof wizardStateMachine>

// Helper function to prepare save session input from wizard context
const prepareSaveSessionInput = (
  context: WizardContext,
): CompositionSession => {
  const cycles = context.repairCycleActors.map((cycle) => {
    const parts = cycle
      .getSnapshot()
      .context.partActors.map((part) =>
        PartSchema.make(part.getSnapshot().context),
      )
    return RepairCycleSchema.make({
      ...cycle.getSnapshot().context,
      parts,
    })
  })
  const wizardInput = WizardInputSchema.make({
    ...context,
    repairCycles: cycles,
  })
  return encodeFromWizardInput(wizardInput) as CompositionSession
}

export const wizardStateMachine = setup({
  types: {
    input: {} as WizardInput,
    context: {} as WizardContext,
    events: {} as WizardEvents,
  },
  actors: {
    saveCompositionSession: fromPromise(
      (_: {
        input: CompositionSession
      }): Promise<CompositionSessionUpdateOutput> =>
        // This is a placeholder that will be replaced when the machine is instantiated
        Promise.reject('Not implemented. Provide when instantiating machine'),
    ),
    holdSession: fromPromise(
      (_: {
        input: {
          repairOrder: RepairOrder
          sessionId: string
        }
      }): Promise<RepairOrder> =>
        // This is a placeholder that will be replaced when the machine is instantiated
        Promise.reject('Not implemented. Provide when instantiating machine'),
    ),
  },
  actions: {
    toggleChoice: assign(({ context }, params: { choiceConfig: Choice }) => {
      const [unmatchedChoices, matchedChoices] = A.partition(
        context.selectedChoices,
        (choice) => choice.choiceId === params.choiceConfig.id,
      )

      const toggledChoices = matchedChoices.map((choice) => ({
        ...choice,
        isSelected: !choice.isSelected,
      }))

      const merged =
        toggledChoices.length > 0
          ? [...unmatchedChoices, ...toggledChoices]
          : [
              ...unmatchedChoices,
              SelectedChoiceSchema.make({
                choiceId: params.choiceConfig.id,
                stage: 'initial',
                phraseId: params.choiceConfig.phraseId,
                isSelected: true,
              }),
            ]

      return { selectedChoices: merged }
    }),
    addRepairCycle: assign(
      ({ context, spawn }, params: { repairCycle: RepairCycle }) => ({
        currentRepairCycleId: params.repairCycle.id,
        repairCycleActors: [
          ...context.repairCycleActors,
          spawn(repairCycleMachine, {
            input: params.repairCycle,
            syncSnapshot: true, // Enable automatic state synchronization from child to parent
          }),
        ],
      }),
    ),

    reorderChoices: assign(
      (
        { context },
        {
          stage,
          sourceIndex,
          destinationIndex,
        }: {
          stage: Extract<StageType, 'initial'>
          sourceIndex: number
          destinationIndex: number
        },
      ) => {
        // Filter choices for the specified stage
        const stageChoices = context.selectedChoices.filter(
          (choice) => choice.stage === stage && choice.isSelected,
        )

        // Reorder the filtered choices
        const reorderedStageChoices = reorderArray(
          stageChoices,
          sourceIndex,
          destinationIndex,
        )

        const sortedChoices = pipe(
          context.selectedChoices,
          A.filter((choice) => choice.stage !== stage),
          (nonStageChoices) => [...nonStageChoices, ...reorderedStageChoices],
        )

        return {
          selectedChoices: sortedChoices,
        }
      },
    ),
    removeChoice: assign(({ context }, params: { choice: SelectedChoice }) => {
      return {
        selectedChoices: context.selectedChoices.filter(
          (sc) => sc.id !== params.choice.id,
        ),
      }
    }),
    sendStory: (
      _,
      params: {
        sessionId: string
        payload: {
          editedCause?: string
          editedCorrection?: string
          originalCause?: string
          originalCorrection?: string
          storyModified: boolean
        }
      },
    ) => {
      throw new Error(`Not implemented ${params}`)
    },
    setSystem: assign((_, { input }: { input: System }) => {
      return {
        system: input,
      }
    }),
    logToConsole,
    setIsCustom: assign((_, { isCustom }: { isCustom: boolean }) => {
      return {
        isCustom,
      }
    }),
    saveRepairOrder: assign((_, params: { repairOrder: RepairOrder }) => {
      return {
        repairOrder: params.repairOrder,
      }
    }),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QHcCWAvAhgJwgZQBdMCwBZTAYwAtUA7MAOmwFdba6oBiPAFQHkASgE0A+gFUACgBEAgjwCiUgNoAGALqJQABwD2sVAVQ7amkAA9EADksNLAFksBOB3YCMK13YCsANgBMADQgAJ6I7gDsrgyRln4AzG6OPl4pfgC+aUFoWLiExGSUNPRMrOy0XHhCvPKkInjyADLyAMIKyuqmuvqGxqYWCLEM3l7hcZYq4V52juE+dkGhCM6Oti4+jirWG66uGVkYOPhEJOTUdIwsbBycAOoAkgBaMgJSIs18pBJNCqoaSCBdAxGEz-frxOwMJLOPzrNwqOx+SwLKx+IbwpJeOKI2JxDx7EDZQ55E6Fc4lK7lTjNAASfDuzXk4mkckUv06eiBvVBVhs4T8Xj8dj54xUjksmORAymDC8jix4XC8PisUc+MJuWOBTOxUuZS4NLpDJEAhqfAAaqyOv9AT0QaB+pYfEM4nEvJZwk4VD51i7JZMVi7xvZHI43XMfGqDhr8qcihdStcDfT5HhjfJBFJ5Cb2n9tBzbX1EKNol5XLiETM3ZNwpLvRDNojHH5lgk5pGckcY6SdQnKSaJDI7gI3kJmk0RDIpJmc+zusDCwg+Qw4q5BU2veFHKv5iFEL4bLEFSpRSpEWf20TNbGybrrvUeG8xAITQA5B-9wfD5qjpps635+duQQbxITmSw4kiJs5hDQVJSFOIZT5OxvXCOwEX8UML2jEltXjCkKnkB9eDkMQ8D-PM5y5e0wlFGV7H8FJvVlNC4klCCbBXPlUPWBU0PCLDOxwuNyT1bhCLTAchxEDMs3IgEAKo8xEHlWxxTsFRZR8aw0MlR1wgYcMHFccUGySATiS1YTb0pJMjXqJpWjuPgXxEfgAHE3KaGd-0ou0lOAwJdwQREEK9PwG2SVcYS8cyr27PDRLuF87h4O4WREWkGleAAxBo+BuOSbUA6iEBU6wpg0pJtJ3RYxSiXEqrQ3wfFXSxYq7XCRLvGQLTqFM8Ccl9CoUvz+jKtTKq0+warCPxXC8AzXHWHYPGPXxdkyAko0EyyyWoMAKAAa2pHQABtBOYWBOGG3yF0iBD1P8F1kPdBUkSC6x9JULEEi3D1Q1PdqhL2qgDuOs6LqupRXFzeTbqA8aKs06rdL8VEsRahxxViBxVU29UduvYoqAhzgpDuPBSAp1NMu8ijOVG5S-H08r1OR6bJSWp1HWQuIfAg091NiIHduJiGGBJ867zEAAhKmH1pm6GYXVqIVekZZRheEsUlKshhGENoUiMsYvx7aLKJxhJYgBhYGYAAjABbAxDEpCBjEYOgADcdEOxgCYt+KJfFu2nZdjgEG9nQKGIYFfiVgsgKcJ14mM1xN38BVAsWOIxVsZVcV8flHTiEXLeD87bYd52CFdrgwGwbAdGwBgtFO4gADNm8dhgA7izrrarsPa4jqOY9teOrXpxOSp2JtEObLwPHDJVa0Ge7md8GY+RSMug8H0Oa7rzh3eKKO-d783++Eg-q-D8pI9oH3x7jmGE+K-y59REZF+X5DV6Ci9GUoYQyKj5vCb6pczYdkDgPEOd8R6Ugbk3FubdO7d0vjA6+ZJb7Dzro-Z+sdjDQzUO-RS-Qv4LwBktf+CJdIeEQgKD0mx3RijatAy8HUb7i1Budbg-BhBMlkG0MhjMECeDdNEYyWk3A+AmO6LwbEtIMA0qMdwaEtwlygfsLBXCySwEwF7a4p9PZP19v7K+ejigGKMQ-MeRDaCT1hkVchTMWYTXZjpIKOxlGWCiszfw0w-F706jY64yDm6t3bgQLu2Ae59ysYwMJdizEv2IeoURC5EZsyqhzbxEwnS+AcLMJeK4VwZE2rQHQEA4CmAScDegs5lZAQALQ+ElG0kJVlexQCaTPT+uIVGyicGMIpCRXCc1cHnKshtyzhSbF0vaOhHZtzACQPpH9+hoRTm6UpoZhhihmgMeqaMtxBL5GKTYizij7SOidc6xJLobNcQgTEEI+Qmw0p9R0jhdL2EhEKHwfJvT8jmnjHRnCGlWwhs8sR4EIQQVmEqZs9h7CSkRCoaICQ+aYj8WpCMHDsKi2hZXa2HBYUqyFAtVsIVjzwV9EFRUTpBZCgmAKaYZZrkkptofe+vSfLNJKtYdGCo5EIhRS4OCSQVGRH5GKJsAoEj8UJYTfePCwDnQpUBTwkxlzIVpfCUYDLFjTAhE2SIspmFym2Vy22hjyUCv6f0WUmKILxB3skcY7TvGeEKWBTEkxwHpAqUAA */
  id: 'wizardStateMachine',
  context: ({ input, spawn }) => {
    const actors = input.repairCycles?.map((repairCycle) =>
      spawn(repairCycleMachine, {
        input: repairCycle,
        syncSnapshot: true, // Enable automatic state synchronization from child to parent
      }),
    )
    return {
      compositionSessionId: input.compositionSessionId,
      manufacturerId: input.manufacturerId,
      manufacturerName: input.manufacturerName,
      system: input.system,
      selectedChoices: input.selectedChoices || [],
      currentRepairCycleId: null,
      repairCycleActors: actors || [],
      status: input.status || 'started',
      repairOrder: input.repairOrder,
      holdSessionError: undefined,
      isCustom: input.isCustom,
    }
  },
  initial: 'running',
  states: {
    running: {
      on: {
        SAVE_STORY: {
          actions: [
            {
              type: 'sendStory',
              params: ({ context, event }) => ({
                sessionId: context.compositionSessionId,
                payload: event.payload,
              }),
            },
          ],
        },

        SYSTEM_SELECTED: {
          actions: [
            {
              type: 'setSystem',
              params: ({ event }) => ({ input: event.system }),
            },
            log(
              ({ context }) =>
                `System selected ${JSON.stringify(context.system)}`,
              'System Selected',
            ),
          ],
        },

        WIZARD_COMPLETE: {
          target: 'complete',
        },

        CHOICE_UPDATED: {
          actions: [
            assign(({ event: { choice }, context }) => {
              const exists = context.selectedChoices.some(
                (selected) => selected.id === choice.id,
              )

              const updatedSelectedChoices = exists
                ? context.selectedChoices.map((selected) =>
                    selected.id === choice.id ? choice : selected,
                  )
                : [...context.selectedChoices, choice]

              return {
                selectedChoices: updatedSelectedChoices,
              }
            }),
          ],
        },

        CHOICE_REMOVED: {
          actions: [
            {
              type: 'removeChoice',
              params: ({ event: { choice } }) => ({ choice }),
            },
          ],
        },

        CHOICES_REORDERED: {
          actions: [
            {
              type: 'reorderChoices',
              params: ({
                event: { stage, sourceIndex, destinationIndex },
              }) => ({
                stage,
                sourceIndex,
                destinationIndex,
              }),
            },
          ],
        },

        REPAIR_CYCLE_ADDED: {
          actions: [
            {
              type: 'addRepairCycle',
              params: ({ event: { repairCycle } }) => ({ repairCycle }),
            },
          ],
        },

        SET_CURRENT_REPAIR_CYCLE: {
          actions: assign(({ event }) => ({
            currentRepairCycleId: event.repairCycleId,
          })),
        },

        SET_STATUS: {
          actions: assign(({ event }) => ({
            status: event.status,
          })),
        },

        SET_REPAIR_ORDER: {
          actions: assign(({ event }) => ({
            repairOrder: event.repairOrder,
          })),
          target: 'checkHoldStatus',
        },

        CHOICE_SELECTION_TOGGLED: {
          actions: [
            {
              type: 'toggleChoice',
              params: ({ event: { choiceConfig, stage } }) => ({
                choiceConfig,
                stage,
              }),
            },
          ],
        },

        INITIATE_HOLD_FLOW: {
          target: 'hold',
          actions: log('Hold flow initiated by button click', 'Initiate Hold'),
        },
        SAVE_SESSION: {
          target: 'saving',
        },
        SET_IS_CUSTOM: {
          actions: assign(({ event }) => ({
            isCustom: event.isCustom,
          })),
        },
      },
    },

    complete: {
      type: 'final',
    },

    checkHoldStatus: {
      always: [
        {
          guard: ({ context }) => !!context.repairOrder,
          target: 'hold.holding',
        },
        {
          target: 'running',
        },
      ],
    },

    hold: {
      on: {
        DISMISS_HOLD: {
          target: 'running',
          actions: [
            log('Hold dismissed', 'Hold Dismissed'),
            assign({
              holdSessionError: undefined,
            }),
          ],
        },
      },
      initial: 'holding',
      states: {
        holding: {
          entry: log('Entering holding state'),
          on: {
            SUBMIT_HOLD: {
              target: 'submitting',
              actions: assign(({ event }) => ({
                repairOrder: event.repairOrder,
              })),
            },
          },
        },
        submitting: {
          entry: log('Submitting hold to server'),
          invoke: {
            src: 'holdSession',
            input: ({ event, context }) => {
              if (event.type !== 'SUBMIT_HOLD') {
                throw new Error('Invalid event type')
              }
              return {
                repairOrder: event.repairOrder,
                sessionId: context.compositionSessionId,
              }
            },
            onDone: {
              target: '#wizardStateMachine.hold.held',
              actions: [
                log(
                  'Hold session completed successfully',
                  'Hold Session Complete',
                ),
                {
                  type: 'saveRepairOrder',
                  params: ({ event }) => ({
                    repairOrder: event.output,
                  }),
                },
              ],
            },
            onError: {
              target: '#wizardStateMachine.hold.holding',
              actions: [
                log('Hold session failed', 'Hold Session Error'),
                assign({
                  holdSessionError: ({ event }) =>
                    `Failed to hold session: ${
                      event.error instanceof Error
                        ? event.error.message
                        : String(event.error)
                    }`,
                }),
              ],
            },
          },
        },
        held: {
          entry: log('Hold session completed, showing copy view'),
          on: {
            SAVE_STORY: {
              actions: [
                {
                  type: 'sendStory',
                  params: ({ context, event }) => ({
                    sessionId: context.compositionSessionId,
                    payload: event.payload,
                  }),
                },
              ],
            },
            SAVE_SESSION: {
              target: '#wizardStateMachine.hold.saving',
            },
          },
        },
        saving: {
          invoke: {
            src: 'saveCompositionSession',
            input: ({ context }) => prepareSaveSessionInput(context),
            onDone: {
              target: '#wizardStateMachine.hold.held',
            },
            onError: {
              target: '#wizardStateMachine.hold.held',
              actions: {
                type: 'logToConsole',
                params: ({ event }) => ({
                  message: event.error,
                  type: LogLevel.Error,
                }),
              },
            },
          },
        },
      },
    },

    saving: {
      invoke: {
        src: 'saveCompositionSession',
        input: ({ context }) => prepareSaveSessionInput(context),
        onDone: {
          target: 'running',
        },
        onError: {
          target: 'running',
          actions: {
            type: 'logToConsole',
            params: ({ event }) => ({
              message: event.error,
              type: LogLevel.Error,
            }),
          },
        },
      },
    },
  },
})
