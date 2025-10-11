# Refactoring Remaining Work

## Overview
We've successfully refactored the core architecture to use LiveStore as the single source of truth, with a pure UI state machine. The following files still need to be updated to work with the new architecture.

## Completed ✅

1. **matchMachine** - Now only stores `matchId` and `currentGameId`
2. **LiveStoreMatchContext** - Simplified to thin provider
3. **Deleted obsolete code:**
   - StateReconstructor
   - EventStore
   - EventSourcedMatchContext
   - useMatchEvents
   - useMatchSelectors
   - matchManager
4. **Fixed simple routes:**
   - `src/routes/index.tsx`
   - `src/routes/matches.tsx`

## Files That Need Fixing

### 🔴 HIGH PRIORITY - Routes (Broken)

#### 1. `src/routes/match.$matchId.setup.tsx` (620 lines)

**Current Issues:**
- Lines 52-54: Reads `players`, `teamAFirstServer`, `teamBFirstServer` from machine context
- Lines 173-178: Sends old `SETUP_MATCH` event to machine
- Lines 181-184: Sends old `START_NEW_GAME` event to machine

**Required Changes:**
```typescript
// OLD - Reading from machine context
const matchData = actor
  ? {
      players: actor.getSnapshot().context.players,
      teamAFirstServer: actor.getSnapshot().context.teamAFirstServer,
      teamBFirstServer: actor.getSnapshot().context.teamBFirstServer,
    }
  : { /* defaults */ }

// NEW - Query LiveStore
const { store } = useStore()
const match = store.useQuery(matchById$(matchId))

// OLD - Sending to machine
actor.send({
  type: 'SETUP_MATCH',
  players,
  teamAFirstServer: parsed.teamAFirstServer,
  teamBFirstServer: parsed.teamBFirstServer,
})

// NEW - Emit to LiveStore
store.commit(
  events.matchSetup({
    matchId,
    playerA1: { firstName: A1.firstName, lastName: A1.lastName },
    playerA2: { firstName: A2.firstName, lastName: A2.lastName },
    playerB1: { firstName: B1.firstName, lastName: B1.lastName },
    playerB2: { firstName: B2.firstName, lastName: B2.lastName },
    teamAFirstServer: parsed.teamAFirstServer,
    teamBFirstServer: parsed.teamBFirstServer,
    timestamp: new Date(),
  })
)

// OLD - Starting game via machine
actor.send({
  type: 'START_NEW_GAME',
  firstServingTeam: parsed.firstServingTeam,
})

// NEW - Emit to LiveStore + update machine UI state
const gameId = crypto.randomUUID()
store.commit(
  events.gameStarted({
    gameId,
    matchId,
    gameNumber: 1,
    firstServingTeam: parsed.firstServingTeam,
    firstServingPlayer: 1,
    firstServingSide: 'R',
    maxPoints: 15,
    winBy: 1,
    timestamp: new Date(),
  })
)
actor.send({ type: 'START_GAME', gameId })
```

---

#### 2. `src/routes/match.$matchId.game.$gameId.tsx`

**Current Issues:**
- Line 18: Imports `GameResult` type that no longer exists
- Lines 201, 229: Sends `GAME_COMPLETED` event with `winner` and `finalScore` (not in new event type)
- Line 246: Sends `START_NEW_GAME` event (should be `START_GAME`)

**Required Changes:**
```typescript
// Remove import
import type { GameResult } from '../machines/matchMachine' // DELETE

// OLD - Machine event
actor.send({
  type: 'GAME_COMPLETED',
  winner,
  finalScore: { A: scoreA, B: scoreB },
})

// NEW - LiveStore event + machine UI state
store.commit(
  events.gameCompleted({
    gameId,
    matchId,
    winner,
    finalScoreA: scoreA,
    finalScoreB: scoreB,
    timestamp: new Date(),
  })
)
actor.send({ type: 'GAME_COMPLETED', gameId })

// Check if match is complete by querying LiveStore
const games = store.query(gamesByMatch$(matchId))
const gamesWonA = games.filter(g => g.winner === 'A').length
const gamesWonB = games.filter(g => g.winner === 'B').length
const isMatchComplete = gamesWonA >= 3 || gamesWonB >= 3

if (isMatchComplete) {
  actor.send({ type: 'END_MATCH' })
}
```

---

#### 3. `src/routes/match.$matchId.summary.tsx`

**Current Issues:**
- Lines 17-18: Reads `games` and `players` from machine context

**Required Changes:**
```typescript
// OLD
const games = actor.getSnapshot().context.games
const players = actor.getSnapshot().context.players

// NEW
const { store } = useStore()
const games = store.useQuery(gamesByMatch$(matchId))
const match = store.useQuery(matchById$(matchId))
const players = {
  A1: {
    firstName: match.playerA1FirstName,
    lastName: match.playerA1LastName,
    fullName: `${match.playerA1FirstName} ${match.playerA1LastName}`,
  },
  // ... etc for A2, B1, B2
}
```

---

### 🟡 MEDIUM PRIORITY - Components

#### 4. `src/components/game/MatchSummary.tsx`

**Issues:** Reads `context.games` and `context.players`

**Fix:** Query LiveStore instead:
```typescript
const { store } = useStore()
const games = store.useQuery(gamesByMatch$(matchId))
const match = store.useQuery(matchById$(matchId))
```

---

#### 5. `src/components/game/ScoreHeader.tsx`

**Issues:** Reads `context.games` from machine

**Fix:** Pass games as props from parent that queries LiveStore, or query directly in component

---

#### 6. `src/components/game/MatchProgress.tsx`

**Issues:**
- Imports `GameResult` type (deleted)
- Reads `context.games` and `context.players`

**Fix:** Query LiveStore + remove GameResult import

---

## New Architecture Pattern

### For Routes That Start Games:

```typescript
import { useStore } from '@livestore/react'
import { events } from '../livestore/schema'
import { useLiveStoreMatch } from '../contexts/LiveStoreMatchContext'

function MyRoute() {
  const { matchId } = Route.useParams()
  const { store } = useStore()
  const { actor } = useLiveStoreMatch()
  
  // Query data from LiveStore
  const match = store.useQuery(matchById$(matchId))
  const games = store.useQuery(gamesByMatch$(matchId))
  
  const startNewGame = (firstServingTeam: Team) => {
    const gameId = crypto.randomUUID()
    const gameNumber = games.length + 1
    
    // 1. Emit to LiveStore
    store.commit(
      events.gameStarted({
        gameId,
        matchId,
        gameNumber,
        firstServingTeam,
        firstServingPlayer: 1,
        firstServingSide: 'R',
        maxPoints: 15,
        winBy: 1,
        timestamp: new Date(),
      })
    )
    
    // 2. Update machine UI state
    actor.send({ type: 'START_GAME', gameId })
    
    // 3. Navigate
    navigate({ to: '/match/$matchId/game/$gameId', params: { matchId, gameId } })
  }
}
```

### For Components That Display Data:

```typescript
import { useStore } from '@livestore/react'
import { gamesByMatch$, matchById$ } from '../livestore/squash-queries'

function MyComponent({ matchId }: { matchId: MatchId }) {
  const { store } = useStore()
  
  // Query LiveStore - reactive, updates automatically
  const match = store.useQuery(matchById$(matchId))
  const games = store.useQuery(gamesByMatch$(matchId))
  
  // Use the data directly
  return (
    <div>
      {games.map(game => (
        <div key={game.id}>
          Game {game.gameNumber}: {game.scoreA} - {game.scoreB}
        </div>
      ))}
    </div>
  )
}
```

## Testing Strategy

After fixing each route:
1. Run `npx tsc --noEmit` to check types
2. Test the specific route in the browser
3. Verify LiveStore events are being emitted
4. Verify UI state machine transitions correctly
5. Commit the fix before moving to next file

## Order of Implementation

1. ✅ Setup foundation (completed)
2. 🔄 Fix `match.$matchId.setup.tsx` (template for others)
3. Fix `match.$matchId.game.$gameId.tsx`
4. Fix `match.$matchId.summary.tsx`
5. Fix components (MatchSummary, ScoreHeader, MatchProgress)
6. Final testing and cleanup

## Key Principles

- **LiveStore is the source of truth** - All data comes from LiveStore queries
- **Machine is for UI state only** - Just tracks which game is active
- **Emit events to LiveStore** - Not to the machine (except UI state changes)
- **Query, don't store** - Components query LiveStore, don't read from machine context
