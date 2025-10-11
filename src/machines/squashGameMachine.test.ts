import { describe, expect, it } from 'vitest'
import { createActor } from 'xstate'
import { squashGameMachine } from './squashGameMachine'
import { flip, gameEnded, otherTeam } from './squashGameMachine.actions'
import type { PlayerNameMap } from './squashMachine.types'

// Test helpers
const mockPlayers: PlayerNameMap = {
  A1: { firstName: 'Tim', lastName: 'Player', fullName: 'Tim Player' },
  A2: { firstName: 'Bob', lastName: 'Player', fullName: 'Bob Player' },
  B1: { firstName: 'Sal', lastName: 'Player', fullName: 'Sal Player' },
  B2: { firstName: 'Stu', lastName: 'Player', fullName: 'Stu Player' },
  teamA: 'Tim & Bob',
  teamB: 'Sal & Stu',
}

const mockGame = {
  id: 'game-1',
  matchId: 'match-1',
  gameNumber: 1,
  status: 'in_progress',
  scoreA: 0,
  scoreB: 0,
  winner: null,
  maxPoints: 15,
  winBy: 1,
  createdAt: new Date(),
  completedAt: null,
  firstServingTeam: 'A',
  firstServingPlayer: 1,
  firstServingSide: 'R',
  currentServerTeam: 'A',
  currentServerPlayer: 1,
  currentServerSide: 'R',
  currentServerHandIndex: 0,
  firstHandUsed: false,
}

describe('squashGameMachine', () => {
  describe('initialization', () => {
    it('should start in notConfigured state', () => {
      const actor = createActor(squashGameMachine, {
        input: { store: null },
      })
      actor.start()

      expect(actor.getSnapshot().value).toBe('notConfigured')
    })

    it('should transition to active after GAME_LOADED', () => {
      const actor = createActor(squashGameMachine, {
        input: { store: null },
      })
      actor.start()

      actor.send({
        type: 'GAME_LOADED',
        game: mockGame,
        players: mockPlayers,
      })

      const snapshot = actor.getSnapshot()
      expect(snapshot.value).toBe('active')
      expect(snapshot.context.score).toEqual({ A: 0, B: 0 })
      expect(snapshot.context.server.team).toBe('A')
      expect(snapshot.context.server.player).toBe(1)
    })
  })

  describe('rally scoring', () => {
    it('should increment score when server wins rally', () => {
      const actor = createActor(squashGameMachine, {
        input: { store: null },
      })
      actor.start()

      actor.send({
        type: 'GAME_LOADED',
        game: mockGame,
        players: mockPlayers,
      })

      // Team A serves and wins
      actor.send({ type: 'RALLY_WON', winner: 'A' })

      const snapshot = actor.getSnapshot()
      expect(snapshot.context.score).toEqual({ A: 1, B: 0 })
      expect(snapshot.context.server.team).toBe('A')
      expect(snapshot.context.server.side).toBe('L') // Side should flip
    })

    it('should handle hand-out when receiver wins rally', () => {
      const actor = createActor(squashGameMachine, {
        input: { store: null },
      })
      actor.start()

      actor.send({
        type: 'GAME_LOADED',
        game: mockGame,
        players: mockPlayers,
      })

      // Team A serves, Team B wins (first hand)
      actor.send({ type: 'RALLY_WON', winner: 'B' })

      const snapshot = actor.getSnapshot()
      expect(snapshot.context.score).toEqual({ A: 0, B: 1 })
      // Should hand out to Team B after first hand exception
      expect(snapshot.context.server.team).toBe('B')
      expect(snapshot.context.server.player).toBe(1)
      expect(snapshot.context.firstHandUsed).toBe(true)
    })

    it('should not end game before reaching maxPoints', () => {
      const actor = createActor(squashGameMachine, {
        input: { store: null },
      })
      actor.start()

      actor.send({
        type: 'GAME_LOADED',
        game: mockGame,
        players: mockPlayers,
      })

      // Play one rally
      actor.send({ type: 'RALLY_WON', winner: 'A' })

      const snapshot = actor.getSnapshot()
      expect(snapshot.value).toBe('active')
      expect(snapshot.context.score).toEqual({ A: 1, B: 0 })
    })
  })

  describe('game ending', () => {
    it('should transition to awaitingConfirmation when game ends', () => {
      const actor = createActor(squashGameMachine, {
        input: { store: null },
      })
      actor.start()

      actor.send({
        type: 'GAME_LOADED',
        game: mockGame,
        players: mockPlayers,
      })

      // Simulate game to 15-0
      for (let i = 0; i < 15; i++) {
        actor.send({ type: 'RALLY_WON', winner: 'A' })
      }

      const snapshot = actor.getSnapshot()
      expect(snapshot.value).toBe('awaitingConfirmation')
      expect(snapshot.context.score.A).toBe(15)
    })

    it('should transition to complete after CONFIRM_GAME_OVER', () => {
      const actor = createActor(squashGameMachine, {
        input: { store: null },
      })
      actor.start()

      actor.send({
        type: 'GAME_LOADED',
        game: mockGame,
        players: mockPlayers,
      })

      // Simulate game to 15-0
      for (let i = 0; i < 15; i++) {
        actor.send({ type: 'RALLY_WON', winner: 'A' })
      }

      actor.send({ type: 'CONFIRM_GAME_OVER' })

      const snapshot = actor.getSnapshot()
      expect(snapshot.value).toBe('complete')
    })
  })

  describe('undo functionality', () => {
    it('should undo last rally', () => {
      const actor = createActor(squashGameMachine, {
        input: { store: null },
      })
      actor.start()

      actor.send({
        type: 'GAME_LOADED',
        game: mockGame,
        players: mockPlayers,
      })

      // Play two rallies
      actor.send({ type: 'RALLY_WON', winner: 'A' })
      actor.send({ type: 'RALLY_WON', winner: 'A' })

      expect(actor.getSnapshot().context.score).toEqual({ A: 2, B: 0 })

      // Undo
      actor.send({ type: 'UNDO' })

      const snapshot = actor.getSnapshot()
      expect(snapshot.context.score).toEqual({ A: 1, B: 0 })
    })

    it('should not undo when no history exists', () => {
      const actor = createActor(squashGameMachine, {
        input: { store: null },
      })
      actor.start()

      actor.send({
        type: 'GAME_LOADED',
        game: mockGame,
        players: mockPlayers,
      })

      // Try to undo with no rallies played
      actor.send({ type: 'UNDO' })

      const snapshot = actor.getSnapshot()
      expect(snapshot.context.score).toEqual({ A: 0, B: 0 })
    })
  })
})

describe('gameEnded guard', () => {
  it('should return false when neither team has reached maxPoints', () => {
    const result = gameEnded(undefined, {
      score: { A: 10, B: 8 },
      maxPoints: 15,
      winBy: 1,
    })
    expect(result).toBe(false)
  })

  it('should return true when one team reaches maxPoints with sufficient lead', () => {
    const result = gameEnded(undefined, {
      score: { A: 15, B: 10 },
      maxPoints: 15,
      winBy: 1,
    })
    expect(result).toBe(true)
  })

  it('should return false when score difference is less than winBy', () => {
    const result = gameEnded(undefined, {
      score: { A: 15, B: 15 },
      maxPoints: 15,
      winBy: 2,
    })
    expect(result).toBe(false)
  })

  it('should return true when both teams exceed maxPoints with sufficient lead', () => {
    const result = gameEnded(undefined, {
      score: { A: 17, B: 15 },
      maxPoints: 15,
      winBy: 2,
    })
    expect(result).toBe(true)
  })
})

describe('helper functions', () => {
  describe('otherTeam', () => {
    it('should return B when given A', () => {
      expect(otherTeam('A')).toBe('B')
    })

    it('should return A when given B', () => {
      expect(otherTeam('B')).toBe('A')
    })
  })

  describe('flip', () => {
    it('should return L when given R', () => {
      expect(flip('R')).toBe('L')
    })

    it('should return R when given L', () => {
      expect(flip('L')).toBe('R')
    })
  })
})
