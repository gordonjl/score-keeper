import { describe, expect, it } from 'vitest'
import { buildGridFromRallies } from './score-grid-utils'
import type { RallyData, Server } from './score-grid-utils'
import type { PlayerRow, Side, Team } from '../../machines/squashMachine.types'

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

    it('should not mark both team players as serving when transitioning after second hand lost', () => {
      // Test normal hand transition (after opening hand is complete)
      // Opening hand: A1 serves at 0-0, loses → immediate side-out to B (opening hand exception)
      // Then B gets normal two-server hand
      const rallies: Array<RallyData> = [
        // Opening hand: A1 loses immediately
        {
          winner: 'B',
          rallyNumber: 1,
          serverTeam: 'A',
          serverPlayer: 1,
          serverSide: 'R',
          serverHandIndex: 0,
        },
        // B's first normal hand: B1 wins
        {
          winner: 'B',
          rallyNumber: 2,
          serverTeam: 'B',
          serverPlayer: 1,
          serverSide: 'R',
          serverHandIndex: 0,
        },
        // B1 wins again
        {
          winner: 'B',
          rallyNumber: 3,
          serverTeam: 'B',
          serverPlayer: 1,
          serverSide: 'L',
          serverHandIndex: 0,
        },
        // B1 loses (first hand)
        {
          winner: 'A',
          rallyNumber: 4,
          serverTeam: 'B',
          serverPlayer: 1,
          serverSide: 'R',
          serverHandIndex: 0,
        },
        // B2 loses (second hand) - hand-out to A
        {
          winner: 'A',
          rallyNumber: 5,
          serverTeam: 'B',
          serverPlayer: 2,
          serverSide: 'L',
          serverHandIndex: 1,
        },
      ]

      const initialServer: Server = {
        team: 'A',
        player: 1,
        side: 'R',
        handIndex: 0,
      }

      const grid = buildGridFromRallies(rallies, initialServer, false, 1, 1)

      // Rally 1: A1 loses at 0-0 (opening hand exception)
      expect(grid.A1[0]).toBe('R/')
      expect(grid.A2[0]).toBe('/') // Partner didn't serve

      // Rally 2-3: B1 wins twice
      expect(grid.B1[1]).toBe('R')
      expect(grid.B1[2]).toBe('L')

      // Rally 4: B1 loses first hand
      expect(grid.B1[3]).toBe('R/')
      expect(grid.A[1]).toBe('X') // A scored but B2 will serve

      // Rally 5: B2 loses second hand - hand-out to A
      expect(grid.B2[3]).toBe('L/')
      expect(grid.A[2]).toBe('') // NO X (A is now serving)

      // CRITICAL: After hand-out, ONLY A1 should have serving position
      expect(grid.A1[2]).toBe('R')
      expect(grid.A2[2]).toBe('') // A2 should NOT have a serving position
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

    it('should handle opening hand exception when first server wins then loses', () => {
      // Opening hand: A1 wins at 0-0, then loses - opening hand exception triggers
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

      // A1 serves and loses at column 1 (opening hand exception - first point lost)
      expect(grid.A1[1]).toBe('L/')

      // A2 has "/" at column 1 (partner didn't serve - opening hand exception)
      expect(grid.A2[1]).toBe('/')

      // NO X marker (immediate side-out to Team B)
      expect(grid.B[1]).toBe('')

      // B1 should be serving at column 1
      expect(grid.B1[1]).toBe('R')
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
      // Complex scenario: opening hand exception, then normal hand transitions
      const rallies: Array<RallyData> = [
        // A1 serves and wins (0-0 → 1-0) - opening hand continues
        {
          winner: 'A',
          rallyNumber: 1,
          serverTeam: 'A',
          serverPlayer: 1,
          serverSide: 'R',
          serverHandIndex: 0,
        },
        // A1 serves and wins (1-0 → 2-0) - opening hand continues
        {
          winner: 'A',
          rallyNumber: 2,
          serverTeam: 'A',
          serverPlayer: 1,
          serverSide: 'L',
          serverHandIndex: 0,
        },
        // A1 serves and loses (2-0 → 2-1) - OPENING HAND EXCEPTION triggers
        {
          winner: 'B',
          rallyNumber: 3,
          serverTeam: 'A',
          serverPlayer: 1,
          serverSide: 'R',
          serverHandIndex: 0,
        },
        // B1 serves and wins (2-1 → 2-2)
        {
          winner: 'B',
          rallyNumber: 4,
          serverTeam: 'B',
          serverPlayer: 1,
          serverSide: 'R',
          serverHandIndex: 0,
        },
        // B1 serves and wins (2-2 → 2-3)
        {
          winner: 'B',
          rallyNumber: 5,
          serverTeam: 'B',
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

      // Verify A1's serves
      expect(grid.A1[0]).toBe('R') // Rally 1: A1 serves and wins
      expect(grid.A1[1]).toBe('L') // Rally 2: A1 serves and wins
      expect(grid.A1[2]).toBe('R/') // Rally 3: A1 loses - opening hand exception

      // A2 has "/" (partner didn't serve - opening hand exception)
      expect(grid.A2[2]).toBe('/')

      // Verify B1's serves
      expect(grid.B1[1]).toBe('R') // Rally 4: B1 serves and wins
      expect(grid.B1[2]).toBe('L') // Rally 5: B1 serves and wins
      expect(grid.B1[3]).toBe('R') // B1 continues serving

      // NO X marker at B[1] (opening hand exception = immediate side-out)
      expect(grid.B[1]).toBe('')
    })

    it('should reproduce bug: B2 serves first, wins twice, loses - opening hand exception', () => {
      // Exact scenario from bug report:
      // B2 serves at 0-0, wins (0-1) - opening hand continues
      // B2 serves at 0-1, wins (0-2) - opening hand continues
      // B2 serves at 0-2, loses (1-2) - OPENING HAND EXCEPTION triggers
      // Result: immediate side-out to Team A (no B1 second server)
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
      ]

      const initialServer: Server = {
        team: 'B',
        player: 2,
        side: 'R',
        handIndex: 0,
      }

      const grid = buildGridFromRallies(rallies, initialServer, false, 1, 2)

      // B2 serves and wins at column 0
      expect(grid.B2[0]).toBe('R')

      // B2 serves and wins at column 1
      expect(grid.B2[1]).toBe('L')

      // B2 serves and loses at column 2 (opening hand exception)
      expect(grid.B2[2]).toBe('R/')

      // B1 should have "/" at column 2 (partner didn't serve - opening hand exception)
      expect(grid.B1[2]).toBe('/')

      // NO X marker (immediate side-out, Team A is now serving)
      expect(grid.A[1]).toBe('')

      // A1 should be serving at column 1
      expect(grid.A1[1]).toBe('R')
    })

    it('should handle partner serving from opposite side after first server loses', () => {
      // After opening hand, normal two-server rules apply
      // When first server loses, partner serves from opposite side
      const rallies: Array<RallyData> = [
        // Opening hand: A1 loses at 0-0
        {
          winner: 'B',
          rallyNumber: 1,
          serverTeam: 'A',
          serverPlayer: 1,
          serverSide: 'R',
          serverHandIndex: 0,
        },
        // B1 serves and wins
        {
          winner: 'B',
          rallyNumber: 2,
          serverTeam: 'B',
          serverPlayer: 1,
          serverSide: 'R',
          serverHandIndex: 0,
        },
        // B1 loses (first hand) - partner B2 should serve from opposite side (L)
        {
          winner: 'A',
          rallyNumber: 3,
          serverTeam: 'B',
          serverPlayer: 1,
          serverSide: 'L',
          serverHandIndex: 0,
        },
        // B2 serves from L (opposite of B1's last side)
        {
          winner: 'A',
          rallyNumber: 4,
          serverTeam: 'B',
          serverPlayer: 2,
          serverSide: 'R',
          serverHandIndex: 1,
        },
      ]

      const initialServer: Server = {
        team: 'A',
        player: 1,
        side: 'R',
        handIndex: 0,
      }

      const grid = buildGridFromRallies(rallies, initialServer, false, 1, 1)

      // B1 serves from R at col 1, then L at col 2
      expect(grid.B1[1]).toBe('R')
      expect(grid.B1[2]).toBe('L/')

      // B2 serves from R at col 2 (opposite of B1's L, flipped)
      expect(grid.B2[2]).toBe('R/')

      // X marker at A[1] when B1 loses first hand
      expect(grid.A[1]).toBe('X')

      // NO X at A[2] when B2 loses second hand (hand-out)
      expect(grid.A[2]).toBe('')
    })

    it('should handle complete game with multiple hand transitions', () => {
      // Simulate a realistic game sequence
      const rallies: Array<RallyData> = [
        // Opening hand: A1 loses
        {
          winner: 'B',
          rallyNumber: 1,
          serverTeam: 'A',
          serverPlayer: 1,
          serverSide: 'R',
          serverHandIndex: 0,
        },
        // B1 wins 3 points
        {
          winner: 'B',
          rallyNumber: 2,
          serverTeam: 'B',
          serverPlayer: 1,
          serverSide: 'R',
          serverHandIndex: 0,
        },
        {
          winner: 'B',
          rallyNumber: 3,
          serverTeam: 'B',
          serverPlayer: 1,
          serverSide: 'L',
          serverHandIndex: 0,
        },
        {
          winner: 'B',
          rallyNumber: 4,
          serverTeam: 'B',
          serverPlayer: 1,
          serverSide: 'R',
          serverHandIndex: 0,
        },
        // B1 loses first hand
        {
          winner: 'A',
          rallyNumber: 5,
          serverTeam: 'B',
          serverPlayer: 1,
          serverSide: 'L',
          serverHandIndex: 0,
        },
        // B2 loses second hand
        {
          winner: 'A',
          rallyNumber: 6,
          serverTeam: 'B',
          serverPlayer: 2,
          serverSide: 'R',
          serverHandIndex: 1,
        },
        // A1 wins 2 points
        {
          winner: 'A',
          rallyNumber: 7,
          serverTeam: 'A',
          serverPlayer: 1,
          serverSide: 'R',
          serverHandIndex: 0,
        },
        {
          winner: 'A',
          rallyNumber: 8,
          serverTeam: 'A',
          serverPlayer: 1,
          serverSide: 'L',
          serverHandIndex: 0,
        },
        // A1 loses first hand
        {
          winner: 'B',
          rallyNumber: 9,
          serverTeam: 'A',
          serverPlayer: 1,
          serverSide: 'R',
          serverHandIndex: 0,
        },
        // A2 wins 1 point
        {
          winner: 'A',
          rallyNumber: 10,
          serverTeam: 'A',
          serverPlayer: 2,
          serverSide: 'L',
          serverHandIndex: 1,
        },
        // A2 loses second hand
        {
          winner: 'B',
          rallyNumber: 11,
          serverTeam: 'A',
          serverPlayer: 2,
          serverSide: 'R',
          serverHandIndex: 1,
        },
      ]

      const initialServer: Server = {
        team: 'A',
        player: 1,
        side: 'R',
        handIndex: 0,
      }
      const grid = buildGridFromRallies(rallies, initialServer, false, 1, 1)

      // Verify final score tracking
      expect(grid.A1[0]).toBe('R/') // Opening hand loss
      expect(grid.B1[1]).toBe('R')
      expect(grid.B1[2]).toBe('L')
      expect(grid.B1[3]).toBe('R')
      expect(grid.B1[4]).toBe('L/')
      expect(grid.B2[4]).toBe('R/')
      expect(grid.A1[2]).toBe('R')
      expect(grid.A1[3]).toBe('L')
      expect(grid.A1[4]).toBe('R/')
      expect(grid.A2[4]).toBe('L')
      expect(grid.A2[5]).toBe('R/')

      // Verify X markers
      expect(grid.A[1]).toBe('X') // Rally 5: A scores (0→1), B2 serves
      expect(grid.B[5]).toBe('X') // Rally 9: B scores (4→5), A2 serves
    })

    it('should handle server winning 10+ points in a row', () => {
      // Edge case: dominant server
      const rallies: Array<RallyData> = Array.from({ length: 12 }, (_, i) => ({
        winner: 'A' as Team,
        rallyNumber: i + 1,
        serverTeam: 'A' as Team,
        serverPlayer: 1 as PlayerRow,
        serverSide: (i % 2 === 0 ? 'R' : 'L') as Side,
        serverHandIndex: 0 as 0 | 1,
      }))

      const initialServer: Server = {
        team: 'A',
        player: 1,
        side: 'R',
        handIndex: 0,
      }
      const grid = buildGridFromRallies(rallies, initialServer, false, 1, 1)

      // Verify side alternation
      expect(grid.A1[0]).toBe('R')
      expect(grid.A1[1]).toBe('L')
      expect(grid.A1[2]).toBe('R')
      expect(grid.A1[3]).toBe('L')
      expect(grid.A1[4]).toBe('R')
      expect(grid.A1[5]).toBe('L')
      expect(grid.A1[6]).toBe('R')
      expect(grid.A1[7]).toBe('L')
      expect(grid.A1[8]).toBe('R')
      expect(grid.A1[9]).toBe('L')
      expect(grid.A1[10]).toBe('R')
      expect(grid.A1[11]).toBe('L')

      // A2 never serves
      expect(grid.A2.every((cell) => cell === '')).toBe(true)
      // Team B never scores
      expect(grid.B1.every((cell) => cell === '')).toBe(true)
      expect(grid.B2.every((cell) => cell === '')).toBe(true)
    })

    it('should handle both teams getting multiple hands each', () => {
      // Back-and-forth game
      // Score tracking: Rally 1: 0-1, Rally 2: 1-1, Rally 3: 2-1, Rally 4: 2-2, Rally 5: 2-3, Rally 6: 3-3, Rally 7: 4-3
      const rallies: Array<RallyData> = [
        // Opening hand: A1 loses (0-1)
        {
          winner: 'B',
          rallyNumber: 1,
          serverTeam: 'A',
          serverPlayer: 1,
          serverSide: 'R',
          serverHandIndex: 0,
        },
        // B1 loses first hand (1-1)
        {
          winner: 'A',
          rallyNumber: 2,
          serverTeam: 'B',
          serverPlayer: 1,
          serverSide: 'R',
          serverHandIndex: 0,
        },
        // B2 loses second hand (2-1)
        {
          winner: 'A',
          rallyNumber: 3,
          serverTeam: 'B',
          serverPlayer: 2,
          serverSide: 'L',
          serverHandIndex: 1,
        },
        // A1 loses first hand (2-2)
        {
          winner: 'B',
          rallyNumber: 4,
          serverTeam: 'A',
          serverPlayer: 1,
          serverSide: 'R',
          serverHandIndex: 0,
        },
        // A2 loses second hand (2-3)
        {
          winner: 'B',
          rallyNumber: 5,
          serverTeam: 'A',
          serverPlayer: 2,
          serverSide: 'L',
          serverHandIndex: 1,
        },
        // B1 loses first hand (3-3)
        {
          winner: 'A',
          rallyNumber: 6,
          serverTeam: 'B',
          serverPlayer: 1,
          serverSide: 'R',
          serverHandIndex: 0,
        },
        // B2 loses second hand (4-3)
        {
          winner: 'A',
          rallyNumber: 7,
          serverTeam: 'B',
          serverPlayer: 2,
          serverSide: 'L',
          serverHandIndex: 1,
        },
      ]

      const initialServer: Server = {
        team: 'A',
        player: 1,
        side: 'R',
        handIndex: 0,
      }
      const grid = buildGridFromRallies(rallies, initialServer, false, 1, 1)

      // Team A columns: 0 (opening hand), 2 (second hand), 4 (third hand)
      expect(grid.A1[0]).toBe('R/') // Opening hand at col 0
      expect(grid.A2[0]).toBe('/') // Partner didn't serve (opening hand exception)
      expect(grid.A1[2]).toBe('R/') // Second hand, first server at col 2
      expect(grid.A2[2]).toBe('L/') // Second hand, second server at col 2
      expect(grid.A1[4]).toBe('R') // Third hand starts at col 4

      // Team B columns: 1 (first hand), 2 (loses at col 2), 3 (second hand)
      expect(grid.B1[1]).toBe('R/') // First hand, first server at col 1
      expect(grid.B2[1]).toBe('L/') // First hand, second server at col 1
      expect(grid.B1[3]).toBe('R/') // Second hand, first server at col 3
      expect(grid.B2[3]).toBe('L/') // Second hand, second server at col 3

      // X markers appear when first hand lost
      expect(grid.A[1]).toBe('X') // Rally 2: A scores, B2 serves
      expect(grid.B[2]).toBe('X') // Rally 4: B scores, A2 serves
      expect(grid.A[3]).toBe('X') // Rally 6: A scores, B2 serves
    })

    it('should correctly track columns when teams have different scores', () => {
      // Ensure column indexing is based on serving team's score
      const rallies: Array<RallyData> = [
        // Opening hand: A1 loses
        {
          winner: 'B',
          rallyNumber: 1,
          serverTeam: 'A',
          serverPlayer: 1,
          serverSide: 'R',
          serverHandIndex: 0,
        },
        // B1 wins 5 points
        {
          winner: 'B',
          rallyNumber: 2,
          serverTeam: 'B',
          serverPlayer: 1,
          serverSide: 'R',
          serverHandIndex: 0,
        },
        {
          winner: 'B',
          rallyNumber: 3,
          serverTeam: 'B',
          serverPlayer: 1,
          serverSide: 'L',
          serverHandIndex: 0,
        },
        {
          winner: 'B',
          rallyNumber: 4,
          serverTeam: 'B',
          serverPlayer: 1,
          serverSide: 'R',
          serverHandIndex: 0,
        },
        {
          winner: 'B',
          rallyNumber: 5,
          serverTeam: 'B',
          serverPlayer: 1,
          serverSide: 'L',
          serverHandIndex: 0,
        },
        {
          winner: 'B',
          rallyNumber: 6,
          serverTeam: 'B',
          serverPlayer: 1,
          serverSide: 'R',
          serverHandIndex: 0,
        },
        // B1 loses first hand (score: 1-6)
        {
          winner: 'A',
          rallyNumber: 7,
          serverTeam: 'B',
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

      // Team A column 0 (score 0)
      expect(grid.A1[0]).toBe('R/')
      expect(grid.A2[0]).toBe('/')

      // Team B columns 1-6 (scores 1-6)
      expect(grid.B1[1]).toBe('R')
      expect(grid.B1[2]).toBe('L')
      expect(grid.B1[3]).toBe('R')
      expect(grid.B1[4]).toBe('L')
      expect(grid.B1[5]).toBe('R')
      expect(grid.B1[6]).toBe('L/')

      // X marker at Team A column 1 (A scored when B1 lost first hand)
      expect(grid.A[1]).toBe('X')
    })
  })
})
