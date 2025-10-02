import { Array as A, Option as O, pipe } from "effect";
import { assign, setup } from "xstate";
import {
  Choice,
  Component,
  SelectedChoice,
  SelectedChoiceSchema,
  StageType,
} from "../types";
import { Part, PartSchema } from "../types/Part";
import { reorderArray } from "../utils/arrayUtils";

export type PartStage = Extract<StageType, "failures" | "repairs">;

export type PartEvent =
  | {
      type: "REORDER_ITEMS";
      itemType: PartStage;
      sourceIndex: number;
      destinationIndex: number;
    }
  | {
      type: "CHOICE_UPDATED";
      choice: SelectedChoice;
      itemType: PartStage;
    }
  | {
      type: "CHOICE_REMOVED";
      choice: SelectedChoice;
      itemType: PartStage;
    }
  | {
      type: "CHOICE_SELECTION_TOGGLED";
      choiceConfig: Choice;
      stage: PartStage;
    }
  | {
      type: "SELECTION_TOGGLED";
    };

type PartContext = Part & { component: Component };
type PartInput = PartContext;

export const partMachine = setup({
  types: {
    events: {} as PartEvent,
    input: {} as PartInput,
    context: {} as PartContext,
    output: {} as Part,
  },
  actions: {
    toggleChoiceSelection: assign(
      (
        { context },
        {
          choiceConfig,
          stage,
        }: {
          choiceConfig: Choice;
          stage: PartStage;
        },
      ) => {
        const items = context[stage];

        const index = pipe(
          items,
          A.findFirstIndex((c) => c.choiceId === choiceConfig.id),
          O.getOrElse(() => -1),
        );

        if (index === -1) {
          return {
            [stage]: [
              ...items,
              SelectedChoiceSchema.make({
                choiceId: choiceConfig.id,
                phraseId: choiceConfig.phraseId,
                isSelected: true,
                stage,
              }),
            ],
          };
        } else {
          const updatedItems = [...items];
          updatedItems[index] = {
            ...items[index],
            isSelected: !items[index].isSelected,
          };
          return {
            [stage]: updatedItems,
          };
        }
      },
    ),
    // Action to reorder items within a specific part
    reorderItems: assign(
      (
        { context: partContext },
        {
          itemType,
          sourceIndex,
          destinationIndex,
        }: {
          itemType: "failures" | "repairs";
          sourceIndex: number;
          destinationIndex: number;
        },
      ) => {
        // Get the array to reorder
        const itemsToReorder = partContext[itemType];

        // Reorder the array using the shared reorderArray function
        const reorderedItems = reorderArray(
          itemsToReorder,
          sourceIndex,
          destinationIndex,
        );

        // Return the updated context
        return {
          [itemType]: reorderedItems,
        };
      },
    ),
    // Action to update a choice in the part
    updateChoice: assign(
      (
        { context },
        {
          choice,
          itemType,
        }: {
          choice: SelectedChoice;
          itemType: PartStage;
        },
      ) => {
        const selectedChoices = context[itemType];

        const index = pipe(
          selectedChoices,
          A.findFirstIndex((c) => c.id === choice.id),
          O.getOrElse(() => -1),
        );

        if (index === -1) {
          // Choice doesn't exist, add it
          return {
            [itemType]: [...selectedChoices, choice],
          };
        } else {
          return {
            [itemType]: A.replace(selectedChoices, index, choice),
          };
        }
      },
    ),

    // Action to remove a choice from the part
    removeChoice: assign(
      (
        { context: partContext },
        {
          choice,
          itemType,
        }: {
          choice: SelectedChoice;
          itemType: PartStage;
        },
      ) => {
        const items = partContext[itemType];
        return {
          [itemType]: items.filter((c) => c.id !== choice.id),
        };
      },
    ),
  },
}).createMachine({
  id: "partMachine",
  context: ({ input: partInput }) => ({
    ...partInput,
  }),
  initial: "running",
  states: {
    running: {
      on: {
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
        REORDER_ITEMS: {
          actions: [
            {
              type: "reorderItems",
              params: ({
                event: { itemType, sourceIndex, destinationIndex },
              }) => ({
                itemType,
                sourceIndex,
                destinationIndex,
              }),
            },
          ],
        },
        CHOICE_UPDATED: {
          actions: [
            {
              type: "updateChoice",
              params: ({ event: { choice, itemType } }) => ({
                choice,
                itemType,
              }),
            },
          ],
        },
        CHOICE_REMOVED: {
          actions: [
            {
              type: "removeChoice",
              params: ({ event: { choice, itemType } }) => ({
                choice,
                itemType,
              }),
            },
          ],
        },
        SELECTION_TOGGLED: {
          actions: [
            assign(({ context }) => ({
              isSelected: !context.isSelected,
            })),
          ],
        },
      },
    },
  },
  output: ({ context: partContext }) => PartSchema.make(partContext),
});
