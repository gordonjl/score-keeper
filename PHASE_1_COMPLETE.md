# Phase 1 Complete ✅

**Date:** 2025-10-08  
**Status:** Schema and queries created, ready for Phase 2

---

## What Was Accomplished

### 1. LiveStore Schema Created
**File:** `src/livestore/squash-schema.ts`

- ✅ **4 SQLite Tables**:
  - `matches` - Match metadata and players
  - `games` - Individual games within matches  
  - `rallies` - Rally history for statistics and undo
  - `gameUiState` - Client-only UI state

- ✅ **8 Synced Events**:
  - `matchCreated`, `matchSetup`, `matchCompleted`, `matchArchived`
  - `gameStarted`, `gameCompleted`
  - `rallyWon`, `rallyUndone`

- ✅ **8 Materializers**:
  - Map events to database state changes
  - Includes undo functionality with proper type handling

### 2. LiveStore Queries Created
**File:** `src/livestore/squash-queries.ts`

- ✅ Match queries (by ID, active, completed, all)
- ✅ Game queries (by match, current, by ID, completed)
- ✅ Rally queries (by game, count, last rally)
- ✅ Composite query helpers
- ✅ Stats computation helper

### 3. Schema Composition
**File:** `src/livestore/schema.ts`

- ✅ TODO schema preserved as canary
- ✅ Squash schema imported and composed
- ✅ Single unified schema for LiveStore worker

### 4. Context Started
**File:** `src/contexts/LiveStoreMatchContext.tsx`

- ⚠️ Created but has type errors (needs refinement in Phase 2)
- Basic structure for LiveStore + XState integration

---

## Architecture

```
LiveStore (Data Layer)
├── Events → Eventlog (append-only)
├── Materializers → SQLite State
└── Queries → Reactive data access

XState (Process Layer)
├── Match Machine → UI flow
├── Squash Machine → Game flow
└── Actions → Emit LiveStore events

React (View Layer)
├── Context → Provides actor + data
├── Components → Query LiveStore
└── Hooks → Trigger XState events
```

---

## Next Steps (Phase 2)

### Immediate Tasks

1. **Fix LiveStoreMatchContext type errors**
   - Simplify event inspection approach
   - Use XState actions to emit LiveStore events directly
   - Remove complex type assertions

2. **Modify XState Machines**
   - Add `store` to machine input
   - Create actions that emit LiveStore events
   - Remove Dexie persistence logic

3. **Update Routes**
   - Replace `EventSourcedMatchContext` with `LiveStoreMatchContext`
   - Update imports in route files

4. **Test TODO Canary**
   - Ensure TODO list still works
   - Verify LiveStore integration is solid

5. **Remove Dexie**
   - Delete `src/db/` directory
   - Remove Dexie from package.json
   - Clean up imports

---

## Key Design Decisions

### ✅ Separation of Concerns
- **LiveStore**: Owns all persisted data
- **XState**: Owns UI flow and transient state
- **React**: Queries LiveStore, triggers XState

### ✅ Event Flow
```
User Action
  ↓
XState Event
  ↓
XState Action → LiveStore.commit(event)
  ↓
Materializer → SQLite Update
  ↓
Query Re-runs → Component Re-renders
```

### ✅ No Snapshots
- XState no longer persists snapshots
- State reconstructed from LiveStore queries on mount
- XState manages only current UI flow

### ✅ Activity Grid
- Stored as JSON in `gameUiState` client document
- Can normalize later if needed for analytics

### ✅ Undo Functionality
- Rally events stored with soft delete (`deletedAt`)
- `rallyUndone` event restores previous score
- Full undo history available

---

## Files Status

| File | Status | Notes |
|------|--------|-------|
| `squash-schema.ts` | ✅ Complete | All tables, events, materializers |
| `squash-queries.ts` | ✅ Complete | All reactive queries |
| `schema.ts` | ✅ Complete | TODO + Squash composed |
| `LiveStoreMatchContext.tsx` | ⚠️ In Progress | Has type errors, needs refinement |
| `matchMachine.ts` | ⚠️ Needs Update | Add store input, emit events |
| `squashMachine.ts` | ⚠️ Needs Update | Add store input, emit events |
| Routes | ❌ Not Started | Need to use new context |
| Dexie cleanup | ❌ Not Started | Remove after migration |

---

## Testing Strategy

### Canary Test
- ✅ TODO list remains functional
- ✅ Isolated schema prevents interference
- ✅ If TODO breaks, LiveStore integration is broken

### Integration Tests Needed
1. Create match → Verify in LiveStore
2. Setup players → Verify matchSetup event
3. Start game → Verify gameStarted event
4. Score rally → Verify rallyWon event + score update
5. Undo rally → Verify rallyUndone event + score restore
6. Complete game → Verify gameCompleted event
7. Complete match → Verify matchCompleted event

---

## Known Issues

### Type Errors in LiveStoreMatchContext
- Event type assertions failing
- Need to simplify event inspection
- Consider using XState actions directly instead

### Store Type in Machine Input
- Currently `store?: any`
- Should type properly as `Store` from LiveStore
- May need to import type from `@livestore/livestore`

---

## Questions for Phase 2

1. **Event Emission Strategy**: 
   - Inspect XState events and emit LiveStore events?
   - Or emit LiveStore events directly from XState actions?
   - **Recommendation**: Direct emission from actions (simpler, more explicit)

2. **State Initialization**:
   - Load state from LiveStore queries on mount?
   - Or replay events like current Dexie approach?
   - **Recommendation**: Query-based (LiveStore handles event replay)

3. **Activity Grid**:
   - Keep in XState transient state?
   - Or persist to LiveStore gameUiState?
   - **Recommendation**: XState transient (UI-only, not critical data)

---

**Ready to proceed with Phase 2!** 🚀
