import type { Cell, Grid, Orientation, Placement } from './types'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function columnLabels(grid: Grid): string[] {
  return Array.from({ length: grid.cols }, (_, i) => LETTERS[i])
}

export function rowLabels(grid: Grid): string[] {
  return Array.from({ length: grid.rows }, (_, i) => String(i + 1))
}

export function key(cell: Cell): string {
  return `${cell.row},${cell.col}`
}

export function fromKey(k: string): Cell {
  const [row, col] = k.split(',').map(Number)
  return { row, col }
}

export function inBounds(cell: Cell, grid: Grid): boolean {
  return cell.row >= 0 && cell.row < grid.rows && cell.col >= 0 && cell.col < grid.cols
}

/** Human-readable coordinate: column letter then 1-based row, e.g. B7. */
export function label(cell: Cell): string {
  return `${LETTERS[cell.col]}${cell.row + 1}`
}

export function sameCell(a: Cell, b: Cell): boolean {
  return a.row === b.row && a.col === b.col
}

export function spanCells(stem: Cell, length: number, orientation: Orientation): Cell[] {
  const cells: Cell[] = []
  for (let i = 0; i < length; i += 1) {
    cells.push(
      orientation === 'horizontal'
        ? { row: stem.row, col: stem.col + i }
        : { row: stem.row + i, col: stem.col },
    )
  }
  return cells
}

export function shipCells(placement: Placement): Cell[] {
  return spanCells(placement, placement.length, placement.orientation)
}

export const ORTHOGONAL: Cell[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
]

export function neighbours(cell: Cell, grid: Grid): Cell[] {
  return ORTHOGONAL.map((d) => ({ row: cell.row + d.row, col: cell.col + d.col })).filter((c) =>
    inBounds(c, grid),
  )
}

/** Includes the diagonals, which is what a one-cell separation rule needs. */
export function surrounding(cell: Cell, grid: Grid): Cell[] {
  const cells: Cell[] = []
  for (let row = cell.row - 1; row <= cell.row + 1; row += 1) {
    for (let col = cell.col - 1; col <= cell.col + 1; col += 1) {
      if (row === cell.row && col === cell.col) continue
      if (inBounds({ row, col }, grid)) cells.push({ row, col })
    }
  }
  return cells
}

export function allCells(grid: Grid): Cell[] {
  const cells: Cell[] = []
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) cells.push({ row, col })
  }
  return cells
}
