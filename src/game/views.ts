import { key, shipCells } from './geometry'
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

/**
 * What the human may see of Admiral North's water: their own shots, plus the
 * outline of ships already sunk. Intact enemy ships are not in the returned map
 * at all, so they cannot leak into the DOM before the reveal.
 */
export function fireView(enemy: Side, reveal: boolean): Map<string, CellView> {
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
  for (const [k, outcome] of Object.entries(enemy.shots)) {
    if (views.get(k) === 'sunk') continue
    views.set(k, outcome)
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
