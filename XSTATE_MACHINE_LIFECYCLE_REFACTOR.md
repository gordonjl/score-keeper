# XState Machine Lifecycle Refactor

## Summary

Refactored the `squashGameMachine` lifecycle management to align with React best practices and XState v5 patterns. The machine now properly creates a new instance for each game, eliminating the need for manual reset logic.

## Key Changes

### 1. **Made `complete` a Final State**
- Changed `complete` state to `type: 'final'`
- This signals that the game is truly done and the machine stops accepting events
- Enables automatic cleanup of any running timers/actors

**File:** `src/machines/squashGameMachine.ts`
```typescript
complete: {
  type: 'final',
  // Machine lifecycle now managed by React - new game = new machine instance
}
```

### 2. **Replaced `useMachine` with `useMemo` + `createActor`**
- Removed `useEffect` with manual `RESET` event
- Machine now recreates when `gameId` changes (via `useMemo` dependency)
- Game data and rallies are loaded immediately on actor creation
- Each game gets a fresh machine instance with clean state

**File:** `src/hooks/useSquashGameMachine.ts`
```typescript
const actorRef = useMemo(() => {
  const actor = createActor(squashGameMachine, {
    input: { store },
  })
  
  actor.start()
  
  // Load game data
  actor.send({
    type: 'GAME_LOADED',
    game: gameData,
    players,
  })
  
  // Replay rallies to reconstruct grid state
  if (gameData.status === 'in_progress' && ralliesData.length > 0) {
    ralliesData.forEach((rally) => {
      actor.send({
        type: 'RALLY_WON',
        winner: rally.winner as Team,
      })
    })
  }
  
  return actor
}, [gameId, store])
```

### 3. **Removed `RESET` Event**
- Removed `RESET` event type from `Events` union
- Removed `RESET` event handler from machine's root `on` config
- Removed `resetGameState` action (no longer needed)
- Removed unused imports (`log`, `resetGameState`)

**Files:** `src/machines/squashGameMachine.ts`

### 4. **Updated Final State Checks to XState v5 API**
- Changed from `state.matches('complete')` to `state.status === 'done'`
- XState v5 uses `snapshot.status === 'done'` instead of `snapshot.done`
- Updated all components that check for game completion

**Files Updated:**
- `src/routes/match.$matchId.game.$gameNumber.tsx`
- `src/hooks/useGameSelectors.ts`
- `src/components/game/RallyButtons.tsx`
- `src/components/game/ActionButtons.tsx`
- `src/components/game/ScoreGrid.tsx`

## Benefits

### ✅ **Simpler Code**
- No manual reset logic
- No `useEffect` dependencies to manage
- No rally replay in effects

### ✅ **React-Aligned**
- Follows React's declarative model
- `useMemo` dependency on `gameId` naturally recreates machine
- Component unmount automatically cleans up actor

### ✅ **XState Best Practices**
- Final states properly signal completion
- Machine lifecycle matches data lifecycle
- Cleaner separation: LiveStore = data, XState = UI state

### ✅ **Type Safety**
- XState v5 `status === 'done'` is properly typed
- No more `@ts-expect-error` for final state checks

## XState Concepts Applied

### **Final States**
- States marked with `type: 'final'` signal completion
- Machine stops accepting events when in final state
- Automatic cleanup of internal actors/timers
- Can check via `snapshot.status === 'done'` (XState v5)

### **Machine Lifecycle**
- Actors run for the lifetime of the component (or until unmounted)
- To restart with new data, recreate the actor (via `useMemo`)
- Don't fight React's lifecycle with manual resets

### **Actor Creation**
- `createActor(machine, { input })` creates an actor
- `actor.start()` starts the actor
- `actor.send(event)` sends events
- Actor reference is stable within `useMemo`

## Migration Notes

If you need to access the old behavior:
- The `RESET` event is no longer available
- Instead, navigate to a different game (changes `gameId`)
- The hook will automatically create a new machine instance

## Testing Recommendations

1. **Test game transitions**: Verify new games start fresh
2. **Test route changes**: Ensure `gameId` changes trigger new machines
3. **Test final state**: Confirm `status === 'done'` works correctly
4. **Test rally replay**: Ensure in-progress games reconstruct properly

## References

- [XState v5 Migration Guide](https://stately.ai/docs/migration)
- [XState Final States](https://stately.ai/docs/final-states)
- [XState React Integration](https://stately.ai/docs/xstate-react)
