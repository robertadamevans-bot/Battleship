export type ShipId =
  | 'carrier'
  | 'battleship'
  | 'cruiser'
  | 'submarine'
  | 'destroyer'
  | 'patrol'
  | 'decoy-a'
  | 'decoy-b'

export interface ShipSpec {
  id: ShipId
  name: string
  length: number
  /** Occupies water and can be struck, but sinking it wins nobody the match. */
  decoy?: boolean
}

export const SHIP_NAMES: Record<ShipId, string> = {
  carrier: 'Carrier',
  battleship: 'Battleship',
  cruiser: 'Cruiser',
  submarine: 'Submarine',
  destroyer: 'Destroyer',
  patrol: 'Patrol',
  'decoy-a': 'Ghost',
  'decoy-b': 'Ghost',
}

export const STANDARD_FLEET: readonly ShipSpec[] = [
  { id: 'carrier', name: 'Carrier', length: 5 },
  { id: 'battleship', name: 'Battleship', length: 4 },
  { id: 'cruiser', name: 'Cruiser', length: 3 },
  { id: 'submarine', name: 'Submarine', length: 3 },
  { id: 'destroyer', name: 'Destroyer', length: 2 },
]

export function fleetSquares(fleet: readonly ShipSpec[]): number {
  return fleet.filter((s) => !s.decoy).reduce((n, s) => n + s.length, 0)
}

export type Orientation = 'horizontal' | 'vertical'

export interface Cell {
  row: number
  col: number
}

export interface Grid {
  rows: number
  cols: number
}

/**
 * A ship anchored at its stem cell (topmost / leftmost occupied square). Length
 * travels with the placement so no part of the engine needs a global fleet.
 */
export interface Placement extends Cell {
  id: ShipId
  orientation: Orientation
  length: number
  decoy?: boolean
}

export function placementOf(spec: ShipSpec, stem: Cell, orientation: Orientation): Placement {
  return {
    id: spec.id,
    length: spec.length,
    orientation,
    row: stem.row,
    col: stem.col,
    ...(spec.decoy ? { decoy: true } : {}),
  }
}

export type Outcome = 'miss' | 'hit' | 'sunk'

export interface ShotResult {
  cell: Cell
  outcome: Outcome
  /** Present when the shot hit, naming the ship struck. */
  shipId?: ShipId
  /** True when the ship struck was a decoy, so the copy can stay vague. */
  decoy?: boolean
}

/** One player's water: the grid it sits on, their fleet, and every shot taken at it. */
export interface Side {
  grid: Grid
  placements: Placement[]
  /** cell key -> 'miss' | 'hit' */
  shots: Record<string, 'miss' | 'hit'>
  /**
   * cell key -> which shot at this side it was (1-based). Fog ages misses by
   * comparing this against the shot count, so history is never rewritten.
   */
  order: Record<string, number>
  sunk: ShipId[]
}

export function emptySide(grid: Grid, placements: Placement[] = []): Side {
  return { grid, placements, shots: {}, order: {}, sunk: [] }
}
