# LiveStore Refactoring Plan

**Date:** 2025-10-08  
**Goal:** Migrate squash score-keeper from Dexie to LiveStore as the source of truth for data persistence

---

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [Domain Model Analysis](#domain-model-analysis)
3. [Proposed LiveStore Architecture](#proposed-livestore-architecture)
4. [Key Design Decisions](#key-design-decisions)
5. [Detailed Implementation Plan](#detailed-implementation-plan)
6. [Migration Phases](#migration-phases)
7. [Testing Strategy](#testing-strategy)

---

## Current Architecture

### Current State

**Database Layer (Dexie):**
- `matches` table - Match metadata and player names
- `events` table - Event log for event sourcing
- `snapshots` table - Periodic XState snapshots for performance

**State Management:**
- **XState machines**: 
  - `matchMachine` (parent) - Manages overall match flow
  - `squashMachine` (child) - Manages individual game state
- **Event sourcing**: Custom implementation with event store
- **State reconstruction**: Replay events from Dexie to rebuild XState state
- **Persistence**: XState snapshots saved to Dexie every 20 events

**Key Files:**
- `src/db/schema.ts` - Dexie database schema
- `src/db/eventStore.ts` - Event append and retrieval
- `src/db/matchManager.ts` - Match CRUD operations
- `src/db/stateReconstructor.ts` - Rebuild XState from events
- `src/contexts/EventSourcedMatchContext.tsx` - React context provider

### Current Event Flow

```
User Action → XState Event → XState Inspector → Dexie Event Store
                                                        ↓
                                                  Periodic Snapshot
                                                        ↓
On Load: Dexie Events → State Reconstructor → XState Actor
```

---

## Domain Model Analysis

### Core Entities

#### 1. Match
- **Purpose**: Container for a best-of-5 squash doubles match
- **Properties**:
  - `id` (MatchId) - UUID
  - `status` - 'active' | 'completed' | 'archived'
  - `createdAt`, `updatedAt` - Timestamps
  - `playerNames` - Array of 4 player names
  - `currentSeq` - Event sequence number
  - Players: A1, A2, B1, B2 (with firstName, lastName, fullName)
  - Team first servers: teamAFirstServer, teamBFirstServer (1 or 2)

#### 2. Game
- **Purpose**: Individual game within a match (up to 5 games)
- **Properties**:
  - `gameNumber` - 1-5
  - `status` - 'in_progress' | 'completed'
  - `winner` - Team 'A' | 'B' | null
  - `finalScore` - { A: number, B: number } | null
  - `score` - Current score during play
  - `server` - { team, player, side, handIndex }
  - `grid` - Activity grid (serves and rallies)
  - `firstHandUsed` - Boolean for first-hand exception rule
  - `maxPoints` - Usually 15
  - `winBy` - Usually 1

#### 3. Rally
- **Purpose**: Individual point/serve within a game
- **Properties**:
  - Rally winner (Team A or B)
  - Server state at time of rally
  - Timestamp
  - Sequence within game

### Current XState Events

**Match-level events:**
- `SETUP_MATCH` - Configure players and first servers
- `START_NEW_GAME` - Begin a new game
- `GAME_COMPLETED` - Game finished with winner
- `END_MATCH` - Manually end match
- `RESET` - Reset to idle

**Game-level events:**
- `SETUP_TEAMS` - Assign player names
- `START_GAME` - Initialize game with first server
- `RALLY_WON` - Rally outcome (winner: Team)
- `CLICK_ROW` - Pre-fill serve indicator (R/L)
- `TOGGLE_SERVE_SIDE` - Toggle R/L before serve
- `LET` - Let stroke (no-op currently)
- `UNDO` - Undo last rally
- `CONFIRM_GAME_OVER` - Confirm game completion
- `RESET` - Reset game

---

## Proposed LiveStore Architecture

### 1. LiveStore Schema (SQLite Tables)

```typescript
// src/livestore/squash-schema.ts

export const tables = {
  // Match metadata
  matches: State.SQLite.table({
    name: 'matches',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      status: State.SQLite.text({ default: 'active' }), // 'active' | 'completed' | 'archived'
      createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      updatedAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      // Players
      playerA1FirstName: State.SQLite.text({ default: '' }),
      playerA1LastName: State.SQLite.text({ default: '' }),
      playerA2FirstName: State.SQLite.text({ default: '' }),
      playerA2LastName: State.SQLite.text({ default: '' }),
      playerB1FirstName: State.SQLite.text({ default: '' }),
      playerB1LastName: State.SQLite.text({ default: '' }),
      playerB2FirstName: State.SQLite.text({ default: '' }),
      playerB2LastName: State.SQLite.text({ default: '' }),
      // First servers
      teamAFirstServer: State.SQLite.integer({ default: 1 }), // 1 or 2
      teamBFirstServer: State.SQLite.integer({ default: 1 }), // 1 or 2
    },
  }),

  // Individual games within matches
  games: State.SQLite.table({
    name: 'games',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      matchId: State.SQLite.text(),
      gameNumber: State.SQLite.integer(),
      status: State.SQLite.text({ default: 'in_progress' }), // 'in_progress' | 'completed'
      scoreA: State.SQLite.integer({ default: 0 }),
      scoreB: State.SQLite.integer({ default: 0 }),
      winner: State.SQLite.text({ nullable: true }), // 'A' | 'B' | null
      maxPoints: State.SQLite.integer({ default: 15 }),
      winBy: State.SQLite.integer({ default: 1 }),
      createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      completedAt: State.SQLite.integer({ nullable: true, schema: Schema.DateFromNumber }),
    },
  }),

  // Rally history for statistics and replay
  rallies: State.SQLite.table({
    name: 'rallies',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      gameId: State.SQLite.text(),
      rallyNumber: State.SQLite.integer(),
      winner: State.SQLite.text(), // 'A' | 'B'
      serverTeam: State.SQLite.text(),
      serverPlayer: State.SQLite.integer(), // 1 or 2
      serverSide: State.SQLite.text(), // 'R' | 'L'
      serverHandIndex: State.SQLite.integer(), // 0 or 1
      scoreABefore: State.SQLite.integer(),
      scoreBBefore: State.SQLite.integer(),
      scoreAAfter: State.SQLite.integer(),
      scoreBAfter: State.SQLite.integer(),
      timestamp: State.SQLite.integer({ schema: Schema.DateFromNumber }),
    },
  }),

  // Current game UI state (transient, not synced)
  gameUiState: State.SQLite.clientDocument({
    name: 'gameUiState',
    schema: Schema.Struct({
      matchId: Schema.String,
      currentGameId: Schema.NullOr(Schema.String),
      // Activity grid stored as JSON for now
      activityGrid: Schema.optional(Schema.Unknown),
      // Server state
      currentServer: Schema.optional(Schema.Struct({
        team: Schema.Literal('A', 'B'),
        player: Schema.Literal(1, 2),
        side: Schema.Literal('R', 'L'),
        handIndex: Schema.Literal(0, 1),
      })),
      firstHandUsed: Schema.Boolean,
    }),
    default: {
      id: SessionIdSymbol,
      value: {
        matchId: '',
        currentGameId: null,
        firstHandUsed: false,
      },
    },
  }),
}
```

### 2. LiveStore Events

**Match-level events:**

```typescript
export const events = {
  // Match lifecycle
  matchCreated: Events.synced({
    name: 'v1.MatchCreated',
    schema: Schema.Struct({
      matchId: Schema.String,
      playerNames: Schema.Array(Schema.String),
      timestamp: Schema.Date,
    }),
  }),

  matchSetup: Events.synced({
    name: 'v1.MatchSetup',
    schema: Schema.Struct({
      matchId: Schema.String,
      playerA1: Schema.Struct({
        firstName: Schema.String,
        lastName: Schema.String,
      }),
      playerA2: Schema.Struct({
        firstName: Schema.String,
        lastName: Schema.String,
      }),
      playerB1: Schema.Struct({
        firstName: Schema.String,
        lastName: Schema.String,
      }),
      playerB2: Schema.Struct({
        firstName: Schema.String,
        lastName: Schema.String,
      }),
      teamAFirstServer: Schema.Literal(1, 2),
      teamBFirstServer: Schema.Literal(1, 2),
      timestamp: Schema.Date,
    }),
  }),

  matchCompleted: Events.synced({
    name: 'v1.MatchCompleted',
    schema: Schema.Struct({
      matchId: Schema.String,
      winner: Schema.Literal('A', 'B'),
      timestamp: Schema.Date,
    }),
  }),

  matchArchived: Events.synced({
    name: 'v1.MatchArchived',
    schema: Schema.Struct({
      matchId: Schema.String,
      timestamp: Schema.Date,
    }),
  }),

  // Game lifecycle
  gameStarted: Events.synced({
    name: 'v1.GameStarted',
    schema: Schema.Struct({
      gameId: Schema.String,
      matchId: Schema.String,
      gameNumber: Schema.Number,
      firstServingTeam: Schema.Literal('A', 'B'),
      firstServingPlayer: Schema.Literal(1, 2),
      firstServingSide: Schema.Literal('R', 'L'),
      maxPoints: Schema.Number,
      winBy: Schema.Number,
      timestamp: Schema.Date,
    }),
  }),

  gameCompleted: Events.synced({
    name: 'v1.GameCompleted',
    schema: Schema.Struct({
      gameId: Schema.String,
      matchId: Schema.String,
      winner: Schema.Literal('A', 'B'),
      finalScoreA: Schema.Number,
      finalScoreB: Schema.Number,
      timestamp: Schema.Date,
    }),
  }),

  // Rally events
  rallyWon: Events.synced({
    name: 'v1.RallyWon',
    schema: Schema.Struct({
      rallyId: Schema.String,
      gameId: Schema.String,
      rallyNumber: Schema.Number,
      winner: Schema.Literal('A', 'B'),
      serverTeam: Schema.Literal('A', 'B'),
      serverPlayer: Schema.Literal(1, 2),
      serverSide: Schema.Literal('R', 'L'),
      serverHandIndex: Schema.Literal(0, 1),
      scoreABefore: Schema.Number,
      scoreBBefore: Schema.Number,
      scoreAAfter: Schema.Number,
      scoreBAfter: Schema.Number,
      timestamp: Schema.Date,
    }),
  }),

  rallyUndone: Events.synced({
    name: 'v1.RallyUndone',
    schema: Schema.Struct({
      gameId: Schema.String,
      rallyId: Schema.String, // Rally to undo
      timestamp: Schema.Date,
    }),
  }),

  // UI state (client-only, not synced)
  gameUiStateSet: tables.gameUiState.set,
}
```

### 3. Materializers

```typescript
const materializers = State.SQLite.materializers(events, {
  'v1.MatchCreated': ({ matchId, playerNames, timestamp }) =>
    tables.matches.insert({
      id: matchId,
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
      // Players will be set in matchSetup
    }),

  'v1.MatchSetup': ({ matchId, playerA1, playerA2, playerB1, playerB2, teamAFirstServer, teamBFirstServer, timestamp }) =>
    tables.matches.update({
      playerA1FirstName: playerA1.firstName,
      playerA1LastName: playerA1.lastName,
      playerA2FirstName: playerA2.firstName,
      playerA2LastName: playerA2.lastName,
      playerB1FirstName: playerB1.firstName,
      playerB1LastName: playerB1.lastName,
      playerB2FirstName: playerB2.firstName,
      playerB2LastName: playerB2.lastName,
      teamAFirstServer,
      teamBFirstServer,
      updatedAt: timestamp,
    }).where({ id: matchId }),

  'v1.MatchCompleted': ({ matchId, timestamp }) =>
    tables.matches.update({
      status: 'completed',
      updatedAt: timestamp,
    }).where({ id: matchId }),

  'v1.MatchArchived': ({ matchId, timestamp }) =>
    tables.matches.update({
      status: 'archived',
      updatedAt: timestamp,
    }).where({ id: matchId }),

  'v1.GameStarted': ({ gameId, matchId, gameNumber, firstServingTeam, firstServingPlayer, firstServingSide, maxPoints, winBy, timestamp }) =>
    tables.games.insert({
      id: gameId,
      matchId,
      gameNumber,
      status: 'in_progress',
      scoreA: 0,
      scoreB: 0,
      winner: null,
      maxPoints,
      winBy,
      createdAt: timestamp,
      completedAt: null,
    }),

  'v1.GameCompleted': ({ gameId, winner, finalScoreA, finalScoreB, timestamp }) =>
    tables.games.update({
      status: 'completed',
      winner,
      scoreA: finalScoreA,
      scoreB: finalScoreB,
      completedAt: timestamp,
    }).where({ id: gameId }),

  'v1.RallyWon': ({ rallyId, gameId, rallyNumber, winner, serverTeam, serverPlayer, serverSide, serverHandIndex, scoreABefore, scoreBBefore, scoreAAfter, scoreBAfter, timestamp }) => [
    // Insert rally record
    tables.rallies.insert({
      id: rallyId,
      gameId,
      rallyNumber,
      winner,
      serverTeam,
      serverPlayer,
      serverSide,
      serverHandIndex,
      scoreABefore,
      scoreBBefore,
      scoreAAfter,
      scoreBAfter,
      timestamp,
    }),
    // Update game score
    tables.games.update({
      scoreA: scoreAAfter,
      scoreB: scoreBAfter,
    }).where({ id: gameId }),
  ],

  'v1.RallyUndone': ({ gameId, rallyId, timestamp }, ctx) => {
    // Query the rally to undo
    const rally = ctx.query(tables.rallies.where({ id: rallyId }).first())
    if (!rally) return []

    return [
      // Soft delete the rally (or mark as undone)
      tables.rallies.delete().where({ id: rallyId }),
      // Restore previous score
      tables.games.update({
        scoreA: rally.scoreABefore,
        scoreB: rally.scoreBBefore,
      }).where({ id: gameId }),
    ]
  },
})
```

### 4. LiveStore Queries

```typescript
// src/livestore/squash-queries.ts

import { queryDb } from '@livestore/livestore'
import { tables } from './squash-schema'

// Get match by ID
export const matchById$ = (matchId: string) =>
  queryDb(
    () => tables.matches.where({ id: matchId }).first(),
    { label: `match-${matchId}` }
  )

// Get all games for a match
export const gamesByMatch$ = (matchId: string) =>
  queryDb(
    () => tables.games.where({ matchId }).orderBy('gameNumber', 'asc'),
    { label: `games-${matchId}` }
  )

// Get current game for a match
export const currentGameByMatch$ = (matchId: string) =>
  queryDb(
    () => tables.games.where({ matchId, status: 'in_progress' }).first(),
    { label: `current-game-${matchId}` }
  )

// Get rallies for a game
export const ralliesByGame$ = (gameId: string) =>
  queryDb(
    () => tables.rallies.where({ gameId }).orderBy('rallyNumber', 'asc'),
    { label: `rallies-${gameId}` }
  )

// Get match summary (match + games)
export const matchSummary$ = (matchId: string) =>
  queryDb(
    (get) => {
      const match = get(matchById$(matchId))
      const games = get(gamesByMatch$(matchId))
      return { match, games }
    },
    { label: `match-summary-${matchId}` }
  )

// Get game UI state
export const gameUiState$ = queryDb(
  () => tables.gameUiState.get(),
  { label: 'gameUiState' }
)
```

---

## Key Design Decisions

### What LiveStore Stores (Persisted Data)

✅ **Match metadata** - Players, status, timestamps  
✅ **Game results** - Scores, winners, game numbers  
✅ **Rally history** - For statistics, replay, and undo  
✅ **Derived state** - Current scores (materialized from rallies)

### What XState Manages (Transient UI State)

✅ **Current UI state** - Which screen/modal to show  
✅ **Transient game state** - Activity grid display, server position  
✅ **Process flow** - State transitions and guards  
✅ **Input from LiveStore** - Receives initial state from queries

### Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                         User Action                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    XState Machine                            │
│  • Manages UI flow and transitions                           │
│  • Validates state transitions                               │
│  • Emits LiveStore events via actions                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ store.commit(event)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    LiveStore Events                          │
│  • Event log (append-only)                                   │
│  • Synced across devices                                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Materializers
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   SQLite State                               │
│  • Matches, Games, Rallies tables                            │
│  • Derived from events                                       │
│  • Queryable via reactive queries                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Reactive Queries
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  React Components                            │
│  • Display data from queries                                 │
│  • Trigger XState events                                     │
│  • Automatically re-render on data changes                   │
└─────────────────────────────────────────────────────────────┘
```

### Benefits of This Approach

1. **✅ Event Sourcing** - LiveStore handles this natively with eventlog
2. **✅ Multi-device Sync** - Built-in via Cloudflare Worker sync backend
3. **✅ Offline-first** - LiveStore handles offline queuing and sync
4. **✅ Reactive Queries** - No manual state reconstruction needed
5. **✅ Separation of Concerns** - XState for process, LiveStore for data
6. **✅ Type Safety** - Effect Schema for events and queries
7. **✅ Undo/Redo** - Event log enables time-travel debugging

### Trade-offs

- **Activity Grid Storage**: Store as JSON blob in client document vs. normalize into cells table
  - **Decision**: Start with JSON blob for simplicity, can normalize later if needed
- **Rally History**: Store every rally vs. only store final scores
  - **Decision**: Store every rally for statistics and undo functionality
- **XState Snapshots**: No longer needed, state derived from LiveStore
  - **Decision**: Remove snapshot logic entirely

---

## Detailed Implementation Plan

### Phase 1: Schema & Events Definition

**Goal**: Create LiveStore schema without touching existing code

**Tasks**:
1. ✅ Create `src/livestore/squash-schema.ts` with tables
2. ✅ Define all events matching XState events
3. ✅ Create materializers for each event
4. ✅ Create `src/livestore/squash-queries.ts` with reactive queries
5. ✅ Update `src/livestore/livestore.worker.ts` to use new schema
6. ✅ Test schema in isolation (create test file)

**Files to Create**:
- `src/livestore/squash-schema.ts`
- `src/livestore/squash-queries.ts`
- `src/livestore/__tests__/schema.test.ts` (optional)

**Files to Modify**:
- `src/livestore/livestore.worker.ts` - Import and use squash schema

**Success Criteria**:
- Schema compiles without errors
- Worker starts successfully
- Can commit test events and query results

---

### Phase 2: XState Integration

**Goal**: Modify XState machines to emit LiveStore events

**Tasks**:
1. ✅ Update `matchMachine` actions to emit LiveStore events
2. ✅ Update `squashMachine` actions to emit LiveStore events
3. ✅ Remove snapshot-related actions
4. ✅ Add `store` parameter to machine context/input
5. ✅ Test machines emit events correctly

**Files to Modify**:
- `src/machines/matchMachine.ts`
- `src/machines/squashMachine.ts`

**Example Change**:

```typescript
// BEFORE
actions: {
  rallyWon: assign(({ context }, { winner }) => {
    // ... complex state update logic
    return { score: nextScore, server: nextServer, grid }
  }),
}

// AFTER
actions: {
  rallyWon: ({ context, event }, params: { winner: Team, store: LiveStore }) => {
    const { winner, store } = params
    
    // Emit LiveStore event
    store.commit(events.rallyWon({
      rallyId: crypto.randomUUID(),
      gameId: context.gameId!,
      rallyNumber: context.rallyNumber + 1,
      winner,
      serverTeam: context.server.team,
      serverPlayer: context.server.player,
      serverSide: context.server.side,
      serverHandIndex: context.server.handIndex,
      scoreABefore: context.score.A,
      scoreBBefore: context.score.B,
      scoreAAfter: winner === 'A' ? context.score.A + 1 : context.score.A,
      scoreBAfter: winner === 'B' ? context.score.B + 1 : context.score.B,
      timestamp: new Date(),
    }))
    
    // XState still manages transient UI state
    // (activity grid, current server position, etc.)
  },
}
```

**Success Criteria**:
- XState machines compile without errors
- Events are emitted to LiveStore when actions fire
- Materializers update SQLite tables correctly

---

### Phase 3: Context & Queries Refactoring

**Goal**: Replace Dexie-based state reconstruction with LiveStore queries

**Tasks**:
1. ✅ Create new `src/contexts/LiveStoreMatchContext.tsx`
2. ✅ Use LiveStore queries to fetch match/game data
3. ✅ Initialize XState machines with data from queries
4. ✅ Remove event reconstruction logic
5. ✅ Update components to use new context

**Files to Create**:
- `src/contexts/LiveStoreMatchContext.tsx`

**Files to Modify**:
- `src/routes/match/$matchId/setup.tsx`
- `src/routes/match/$matchId/game.tsx`
- All game components

**Example Context**:

```typescript
// src/contexts/LiveStoreMatchContext.tsx

export const LiveStoreMatchProvider = ({ matchId, children }) => {
  const { store } = useStore()
  
  // Query match data from LiveStore
  const match = store.useQuery(matchById$(matchId))
  const currentGame = store.useQuery(currentGameByMatch$(matchId))
  const games = store.useQuery(gamesByMatch$(matchId))
  
  // Initialize XState machine with LiveStore data
  const [actor, setActor] = useState<ActorRefFrom<typeof matchMachine> | null>(null)
  
  useEffect(() => {
    if (!match) return
    
    // Create actor with initial state from LiveStore
    const newActor = createActor(matchMachine, {
      input: {
        matchId: match.id,
        store, // Pass store to machine
      },
    })
    
    // If match is already set up, send SETUP_MATCH event
    if (match.playerA1FirstName) {
      newActor.send({
        type: 'SETUP_MATCH',
        players: {
          A1: { firstName: match.playerA1FirstName, lastName: match.playerA1LastName, fullName: `${match.playerA1FirstName} ${match.playerA1LastName}` },
          // ... other players
        },
        teamAFirstServer: match.teamAFirstServer,
        teamBFirstServer: match.teamBFirstServer,
      })
    }
    
    newActor.start()
    setActor(newActor)
    
    return () => newActor.stop()
  }, [match, store])
  
  return (
    <LiveStoreMatchContext.Provider value={{ actor, match, currentGame, games }}>
      {children}
    </LiveStoreMatchContext.Provider>
  )
}
```

**Success Criteria**:
- Match data loads from LiveStore
- XState machines initialize with correct state
- Components display data correctly
- No Dexie dependencies in new code

---

### Phase 4: Component Updates

**Goal**: Update all components to use LiveStore queries

**Tasks**:
1. ✅ Update `ScoreHeader` to query game data
2. ✅ Update `ScoreGrid` to query rally history
3. ✅ Update `MatchProgress` to query games
4. ✅ Update `MatchSummary` to query match summary
5. ✅ Remove any direct Dexie usage

**Files to Modify**:
- `src/components/game/ScoreHeader.tsx`
- `src/components/game/ScoreGrid.tsx`
- `src/components/game/MatchProgress.tsx`
- `src/components/game/MatchSummary.tsx`
- All other game components

**Example Component Update**:

```typescript
// BEFORE
const { actor } = useEventSourcedMatch()
const snapshot = useSelector(actor, (state) => state.context)

// AFTER
const { store } = useStore()
const { actor, currentGame } = useLiveStoreMatch()
const rallies = store.useQuery(ralliesByGame$(currentGame?.id ?? ''))
```

**Success Criteria**:
- All components render correctly
- Data updates reactively
- No console errors

---

### Phase 5: Cleanup & Removal

**Goal**: Remove all Dexie code and old event store

**Tasks**:
1. ✅ Delete `src/db/schema.ts`
2. ✅ Delete `src/db/eventStore.ts`
3. ✅ Delete `src/db/matchManager.ts`
4. ✅ Delete `src/db/stateReconstructor.ts`
5. ✅ Delete `src/db/types.ts`
6. ✅ Delete `src/contexts/EventSourcedMatchContext.tsx`
7. ✅ Remove Dexie from `package.json`
8. ✅ Update imports throughout codebase

**Files to Delete**:
- `src/db/` (entire directory)
- `src/contexts/EventSourcedMatchContext.tsx`

**Files to Modify**:
- `package.json` - Remove `dexie` dependency
- All files importing from deleted files

**Success Criteria**:
- No Dexie imports remain
- App compiles without errors
- All features work correctly

---

## Migration Phases

### Phase 1: Parallel Implementation (Week 1)
- ✅ Create LiveStore schema alongside existing Dexie
- ✅ Create queries and test in isolation
- ✅ Keep existing code working

### Phase 2: XState Integration (Week 1-2)
- ✅ Modify XState machines to emit LiveStore events
- ✅ Keep Dexie for reading, LiveStore for writing
- ✅ Validate events are persisted correctly

### Phase 3: Context Migration (Week 2)
- ✅ Create new LiveStore-based context
- ✅ Migrate routes one at a time
- ✅ Keep old context as fallback

### Phase 4: Component Migration (Week 2-3)
- ✅ Update components to use LiveStore queries
- ✅ Test each component thoroughly
- ✅ Ensure no regressions

### Phase 5: Cleanup (Week 3)
- ✅ Remove Dexie code
- ✅ Remove old context
- ✅ Clean up imports
- ✅ Final testing

---

## Testing Strategy

### Unit Tests
- ✅ Test materializers with mock events
- ✅ Test queries return expected data
- ✅ Test XState machines emit correct events

### Integration Tests
- ✅ Test full rally flow (user action → event → materialization → query)
- ✅ Test game completion flow
- ✅ Test match completion flow
- ✅ Test undo functionality

### Manual Testing Checklist
- [ ] Create new match
- [ ] Set up players
- [ ] Play complete game
- [ ] Undo rally
- [ ] Complete game
- [ ] Start new game
- [ ] Complete match
- [ ] View match history
- [ ] Archive match
- [ ] Sync across devices (if sync enabled)

### Canary Test
- ✅ **TODO List** - Keep existing TODO functionality as a canary
  - Located in `src/routes/index.tsx`
  - Uses separate schema in `src/livestore/schema.ts`
  - If TODO breaks, LiveStore integration is broken
  - Serves as working reference implementation

---

## Important Notes

### Activity Grid Considerations

The activity grid (`grid: ActivityGrid`) is complex:
- Tracks serves (R/L) for each player
- Tracks hand-outs (/) for each player
- Tracks X marks for receiving team

**Options**:
1. **Store as JSON blob** in `gameUiState` (client document)
   - ✅ Simple to implement
   - ✅ Preserves exact XState structure
   - ❌ Not queryable
   - ❌ Not normalized

2. **Normalize into cells table**
   - ✅ Queryable and analyzable
   - ✅ Proper relational structure
   - ❌ Complex to reconstruct
   - ❌ More tables and events

**Recommendation**: Start with JSON blob, normalize later if needed for analytics.

### Undo Functionality

LiveStore's event log enables powerful undo:
- Store every rally as an event
- Undo = emit `rallyUndone` event
- Materializer restores previous score
- Can implement multi-level undo easily

### Sync Considerations

LiveStore sync is automatic, but consider:
- **Conflict resolution**: Last-write-wins by default
- **Match ownership**: Consider adding `ownerId` to matches
- **Real-time scoring**: Multiple devices can score same match
- **Offline mode**: Events queue and sync when online

---

## Next Steps

1. **Review this plan** - Discuss any concerns or questions
2. **Start Phase 1** - Create LiveStore schema
3. **Test in isolation** - Validate schema and materializers
4. **Proceed incrementally** - One phase at a time
5. **Keep TODO as canary** - Monitor for regressions

---

## Questions to Resolve

1. **Activity Grid**: JSON blob or normalize? → **Decision: JSON blob initially**
2. **Rally History**: How much detail to store? → **Decision: Full rally details for undo/stats**
3. **Sync Strategy**: Enable multi-device sync immediately? → **Decision: TBD based on requirements**
4. **Migration Path**: Big bang or incremental? → **Decision: Incremental (phases above)**
5. **Undo Depth**: Limit undo history? → **Decision: Unlimited initially, can add limit later**

---

## Resources

- [LiveStore Docs](https://docs.livestore.dev/)
- [LiveStore + React Guide](https://docs.livestore.dev/getting-started/react-web/)
- [Event Sourcing in LiveStore](https://docs.livestore.dev/evaluation/event-sourcing/)
- [State Machines Pattern](https://docs.livestore.dev/patterns/state-machines/)
- [Materializers Reference](https://docs.livestore.dev/reference/state/materializers/)
- [Effect Schema](https://effect.website/docs/schema/introduction)

---

**Last Updated**: 2025-10-08  
**Status**: Planning Phase  
**Next Action**: Review plan and begin Phase 1
