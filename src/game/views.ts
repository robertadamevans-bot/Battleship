import { fromKey, key, neighbours, shipCells } from './geometry'
import { shotCount } from './resolve'
import type { FogConfig } from './rules'
import type { Side } from './types'

export type CellView =
  | 'water'
  | 'ship'
  | 'ship-hit'
  | 'ship-sunk'
  | 'miss'
  | 'hit'
  | 'sunk'
  | 'ghost'
  | 'ghost-bad'
  | 'reveal'
  /** A spent miss the chart has forgotten. Still spent, no longer marked. */
  | 'uncertain'
  /** Cadet-only range pip beside an unsunk hit. A hint, not a shot. */
  | 'range'

export interface FireViewOptions {
  reveal?: boolean
  fog?: FogConfig
  adjacentHitIndicators?: boolean
}

/**
 * What the human may see of Admiral North's water: their own shots, plus the
 * outline of ships already sunk. Intact enemy ships are not in the returned map
 * at all, so they cannot leak into the DOM before the reveal.
 */
export function fireView(enemy: Side, options: FireViewOptions = {}): Map<string, CellView> {
  const { reveal = false, fog, adjacentHitIndicators = false } = options
  const views = new Map<string, CellView>()

  if (reveal) {
    for (const placement of enemy.placements) {
      for (const cell of shipCells(placement)) views.set(key(cell), 'reveal')
    }
  }
  for (const placement of enemy.placements) {
    if (!enemy.sunk.includes(placement.id)) continue
    for (const cell of shipCells(placement)) views.set(key(cell), 'sunk')
  }

  const fired = shotCount(enemy)
  for (const [k, outcome] of Object.entries(enemy.shots)) {
    if (views.get(k) === 'sunk') continue
    if (outcome === 'miss' && !reveal && fog?.enabled) {
      const age = fired - (enemy.order[k] ?? fired)
      views.set(k, age > fog.fadeAfterRounds ? 'uncertain' : 'miss')
      continue
    }
    views.set(k, outcome)
  }

  if (adjacentHitIndicators && !reveal) {
    for (const [k, outcome] of Object.entries(enemy.shots)) {
      if (outcome !== 'hit' || views.get(k) === 'sunk') continue
      for (const n of neighbours(fromKey(k), enemy.grid)) {
        if (!views.has(key(n))) views.set(key(n), 'range')
      }
    }
  }

  return views
}

/** The human's own water: their fleet and every shot Admiral North has taken. */
export function fleetView(own: Side): Map<string, CellView> {
  const views = new Map<string, CellView>()
  for (const placement of own.placements) {
    const sunk = own.sunk.includes(placement.id)
    for (const cell of shipCells(placement)) {
      views.set(key(cell), sunk ? 'ship-sunk' : 'ship')
    }
  }
  for (const [k, outcome] of Object.entries(own.shots)) {
    if (outcome === 'miss') views.set(k, 'miss')
    else if (views.get(k) !== 'ship-sunk') views.set(k, 'ship-hit')
  }
  return views
}
