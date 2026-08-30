import { inBounds, key, shipCells, spanCells, surrounding } from './geometry'
import { pick, type Rng } from './rng'
import {
  placementOf,
  type Cell,
  type Grid,
  type Orientation,
  type Placement,
  type ShipId,
  type ShipSpec,
} from './types'

export type PlacementError = 'off-board' | 'overlap' | 'too-close'

export interface PlacementCheck {
  cells: Cell[]
  error: PlacementError | null
}

export interface PlacementRules {
  grid: Grid
  /** 0 lets hulls touch; 1 demands a clear cell all round, corners included. */
  minShipGap: 0 | 1
}

/**
 * Ships sit horizontally or vertically, must fit entirely on the board and may
 * not overlap. With a gap of 1 they may not touch at all, not even at a corner.
 */
export function checkPlacement(
  existing: readonly Placement[],
  candidate: Placement,
  rules: PlacementRules,
): PlacementCheck {
  const cells = shipCells(candidate)
  if (cells.some((c) => !inBounds(c, rules.grid))) return { cells, error: 'off-board' }

  const others = existing.filter((p) => p.id !== candidate.id)
  const taken = new Set(others.flatMap(shipCells).map(key))
  const clashing = cells.filter((c) => taken.has(key(c)))
  if (clashing.length > 0) return { cells: clashing, error: 'overlap' }

  if (rules.minShipGap === 1) {
    const halo = new Set(
      others.flatMap(shipCells).flatMap((c) => surrounding(c, rules.grid)).map(key),
    )
    const crowding = cells.filter((c) => halo.has(key(c)))
    if (crowding.length > 0) return { cells: crowding, error: 'too-close' }
  }

  return { cells, error: null }
}

export function isLegalPlacement(
  existing: readonly Placement[],
  candidate: Placement,
  rules: PlacementRules,
): boolean {
  return checkPlacement(existing, candidate, rules).error === null
}

export function withPlacement(
  existing: readonly Placement[],
  candidate: Placement,
): Placement[] {
  return [...existing.filter((p) => p.id !== candidate.id), candidate]
}

export function legalStems(
  existing: readonly Placement[],
  spec: ShipSpec,
  orientation: Orientation,
  rules: PlacementRules,
): Cell[] {
  const stems: Cell[] = []
  for (let row = 0; row < rules.grid.rows; row += 1) {
    for (let col = 0; col < rules.grid.cols; col += 1) {
      const candidate = placementOf(spec, { row, col }, orientation)
      if (
        spanCells({ row, col }, spec.length, orientation).every((c) => inBounds(c, rules.grid)) &&
        isLegalPlacement(existing, candidate, rules)
      ) {
        stems.push({ row, col })
      }
    }
  }
  return stems
}

export function specFor(fleet: readonly ShipSpec[], id: ShipId): ShipSpec {
  const spec = fleet.find((s) => s.id === id)
  if (!spec) throw new Error(`unknown ship: ${id}`)
  return spec
}

/** Bounding box of the whole fleet, used to reject corner-clustered layouts. */
function fleetSpread(placements: readonly Placement[]): { width: number; height: number } {
  const cells = placements.flatMap(shipCells)
  const rows = cells.map((c) => c.row)
  const cols = cells.map((c) => c.col)
  return {
    height: Math.max(...rows) - Math.min(...rows) + 1,
    width: Math.max(...cols) - Math.min(...cols) + 1,
  }
}

function drawFleet(
  fleet: readonly ShipSpec[],
  rules: PlacementRules,
  rng: Rng,
): Placement[] | null {
  const placements: Placement[] = []
  // Longest first: a packed board runs out of room for big hulls, not small ones.
  for (const spec of [...fleet].sort((a, b) => b.length - a.length)) {
    const wanted: Orientation = rng() < 0.5 ? 'horizontal' : 'vertical'
    const options = legalStems(placements, spec, wanted, rules)
    const orientation: Orientation = options.length > 0
      ? wanted
      : wanted === 'horizontal' ? 'vertical' : 'horizontal'
    const stems = options.length > 0 ? options : legalStems(placements, spec, orientation, rules)
    if (stems.length === 0) return null
    placements.push(placementOf(spec, pick(stems, rng), orientation))
  }
  return fleet.map((spec) => placements.find((p) => p.id === spec.id)!)
}

/**
 * Rejection-samples a legal fleet, discarding layouts that huddle in one corner
 * and layouts that are all one orientation.
 */
export function randomFleet(
  fleet: readonly ShipSpec[],
  rules: PlacementRules,
  rng: Rng,
  attempts = 80,
): Placement[] {
  let best: Placement[] | null = null
  let bestScore = -1
  const roomy = Math.floor(Math.min(rules.grid.rows, rules.grid.cols) * 0.7)

  for (let i = 0; i < attempts; i += 1) {
    const candidate = drawFleet(fleet, rules, rng)
    if (!candidate) continue
    const { width, height } = fleetSpread(candidate)
    const horizontals = candidate.filter((p) => p.orientation === 'horizontal').length
    const mixed = horizontals > 0 && horizontals < candidate.length
    const score = Math.min(width, height) + (mixed ? 3 : 0)
    if (score > bestScore) {
      best = candidate
      bestScore = score
    }
    if (width >= roomy && height >= roomy && mixed) return candidate
  }
  if (!best) throw new Error('no legal fleet layout for these rules')
  return best
}
