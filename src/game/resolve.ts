import { key, shipCells } from './geometry'
import { FLEET, shipSpec, type Cell, type ShipId, type ShotResult, type Side } from './types'

/** Both players fire through this resolver. Nothing else may read enemy placements. */
export function resolveShot(side: Side, cell: Cell): { side: Side; result: ShotResult } {
  const k = key(cell)
  if (side.shots[k] !== undefined) {
    throw new Error(`cell ${k} has already been fired at`)
  }

  const struck = side.placements.find((p) => shipCells(p).some((c) => key(c) === k))
  if (!struck) {
    return {
      side: { ...side, shots: { ...side.shots, [k]: 'miss' } },
      result: { cell, outcome: 'miss' },
    }
  }

  const shots = { ...side.shots, [k]: 'hit' as const }
  const sunk = shipCells(struck).every((c) => shots[key(c)] === 'hit')
  return {
    side: {
      ...side,
      shots,
      sunk: sunk ? [...side.sunk, struck.id] : side.sunk,
    },
    result: { cell, outcome: sunk ? 'sunk' : 'hit', shipId: struck.id },
  }
}

export function canFire(side: Side, cell: Cell): boolean {
  return side.shots[key(cell)] === undefined
}

export function isFleetDestroyed(side: Side): boolean {
  return side.sunk.length === FLEET.length
}

export function remainingSquares(side: Side): number {
  return side.placements
    .filter((p) => !side.sunk.includes(p.id))
    .reduce((n, p) => n + shipSpec(p.id).length, 0)
}

export function shipsAfloat(side: Side): ShipId[] {
  return FLEET.map((s) => s.id).filter((id) => !side.sunk.includes(id))
}

export function shotCount(side: Side): number {
  return Object.keys(side.shots).length
}
