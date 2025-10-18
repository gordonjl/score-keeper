import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { page } from '@vitest/browser/context'
import { ScoreTable } from './ScoreTable'
import type { ActivityGrid } from '../../machines/squashMachine.types'

describe('ScoreTable', () => {
  const mockPlayerLabels = {
    A1: 'Alice',
    A2: 'Amy',
    B1: 'Bob',
    B2: 'Ben',
  }

  const createEmptyGrid = (): ActivityGrid => ({
    A1: ['', '', '', '', ''],
    A2: ['', '', '', '', ''],
    B1: ['', '', '', '', ''],
    B2: ['', '', '', '', ''],
    A: ['', '', '', '', ''],
    B: ['', '', '', '', ''],
  })

  it('should render all player labels', async () => {
    const grid = createEmptyGrid()
    const rows = ['A1', 'A2', 'B1', 'B2'] as const

    render(
      <ScoreTable
        grid={grid}
        rows={rows}
        playerLabels={mockPlayerLabels}
        serverRowKey="A1"
        serverScore={0}
        handIndex={0}
        isGameOver={false}
        onToggleServeSide={() => {}}
        maxCols={5}
      />,
    )

    await expect.element(page.getByText('Alice')).toBeInTheDocument()
    await expect.element(page.getByText('Amy')).toBeInTheDocument()
    await expect.element(page.getByText('Bob')).toBeInTheDocument()
    await expect.element(page.getByText('Ben')).toBeInTheDocument()
  })

  it('should render X marks correctly for team A', async () => {
    const grid = createEmptyGrid()
    grid.A[2] = 'X' // X at column 2 for team A
    const rows = ['A1', 'A2', 'B1', 'B2'] as const

    render(
      <ScoreTable
        grid={grid}
        rows={rows}
        playerLabels={mockPlayerLabels}
        serverRowKey="B1"
        serverScore={2}
        handIndex={0}
        isGameOver={false}
        onToggleServeSide={() => {}}
        maxCols={5}
      />,
    )

    await expect.element(page.getByText('X')).toBeInTheDocument()
  })

  it('should handle different row orders (B first)', async () => {
    const grid = createEmptyGrid()
    grid.B1[0] = 'R'
    const rows = ['B1', 'B2', 'A1', 'A2'] as const

    render(
      <ScoreTable
        grid={grid}
        rows={rows}
        playerLabels={mockPlayerLabels}
        serverRowKey="B1"
        serverScore={0}
        handIndex={0}
        isGameOver={false}
        onToggleServeSide={() => {}}
        maxCols={5}
      />,
    )

    await expect.element(page.getByText('Bob')).toBeInTheDocument()
    await expect.element(page.getByText('Ben')).toBeInTheDocument()
  })
})
