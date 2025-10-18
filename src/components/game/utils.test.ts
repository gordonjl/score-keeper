import { describe, expect, it } from 'vitest'
import { getOrderedRows } from './utils'
import type { RowKey } from '../../machines/squashMachine.types'

describe('getOrderedRows', () => {
  describe('Team A serving first', () => {
    it('should order rows correctly when A1 serves first for team A and B1 serves first for team B', () => {
      const result = getOrderedRows('A', 1, 1)
      const expected: Array<RowKey> = ['A1', 'A2', 'B1', 'B2']
      expect(result).toEqual(expected)
    })

    it('should order rows correctly when A2 serves first for team A and B1 serves first for team B', () => {
      const result = getOrderedRows('A', 2, 1)
      const expected: Array<RowKey> = ['A2', 'A1', 'B1', 'B2']
      expect(result).toEqual(expected)
    })

    it('should order rows correctly when A1 serves first for team A and B2 serves first for team B', () => {
      const result = getOrderedRows('A', 1, 2)
      const expected: Array<RowKey> = ['A1', 'A2', 'B2', 'B1']
      expect(result).toEqual(expected)
    })

    it('should order rows correctly when A2 serves first for team A and B2 serves first for team B', () => {
      const result = getOrderedRows('A', 2, 2)
      const expected: Array<RowKey> = ['A2', 'A1', 'B2', 'B1']
      expect(result).toEqual(expected)
    })
  })

  describe('Team B serving first', () => {
    it('should order rows correctly when B1 serves first for team B and A1 serves first for team A', () => {
      const result = getOrderedRows('B', 1, 1)
      const expected: Array<RowKey> = ['B1', 'B2', 'A1', 'A2']
      expect(result).toEqual(expected)
    })

    it('should order rows correctly when B2 serves first for team B and A1 serves first for team A', () => {
      const result = getOrderedRows('B', 1, 2)
      const expected: Array<RowKey> = ['B2', 'B1', 'A1', 'A2']
      expect(result).toEqual(expected)
    })

    it('should order rows correctly when B1 serves first for team B and A2 serves first for team A', () => {
      const result = getOrderedRows('B', 2, 1)
      const expected: Array<RowKey> = ['B1', 'B2', 'A2', 'A1']
      expect(result).toEqual(expected)
    })

    it('should order rows correctly when B2 serves first for team B and A2 serves first for team A', () => {
      const result = getOrderedRows('B', 2, 2)
      const expected: Array<RowKey> = ['B2', 'B1', 'A2', 'A1']
      expect(result).toEqual(expected)
    })
  })

  describe('Examples from requirements', () => {
    it('Example 1: team A to serve first, A1 serves first for team A, B1 serves first for team B', () => {
      // Row order should be: a1, a2, b1, b2
      const result = getOrderedRows('A', 1, 1)
      const expected: Array<RowKey> = ['A1', 'A2', 'B1', 'B2']
      expect(result).toEqual(expected)
    })

    it('Example 2: team B to serve first, B2 serves first for team B, A2 serves first for team A', () => {
      // Row order should be: b2, b1, a2, a1
      const result = getOrderedRows('B', 2, 2)
      const expected: Array<RowKey> = ['B2', 'B1', 'A2', 'A1']
      expect(result).toEqual(expected)
    })
  })

  describe('Edge cases and comprehensive coverage', () => {
    it('should always place the serving team first', () => {
      const resultA = getOrderedRows('A', 1, 1)
      expect(resultA[0]).toMatch(/^A/)
      expect(resultA[1]).toMatch(/^A/)
      expect(resultA[2]).toMatch(/^B/)
      expect(resultA[3]).toMatch(/^B/)

      const resultB = getOrderedRows('B', 1, 1)
      expect(resultB[0]).toMatch(/^B/)
      expect(resultB[1]).toMatch(/^B/)
      expect(resultB[2]).toMatch(/^A/)
      expect(resultB[3]).toMatch(/^A/)
    })

    it('should place the first server of each team first within their team rows', () => {
      // When A1 is first server, A1 should be before A2
      const result1 = getOrderedRows('A', 1, 1)
      const teamARows1 = result1.filter((r) => r.startsWith('A'))
      expect(teamARows1).toEqual(['A1', 'A2'])

      // When A2 is first server, A2 should be before A1
      const result2 = getOrderedRows('A', 2, 1)
      const teamARows2 = result2.filter((r) => r.startsWith('A'))
      expect(teamARows2).toEqual(['A2', 'A1'])

      // When B1 is first server, B1 should be before B2
      const result3 = getOrderedRows('B', 1, 1)
      const teamBRows3 = result3.filter((r) => r.startsWith('B'))
      expect(teamBRows3).toEqual(['B1', 'B2'])

      // When B2 is first server, B2 should be before B1
      const result4 = getOrderedRows('B', 1, 2)
      const teamBRows4 = result4.filter((r) => r.startsWith('B'))
      expect(teamBRows4).toEqual(['B2', 'B1'])
    })

    it('should always return exactly 4 rows', () => {
      expect(getOrderedRows('A', 1, 1)).toHaveLength(4)
      expect(getOrderedRows('A', 2, 2)).toHaveLength(4)
      expect(getOrderedRows('B', 1, 1)).toHaveLength(4)
      expect(getOrderedRows('B', 2, 2)).toHaveLength(4)
    })

    it('should return all unique row keys', () => {
      const result = getOrderedRows('A', 1, 1)
      const uniqueRows = new Set(result)
      expect(uniqueRows.size).toBe(4)
      expect(uniqueRows).toContain('A1')
      expect(uniqueRows).toContain('A2')
      expect(uniqueRows).toContain('B1')
      expect(uniqueRows).toContain('B2')
    })
  })

  describe('All possible combinations', () => {
    const combinations: Array<{
      firstServingTeam: 'A' | 'B'
      teamAFirstServer: 1 | 2
      teamBFirstServer: 1 | 2
      expected: Array<RowKey>
    }> = [
      // Team A serving first
      {
        firstServingTeam: 'A',
        teamAFirstServer: 1,
        teamBFirstServer: 1,
        expected: ['A1', 'A2', 'B1', 'B2'],
      },
      {
        firstServingTeam: 'A',
        teamAFirstServer: 1,
        teamBFirstServer: 2,
        expected: ['A1', 'A2', 'B2', 'B1'],
      },
      {
        firstServingTeam: 'A',
        teamAFirstServer: 2,
        teamBFirstServer: 1,
        expected: ['A2', 'A1', 'B1', 'B2'],
      },
      {
        firstServingTeam: 'A',
        teamAFirstServer: 2,
        teamBFirstServer: 2,
        expected: ['A2', 'A1', 'B2', 'B1'],
      },
      // Team B serving first
      {
        firstServingTeam: 'B',
        teamAFirstServer: 1,
        teamBFirstServer: 1,
        expected: ['B1', 'B2', 'A1', 'A2'],
      },
      {
        firstServingTeam: 'B',
        teamAFirstServer: 1,
        teamBFirstServer: 2,
        expected: ['B2', 'B1', 'A1', 'A2'],
      },
      {
        firstServingTeam: 'B',
        teamAFirstServer: 2,
        teamBFirstServer: 1,
        expected: ['B1', 'B2', 'A2', 'A1'],
      },
      {
        firstServingTeam: 'B',
        teamAFirstServer: 2,
        teamBFirstServer: 2,
        expected: ['B2', 'B1', 'A2', 'A1'],
      },
    ]

    combinations.forEach(
      ({ firstServingTeam, teamAFirstServer, teamBFirstServer, expected }) => {
        it(`should return ${expected.join(', ')} when firstServingTeam=${firstServingTeam}, teamAFirstServer=${teamAFirstServer}, teamBFirstServer=${teamBFirstServer}`, () => {
          const result = getOrderedRows(
            firstServingTeam,
            teamAFirstServer,
            teamBFirstServer,
          )
          expect(result).toEqual(expected)
        })
      },
    )
  })
})
