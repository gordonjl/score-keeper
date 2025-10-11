# Squash Game Machine Implementation

## Overview

The `squashGameMachine.ts` has been fully implemented following XState + LiveStore best practices. This machine manages UI state for a single squash game while coordinating with LiveStore for persistence.

## Architecture Pattern

**React → XState → LiveStore (Fire-and-Forget)**

```
User Action → gameActor.send() → State Machine Action → LiveStore.commit() → UI Update
```

The state machine:
1. Receives events from React components
2. Computes new game state (score, grid, server)
3. Commits events to LiveStore for persistence
4. Returns updated context for immediate UI rendering

## Complete Context

```typescript
type Context = {
  // Configuration (from Game)
  gameId: string | null
  matchId: string | null
  maxPoints: number
  winBy: number
  
  // Players (passed in, not from Game)
  players: PlayerNameMap
  
  // Game state (UI state machine manages this)
  score: Score
  server: Server
  grid: ActivityGrid
  firstHandUsed: boolean
  
  // History for undo
  history: Array<Snapshot>
  
  // LiveStore integration
  store: unknown | null
  rallyCount: number
}
```

## Events

| Event | Purpose | Payload |
|-------|---------|---------|
| `GAME_LOADED` | Initialize machine from LiveStore Game | `game: Game, players: PlayerNameMap` |
| `RALLY_WON` | Record rally winner | `winner: Team` |
| `TOGGLE_SERVE_SIDE` | Toggle R/L at hand-in | none |
| `CONFIRM_GAME_OVER` | Confirm game completion | none |
| `LET` | Record a let (no-op for now) | none |
| `UNDO` | Undo last rally | none |
| `RESET` | Reset to notConfigured | none |

## States

```
notConfigured
    ↓ GAME_LOADED
  active
    ↓ RALLY_WON
  check (transient)
    ↓ gameEnded guard
  awaitingConfirmation
    ↓ CONFIRM_GAME_OVER
  complete (final)
```

**Global transitions:**
- `UNDO` from any state → `active` (pops history)
- `RESET` from any state → `notConfigured`

## Actions

### `configureGameState`
- Initializes machine from LiveStore `Game` object
- Extracts minimal state (IDs, config)
- Creates initial server and grid
- **Limitation:** Only supports fresh games (0-0). In-progress game resumption requires rally event replay (TODO)

### `snapshot`
- Saves current state to history before each rally
- Enables undo functionality

### `toggleServeSide`
- Toggles serve side (R ↔ L) when `handIndex === 0`
- Updates grid cell with new side

### `rallyWon`
- **Core game logic** - handles all rally resolution scenarios:
  - Server wins: increment score, flip side, pre-write next serve
  - Receiver wins: add slash, check hand-in/hand-out rules
  - First-hand exception at 0-0
  - Partner rotation (second hand)
  - Hand-out to other team
- **Emits LiveStore event:** `rallyWon` with full rally data
- Updates score, grid, and server state

### `undoOnce`
- Restores previous state from history
- **Emits LiveStore event:** `rallyUndone`
- Decrements rally count

## Guards

### `gameEnded`
- **Parameterized for testability**
- Checks if either team reached `maxPoints` with `winBy` margin
- Used in `check` state to determine if game is over

## UI Integration

### What the UI needs from the machine:

**ScoreGrid:**
- `context.grid` - Full activity grid
- `context.server` - Current server (team, player, side, handIndex)
- `context.score` - Current scores
- `matches('complete')` - Is game over?

**RallyButtons:**
- `matches('awaitingConfirmation')` - Disable buttons?

**ActionButtons:**
- `context.history.length > 0` - Can undo?
- `matches('idle')` - Is game idle?
- `matches('awaitingConfirmation')` - Is awaiting confirmation?

**ServeAnnouncement:**
- Derived from `context.score`, `context.server`, `context.players`

## LiveStore Integration

### Events Emitted

**`rallyWon`** - After each rally:
```typescript
{
  rallyId: string
  gameId: string
  rallyNumber: number
  winner: 'A' | 'B'
  serverTeam: 'A' | 'B'
  serverPlayer: 1 | 2
  serverSide: 'R' | 'L'
  serverHandIndex: 0 | 1
  scoreABefore: number
  scoreBBefore: number
  scoreAAfter: number
  scoreBAfter: number
  timestamp: Date
}
```

**`rallyUndone`** - After undo:
```typescript
{
  gameId: string
  rallyId: string  // Empty string - materializer finds last rally
  timestamp: Date
}
```

### Materialization

LiveStore materializers update:
- `games` table: `scoreA`, `scoreB`
- `rallies` table: Insert new rally or soft-delete on undo

## Best Practices Followed

✅ **Single Source of Truth:** LiveStore is authoritative for persistent data; machine manages UI state

✅ **Minimal Context:** Machine doesn't duplicate entire `Game` object, only extracts needed values

✅ **Fire-and-Forget:** LiveStore commits happen in actions without blocking UI

✅ **Deterministic:** All state changes funnel through machine events

✅ **Testable:** Guards use params; actions are pure (aside from LiveStore side effects)

✅ **No `any` or `let`:** Strongly typed with `unknown` for store, functional style

✅ **Orchestration:** Machine coordinates game logic and persistence

## Future Enhancements

### TODO: Grid Reconstruction from Rally Events

Currently, the machine only supports fresh games (0-0). To support resuming in-progress games:

1. Query rally events from LiveStore on `GAME_LOADED`
2. Replay rallies through `rallyWon` logic to rebuild grid
3. Restore server state from last rally

**Implementation sketch:**
```typescript
configureGameState: assign(async ({ context }, params) => {
  const rallies = await queryRallies(context.store, params.game.id)
  
  const state = rallies.reduce((acc, rally) => {
    return applyRally(acc, rally)
  }, initialState)
  
  return state
})
```

Rally events already contain sufficient data for replay:
- `winner`, `serverTeam`, `serverPlayer`, `serverSide`, `serverHandIndex`
- Scores before/after

## Testing Strategy

**Unit tests:**
- Test guards with various score scenarios
- Test helper functions (writeCell, flip, otherTeam)

**Integration tests:**
- Mock LiveStore, send events, verify context updates
- Test full rally sequences (server wins, receiver wins, hand-outs)
- Test undo functionality

**E2E tests:**
- Full game flow with real LiveStore
- Verify persistence and materialization

## Usage Example

```typescript
import { squashGameMachine } from './machines/squashGameMachine'
import { useMachine } from '@xstate/react'

const GameComponent = ({ game, players, store }) => {
  const [state, send] = useMachine(squashGameMachine, {
    input: { gameId: game.id, matchId: game.matchId, store }
  })
  
  // Initialize
  useEffect(() => {
    send({ type: 'GAME_LOADED', game, players })
  }, [])
  
  // Rally won
  const handleRallyWon = (winner: 'A' | 'B') => {
    send({ type: 'RALLY_WON', winner })
  }
  
  // Render based on state
  return (
    <div>
      <ScoreGrid
        grid={state.context.grid}
        server={state.context.server}
        score={state.context.score}
        isGameOver={state.matches('complete')}
        onToggleServeSide={() => send({ type: 'TOGGLE_SERVE_SIDE' })}
      />
      
      <RallyButtons
        isDisabled={state.matches('awaitingConfirmation')}
        onRallyWon={handleRallyWon}
      />
      
      {state.matches('awaitingConfirmation') && (
        <GameOverConfirmation
          onConfirm={() => send({ type: 'CONFIRM_GAME_OVER' })}
          onCancel={() => send({ type: 'UNDO' })}
        />
      )}
    </div>
  )
}
```

## Summary

The `squashGameMachine` is now a complete, production-ready state machine that:
- Manages all UI state for a squash game
- Coordinates with LiveStore for persistence
- Follows XState + LiveStore best practices
- Is strongly typed with no `any` or `let`
- Provides all state needed by UI components
- Handles complex game logic (rally resolution, hand-in/hand-out, undo)

The only remaining enhancement is grid reconstruction for resuming in-progress games, which can be added by querying and replaying rally events from LiveStore.
