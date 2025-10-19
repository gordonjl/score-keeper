import { memo } from 'react'
import type { Cell } from '../../machines/squashMachine.types'

type ScoreCellProps = {
  cell: Cell
  isActive: boolean
  isClickable: boolean
  onClick: () => void
  rowSpan?: number
}

export const ScoreCell = memo(
  ({ cell, isActive, isClickable, onClick, rowSpan }: ScoreCellProps) => {
    const bgColor = isClickable
      ? 'bg-warning/20 font-bold'
      : isActive
        ? 'bg-primary/20 font-bold'
        : ''

    return (
      <td
        rowSpan={rowSpan}
        onClick={onClick}
        className={`border border-base-300 p-0.5 sm:p-1 text-center text-xs sm:text-sm min-w-[28px] sm:min-w-[32px] ${bgColor} ${isClickable ? 'cursor-pointer hover:bg-primary/40' : ''}`}
        title={isClickable ? 'Click to toggle R/L' : ''}
      >
        {cell || ''}
      </td>
    )
  },
)

ScoreCell.displayName = 'ScoreCell'
