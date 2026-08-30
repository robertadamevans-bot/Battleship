import { EMPTY_MEMORY, rememberShot, type AiMemory, type Difficulty } from '../ai/admiral'
import { label } from './geometry'
import { randomFleet } from './placement'
import { canFire, isFleetDestroyed, resolveShot, shotCount } from './resolve'
import { shipSpec, type Cell, type Placement, type ShotResult, type Side } from './types'
import type { Rng } from './rng'

export type Commander = 'human' | 'ai'

export interface Match {
  /** The human's water. Admiral North fires here. */
  fleet: Side
  /** Admiral North's water. The human fires here. */
  enemy: Side
  turn: Commander
  memory: AiMemory
  difficulty: Difficulty
  log: string[]
  winner: Commander | null
}

export function startMatch(
  placements: Placement[],
  difficulty: Difficulty,
  rng: Rng,
): Match {
  return {
    fleet: { placements, shots: {}, sunk: [] },
    enemy: { placements: randomFleet(rng), shots: {}, sunk: [] },
    turn: 'human',
    memory: EMPTY_MEMORY,
    difficulty,
    log: [],
    winner: null,
  }
}

/** Plain-English resolution line, e.g. "C2 — you sank the Submarine". */
export function describe(result: ShotResult, by: Commander): string {
  const where = label(result.cell)
  const name = result.shipId ? shipSpec(result.shipId).name : ''
  if (by === 'human') {
    if (result.outcome === 'sunk') return `${where} — you sank the ${name}`
    return `${where} ${result.outcome}`
  }
  if (result.outcome === 'sunk') return `${where} — your ${name} is gone`
  return `North: ${where} ${result.outcome}`
}

export interface Turn {
  match: Match
  result: ShotResult
}

export function humanFires(match: Match, cell: Cell): Turn | null {
  if (match.winner || match.turn !== 'human' || !canFire(match.enemy, cell)) return null

  const { side, result } = resolveShot(match.enemy, cell)
  const won = isFleetDestroyed(side)
  return {
    result,
    match: {
      ...match,
      enemy: side,
      turn: won ? 'human' : 'ai',
      winner: won ? 'human' : null,
      log: [describe(result, 'human'), ...match.log].slice(0, 40),
    },
  }
}

export function aiFires(match: Match, cell: Cell): Turn | null {
  if (match.winner || match.turn !== 'ai' || !canFire(match.fleet, cell)) return null

  const { side, result } = resolveShot(match.fleet, cell)
  const won = isFleetDestroyed(side)
  return {
    result,
    match: {
      ...match,
      fleet: side,
      memory: rememberShot(match.memory, result),
      turn: won ? 'ai' : 'human',
      winner: won ? 'ai' : null,
      log: [describe(result, 'ai'), ...match.log].slice(0, 40),
    },
  }
}

export function shotsFired(match: Match): { human: number; ai: number } {
  return { human: shotCount(match.enemy), ai: shotCount(match.fleet) }
}
