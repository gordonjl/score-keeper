import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { page } from '@vitest/browser/context'
import { TeamRows } from './TeamRows'
import type { ActivityGrid } from '../../machines/squashMachine.types'

describe('TeamRows', () => {
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

  it('should render player labels correctly', async () => {
    const grid = createEmptyGrid()
    grid.A1[0] = 'R'

    render(
      <table>
        <tbody>
          <TeamRows
            team="A"
            player1Key="A1"
            player2Key="A2"
            grid={grid}
            playerLabels={mockPlayerLabels}
            serverRowKey="A1"
            serverScore={0}
            handIndex={0}
            isGameOver={false}
            onToggleServeSide={() => {}}
            maxCols={5}
          />
        </tbody>
      </table>,
    )

    await expect.element(page.getByText('Alice')).toBeInTheDocument()
    await expect.element(page.getByText('Amy')).toBeInTheDocument()
  })

  it('should render X mark spanning both team rows', async () => {
    const grid = createEmptyGrid()
    grid.A[2] = 'X' // X at column 2 for team A

    render(
      <table>
        <tbody>
          <TeamRows
            team="A"
            player1Key="A1"
            player2Key="A2"
            grid={grid}
            playerLabels={mockPlayerLabels}
            serverRowKey="B1"
            serverScore={2}
            handIndex={0}
            isGameOver={false}
            onToggleServeSide={() => {}}
            maxCols={5}
          />
        </tbody>
      </table>,
    )

    // X should be visible
    await expect.element(page.getByText('X')).toBeInTheDocument()
  })

  it('should render serve indicators (R and L)', async () => {
    const grid = createEmptyGrid()
    grid.B1[0] = 'R'
    grid.B1[1] = 'L'

    render(
      <table>
        <tbody>
          <TeamRows
            team="B"
            player1Key="B1"
            player2Key="B2"
            grid={grid}
            playerLabels={mockPlayerLabels}
            serverRowKey="B1"
            serverScore={0}
            handIndex={0}
            isGameOver={false}
            onToggleServeSide={() => {}}
            maxCols={5}
          />
        </tbody>
      </table>,
    )

    await expect.element(page.getByText('R')).toBeInTheDocument()
    await expect.element(page.getByText('L')).toBeInTheDocument()
  })

  it('should work with different player orders (A2 first)', async () => {
    const grid = createEmptyGrid()
    grid.A2[0] = 'R'

    render(
      <table>
        <tbody>
          <TeamRows
            team="A"
            player1Key="A2"
            player2Key="A1"
            grid={grid}
            playerLabels={mockPlayerLabels}
            serverRowKey="A2"
            serverScore={0}
            handIndex={0}
            isGameOver={false}
            onToggleServeSide={() => {}}
            maxCols={5}
          />
        </tbody>
      </table>,
    )

    await expect.element(page.getByText('Amy')).toBeInTheDocument()
    await expect.element(page.getByText('Alice')).toBeInTheDocument()
  })
})
