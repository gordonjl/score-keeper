# XState + LiveStore Separation Plan

## Goal
Make XState a **pure state flow controller** while LiveStore owns ALL game data.

## New Architecture

### XState Responsibilities
- **State flow only**: `notConfigured` → `active` → `awaitingConfirmation` → `complete`
- **Event emission**: Send events to LiveStore
- **Configuration**: Hold gameId, matchId, maxPoints, winBy for guards/actions

### LiveStore Responsibilities  
- **All game data**: score, server, firstHandUsed, players
- **Persistence**: Everything survives page refresh
- **Distribution**: Multi-device sync
- **History**: Rally events provide undo capability

## Minimal Context

```typescript
export type Context = {
  // Game configuration (needed for guards/actions)
  gameId: string | null
  matchId: string | null
  maxPoints: number
  winBy: number
  
  // LiveStore integration (needed to emit events)
  store: Store<typeof schema> | null
}
```

## New Events

```typescript
export type Events =
  | {
      type: 'INITIALIZE'
      gameId: string
      matchId: string  
      maxPoints: number
      winBy: number
    }
  | { type: 'RALLY_WON'; winner: Team; game: Game }
  | { type: 'TOGGLE_SERVE_SIDE'; game: Game }
  | { type: 'CONFIRM_GAME_OVER' }
  | { type: 'LET' }
  | { type: 'UNDO' }
```

**Key changes**: 
- Events now receive `game: Game` from LiveStore so guards can check game state
- Removed `CHECK_GAME_END` - eventless `always` transition handles this automatically

## Actions Refactor

### Before: Actions update machine state
```typescript
export const rallyWon = (context: Context, params: { winner: Team }) => {
  const rallyNumber = context.score.A + context.score.B + 1
  
  // Emit to LiveStore
  context.store.commit(events.rallyWon({ /* ... */ }))
  
  // Update machine state
  const nextState = processRally(/* ... */)
  return nextState  // ❌ Machine owns state
}
```

### After: Actions only emit events
```typescript
export const rallyWon = ({ context, event }: { context: Context; event: Events }) => {
  if (event.type !== 'RALLY_WON') return
  
  const { winner, game } = event
  const rallyNumber = game.scoreA + game.scoreB + 1
  
  // Only emit to LiveStore - actions are void functions!
  if (context.store && context.gameId) {
    context.store.commit(events.rallyWon({
      rallyId: crypto.randomUUID(),
      gameId: context.gameId,
      rallyNumber,
      winner,
      serverTeam: game.currentServerTeam,
      serverPlayer: game.currentServerPlayer,
      serverSide: game.currentServerSide,
      serverHandIndex: game.currentServerHandIndex,
      scoreABefore: game.scoreA,
      scoreBBefore: game.scoreB,
      scoreAAfter: winner === 'A' ? game.scoreA + 1 : game.scoreA,
      scoreBAfter: winner === 'B' ? game.scoreB + 1 : game.scoreB,
      timestamp: new Date(),
    }))
  }
  // No return - actions are void!
}
```

## Actions to Remove

- ❌ `configureGameState` - No longer needed, just INITIALIZE with config
- ❌ `snapshot` - No history in machine
- ❌ `undoOnce` - Just emit UNDO event to LiveStore
- ❌ `toggleServeSide` - Emit event to LiveStore instead
- ❌ `processRally` - Logic moved to LiveStore materializer

## Actions to Keep/Modify

- ✅ `rallyWon` - Emit event only
- ✅ `initialize` - NEW: Set gameId, matchId, maxPoints, winBy

## Guards Refactor

### Before: Guards read from context
```typescript
guards: {
  gameEnded: ({ context }) => {
    return context.score.A >= context.maxPoints && 
           Math.abs(context.score.A - context.score.B) >= context.winBy
  }
}
```

### After: Guards receive game data from event
```typescript
guards: {
  gameEnded: ({ context, event }) => {
    const game = event.game  // From CHECK_GAME_END event
    return game.scoreA >= context.maxPoints && 
           Math.abs(game.scoreA - game.scoreB) >= context.winBy
  }
}
```

## State Machine Flow

### Before
```
notConfigured --GAME_LOADED--> checkingStateAfterLoad --[gameEnded?]--> awaitingConfirmation
                                                     \--> active --RALLY_WON--> check --[gameEnded?]--> awaitingConfirmation
```

### After
```
notConfigured --INITIALIZE--> active --RALLY_WON--> active
                                    \--always--[gameEnded?]--> awaitingConfirmation
```

**Key change**: Use eventless `always` transition with guard to check game end after state updates.

## Component Changes

### Components query LiveStore directly

```typescript
// Before: Read from machine
const { score, server, players } = useSelector(actorRef, (s) => ({
  score: s.context.score,
  server: s.context.server,
  players: s.context.players,
}))

// After: Read from LiveStore
const game = store.useQuery(gameById$(gameId))
const match = store.useQuery(matchById$(matchId))

const score = { A: game.scoreA, B: game.scoreB }
const server = {
  team: game.currentServerTeam,
  player: game.currentServerPlayer,
  side: game.currentServerSide,
  handIndex: game.currentServerHandIndex,
}
const players = {
  A1: { firstName: match.playerA1FirstName, /* ... */ },
  // ...
}
```

### Components send game data with events

```typescript
// Before
actorRef.send({ type: 'RALLY_WON', winner: 'A' })

// After - game data included for guards to check
actorRef.send({ type: 'RALLY_WON', winner: 'A', game })
// No CHECK_GAME_END needed - eventless transition handles it!
```

## Hook Changes

### useSquashGameMachine

```typescript
// Before
useEffect(() => {
  actorRef.send({
    type: 'GAME_LOADED',
    game: gameData,
    players,
  })
}, [actorRef])

// After
useEffect(() => {
  actorRef.send({
    type: 'INITIALIZE',
    gameId: gameData.id,
    matchId: gameData.matchId,
    maxPoints: gameData.maxPoints,
    winBy: gameData.winBy,
  })
}, [actorRef])
```

## Benefits

1. **✅ Single source of truth** - LiveStore owns all data
2. **✅ Persistence** - Everything survives page refresh
3. **✅ Distribution** - Multi-device sync works automatically
4. **✅ Simpler machine** - 90% reduction in context
5. **✅ No synchronization bugs** - Can't get out of sync
6. **✅ Reactive** - Components react to LiveStore changes
7. **✅ Undo for free** - Rally events provide history

## Migration Steps

1. Update Context and Events types
2. Remove old actions (configureGameState, snapshot, undoOnce, toggleServeSide)
3. Simplify rallyWon to only emit events
4. Add initialize action
5. Update guards to receive game from events
6. Update machine states and transitions
7. Update useSquashGameMachine hook
8. Update components to query LiveStore
9. Update components to send game data with events
10. Remove useGameSelectors (components query LiveStore directly)
11. Update tests

## Questions to Consider

1. **UNDO**: Should we create a `serverSideToggled` event for LiveStore, or keep it client-only?
2. **LET**: Not implemented yet - do we need it?
3. **Error handling**: What if LiveStore commit fails?
4. **Optimistic updates**: Should UI update before LiveStore confirms?

## Next Steps

Review this plan and confirm approach before proceeding with implementation.
