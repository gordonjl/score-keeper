import { assign, PromiseActorLogic, setup, fromPromise } from "xstate";
import { LogLevel, String as S } from "effect";
import { logToConsole } from "../../../utils/stateMachines";

type BasicCopyMachineEvents =
  | {
      type: "INIT";
      payload: {
        originalCause: string;
      };
    }
  | {
      type: "COPY";
    }
  | {
      type: "EDIT";
      payload: {
        text: string;
      };
    };

type ActorLogic = {
  copyToClipboard: PromiseActorLogic<void, { text: string }>;
};

type BasicCopyMachineContext = {
  editedCause: string;
  originalCause: string;
  storyModified: boolean;
  errorMessage: string;
  successMessage: string;
};

export const basicCopyMachine = setup({
  types: {
    events: {} as BasicCopyMachineEvents,
    context: {} as BasicCopyMachineContext,
  },
  actors: {
    copyToClipboard: fromPromise(({ input }: { input: { text: string } }) =>
      navigator.clipboard.writeText(input.text),
    ),
  } as ActorLogic,
  actions: {
    resizeEditor: () => {},
    enableEditor: (_, _params: { storyText: string }) => {},
    saveSession: () => {
      throw new Error(
        "Provide saveSession function when instantiating machine.",
      );
    },
    sendStory: () => {
      throw new Error("Provide sendStory function when instantiating machine.");
    },
    logToConsole,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QCMCGsCWBjAwgewAcBPAWVSwAsMA7MAOgwgBswBiASQDl2AVAbQAMAXUSgCeTABcMeaqJAAPRAEYBygBx0AnGoDM6gfoAsRgGwaANCCKIAtLtNa6RgEwuHygKxblyrVtNTAF8gqzRMXEJScipaBmY2AFEAEV5BESQQcSkZOUylBF1dATovMxMAdhdvUwEXKxsEW1MXOk9lCs9zT10tNy9OkLD0bHxiMkoaekYWVhwAeQAFAE10+WyMaVl5AoNNDs9PCvV-PtMKioa7Tu0tI2UXcy11dVrdIyGQcNGoidj6LBRGhQVgQWTTagANzwAGt6N9IuMYlM6IDiMCEDRoVhUFtqOk1pkNnidiplC06OoLhUjMcqq4jldCn06PotLoXAJDF4OYNQl8RojopM4miiMDWGAAE5SvBSugEJi4gBmcoAtnQEWNhf9UUDqFBMVC8Di8QThOsJJtcqSEIFWtVisV-HUtDSmS4dHQacozO9XC1PB9PtQ8BA4PItb9kbRLTltvlEC51K0yqZKtUAnUmbYjF1tG4PN5fP5Ap8o0iRdMEnHrQnQAV6aUBOoeuYjEVaUYc74HWYLgJDr1vIdy4LtX8UWLgbWSYmEL4jE4HJzvPpdId3dYVHc6N0jj1k54Uy0QiEgA */
  id: "basicCopyMachine",
  initial: "idle",
  context: () => ({
    editedCause: "",
    originalCause: "",
    storyModified: false,
    errorMessage: "",
    successMessage: "",
  }),
  states: {
    idle: {
      on: {
        INIT: {
          description:
            "Updates the (original cause) context in the state machine, calls the api for saving the story and the session, and copies the original cause to the clipboard.",
          actions: [
            assign(({ event }) => ({
              originalCause: event.payload.originalCause,
            })),
            {
              type: "enableEditor",
              params: ({ context }) => ({
                storyText: context.editedCause || context.originalCause,
              }),
            },
            "resizeEditor",
            "sendStory",
            "saveSession",
          ],
          target: "copying",
        },
        EDIT: {
          description:
            "Updates the (edited cause) context in the state machine.",
          actions: [
            assign(({ event }) => ({
              editedCause: S.toUpperCase(event.payload.text),
              errorMessage: "",
              successMessage: "",
            })),
            // calculate storyModified after assignments
            assign(({ event, context }) => ({
              storyModified:
                event.payload.text === "" ||
                (context.originalCause !== context.editedCause &&
                  context.editedCause !== ""),
            })),
          ],
          target: "idle",
        },
        COPY: {
          description:
            "Calls the api to save the story and copies the cause text to the clipboard.",
          actions: "sendStory",
          target: "copying",
        },
      },
    },
    copying: {
      invoke: {
        src: "copyToClipboard",
        input: ({ context }) => ({
          text: context.editedCause || context.originalCause,
        }),
        onDone: {
          actions: assign(() => ({
            errorMessage: "",
            successMessage: "The text was copied",
          })),

          target: "idle",
        },
        onError: {
          actions: [
            {
              type: "logToConsole",
              params: ({ event }) => ({
                message: `Failed to copy text: ${event.error}`,
                type: LogLevel.Error,
              }),
            },
            assign(() => ({
              errorMessage: "Failed to copy text",
              successMessage: "",
            })),
          ],
          target: "idle",
        },
      },
    },
  },
});
