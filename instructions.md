Doubles Squash Scoring — LLM Rules

Goal

Maintain the full scoring state for a doubles squash game (PAR-15) given user actions and/or a score-sheet–style notation. For each rally, update state, produce the correct referee call, and the notations to write into the sheet.

⸻

Core Concepts & Vocabulary
• Teams: A, B.
• Players (per team): row 1 (e.g., A1), row 2 (A2), then B1, B2. Display top→bottom as A1, A2, B1, B2.
• PAR scoring: Point-a-rally to 15 (configurable). Every rally produces exactly one point for the winning team, independent of who served.
• Columns: numbered 0..15 (or more if win-by-2). A team’s column index equals that team’s current score at the moment the serve is taken.
• E.g., if Team B has 3 points, a serve taken by Team B is written in column 3.
• Service boxes: R (right), L (left). Server must alternate boxes after every successful serve by the same server.
• Notation per cell (in a player’s activity row at a given column):
• R or L → that player served from that side and their team won the rally.
• R/ or L/ → that player served from that side and their team lost the rally (slash = loss).
• Team merged “X”: write X in the winner’s team column when the receiving team wins but the serving team still has a remaining server in this hand (i.e., we cannot write an R/L in the receiver’s row yet because they are not serving next). “X” advances score bookkeeping without changing the current serving team for the next rally.
• First hand exception (start of game): At 0–0, only the first listed player of the initial serving team serves (e.g., A1). The partner (A2) is not allowed to serve in that first hand. Conventionally, mark A1: R/ (if they lose) and A2: / at col 0.

⸻

Server Rotation Rules 1. Initial: A1 serves at 0–0 on the side they choose (typically R). Only A1 can serve in that initial hand. If A1 loses, hand-out to Team B immediately. 2. During a hand (after first hand):
• If current server wins: same player serves next rally from the opposite side at the next column (team score +1). Write R or L (no slash).
• If current server loses: write R/ or L/, then:
• If their partner has not served in this hand yet at the same column, service passes to the partner, who serves next rally from the opposite box (relative to the losing server’s last box). Team score did not change for the server’s team.
• If both partners on the serving team have now lost at this column, it’s hand-out: service changes to the other team at their current score column. 3. When the receiving team wins:
• If the serving team still has another server to use in this hand: write X in the receiving team’s merged cell at the new score column; service stays with the original team and moves down to the partner (or wraps top→bottom).
• If the serving team has no server left in this hand: hand-out to the receiving team; do not write X; the receiving team will write R/L on their next serve at their new score column. 4. “Move down on slash”: When you see a slash (/) on a serve, the next server is the next player row down (wrap B2 → A1), because a slash means that server’s team lost that rally.

⸻

Column & Write Rules (sheet semantics)
• Write R/L at the moment of serve in that team’s current score column.
• Write a trailing / on that R/L only if the server’s team lost that rally.
• Write X in the winner’s team column only when:
• The winner was receiving, and
• The serving team still retains service via its partner (i.e., not a hand-out).
• Never write X when a point is won by the team that serves next (because they will write R/L in their own player cell).
• First hand: if the initial server loses at 0–0, mark partner with / in col 0 to note they did not serve in that first hand.

⸻

Referee Call Format (recommended)

On each rally resolution, announce:

<new score as "A–B" with server’s score first>
[optional: "Hand-out" or "Second hand"]
<Next server name/team>, <box: Right|Left>.
Optional: "Game ball" at 14 for PAR-15.

Examples:
• “Three–one. Second hand. Bob to serve. Left side.”
• “Five–all. Hand-out. Alvin to serve. Right side.”
• “Fourteen–nine. Game ball. Alvin to serve. Left side.”

⸻

State Model (suggested)

type Team = "A" | "B";
type Player = 1 | 2; // 1 = top row, 2 = second row
type Side = "R" | "L";
type Cell = "" | "R" | "L" | "R/" | "L/" | "X";

interface Server {
team: Team;
player: Player; // 1 or 2
side: Side; // next side to serve from
}

interface Score { A: number; B: number; }

interface ActivityGrid {
A1: Cell[]; A2: Cell[]; B1: Cell[]; B2: Cell[];
}

interface Ctx {
maxPoints: number; // default 15
winBy: number; // default 0 (set 2 if needed)
score: Score; // current score
server: Server; // who serves next and from which side
handIndex: 0 | 1; // 0 = first hand within team, 1 = second hand
firstHandUsed: boolean; // only relevant at 0–0 for initial team
grid: ActivityGrid; // sheet cells
}

⸻

Inputs the LLM Will Receive
• One of: 1. Rally result: { rallyWinner: "A" | "B" } (from UI button), or 2. A sheet write being proposed (e.g., “Beth R/ in B col 3”) to interpret/validate, or 3. Administrative events: LET (replay), STROKE(to), UNDO, NEXT_GAME, corrections like SET_SIDE, SWAP_SERVER.

⸻

Outputs the LLM Must Produce Per Rally
• Updated score, updated server (with correct next side), handIndex, and exact sheet writes for that rally:
• Player write(s): R, L, R/, L/
• Team merged X (if applicable)
• A single concise referee call string.
• Any warnings if a proposed write violates the rules (e.g., non-alternating side, wrong column, writing X when hand-out should happen).

Return shape (example):

{
writes: [
{ row: "B1", col: 3, value: "R/" },
{ row: "A", col: 1, value: "X" } // merged team cell
],
score: { A: 1, B: 3 },
nextServer: { team: "B", player: 2, side: "L" },
handIndex: 1,
refCall: "Three–one. Second hand. Bob to serve. Left side."
}

⸻

Deterministic Logic the LLM Must Follow 1. Column calculation
• Serving team’s column = score[servingTeam] at the instant of serve.
• If serving team wins:
• Write R or L in the server’s row at that column.
• Increment that team’s score.
• Same server continues next rally from flipped side.
• If serving team loses:
• Write R/ or L/ in the server’s row at that column.
• If handIndex === 0 and not the very first hand at 0–0 → pass to partner (same team, opposite side), handIndex = 1.
• If handIndex === 1 → hand-out to the other team; set handIndex = 0 for that new team.
• If the receiving team won and it is NOT a hand-out (partner still to serve) → write X in winner’s merged team cell at their new column (score[winner] + 1), increment winner’s score.
• If it IS a hand-out → do not write X; the new serving team will write R/L on their upcoming serve. 2. First hand at 0–0
• Only the first listed player (e.g., A1) may serve.
• If they lose, hand-out immediately; mark partner "/" in col 0 (convention). 3. Alternate sides
• A server must alternate R ↔ L each time they win and continue serving.
• When a team changes server (to partner), that partner starts from the opposite side of the previous serve in this hand (consistent with the rotation). 4. X usage rule (strict)
• Write X only when the receiving team wins and the current team remains serving via its partner (i.e., not a hand-out).
• No X at first-hand loss at 0–0 (since hand-out occurs). 5. Referee call
• Always announce the new score (server’s score first), then any “Second hand” or “Hand-out”, then who serves next and which side. Add “Game ball” at 14 for PAR-15. 6. Validation
• Reject/flag any write that violates:
• side alternation for a continuing server,
• writing into the wrong column,
• writing X when a hand-out should occur,
• skipping the partner within a hand,
• serving from the same side twice in a row by the same player.

⸻

Worked Micro-Examples (LLM must match)
• First rally, first hand lost
Start 0–0, A1 serves R, loses → writes: A1: R/ @ A col 0, A2: / @ A col 0, no X, score B 1–0 A, next server B1 R @ B col 1.
• Receiving team wins but server’s partner still to serve
At B 3–0 A, B1 serves R, loses → writes: B1: R/ @ B col 3, X in A col 1, score B 3–1 A, next server B2 L @ B col 3.
• Second hand lost → hand-out
Immediately after above, B2 serves L, loses → writes: B2: L/ @ B col 3, no X, score B 3–2 A, next server A1 R @ A col 2.

⸻

Undo/Redo (optional but recommended)
• Maintain a history stack of immutable snapshots (score, server, handIndex, grid) so UNDO restores the exact previous scoreboard and call.

⸻

Output Style
• Be concise, deterministic, and consistent. Prefer “Three–one. Second hand. Bob to serve. Left side.” over verbose prose.
• Never guess: if inputs are ambiguous (e.g., unknown next side due to correction), compute from rules; if still impossible, return a clear error.

⸻

If you want, I can plug this into an XState v5 machine + a tiny React UI so your LLM only needs to explain decisions while the state machine handles transitions.

```ts
import { setup, assign } from 'xstate'

/** ===== Types ===== */
interface Player {
  id: string
  name: string
  team: 'A' | 'B'
  row: 1 | 2 // 1 = top row, 2 = second row
}

interface Score {
  A: number
  B: number
}
type Team = 'A' | 'B'
type Side = 'R' | 'L'

interface Server {
  team: Team
  player: 1 | 2 // row
  side: Side // next side to serve from
  handIndex: 0 | 1 // 0 = first hand, 1 = second hand (within current team hand)
}

interface PlayersCtx {
  A1?: Player
  A2?: Player
  B1?: Player
  B2?: Player
}

/** What we snapshot for UNDO */
interface Snapshot {
  score: Score
  server?: Server
}

interface Context {
  players: PlayersCtx
  score: Score
  server?: Server
  maxPoints: number
  winBy: number
  history: Snapshot[] // LIFO stack
  historyLimit: number // optional cap
}

type Events =
  | { type: 'SETUP_TEAMS'; players: PlayersCtx }
  | {
      type: 'START_GAME'
      firstServer: Server
      maxPoints?: number
      winBy?: number
    }
  | { type: 'RALLY_WON'; winner: Team }
  | { type: 'UNDO' }
  | { type: 'RESET' }

/** ===== Helpers ===== */
const otherTeam = (t: Team): Team => (t === 'A' ? 'B' : 'A')
const flip = (s: Side): Side => (s === 'R' ? 'L' : 'R')

/** Push a snapshot of current (score, server) */
const pushSnapshot = (ctx: Context): Context => {
  const snap: Snapshot = {
    score: { ...ctx.score },
    server: ctx.server ? { ...ctx.server } : undefined,
  }
  const trimmed =
    ctx.historyLimit > 0 && ctx.history.length >= ctx.historyLimit
      ? ctx.history.slice(1) // drop oldest
      : ctx.history
  return { ...ctx, history: [...trimmed, snap] }
}

/** Pop last snapshot; if none, no-op */
const popSnapshot = (ctx: Context): Partial<Context> => {
  const prev = ctx.history.at(-1)
  if (!prev) return {}
  return {
    score: prev.score,
    server: prev.server,
    history: ctx.history.slice(0, -1),
  }
}

/** ===== Machine ===== */
export const squashMachine = setup({
  types: {
    context: {} as Context,
    events: {} as Events,
  },
  guards: {
    gameEnded: ({ context }) => {
      const { A, B } = context.score
      const { maxPoints, winBy } = context
      const someoneAtTarget = A >= maxPoints || B >= maxPoints
      if (!someoneAtTarget) return false
      return Math.abs(A - B) >= winBy
    },
  },
  actions: {
    assignTeams: assign((ctx, e: Extract<Events, { type: 'SETUP_TEAMS' }>) => ({
      players: e.players,
    })),

    startGame: assign((ctx, e: Extract<Events, { type: 'START_GAME' }>) => ({
      score: { A: 0, B: 0 },
      server: { ...e.firstServer, handIndex: 0 }, // ensure 0 at start
      maxPoints: e.maxPoints ?? ctx.maxPoints,
      winBy: e.winBy ?? ctx.winBy,
      history: [], // fresh game → clear history
    })),

    /** Snapshot before mutating */
    snapshot: assign((ctx) => pushSnapshot(ctx)),

    /** Core rally resolution per our rules */
    recordRally: assign((ctx, e: Extract<Events, { type: 'RALLY_WON' }>) => {
      const winner = e.winner
      const cur = ctx.server!
      const nextScore: Score = { ...ctx.score, [winner]: ctx.score[winner] + 1 }

      // Next server logic
      let nextServer: Server

      if (winner === cur.team) {
        // Serving team won → same player, flip side, same handIndex
        nextServer = { ...cur, side: flip(cur.side) }
      } else {
        // Receiving team won
        if (cur.handIndex === 0) {
          // Partner gets a turn (second hand), opposite side from last serve
          nextServer = {
            team: cur.team,
            player: cur.player === 1 ? 2 : 1,
            side: flip(cur.side),
            handIndex: 1,
          }
        } else {
          // Second hand lost → hand-out to other team, start first hand (row1 by default)
          const t = otherTeam(cur.team)
          nextServer = {
            team: t,
            player: 1,
            side: 'R',
            handIndex: 0,
          }
        }
      }

      return { ...ctx, score: nextScore, server: nextServer }
    }),

    /** Undo one step */
    undoOnce: assign((ctx) => popSnapshot(ctx)),

    /** Reset everything */
    resetAll: assign((_ctx) => ({
      players: {},
      score: { A: 0, B: 0 },
      server: undefined,
      history: [],
    })),
  },
}).createMachine({
  id: 'squash-scoring',
  initial: 'idle',
  context: {
    players: {},
    score: { A: 0, B: 0 },
    server: undefined,
    maxPoints: 15,
    winBy: 0,
    history: [],
    historyLimit: 500,
  },

  on: {
    /** Global UNDO: restore snapshot & ensure we’re in play state afterward */
    UNDO: {
      actions: 'undoOnce',
      target: '.inPlay', // jump to inPlay even if we were at gameOver
    },
    RESET: { actions: 'resetAll', target: 'idle' },
  },

  states: {
    idle: {
      on: {
        SETUP_TEAMS: { actions: 'assignTeams', target: 'ready' },
      },
    },

    ready: {
      on: {
        START_GAME: { actions: 'startGame', target: 'inPlay' },
      },
    },

    inPlay: {
      on: {
        RALLY_WON: {
          actions: ['snapshot', 'recordRally'],
          target: 'checkGameEnd',
        },
      },
    },

    checkGameEnd: {
      always: [
        { guard: 'gameEnded', target: 'gameOver' },
        { target: 'inPlay' },
      ],
    },

    gameOver: {
      // UNDO handled globally; pops us back to inPlay
      type: 'final',
    },
  },
})
```

Notes
• History snapshots: taken before each RALLY_WON mutation via "snapshot". You can also snapshot before any other mutating action you add later (e.g., corrections).
• UNDO from anywhere: Root on.UNDO pops a snapshot and routes to .inPlay. If there’s no history, it’s a no-op.
• History cap: historyLimit (default 500). Bump or set 0 for unlimited.
• Separation of concerns: This version handles score + serving/hand rotation. If you want the sheet writes (R, L, R/, L/, X) and referee call generation, we can add a writes array and a derived refCall action next. Undo already covers them—just include them in the Snapshot when you add.

Want me to extend this to emit the exact sheet notations and a referee call string per rally, all covered by the same UNDO?
