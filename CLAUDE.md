# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Score-Keeper is a doubles squash scoring application implementing PAR-15 rules with real-time sync.

**Tech Stack:** React 19, TypeScript, TanStack Router/Query/Start, XState v5, LiveStore (event sourcing), Tailwind CSS v4 + DaisyUI, Cloudflare Workers/D1, Auth0, Vite, Vitest

## Commands

```bash
pnpm dev          # Run Vite dev server (3000) + Wrangler backend (8787)
pnpm build        # Lint + build to dist/
pnpm test         # Vitest (no watch)
pnpm lint         # ESLint (max 100 warnings)
pnpm check        # Prettier write + ESLint fix
```

## Architecture

```
Routes (TanStack Router) → Components (React) → State Machines (XState)
                                              → LiveStore (event sourcing → SQLite)
                                              → Cloudflare Worker (WebSocket sync)
```

### Key Directories

- `src/routes/` - File-based routing (match.$matchId.game.$gameNumber.tsx is main game UI)
- `src/machines/` - XState v5 machines (squashGameMachine handles scoring, matchMachine handles flow)
- `src/livestore/` - Event sourcing: events.ts, materializers.ts, *-queries.ts
- `src/components/game/` - Scoring UI (ScoreTable → ScoreGrid → TeamRows → ScoreRow → ScoreCell)
- `src/cf-worker/` - Cloudflare Worker backend for WebSocket sync

### Data Flow

1. User action → XState event (e.g., `RALLY_WON`)
2. Machine action emits LiveStore event (e.g., `events.rallyWon(...)`)
3. Materializer updates SQLite tables
4. Reactive queries push updates to components

### LiveStore Pattern

- **Events** (`src/livestore/events.ts`): Immutable records (rallyWon, rallyUndone, etc.)
- **Tables** (`src/livestore/tables.ts`): SQLite schemas (matches, games, rallies)
- **Materializers** (`src/livestore/materializers.ts`): Event handlers that update tables
- **Queries** (`src/livestore/squash-queries.ts`): Reactive queries with `$` suffix (e.g., `gameById$`)

## TypeScript Conventions

- Use type aliases, not interfaces (`@typescript-eslint/consistent-type-definitions`)
- Path alias: `@/*` maps to `./src/*`
- Strict mode enabled

## Scoring Rules

PAR-15 doubles squash rules are documented in `instructions.md`. Key state:
- `currentServerTeam`, `currentServerPlayer` (1|2), `currentServerSide` (R|L)
- `currentServerHandIndex` (0=first hand, 1=second hand)
- Rally won by serving team → same server, flip side
- Rally lost → partner serves (handIndex++) or handout to other team

## Adding Features

1. **New event**: `src/livestore/events.ts`
2. **Handle event**: `src/livestore/materializers.ts`
3. **Query data**: `src/livestore/squash-queries.ts`
4. **UI state**: `src/machines/squashGameMachine.ts`
5. **Components**: `src/components/game/`
