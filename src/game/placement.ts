import { BOARD_SIZE, inBounds, key, shipCells, spanCells } from './geometry'
import { pick, type Rng } from './rng'
import { FLEET, shipSpec, type Cell, type Orientation, type Placement, type ShipId } from './types'

export type PlacementError = 'off-board' | 'overlap'

export interface PlacementCheck {
  cells: Cell[]
  error: PlacementError | null
}

/**
 * Official rules: ships sit horizontally or vertically, must fit entirely on the
 * board and may not overlap. Touching is allowed.
 */
export function checkPlacement(
  existing: readonly Placement[],
  candidate: Placement,
): PlacementCheck {
  const cells = shipCells(candidate)
  if (cells.some((c) => !inBounds(c))) return { cells, error: 'off-board' }

  const taken = new Set(
    existing.filter((p) => p.id !== candidate.id).flatMap(shipCells).map(key),
  )
  const clashing = cells.filter((c) => taken.has(key(c)))
  if (clashing.length > 0) return { cells: clashing, error: 'overlap' }

  return { cells, error: null }
}

export function isLegalPlacement(existing: readonly Placement[], candidate: Placement): boolean {
  return checkPlacement(existing, candidate).error === null
}

export function withPlacement(
  existing: readonly Placement[],
  candidate: Placement,
): Placement[] {
  return [...existing.filter((p) => p.id !== candidate.id), candidate]
}

export function legalStems(
  existing: readonly Placement[],
  id: ShipId,
  orientation: Orientation,
): Cell[] {
  const { length } = shipSpec(id)
  const stems: Cell[] = []
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const candidate: Placement = { id, row, col, orientation }
      if (spanCells({ row, col }, length, orientation).every(inBounds) &&
        isLegalPlacement(existing, candidate)) {
        stems.push({ row, col })
      }
    }
  }
  return stems
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

function drawFleet(rng: Rng): Placement[] {
  const placements: Placement[] = []
  for (const spec of FLEET) {
    const orientation: Orientation = rng() < 0.5 ? 'horizontal' : 'vertical'
    const options = legalStems(placements, spec.id, orientation)
    const fallback = options.length > 0 ? options : legalStems(placements, spec.id, 'horizontal')
    const stem = pick(fallback, rng)
    placements.push({ id: spec.id, orientation: fallback === options ? orientation : 'horizontal', ...stem })
  }
  return placements
}

/**
 * Rejection-samples a legal fleet, discarding layouts that huddle in one corner
 * and layouts that are all one orientation.
 */
export function randomFleet(rng: Rng, attempts = 60): Placement[] {
  let best = drawFleet(rng)
  let bestScore = -1
  for (let i = 0; i < attempts; i += 1) {
    const candidate = i === 0 ? best : drawFleet(rng)
    const { width, height } = fleetSpread(candidate)
    const horizontals = candidate.filter((p) => p.orientation === 'horizontal').length
    const mixed = horizontals > 0 && horizontals < candidate.length
    const score = Math.min(width, height) + (mixed ? 3 : 0)
    if (score > bestScore) {
      best = candidate
      bestScore = score
    }
    if (width >= 7 && height >= 7 && mixed) return candidate
  }
  return best
}
