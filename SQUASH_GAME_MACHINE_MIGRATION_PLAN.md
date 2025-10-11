# Squash Game Machine Migration Plan

## Overview
Transition `GameRoute` to use `squashGameMachine` with LiveStore as the source of truth, following XState + LiveStore best practices.

## Architecture Principles

### 1. **LiveStore as Source of Truth**
- LiveStore database stores all persistent game data (games table, rallies table)
- Event sourcing: All game actions emit LiveStore events (`rallyWon`, `rallyUndone`)
- Materializers update database state from events

### 2. **XState for UI Orchestration**
- `squashGameMachine` manages UI state transitions (active → check → awaitingConfirmation → complete)
- Machine context holds minimal ephemeral state (current server, grid, firstHandUsed)
- Machine reacts to LiveStore data changes via events

### 3. **Undo via Event Sourcing (Not In-Memory History)**
- **Current approach**: Machine stores history array in context for undo
- **New approach**: Query LiveStore rallies table and emit `rallyUndone` event
- Benefits:
  - Undo persists across sessions
  - Undo syncs across devices
  - No memory overhead for long games
  - Follows LiveStore best practice: "Undo/redo should be modeled through explicit events"

## Current State Analysis

### What Works
- `squashGameMachine` already emits LiveStore events (`rallyWon`, `rallyUndone`)
- LiveStore schema has `games` and `rallies` tables
- Machine has `GAME_LOADED` event to initialize from LiveStore data
- `configureGameState` action sets up machine from game record

### What Needs Changing
1. **GameRoute currently uses old `squashMachine`** (not `squashGameMachine`)
2. **No hook to instantiate `squashGameMachine`** with LiveStore integration
3. **No reactive connection** between LiveStore game data and machine
4. **History array in machine context** should be removed (use LiveStore rallies)
5. **Components use `useGameState` hook** which reads from old machine

## Detailed Migration Steps

### Step 1: Update squashGameMachine (Remove History Array)
**File**: `src/machines/squashGameMachine.ts`

**Changes**:
```typescript
// REMOVE from Context type:
history: Array<Snapshot>

// REMOVE Snapshot type (no longer needed)

// UPDATE undoOnce action to query LiveStore rallies:
undoOnce: assign(({ context }) => {
  // Query last rally from LiveStore
  if (!context.store || !context.gameId) return {}
  
  const ralliesQuery = ralliesByGame$(context.gameId)
  const rallies = context.store.query(ralliesQuery)
  const lastRally = rallies[rallies.length - 1]
  
  if (!lastRally) return {}
  
  // Emit rallyUndone event
  context.store.commit(
    events.rallyUndone({
      gameId: context.gameId,
      rallyId: lastRally.id,
      timestamp: new Date(),
    })
  )
  
  // Rebuild state from remaining rallies
  // (This will be handled by replaying rallies in GAME_LOADED)
  return {}
})

// REMOVE snapshot action (no longer needed)
```

**Rationale**: 
- LiveStore rallies table is the source of truth for undo
- Undo becomes an event, not a state rollback
- Machine can be reconstructed from rallies at any time

---

### Step 2: Create useSquashGameMachine Hook
**File**: `src/hooks/useSquashGameMachine.ts` (NEW)

**Purpose**: Instantiate and manage `squashGameMachine` lifecycle with LiveStore integration

**Implementation**:
```typescript
import { useStore } from '@livestore/react'
import { useActorRef } from '@xstate/react'
import { useEffect } from 'react'
import { squashGameMachine } from '../machines/squashGameMachine'
import { gameById$, ralliesByGame$ } from '../livestore/squash-queries'
import type { PlayerNameMap } from '../machines/squashMachine'
import type { Team } from '../machines/squashMachine'

export const useSquashGameMachine = (gameId: string, players: PlayerNameMap) => {
  const { store } = useStore()
  
  // Create actor ref (doesn't cause re-renders on state changes)
  const actorRef = useActorRef(squashGameMachine, {
    input: { gameId, store }
  })
  
  // Query game data from LiveStore (reactive)
  const game = store.useQuery(gameById$(gameId))
  const rallies = store.useQuery(ralliesByGame$(gameId))
  
  // Load game data into machine when available
  useEffect(() => {
    if (!game) return
    
    // Send GAME_LOADED event to configure machine
    actorRef.send({
      type: 'GAME_LOADED',
      game,
      players,
    })
    
    // Replay rallies to reconstruct grid state
    // (Only if game is in progress and has rallies)
    if (game.status === 'in_progress' && rallies.length > 0) {
      for (const rally of rallies) {
        actorRef.send({
          type: 'RALLY_WON',
          winner: rally.winner as Team,
        })
      }
    }
  }, [game, rallies, actorRef, players])
  
  return { actorRef, game, rallies }
}
```

**Key Features**:
- Uses `useActorRef()` instead of `useMachine()` for better performance (no re-renders on every state change)
- Passes `store` to machine via input
- Reactively queries game and rallies from LiveStore
- Sends `GAME_LOADED` event when data arrives
- Replays rallies to reconstruct grid (for in-progress games)
- Returns `actorRef` for use with `useSelector()` in components

**Why `useActorRef()` instead of `useMachine()`?**
- `useMachine()` causes component re-render on every state change
- `useActorRef()` returns stable reference, components use `useSelector()` for fine-grained reactivity
- Better performance: only re-render when selected state changes

---

### Step 3: Create useGameSelectors Hook
**File**: `src/hooks/useGameSelectors.ts` (NEW)

**Purpose**: Expose machine state to components using `useSelector()` for fine-grained reactivity

**Implementation**:
```typescript
import { useSelector } from '@xstate/react'
import { toWords } from '../components/game/utils'
import type { ActorRefFrom } from 'xstate'
import type { squashGameMachine } from '../machines/squashGameMachine'
import type { RowKey } from '../machines/squashMachine'

export const useGameSelectors = (actor: ActorRefFrom<typeof squashGameMachine>) => {
  // Individual selectors for fine-grained reactivity
  const score = useSelector(actor, (s) => s.context.score)
  const grid = useSelector(actor, (s) => s.context.grid)
  const players = useSelector(actor, (s) => s.context.players)
  const server = useSelector(actor, (s) => s.context.server)
  const rallyCount = useSelector(actor, (s) => s.context.rallyCount)
  
  // State checks
  const isGameOver = useSelector(actor, (s) => s.matches('complete'))
  const isAwaitingConfirmation = useSelector(actor, (s) => s.matches('awaitingConfirmation'))
  const isActive = useSelector(actor, (s) => s.matches('active'))
  
  // Derived values
  const scoreA = score.A
  const scoreB = score.B
  const serverRowKey = `${server.team}${server.player}` as RowKey
  
  // Serve announcement
  const serverScore = score[server.team]
  const receiverTeam = server.team === 'A' ? 'B' : 'A'
  const receiverScore = score[receiverTeam]
  const scorePhrase =
    serverScore === receiverScore
      ? `${toWords(serverScore)} All`
      : `${toWords(serverScore)}–${toWords(receiverScore)}`
  
  const serverName = players[serverRowKey]?.lastName || players[serverRowKey]?.firstName || serverRowKey
  const sideName = server.side === 'R' ? 'Right' : 'Left'
  const announcement = `${scorePhrase}, ${serverName} to Serve from the ${sideName}`
  
  return {
    score,
    scoreA,
    scoreB,
    grid,
    players,
    server,
    serverRowKey,
    rallyCount,
    isGameOver,
    isAwaitingConfirmation,
    isActive,
    announcement,
  }
}
```

**Key Features**:
- Uses `useSelector()` for each piece of state (fine-grained reactivity)
- Only re-renders when selected state changes
- Computes derived values (announcement, serverRowKey)
- Follows XState best practices

---

### Step 4: Update GameRoute Component
**File**: `src/routes/match.$matchId.game.$gameId.tsx`

**Changes**:
```typescript
// REMOVE:
import { useEventSourcedGameActor } from '../hooks/useEventSourcedGame'
import { useGameState } from '../components/game/useGameState'

// ADD:
import { useSquashGameMachine } from '../hooks/useSquashGameMachine'
import { useGameSelectors } from '../hooks/useGameSelectors'

// In GameRouteWrapper:
// REMOVE the gameActor logic entirely - it will be created in GameRoute

// In GameRoute component:
function GameRoute({
  matchGames,
}: {
  matchGames: Array<GameResult>
}) {
  const { matchId, gameId } = Route.useParams()
  const { actor: matchActorRef } = useLiveStoreMatch()
  
  // NEW: Use squashGameMachine hook
  const { actorRef, game, rallies } = useSquashGameMachine(
    gameId,
    matchActorRef?.getSnapshot().context.players || defaultPlayers
  )
  
  // NEW: Use selectors hook
  const {
    scoreA,
    scoreB,
    grid,
    players,
    server,
    serverRowKey,
    rallyCount,
    isGameOver,
    isAwaitingConfirmation,
    isActive,
    announcement,
  } = useGameSelectors(actorRef)
  
  // REMOVE:
  const {
    scoreA,
    scoreB,
    grid,
    players,
    server,
    serverRowKey,
    history,
    isGameOver,
    isAwaitingConfirmation,
    isIdle,
    announcement,
  } = useGameState(gameActor)
  
  // UPDATE: Use rallyCount instead of history.length
  const canUndo = rallyCount > 0
  
  // UPDATE: Send events to new actorRef
  <RallyButtons
    onRallyWon={(winner) => actorRef.send({ type: 'RALLY_WON', winner })}
  />
  
  <ActionButtons
    canUndo={canUndo}
    onUndo={() => actorRef.send({ type: 'UNDO' })}
  />
  
  // UPDATE: All other event sends
  <ScoreGrid
    onToggleServeSide={() => actorRef.send({ type: 'TOGGLE_SERVE_SIDE' })}
  />
  
  <GameOverConfirmation
    onCancel={() => actorRef.send({ type: 'UNDO' })}
    onConfirm={() => {
      actorRef.send({ type: 'CONFIRM_GAME_OVER' })
      // ... rest of logic
    }}
  />
}
```

**Key Changes**:
- Remove `gameActor` prop from GameRoute (create machine inside component)
- Use `useSquashGameMachine` to create and manage machine
- Use `useGameSelectors` for fine-grained state access
- Replace `history.length` with `rallyCount` for undo check
- Send events to `actorRef` instead of `gameActor`
- Update GameRouteWrapper to not pass gameActor prop

---

### Step 5: Update Child Components (If Needed)
**Files**: Components that receive `gameActor` prop

**Changes**:
- Most components already receive events via callbacks (no change needed)
- If any component directly accesses `gameActor.getSnapshot()`, update to use selectors

**Example**:
```typescript
// BEFORE:
const score = gameActor.getSnapshot().context.score

// AFTER:
const score = useSelector(actor, (s) => s.context.score)
```

---

### Step 6: Handle Undo Reconstruction
**File**: `src/machines/squashGameMachine.ts`

**Enhancement**: When `UNDO` is triggered, machine needs to reconstruct state from remaining rallies

**Implementation**:
```typescript
on: {
  UNDO: {
    actions: ['undoOnce'],
    target: '.notConfigured', // Reset to notConfigured
  },
}

// Then in a useEffect in the hook:
useEffect(() => {
  if (state.matches('notConfigured') && game) {
    // Re-send GAME_LOADED to reconstruct
    send({ type: 'GAME_LOADED', game, players })
    
    // Replay remaining rallies (after undo)
    const activeRallies = rallies.filter(r => !r.deletedAt)
    for (const rally of activeRallies) {
      send({ type: 'RALLY_WON', winner: rally.winner })
    }
  }
}, [state.value, game, rallies, send, players])
```

**Rationale**:
- After undo, machine resets and replays remaining rallies
- Grid is reconstructed from scratch (deterministic)
- No need to store history in memory

---

## Benefits of This Approach

### 1. **Single Source of Truth**
- LiveStore database is authoritative for all game data
- Machine state can be reconstructed at any time from rallies
- No risk of state divergence

### 2. **Persistent Undo**
- Undo works across page refreshes
- Undo syncs across devices (if sync backend is configured)
- Undo history is unlimited (not constrained by memory)

### 3. **Fine-Grained Reactivity**
- Components only re-render when their selected state changes
- Better performance for complex UIs
- Follows React best practices

### 4. **Testability**
- Machine logic is pure and deterministic
- Can test by replaying event sequences
- Easy to debug with XState inspector

### 5. **Follows Best Practices**
- XState + LiveStore patterns from documentation
- Event sourcing for undo/redo
- Separation of concerns (data vs UI state)

---

## Testing Strategy

### Unit Tests
1. Test `squashGameMachine` with mock LiveStore events
2. Test rally replay logic reconstructs grid correctly
3. Test undo emits correct `rallyUndone` event

### Integration Tests
1. Test `useSquashGameMachine` hook with real LiveStore
2. Test undo → replay flow
3. Test game completion flow

### E2E Tests
1. Play a game, undo several moves, verify grid state
2. Refresh page mid-game, verify state restored
3. Complete a game, verify LiveStore events committed

---

## Migration Checklist

- [ ] Update `squashGameMachine.ts` to remove history array
- [ ] Create `useSquashGameMachine.ts` hook
- [ ] Create `useGameSelectors.ts` hook
- [ ] Update `GameRoute` component to use new hooks
- [ ] Update child components (if needed)
- [ ] Test undo functionality
- [ ] Test game completion flow
- [ ] Test page refresh / state restoration
- [ ] Remove old `useGameState.ts` hook (after migration complete)
- [ ] Remove old `useEventSourcedGame.ts` hook (after migration complete)

---

## Rollback Plan

If issues arise:
1. Keep old hooks in place during migration
2. Use feature flag to toggle between old/new implementation
3. Can revert by restoring old imports in `GameRoute`

---

## Future Enhancements

### 1. **Use `createActorContext()` for Better Encapsulation**
Currently, we're using `useActorRef()` + `useSelector()` in components. For better encapsulation, consider using `createActorContext()`:

```typescript
// src/contexts/SquashGameContext.ts
import { createActorContext } from '@xstate/react'
import { squashGameMachine } from '../machines/squashGameMachine'

export const SquashGameContext = createActorContext(squashGameMachine)

// Usage in GameRoute:
<SquashGameContext.Provider>
  <GameContent />
</SquashGameContext.Provider>

// Usage in child components:
const score = SquashGameContext.useSelector((s) => s.context.score)
const actorRef = SquashGameContext.useActorRef()
```

**Benefits**:
- No prop drilling
- Components can access machine state directly
- Better for deeply nested component trees

**Tradeoff**: Less explicit data flow (harder to see what data components use)

### 2. **Optimistic UI Updates**
- Show rally result immediately, sync in background
- Handle conflict resolution if sync fails

### 3. **Offline Support**
- Queue events while offline
- Replay when connection restored

### 4. **Real-Time Multiplayer**
- Subscribe to LiveStore sync events
- Update UI when remote player makes move

### 5. **Advanced Analytics**
- Query rallies table for statistics
- Show rally duration, server success rate, etc.

---

## References

- [XState + LiveStore Patterns](./src/machines/xstateWLiveStorePatterns.md)
- [LiveStore Undo/Redo Pattern](https://docs.livestore.dev/patterns/undo-redo/)
- [LiveStore Event Sourcing](https://docs.livestore.dev/evaluation/event-sourcing/)
- [XState React Hooks](https://stately.ai/docs/xstate-react) - `useActorRef()`, `useSelector()`, `createActorContext()`
- [XState Best Practices](https://stately.ai/docs/xstate)
