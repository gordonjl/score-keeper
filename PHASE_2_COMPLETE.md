# Phase 2: XState Integration - COMPLETED ✅

**Date:** 2025-10-08  
**Status:** Complete

---

## Summary

Successfully integrated XState machines with LiveStore event emission. Both `matchMachine` and `squashMachine` now emit LiveStore events for all state changes, enabling persistent event sourcing and reactive data flow.

---

## Changes Made

### 1. **matchMachine.ts** ✅

**Added:**
- `store` parameter to context and input types
- LiveStore event emission for:
  - `matchSetup` - When players and first servers are configured
  - `gameStarted` - When a new game begins
  - `gameCompleted` - When a game finishes

**Key Implementation:**
```typescript
// Context now includes store
export type MatchContext = {
  // ... existing fields
  store: any | null // LiveStore instance for event emission
}

// Actions emit events before state updates
setupMatch: assign(({ event, context }) => {
  if (context.store && context.matchId) {
    context.store.commit(
      events.matchSetup({
        matchId: context.matchId,
        playerA1: { firstName, lastName },
        // ... all player data
        timestamp: new Date(),
      }),
    )
  }
  // ... state update
})
```

**Game ID Format:** `${matchId}-game-${gameNumber}` for consistency

---

### 2. **squashMachine.ts** ✅

**Added:**
- `store` parameter to context and input types
- `rallyCount` field to track rally numbers
- LiveStore event emission for:
  - `rallyWon` - Every point scored with full server state
  - `rallyUndone` - When undo is triggered

**Key Implementation:**
```typescript
export type Context = {
  // ... existing fields
  store: any | null
  rallyCount: number // Track rally number for events
}

rallyWon: assign(({ context }, { winner }) => {
  const rallyNumber = context.rallyCount + 1
  
  // Emit LiveStore event with full rally details
  if (context.store && context.gameId) {
    context.store.commit(
      events.rallyWon({
        rallyId: crypto.randomUUID(),
        gameId: context.gameId,
        rallyNumber,
        winner,
        serverTeam: cur.team,
        serverPlayer: cur.player,
        serverSide: cur.side,
        serverHandIndex: cur.handIndex,
        scoreABefore: context.score.A,
        scoreBBefore: context.score.B,
        scoreAAfter: winner === 'A' ? context.score.A + 1 : context.score.A,
        scoreBAfter: winner === 'B' ? context.score.B + 1 : context.score.B,
        timestamp: new Date(),
      }),
    )
  }
  
  // ... state update with rallyCount: rallyNumber
})
```

**Undo Handling:**
- Emits `rallyUndone` event with empty `rallyId`
- Materializer queries the last rally by `gameId` and `rallyNumber`
- Soft deletes rally and restores previous score

---

### 3. **squash-schema.ts** ✅

**Enhanced Materializer:**
```typescript
'v1.RallyUndone': ({ gameId, rallyId, timestamp }, ctx) => {
  // Query last rally if rallyId is empty
  const rally = rallyId
    ? ctx.query(squashTables.rallies.where({ id: rallyId, deletedAt: null }).first())
    : ctx.query(
        squashTables.rallies
          .where({ gameId, deletedAt: null })
          .orderBy('rallyNumber', 'desc')
          .first()
      )

  if (!rally) return []

  return [
    // Soft delete the rally
    squashTables.rallies.update({ deletedAt: timestamp }).where({ id: rally.id }),
    // Restore previous score
    squashTables.games.update({
      scoreA: rally.scoreABefore,
      scoreB: rally.scoreBBefore,
    }).where({ id: gameId }),
  ]
}
```

---

### 4. **LiveStoreMatchContext.tsx** ✅

**Enhanced:**
- Queries both `match` and `games` from LiveStore
- Passes `store` to machine input
- Waits for both queries before initializing actor
- Added comments for future game state restoration

**Key Changes:**
```typescript
// Query match and games data from LiveStore
const match = store.useQuery(matchById$(matchId))
const games = store.useQuery(gamesByMatch$(matchId))

// Wait for both queries
if (!match || !games) {
  setIsLoading(true)
  return
}

// Pass store to machine
const newActor = createActor(matchMachine, {
  input: { matchId, store },
})
```

---

## Architecture Flow

```
User Action (e.g., RALLY_WON)
    ↓
XState Machine Action
    ↓
store.commit(events.rallyWon(...)) ← Emit LiveStore Event
    ↓
LiveStore Event Log (append-only)
    ↓
Materializer (v1.RallyWon)
    ↓
SQLite Tables Updated (rallies, games)
    ↓
Reactive Queries Re-run
    ↓
React Components Re-render
```

---

## Event Flow Examples

### Match Setup Flow
1. User fills in player names → `SETUP_MATCH` event
2. `matchMachine.setupMatch` action:
   - Emits `events.matchSetup()` to LiveStore
   - Updates XState context
3. Materializer updates `matches` table
4. Queries reflect new player data

### Rally Flow
1. User clicks "Team A" → `RALLY_WON` event with `winner: 'A'`
2. `squashMachine.rallyWon` action:
   - Emits `events.rallyWon()` with full rally details
   - Updates score, server, grid in XState context
   - Increments `rallyCount`
3. Materializer:
   - Inserts row in `rallies` table
   - Updates `scoreA`/`scoreB` in `games` table
4. Queries reflect new score

### Undo Flow
1. User clicks "Undo" → `UNDO` event
2. `squashMachine.undoOnce` action:
   - Emits `events.rallyUndone()` with `rallyId: ''`
   - Pops snapshot from history
   - Decrements `rallyCount`
3. Materializer:
   - Queries last rally by `gameId` + `rallyNumber DESC`
   - Soft deletes rally (`deletedAt` timestamp)
   - Restores `scoreABefore`/`scoreBBefore`
4. Queries reflect reverted score

---

## Testing Status

### Compilation ✅
- All TypeScript errors resolved
- ESLint passes
- Prettier formatting applied

### Manual Testing Required
- [ ] Create new match
- [ ] Set up players
- [ ] Start game
- [ ] Score rallies
- [ ] Verify LiveStore events in DevTools
- [ ] Test undo functionality
- [ ] Complete game
- [ ] Start second game
- [ ] Complete match

---

## Known Limitations

1. **Game State Restoration:** Currently, if you reload the page mid-game, the XState machine starts fresh. The game data is in LiveStore, but we need to:
   - Query rallies for the current game
   - Reconstruct the activity grid
   - Restore server position
   - This is Phase 3 work

2. **Rally ID in Undo:** The undo action doesn't store `rallyId` in the XState history. The materializer works around this by querying the last rally, which works but isn't ideal for multi-level undo.

3. **Type Safety:** Using `any` for store type since `LiveStore` isn't exported from `@livestore/livestore`. This is acceptable for now.

---

## Next Steps (Phase 3)

1. **Component Migration:**
   - Update components to use LiveStore queries instead of XState context
   - `ScoreHeader` → query current game
   - `ScoreGrid` → query rallies
   - `MatchProgress` → query games

2. **Game State Restoration:**
   - On page load, query current game + rallies
   - Reconstruct activity grid from rally history
   - Initialize squashMachine with restored state

3. **Remove Dexie:**
   - Delete old event store files
   - Remove Dexie dependency
   - Update all imports

---

## Files Modified

- ✅ `src/machines/matchMachine.ts`
- ✅ `src/machines/squashMachine.ts`
- ✅ `src/livestore/squash-schema.ts`
- ✅ `src/contexts/LiveStoreMatchContext.tsx`

---

## Verification Commands

```bash
# Type check
pnpm exec tsc --noEmit

# Lint
pnpm exec eslint src/machines/*.ts src/contexts/LiveStoreMatchContext.tsx

# Format
pnpm exec prettier --write src/machines/*.ts src/contexts/LiveStoreMatchContext.tsx

# Run dev server
pnpm dev
```

---

**Phase 2 Status:** ✅ COMPLETE  
**Ready for Phase 3:** Component Migration & State Restoration
