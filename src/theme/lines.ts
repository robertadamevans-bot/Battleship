import { label } from '../game/geometry'
import type { LogEntry } from '../game/match'
import type { ShipId } from '../game/types'
import type { ThemeCopy } from './themes'

/** The tray and log name ships in the theme's idiom; the engine's ids never change. */
export function shipName(id: ShipId, copy: ThemeCopy): string {
  return copy.shipAlias[id]
}

/** One resolution line, worded for the current theatre. */
export function resolutionLine(entry: LogEntry, copy: ThemeCopy): string {
  const where = label(entry.result.cell)
  const mine = entry.by === 'human'
  const ship = entry.result.shipId ? shipName(entry.result.shipId, copy) : ''

  // A decoy is never named: the commander is told there was something there.
  if (entry.result.decoy) {
    return entry.result.outcome === 'sunk' ? copy.ghostSunk(where) : copy.ghostHit(where)
  }

  switch (entry.result.outcome) {
    case 'miss':
      return mine ? copy.miss(where) : copy.theirMiss(where)
    case 'hit':
      return mine ? copy.hit(where) : copy.theirHit(where)
    case 'sunk':
      return mine ? copy.sunk(where, ship) : copy.theirSunk(where, ship)
  }
}
