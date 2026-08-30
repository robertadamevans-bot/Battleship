import { key, shipCells } from './geometry'
import type { Cell, Placement, ShipId, ShotResult, Side } from './types'

/** Both players fire through this resolver. Nothing else may read enemy placements. */
export function resolveShot(side: Side, cell: Cell): { side: Side; result: ShotResult } {
  const k = key(cell)
  if (side.shots[k] !== undefined) {
    throw new Error(`cell ${k} has already been fired at`)
  }

  const order = { ...side.order, [k]: shotCount(side) + 1 }
  const struck = side.placements.find((p) => shipCells(p).some((c) => key(c) === k))
  if (!struck) {
    return {
      side: { ...side, shots: { ...side.shots, [k]: 'miss' }, order },
      result: { cell, outcome: 'miss' },
    }
  }

  const shots = { ...side.shots, [k]: 'hit' as const }
  const sunk = shipCells(struck).every((c) => shots[key(c)] === 'hit')
  return {
    side: {
      ...side,
      shots,
      order,
      sunk: sunk ? [...side.sunk, struck.id] : side.sunk,
    },
    result: {
      cell,
      outcome: sunk ? 'sunk' : 'hit',
      shipId: struck.id,
      ...(struck.decoy ? { decoy: true } : {}),
    },
  }
}

export function canFire(side: Side, cell: Cell): boolean {
  return side.shots[key(cell)] === undefined
}

export function realShips(side: Side): Placement[] {
  return side.placements.filter((p) => !p.decoy)
}

/** Decoys hold water but not the match: victory needs every real hull sunk. */
export function isFleetDestroyed(side: Side): boolean {
  return realShips(side).every((p) => side.sunk.includes(p.id))
}

export function remainingSquares(side: Side): number {
  return realShips(side)
    .filter((p) => !side.sunk.includes(p.id))
    .reduce((n, p) => n + p.length, 0)
}

export function shipsAfloat(side: Side): ShipId[] {
  return realShips(side)
    .map((p) => p.id)
    .filter((id) => !side.sunk.includes(id))
}

export function shotCount(side: Side): number {
  return Object.keys(side.shots).length
}

export function hitCells(side: Side, placement: Placement): number {
  return shipCells(placement).filter((c) => side.shots[key(c)] === 'hit').length
}
