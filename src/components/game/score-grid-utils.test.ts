import { describe, expect, it } from 'vitest'
import { buildGridFromRallies } from './score-grid-utils'
import type { RallyData, Server } from './score-grid-utils'

describe('score-grid-utils', () => {
  describe('buildGridFromRallies - first server logic', () => {
    it('should use B2 as first server when teamBFirstServer is 2', () => {
      // Scenario: A2 serves and loses, Team B wins
      // B2 should serve next (not B1) because B2 is the first server for Team B
      const rallies: Array<RallyData> = [
        {
          winner: 'B',
          rallyNumber: 1,
          serverTeam: 'A',
          serverPlayer: 2,
          serverSide: 'R',
          serverHandIndex: 1, // Second hand
        },
      ]

      const initialServer: Server = {
        team: 'A',
        player: 2,
        side: 'R',
        handIndex: 1,
      }

      const grid = buildGridFromRallies(
        rallies,
        initialServer,
        true, // firstHandUsed
        1, // teamAFirstServer
        2, // teamBFirstServer - B2 serves first for Team B
      )

      // A2 should have a slash (lost the rally as second hand)
      expect(grid.A2[0]).toBe('R/')

      // B2 should have 'R' at column 1 (Team B's score after winning)
      // This is the KEY assertion - B2 should serve, not B1
      expect(grid.B2[1]).toBe('R')

      // B1 should be empty at column 1
      expect(grid.B1[1]).toBe('')
    })

    it('should use B1 as first server when teamBFirstServer is 1', () => {
      // Same scenario but B1 is the first server
      const rallies: Array<RallyData> = [
        {
          winner: 'B',
          rallyNumber: 1,
          serverTeam: 'A',
          serverPlayer: 2,
          serverSide: 'R',
          serverHandIndex: 1,
        },
      ]

      const initialServer: Server = {
        team: 'A',
        player: 2,
        side: 'R',
        handIndex: 1,
      }

      const grid = buildGridFromRallies(
        rallies,
        initialServer,
        true,
        1, // teamAFirstServer
        1, // teamBFirstServer - B1 serves first for Team B
      )

      // B1 should have 'R' at column 1
      expect(grid.B1[1]).toBe('R')

      // B2 should be empty at column 1
      expect(grid.B2[1]).toBe('')
    })

    it('should use A2 as first server when teamAFirstServer is 2', () => {
      // B1 serves and loses (second hand), Team A wins
      // A2 should serve next because A2 is the first server for Team A
      const rallies: Array<RallyData> = [
        {
          winner: 'A',
          rallyNumber: 1,
          serverTeam: 'B',
          serverPlayer: 1,
          serverSide: 'R',
          serverHandIndex: 1,
        },
      ]

      const initialServer: Server = {
        team: 'B',
        player: 1,
        side: 'R',
        handIndex: 1,
      }

      const grid = buildGridFromRallies(
        rallies,
        initialServer,
        true,
        2, // teamAFirstServer - A2 serves first for Team A
        1, // teamBFirstServer
      )

      // A2 should have 'R' at column 1 (Team A's score after winning)
      expect(grid.A2[1]).toBe('R')

      // A1 should be empty at column 1
      expect(grid.A1[1]).toBe('')
    })

    it('should handle first-hand exception at 0-0 with correct first servers', () => {
      // A1 serves at 0-0 and loses immediately
      // B2 should serve next (if B2 is first server for Team B)
      const rallies: Array<RallyData> = [
        {
          winner: 'B',
          rallyNumber: 1,
          serverTeam: 'A',
          serverPlayer: 1,
          serverSide: 'R',
          serverHandIndex: 0,
        },
      ]

      const initialServer: Server = {
        team: 'A',
        player: 1,
        side: 'R',
        handIndex: 0,
      }

      const grid = buildGridFromRallies(
        rallies,
        initialServer,
        false, // firstHandUsed = false (start of game)
        1, // teamAFirstServer
        2, // teamBFirstServer - B2 serves first
      )

      // A1 should have 'R/' at column 0
      expect(grid.A1[0]).toBe('R/')

      // A2 should have '/' at column 0 (first-hand exception)
      expect(grid.A2[0]).toBe('/')

      // B2 should have 'R' at column 1 (Team B's score)
      expect(grid.B2[1]).toBe('R')

      // B1 should be empty
      expect(grid.B1[1]).toBe('')
    })

    it('should NOT write X marker for first-hand exception at 0-0', () => {
      // At 0-0, if first server loses, NO X marker (first-hand exception)
      const rallies: Array<RallyData> = [
        {
          winner: 'A',
          rallyNumber: 1,
          serverTeam: 'B',
          serverPlayer: 2,
          serverSide: 'R',
          serverHandIndex: 0,
        },
      ]

      const initialServer: Server = {
        team: 'B',
        player: 2,
        side: 'R',
        handIndex: 0,
      }

      const grid = buildGridFromRallies(rallies, initialServer, false, 1, 2)

      // B2 should have 'R/' at column 0
      expect(grid.B2[0]).toBe('R/')

      // B1 should have '/' at column 0 (partner didn't serve)
      expect(grid.B1[0]).toBe('/')

      // NO X marker for first-hand exception
      expect(grid.A[1]).toBe('')
      expect(grid.B[1]).toBe('')

      // A1 should serve at column 1
      expect(grid.A1[1]).toBe('R')
    })

    it('should not mark both team players as serving when transitioning from first to second hand', () => {
      // Reproduce the bug from screenshot:
      // Rally 1: B2 serves from R at 0-0, B wins (score: A=0, B=1)
      // Rally 2: B2 serves from L at 0-1, B wins (score: A=0, B=2)
      // Rally 3: B2 serves from R at 0-2, A wins (score: A=1, B=2) - first hand lost
      // Rally 4: B1 serves from L at 1-2, A wins (score: A=2, B=2) - second hand lost
      // After Rally 4: Team A should serve, only ONE player should show serving position

      const rallies: Array<RallyData> = [
        {
          winner: 'B',
          rallyNumber: 1,
          serverTeam: 'B',
          serverPlayer: 2,
          serverSide: 'R',
          serverHandIndex: 0,
        },
        {
          winner: 'B',
          rallyNumber: 2,
          serverTeam: 'B',
          serverPlayer: 2,
          serverSide: 'L',
          serverHandIndex: 0,
        },
        {
          winner: 'A',
          rallyNumber: 3,
          serverTeam: 'B',
          serverPlayer: 2,
          serverSide: 'R',
          serverHandIndex: 0,
        },
        {
          winner: 'A',
          rallyNumber: 4,
          serverTeam: 'B',
          serverPlayer: 1,
          serverSide: 'L',
          serverHandIndex: 1,
        },
      ]

      const initialServer: Server = {
        team: 'B',
        player: 2,
        side: 'R',
        handIndex: 0,
      }

      const grid = buildGridFromRallies(
        rallies,
        initialServer,
        false, // firstHandUsed
        1, // teamAFirstServer - A1 serves first
        2, // teamBFirstServer - B2 serves first
      )

      // Verify the grid state after all rallies
      // Column 0: B2 serves from R
      expect(grid.B2[0]).toBe('R')
      expect(grid.B1[0]).toBe('')

      // Column 1: B2 serves from L (B won, so B2 continues)
      expect(grid.B2[1]).toBe('L')
      expect(grid.B1[1]).toBe('')

      // Column 2: B2 serves from R and loses (first hand), B1 serves from L and loses (second hand)
      expect(grid.B2[2]).toBe('R/')
      expect(grid.B1[2]).toBe('L/')

      // X markers: X appears when a team scores but doesn't get to serve
      // Rally 3: B2 loses first hand, A wins but A2 continues serving → X at A[1]
      expect(grid.A[1]).toBe('X')

      // Rally 4: B1 loses second hand, A wins and gets serve → NO X at A[2] (A1 serves instead)
      expect(grid.A[2]).toBe('')

      // CRITICAL BUG CHECK: After second hand lost, ONLY A1 should have serving position
      // The bug was that both A1 and A2 were marked as serving at the same column
      expect(grid.A1[2]).toBe('R')
      expect(grid.A2[2]).toBe('') // A2 should NOT have a serving position at column 2
    })

    it('should flip serve side when server wins rally', () => {
      // Server wins, side should flip
      const rallies: Array<RallyData> = [
        {
          winner: 'A',
          rallyNumber: 1,
          serverTeam: 'A',
          serverPlayer: 1,
          serverSide: 'R',
          serverHandIndex: 0,
        },
        {
          winner: 'A',
          rallyNumber: 2,
          serverTeam: 'A',
          serverPlayer: 1,
          serverSide: 'L',
          serverHandIndex: 0,
        },
      ]

      const initialServer: Server = {
        team: 'A',
        player: 1,
        side: 'R',
        handIndex: 0,
      }

      const grid = buildGridFromRallies(rallies, initialServer, false, 1, 1)

      // A1 serves from R at column 0, wins
      expect(grid.A1[0]).toBe('R')

      // A1 serves from L at column 1 (side flipped), wins
      expect(grid.A1[1]).toBe('L')

      // A1 serves from R at column 2 (side flipped again)
      expect(grid.A1[2]).toBe('R')
    })

    it('should handle X markers correctly when first hand lost after 0-0', () => {
      // After 0-0, when first hand is lost, X marker should appear
      const rallies: Array<RallyData> = [
        {
          winner: 'A',
          rallyNumber: 1,
          serverTeam: 'A',
          serverPlayer: 1,
          serverSide: 'R',
          serverHandIndex: 0,
        },
        {
          winner: 'B',
          rallyNumber: 2,
          serverTeam: 'A',
          serverPlayer: 1,
          serverSide: 'L',
          serverHandIndex: 0,
        },
      ]

      const initialServer: Server = {
        team: 'A',
        player: 1,
        side: 'R',
        handIndex: 0,
      }

      const grid = buildGridFromRallies(rallies, initialServer, false, 1, 1)

      // A1 serves and wins at column 0
      expect(grid.A1[0]).toBe('R')

      // A1 serves and loses at column 1 (first hand lost)
      expect(grid.A1[1]).toBe('L/')

      // A2 will serve next (partner takes over), but position not written yet
      // The partner's serve position is written when the next rally is processed
      expect(grid.A2[1]).toBe('')

      // X marker at B[1] because B scored but A still serving (partner will serve)
      expect(grid.B[1]).toBe('X')
    })

    it('should handle all four combinations of first servers', () => {
      // Test A1/B1, A1/B2, A2/B1, A2/B2 combinations
      const scenarios = [
        { teamAFirst: 1, teamBFirst: 1, expectedA: 'A1', expectedB: 'B1' },
        { teamAFirst: 1, teamBFirst: 2, expectedA: 'A1', expectedB: 'B2' },
        { teamAFirst: 2, teamBFirst: 1, expectedA: 'A2', expectedB: 'B1' },
        { teamAFirst: 2, teamBFirst: 2, expectedA: 'A2', expectedB: 'B2' },
      ] as const

      scenarios.forEach(({ teamAFirst, teamBFirst, expectedB }) => {
        // A serves and loses (second hand)
        const rallies: Array<RallyData> = [
          {
            winner: 'B',
            rallyNumber: 1,
            serverTeam: 'A',
            serverPlayer: 1,
            serverSide: 'R',
            serverHandIndex: 1,
          },
        ]

        const grid = buildGridFromRallies(
          rallies,
          { team: 'A', player: 1, side: 'R', handIndex: 1 },
          true,
          teamAFirst,
          teamBFirst,
        )

        // Check that correct first server gets the serve
        expect(grid[expectedB][1]).toBe('R')
        // Check that other player doesn't have serve
        const otherB = expectedB === 'B1' ? 'B2' : 'B1'
        expect(grid[otherB][1]).toBe('')
      })
    })

    it('should handle empty rallies array', () => {
      // Edge case: no rallies played yet
      const rallies: Array<RallyData> = []

      const initialServer: Server = {
        team: 'A',
        player: 1,
        side: 'R',
        handIndex: 0,
      }

      const grid = buildGridFromRallies(rallies, initialServer, false, 1, 1)

      // Grid should be empty
      expect(grid.A1.every((cell) => cell === '')).toBe(true)
      expect(grid.A2.every((cell) => cell === '')).toBe(true)
      expect(grid.B1.every((cell) => cell === '')).toBe(true)
      expect(grid.B2.every((cell) => cell === '')).toBe(true)
    })

    it('should handle long rally sequence with multiple hand transitions', () => {
      // Complex scenario: multiple hand transitions and side flips
      const rallies: Array<RallyData> = [
        // A1 serves and wins (0-0 → 1-0)
        {
          winner: 'A',
          rallyNumber: 1,
          serverTeam: 'A',
          serverPlayer: 1,
          serverSide: 'R',
          serverHandIndex: 0,
        },
        // A1 serves and wins (1-0 → 2-0)
        {
          winner: 'A',
          rallyNumber: 2,
          serverTeam: 'A',
          serverPlayer: 1,
          serverSide: 'L',
          serverHandIndex: 0,
        },
        // A1 serves and loses first hand (2-0 → 2-1)
        {
          winner: 'B',
          rallyNumber: 3,
          serverTeam: 'A',
          serverPlayer: 1,
          serverSide: 'R',
          serverHandIndex: 0,
        },
        // A2 serves and loses second hand (2-1 → 2-2)
        {
          winner: 'B',
          rallyNumber: 4,
          serverTeam: 'A',
          serverPlayer: 2,
          serverSide: 'L',
          serverHandIndex: 1,
        },
        // B1 serves and wins (2-2 → 2-3)
        {
          winner: 'B',
          rallyNumber: 5,
          serverTeam: 'B',
          serverPlayer: 1,
          serverSide: 'R',
          serverHandIndex: 0,
        },
      ]

      const initialServer: Server = {
        team: 'A',
        player: 1,
        side: 'R',
        handIndex: 0,
      }

      const grid = buildGridFromRallies(rallies, initialServer, false, 1, 1)

      // Verify A1's serves
      expect(grid.A1[0]).toBe('R') // Rally 1: A1 serves and wins
      expect(grid.A1[1]).toBe('L') // Rally 2: A1 serves and wins
      expect(grid.A1[2]).toBe('R/') // Rally 3: A1 serves and loses first hand

      // Verify A2's serve
      expect(grid.A2[2]).toBe('L/') // Rally 4: A2 serves and loses second hand

      // Verify B1's serve
      expect(grid.B1[2]).toBe('R') // Rally 5: B1 serves and wins
      expect(grid.B1[3]).toBe('L') // B1 continues serving

      // Verify X markers
      expect(grid.B[1]).toBe('X') // Rally 3: B scores but A2 serves
      expect(grid.A[2]).toBe('') // Rally 4: A scores but no X (B1 serves)
    })

    it('should handle partner serving immediately after first hand lost (not at 0-0)', () => {
      // After first rally, first hand lost should transition to partner
      const rallies: Array<RallyData> = [
        // A1 serves and wins at 0-0
        {
          winner: 'A',
          rallyNumber: 1,
          serverTeam: 'A',
          serverPlayer: 1,
          serverSide: 'R',
          serverHandIndex: 0,
        },
        // A1 serves and loses first hand (not at 0-0 anymore)
        {
          winner: 'B',
          rallyNumber: 2,
          serverTeam: 'A',
          serverPlayer: 1,
          serverSide: 'L',
          serverHandIndex: 0,
        },
      ]

      const initialServer: Server = {
        team: 'A',
        player: 1,
        side: 'R',
        handIndex: 0,
      }

      const grid = buildGridFromRallies(rallies, initialServer, false, 1, 1)

      // A1 serves and wins at column 0
      expect(grid.A1[0]).toBe('R')

      // A1 serves and loses at column 1
      expect(grid.A1[1]).toBe('L/')

      // A2 should NOT have a serve position at column 1 yet
      // (will be written when A2 actually serves in next rally)
      expect(grid.A2[1]).toBe('')

      // X marker because B scored but A still has serve (partner will serve)
      expect(grid.B[1]).toBe('X')
    })
  })
})
