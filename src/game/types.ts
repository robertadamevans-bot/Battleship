export type ShipId = 'carrier' | 'battleship' | 'cruiser' | 'submarine' | 'destroyer'

export interface ShipSpec {
  id: ShipId
  name: string
  length: number
}

export const FLEET: readonly ShipSpec[] = [
  { id: 'carrier', name: 'Carrier', length: 5 },
  { id: 'battleship', name: 'Battleship', length: 4 },
  { id: 'cruiser', name: 'Cruiser', length: 3 },
  { id: 'submarine', name: 'Submarine', length: 3 },
  { id: 'destroyer', name: 'Destroyer', length: 2 },
]

export const FLEET_SQUARES = FLEET.reduce((n, s) => n + s.length, 0)

export function shipSpec(id: ShipId): ShipSpec {
  const spec = FLEET.find((s) => s.id === id)
  if (!spec) throw new Error(`unknown ship: ${id}`)
  return spec
}

export type Orientation = 'horizontal' | 'vertical'

export interface Cell {
  row: number
  col: number
}

/** A ship anchored at its stem cell (topmost / leftmost occupied square). */
export interface Placement extends Cell {
  id: ShipId
  orientation: Orientation
}

export type Outcome = 'miss' | 'hit' | 'sunk'

export interface ShotResult {
  cell: Cell
  outcome: Outcome
  /** Present when the shot hit, naming the ship struck. */
  shipId?: ShipId
}

/** One player's water: their fleet plus every shot taken at it. */
export interface Side {
  placements: Placement[]
  /** cell key -> 'miss' | 'hit' */
  shots: Record<string, 'miss' | 'hit'>
  sunk: ShipId[]
}

export const EMPTY_SIDE: Side = { placements: [], shots: {}, sunk: [] }
