import { shipSpec, type Cell, type Orientation, type Placement } from './types'

export const BOARD_SIZE = 10
export const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as const

export function key(cell: Cell): string {
  return `${cell.row},${cell.col}`
}

export function fromKey(k: string): Cell {
  const [row, col] = k.split(',').map(Number)
  return { row, col }
}

export function inBounds(cell: Cell): boolean {
  return cell.row >= 0 && cell.row < BOARD_SIZE && cell.col >= 0 && cell.col < BOARD_SIZE
}

/** Human-readable coordinate: column letter then 1-based row, e.g. B7. */
export function label(cell: Cell): string {
  return `${COLUMNS[cell.col]}${cell.row + 1}`
}

export function sameCell(a: Cell, b: Cell): boolean {
  return a.row === b.row && a.col === b.col
}

export function shipCells(placement: Placement): Cell[] {
  const { length } = shipSpec(placement.id)
  const cells: Cell[] = []
  for (let i = 0; i < length; i += 1) {
    cells.push(
      placement.orientation === 'horizontal'
        ? { row: placement.row, col: placement.col + i }
        : { row: placement.row + i, col: placement.col },
    )
  }
  return cells
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

export const ORTHOGONAL: Cell[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
]

export function neighbours(cell: Cell): Cell[] {
  return ORTHOGONAL.map((d) => ({ row: cell.row + d.row, col: cell.col + d.col })).filter(inBounds)
}

export function allCells(): Cell[] {
  const cells: Cell[] = []
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) cells.push({ row, col })
  }
  return cells
}
