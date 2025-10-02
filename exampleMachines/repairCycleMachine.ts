import {
  RepairCycle,
  RepairCycleSchema,
} from "@causeCorrection/types/RepairCycle";
import { Array as A, Option as O, pipe } from "effect";
import { ActorRefFrom, assign, setup, SnapshotFrom } from "xstate";
import {
  Choice,
  Component,
  CompositionSessionStage,
  SelectedChoice,
  SelectedChoiceSchema,
  Stage,
  StageType,
  System,
} from "../types";
import { Part, PartSchema } from "../types/Part";
import { reorderArray } from "../utils/arrayUtils";
import { partMachine, PartStage } from "./partMachine";

export type RepairCycleEvent =
  | {
      type: "xstate.snapshot.*";
      snapshot: SnapshotFrom<typeof partMachine>;
    }
  | {
      type: "CHOICE_UPDATED";
      choice: SelectedChoice;
    }
  | {
      type: "CHOICE_REMOVED";
      choice: SelectedChoice;
    }
  | {
      type: "SYSTEM_ADDED";
      system: System;
    }
  | {
      type: "COMPONENT_SELECTED";
      component: Component;
      hasParts: boolean;
    }
  | {
      type: "PART_ADDED";
      part: Part;
    }
  | {
      type: "USE_COMMON_VALUES";
      stage: PartStage;
      useCommon: boolean;
    }
  | {
      type: "REORDER_ITEMS";
      section: keyof Pick<
        RepairCycleContext,
        | "diagnosticSelectedChoices"
        | "finalActionsSelectedChoices"
        | "commonFailures"
        | "commonRepairs"
      >;
      sourceIndex: number;
      destinationIndex: number;
    }
  | {
      type: "CHOICE_SELECTION_TOGGLED";
      choiceConfig: Choice;
      stage: Extract<
        StageType,
        "failures" | "repairs" | "diagnostics" | "final"
      >;
    }
  | {
      type: "UPDATE_STARTED_IN_SESSION";
      startedInSession: boolean;
    };

type RepairCycleContext = {
  id: string;
  systemRefs: readonly System[];
  diagnosticSelectedChoices: readonly SelectedChoice[];
  finalActionsSelectedChoices: readonly SelectedChoice[];
  component?: Component;
  partActors: ActorRefFrom<typeof partMachine>[];
  startedInSession: boolean;
  useCommonFailures: boolean;
  useCommonRepairs: boolean;
  commonFailures: readonly SelectedChoice[];
  commonRepairs: readonly SelectedChoice[];
  customComponentName: string | null | undefined;
  makeDirty: number; // used to trigger selectors when a child actor is updated
};

type StageConfig = {
  readonly choices: readonly SelectedChoice[];
  readonly key: keyof RepairCycleContext;
};

const createStageToConfigMap = (
  context: RepairCycleContext,
): Partial<Record<CompositionSessionStage, StageConfig>> => ({
  diagnostics: {
    choices: context.diagnosticSelectedChoices,
    key: "diagnosticSelectedChoices",
  },
  failures: {
    choices: context.commonFailures,
    key: "commonFailures",
  },
  repairs: {
    choices: context.commonRepairs,
    key: "commonRepairs",
  },
  final: {
    choices: context.finalActionsSelectedChoices,
    key: "finalActionsSelectedChoices",
  },
});

export const repairCycleMachine = setup({
  types: {
    events: {} as RepairCycleEvent,
    input: {} as RepairCycle,
    context: {} as RepairCycleContext,
    output: {} as RepairCycle,
  },
  guards: {
    hasComponent: ({ context }) => context.component !== undefined,
  },
  actions: {
    // Generic action to reorder items in any section
    reorderItems: assign(
      (
        { context },
        {
          section,
          sourceIndex,
          destinationIndex,
        }: {
          section: keyof Pick<
            RepairCycleContext,
            | "diagnosticSelectedChoices"
            | "finalActionsSelectedChoices"
            | "commonFailures"
            | "commonRepairs"
          >;
          sourceIndex: number;
          destinationIndex: number;
        },
      ) => {
        // Get the array to reorder
        const arrayToReorder = context[section];

        // Reorder the array using the shared reorderArray function
        const reorderedArray = reorderArray(
          arrayToReorder,
          sourceIndex,
          destinationIndex,
        );

        // Return the updated context
        return {
          [section]: reorderedArray,
        };
      },
    ),
    selectComponent: assign(
      (
        { spawn },
        { component, hasParts }: { component: Component; hasParts: boolean },
      ) => {
        //create a 'virtual' part if the component has no parts, leaving
        // Create a virtual part if the component has no parts, so the user can add parts later.
        const partActors = hasParts
          ? []
          : [
              spawn(partMachine, {
                input: {
                  ...PartSchema.make({
                    name: "",
                    isSelected: true,
                  }),
                  component,
                },
                syncSnapshot: true,
              }),
            ];

        return {
          component: component,
          partActors,
          //wipe out the common failures/repairs/final-actions from previous component
          commonFailures: [],
          commonRepairs: [],
          finalActionsSelectedChoices: [],
          useCommonFailures: true,
          useCommonRepairs: true,
        };
      },
    ),
    removeChoice: assign(
      ({ context }, { choice }: { choice: SelectedChoice }) => {
        const stageToConfigMap = createStageToConfigMap(context);
        const currentStageConfig = stageToConfigMap[choice.stage];

        if (!currentStageConfig) {
          throw new Error(`Invalid stage: ${choice.stage}`);
        }

        const updatedChoices = currentStageConfig.choices.filter(
          (selectedChoice) => selectedChoice.id !== choice.id,
        );

        return {
          // Assign the filtered array back to the correct key in the context
          [currentStageConfig.key]: updatedChoices,
        };
      },
    ),
    updateChoice: assign(
      ({ context }, { choice }: { choice: SelectedChoice }) => {
        const stageToConfig = createStageToConfigMap(context);

        const upsertSelectedChoice = (config: StageConfig) => {
          // Check if a choice with the same ID already exists
          const exists = config.choices.some(
            (selected) => selected.id === choice.id,
          );

          // Update the existing choice or add a new one
          const updatedChoices = exists
            ? config.choices.map((selected) =>
                selected.id === choice.id ? choice : selected,
              )
            : [...config.choices, choice];

          return { [config.key]: updatedChoices };
        };

        const stageConfig = stageToConfig[choice.stage];
        if (!stageConfig) {
          throw new Error(`Invalid stage "${choice.stage}" in RepairCycle`);
        }

        return upsertSelectedChoice(stageConfig);
      },
    ),
    addSystem: assign(
      ({ context: { systemRefs } }, { system }: { system: System }) => {
        return {
          systemRefs: pipe(systemRefs, A.append(system)),
        };
      },
    ),
    createPart: assign(
      (
        { context: { partActors }, spawn },
        { part, component }: { part: Part; component: Component },
      ) => {
        return {
          partActors: [
            ...partActors,
            spawn(partMachine, {
              input: { ...part, component },
              syncSnapshot: true,
            }),
          ],
        };
      },
    ),
    updateCommonChoice: assign(
      (
        { context },
        {
          choice,
          stage,
        }: {
          choice: SelectedChoice;
          stage: Extract<Stage, "failures" | "repairs">;
        },
      ) => {
        const key = stage === "failures" ? "commonFailures" : "commonRepairs";
        const commonChoices =
          stage === "failures" ? context.commonFailures : context.commonRepairs;

        const updatedChoices = pipe(
          commonChoices,
          A.findFirstIndex((current) => current.choiceId === choice.choiceId),
          O.match({
            onNone: () => [...commonChoices, choice],
            onSome: (index) => {
              const result = [...commonChoices];
              result[index] = choice;
              return result;
            },
          }),
        );

        return {
          [key]: updatedChoices,
        };
      },
    ),
    useCommonValues: assign(
      (
        _,
        {
          stage,
          useCommon,
        }: {
          stage: Extract<StageType, "failures" | "repairs">;
          useCommon: boolean;
        },
      ) => {
        return {
          ...(stage === "failures" && { useCommonFailures: useCommon }),
          ...(stage === "repairs" && { useCommonRepairs: useCommon }),
        };
      },
    ),
    toggleChoiceSelection: assign(
      (
        { context },
        { choiceConfig, stage }: { choiceConfig: Choice; stage: StageType },
      ) => {
        const selectedChoicesForStage = createStageToConfigMap(context)[stage];

        if (!selectedChoicesForStage)
          throw new Error(
            `stage data not found for stage: '${stage}', choice: ${choiceConfig.id}`,
          );

        const [nonMatchedChoices, matchedChoices] = A.partition(
          selectedChoicesForStage.choices,
          (choice) => choice.choiceId === choiceConfig.id,
        );

        const toggledChoices = matchedChoices.map((choice) => ({
          ...choice,
          isSelected: !choice.isSelected,
        }));

        const merged =
          toggledChoices.length > 0
            ? [...nonMatchedChoices, ...toggledChoices]
            : [
                ...nonMatchedChoices,
                SelectedChoiceSchema.make({
                  choiceId: choiceConfig.id,
                  stage,
                  phraseId: choiceConfig.phraseId,
                  isSelected: true,
                }),
              ];

        return {
          [selectedChoicesForStage.key]: merged,
        };
      },
    ),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QCcwAcCGBLZBhAngMYA2YAshoQBZYB2YAdMgK6211QDEuA8gAoBNAPoA1AIIAZAKoBRAMoBtAAwBdRKDQB7WFgAuWTbXUgAHogBMATgDMDa+aXWAjAA4A7C4CsLgCxLLADQg+BZObgyOlkoAbOaeAL7xQaiYOAQk5JQ09Eys7LRcuAASPACSuDJCUnwAImIAKjI1ympIIFo6+obGZggAtK7hbtFhg55KExPWQSEITo4RzubR7i6W5mveicno2HhEpBTUdIwsbByccgJyjWRCYjU1TS3GHXoGRm291pZODJ7WTxOFaWLxudY+HwzRCA6IMHwApyQn5AwHmNzbEApPbpQ5ZE65c4Fbg8Mh8HgAORkFPqQjkMgkMlwjWaqle2ne3S+MJGDGi1mibh8gsh3icnmhcyULnh0X81jcCSSWN2aQOmWOOTO+S4fDEACVadU6iyXm03l1PqBelZbPZHIMvL5-JL7J4+aN3Eqdql9hkjtlTnkLlJ6UJeGQyJTRJJZIo2eaOZaehYbHYHM5Vt4-IFgogfNYfAwnJZEXFEsraJoIHBjNi1f78fR2Z0Pin+uZAQxhp7FZMppLxf8lp4fBtlmExZj6368Zqg0SoC3OVbTIh3c4kdYlG5-K4vRK8wh+eZ4aXojZXArzE5zBX4kA */
  id: "repairCycleMachine",
  context: ({
    spawn,
    input: {
      diagnosticSelectedChoices,
      id,
      systemRefs,
      component,
      parts,
      finalActionsSelectedChoices,
      startedInSession,
      commonFailures,
      commonRepairs,
      useCommonFailures,
      useCommonRepairs,
      customComponentName,
    },
  }) => {
    const partActors = parts.map((part) =>
      spawn(partMachine, {
        input: { ...part, component: component! },
        syncSnapshot: true,
      }),
    );

    return {
      diagnosticSelectedChoices,
      systemRefs,
      id,
      component,
      startedInSession,
      finalActionsSelectedChoices,
      commonFailures,
      commonRepairs,
      useCommonFailures,
      useCommonRepairs,
      customComponentName,
      partActors,
      parent,
      makeDirty: 0,
    };
  },
  initial: "running",
  on: {
    "xstate.snapshot.*": {
      actions: [assign({ makeDirty: ({ context }) => context.makeDirty + 1 })],
    },
  },
  states: {
    running: {
      on: {
        REORDER_ITEMS: {
          actions: [
            {
              type: "reorderItems",
              params: ({
                event: { section, sourceIndex, destinationIndex },
              }) => {
                return {
                  section,
                  sourceIndex,
                  destinationIndex,
                };
              },
            },
          ],
        },
        CHOICE_UPDATED: {
          actions: [
            {
              type: "updateChoice",
              params: ({ event: { choice } }) => ({ choice }),
            },
          ],
        },
        CHOICE_REMOVED: {
          actions: [
            {
              type: "removeChoice",
              params: ({ event: { choice } }) => ({ choice }),
            },
          ],
        },
        SYSTEM_ADDED: {
          actions: [
            {
              type: "addSystem",
              params: ({ event: { system } }) => ({ system }),
            },
          ],
        },
        COMPONENT_SELECTED: {
          actions: [
            {
              type: "selectComponent",
              params: ({ event: { component, hasParts } }) => ({
                component,
                hasParts,
              }),
            },
          ],
        },
        PART_ADDED: {
          guard: "hasComponent",
          actions: [
            {
              type: "createPart",
              params: ({ event: { part }, context: { component } }) => ({
                part,
                component: component!,
              }),
            },
          ],
        },
        USE_COMMON_VALUES: {
          actions: [
            {
              type: "useCommonValues",
              params: ({ event: { stage, useCommon } }) => ({
                stage,
                useCommon,
              }),
            },
          ],
        },
        CHOICE_SELECTION_TOGGLED: {
          actions: [
            {
              type: "toggleChoiceSelection",
              params: ({ event: { choiceConfig, stage } }) => ({
                choiceConfig,
                stage,
              }),
            },
          ],
        },
        UPDATE_STARTED_IN_SESSION: {
          actions: [
            assign({
              startedInSession: ({ event }) => event.startedInSession,
            }),
          ],
        },
      },
    },
  },
  output: ({ context }) => {
    const parts = context.partActors.map((part) =>
      PartSchema.make(part.getSnapshot().context),
    );
    return RepairCycleSchema.make({
      ...context,
      parts,
    });
  },
});
