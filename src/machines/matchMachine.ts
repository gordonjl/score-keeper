import { assign, setup } from 'xstate'
import type { MatchId } from '../types'

/**
 * Pure UI state machine for match flow.
 * All data is queried from LiveStore - this only tracks UI state and flow.
 */
export type MatchContext = {
  matchId: MatchId
  currentGameId: string | null
}

// Simple selector for current game ID
export const getCurrentGameId = (snapshot: {
  context: MatchContext
}): string | null => {
  return snapshot.context.currentGameId
}

export type MatchEvents =
  | { type: 'MATCH_LOADED' } // Match data loaded from LiveStore
  | { type: 'START_GAME'; gameId: string } // Start or navigate to a game
  | { type: 'GAME_COMPLETED'; gameId: string } // Game finished
  | { type: 'END_MATCH' } // Match is over
  | { type: 'RESET' } // Reset to initial state

export const matchMachine = setup({
  types: {
    context: {} as MatchContext,
    events: {} as MatchEvents,
    input: {} as {
      matchId: MatchId
      currentGameId?: string | null
    },
  },
  actions: {
    setCurrentGame: assign(({ event }) => {
      if (event.type !== 'START_GAME') return {}
      return { currentGameId: event.gameId }
    }),
    clearCurrentGame: assign(() => ({
      currentGameId: null,
    })),
  },
}).createMachine({
  id: 'matchMachine',
  initial: 'loading',
  context: ({ input }) => ({
    matchId: input.matchId,
    currentGameId: input.currentGameId ?? null,
  }),
  states: {
    loading: {
      on: {
        MATCH_LOADED: 'ready',
      },
    },
    ready: {
      on: {
        START_GAME: {
          target: 'inGame',
          actions: ['setCurrentGame'],
        },
      },
    },
    inGame: {
      on: {
        GAME_COMPLETED: {
          target: 'gameComplete',
        },
      },
    },
    gameComplete: {
      on: {
        START_GAME: {
          target: 'inGame',
          actions: ['setCurrentGame'],
        },
        END_MATCH: {
          target: 'matchComplete',
          actions: ['clearCurrentGame'],
        },
      },
    },
    matchComplete: {
      on: {
        RESET: {
          target: 'loading',
          actions: ['clearCurrentGame'],
        },
      },
    },
  },
})
