import { emptyMemory, rememberShot, type AiMemory } from '../ai/admiral'
import { allCells, inBounds, key, shipCells } from './geometry'
import { randomFleet } from './placement'
import { canFire, isFleetDestroyed, resolveShot, shotCount } from './resolve'
import { aiFleetSpec, ruleset, type DifficultyId, type Ruleset } from './rules'
import { pick, type Rng } from './rng'
import { emptySide, type Cell, type Placement, type ShotResult, type Side } from './types'

export type Commander = 'human' | 'ai'

/** Why the match ended, so the after-action screen can say something true. */
export type Ending = 'fleet-sunk' | 'powder-spent' | 'one-life'

/**
 * The log keeps results rather than sentences, so the wording can follow the
 * theme even if the commander switches theatre mid-match.
 */
export interface LogEntry {
  result: ShotResult
  by: Commander
}

export interface Match {
  rules: Ruleset
  /** The human's water. Admiral North fires here. */
  fleet: Side
  /** Admiral North's water. The human fires here. */
  enemy: Side
  turn: Commander
  /** Shots the commander on turn still has in this turn. */
  shotsLeft: number
  memory: AiMemory
  log: LogEntry[]
  winner: Commander | null
  ending: Ending | null
  /** When the human's clock started, for ranks that run one. */
  turnStartedAt: number | null
}

export function startMatch(
  placements: Placement[],
  difficulty: DifficultyId,
  rng: Rng,
  now: number = Date.now(),
): Match {
  const rules = ruleset(difficulty)
  const enemyFleet = aiFleetSpec(rules)
  return {
    rules,
    fleet: emptySide(rules.humanGrid, placements),
    enemy: emptySide(
      rules.aiGrid,
      randomFleet(enemyFleet, { grid: rules.aiGrid, minShipGap: rules.minShipGap }, rng),
    ),
    turn: 'human',
    shotsLeft: rules.shotsPerTurnHuman,
    memory: emptyMemory(rules.humanGrid, rules.fleet),
    log: [],
    winner: null,
    ending: null,
    turnStartedAt: rules.moveTimeMs === null ? null : now,
  }
}

export interface Turn {
  match: Match
  result: ShotResult
}

/** Shots the human has left in the whole match, or null when unlimited. */
export function powderLeft(match: Match): number | null {
  const budget = match.rules.matchShotBudgetHuman
  return budget === null ? null : Math.max(0, budget - shotCount(match.enemy))
}

function humanOutOfPowder(match: Match): boolean {
  return powderLeft(match) === 0
}

/**
 * Admiral North's destroyer slips one cell along its axis every fourth human
 * shot, provided nobody has touched it. Nothing is announced: the chart simply
 * stops being true.
 */
function driftAiFleet(enemy: Side): Side {
  const hulls = enemy.placements
  const destroyer = hulls.find(
    (p) =>
      p.id === 'destroyer' &&
      !enemy.sunk.includes(p.id) &&
      shipCells(p).every((c) => enemy.shots[key(c)] !== 'hit'),
  )
  if (!destroyer) return enemy

  const step = destroyer.orientation === 'horizontal' ? { row: 0, col: 1 } : { row: 1, col: 0 }
  const others = hulls.filter((p) => p.id !== destroyer.id)
  const blocked = new Set(others.flatMap(shipCells).map(key))

  for (const dir of [1, -1]) {
    const moved: Placement = {
      ...destroyer,
      row: destroyer.row + step.row * dir,
      col: destroyer.col + step.col * dir,
    }
    const cells = shipCells(moved)
    const legal =
      cells.every((c) => inBounds(c, enemy.grid)) &&
      cells.every((c) => !blocked.has(key(c))) &&
      cells.every((c) => enemy.shots[key(c)] !== 'hit')
    if (legal) return { ...enemy, placements: [...others, moved] }
  }
  return enemy
}

function endOfHumanShot(match: Match, enemy: Side, result: ShotResult, now: number): Turn {
  const won = isFleetDestroyed(enemy)
  const drifted =
    match.rules.movingShips && !won && shotCount(enemy) % 4 === 0 ? driftAiFleet(enemy) : enemy

  const next: Match = {
    ...match,
    enemy: drifted,
    log: [{ result, by: 'human' as const }, ...match.log].slice(0, 40),
  }

  if (won) {
    return { result, match: { ...next, winner: 'human', ending: 'fleet-sunk', turnStartedAt: null } }
  }
  if (humanOutOfPowder(next)) {
    return { result, match: { ...next, winner: 'ai', ending: 'powder-spent', turnStartedAt: null } }
  }

  const shotsLeft = match.shotsLeft - 1
  if (shotsLeft > 0) {
    return { result, match: { ...next, shotsLeft, turnStartedAt: match.rules.moveTimeMs === null ? null : now } }
  }
  return {
    result,
    match: {
      ...next,
      turn: 'ai',
      shotsLeft: match.rules.shotsPerTurnAi,
      turnStartedAt: null,
    },
  }
}

export function humanFires(match: Match, cell: Cell, now: number = Date.now()): Turn | null {
  if (match.winner || match.turn !== 'human') return null
  if (!inBounds(cell, match.enemy.grid) || !canFire(match.enemy, cell)) return null
  if (humanOutOfPowder(match)) return null

  const { side, result } = resolveShot(match.enemy, cell)
  return endOfHumanShot(match, side, result, now)
}

/** The clock ran out: the engine spends one legal shot rather than freezing. */
export function autoFire(match: Match, rng: Rng, now: number = Date.now()): Turn | null {
  if (match.winner || match.turn !== 'human') return null
  const open = allCells(match.enemy.grid).filter((c) => canFire(match.enemy, c))
  if (open.length === 0) return null
  return humanFires(match, pick(open, rng), now)
}

export function aiFires(match: Match, cell: Cell, now: number = Date.now()): Turn | null {
  if (match.winner || match.turn !== 'ai') return null
  if (!inBounds(cell, match.fleet.grid) || !canFire(match.fleet, cell)) return null

  const { side, result } = resolveShot(match.fleet, cell)
  const memory = rememberShot(match.memory, result)
  const wiped = isFleetDestroyed(side)
  const oneLifeLost = match.rules.oneLife && side.sunk.length > 0

  const next: Match = {
    ...match,
    fleet: side,
    memory,
    log: [{ result, by: 'ai' as const }, ...match.log].slice(0, 40),
  }

  if (wiped || oneLifeLost) {
    return {
      result,
      match: {
        ...next,
        winner: 'ai',
        ending: wiped ? 'fleet-sunk' : 'one-life',
        turnStartedAt: null,
      },
    }
  }

  const shotsLeft = match.shotsLeft - 1
  if (shotsLeft > 0) return { result, match: { ...next, shotsLeft } }
  return {
    result,
    match: {
      ...next,
      turn: 'human',
      shotsLeft: match.rules.shotsPerTurnHuman,
      turnStartedAt: match.rules.moveTimeMs === null ? null : now,
    },
  }
}

/** Milliseconds left on the human's clock, or null when the rank has none. */
export function timeLeft(match: Match, now: number): number | null {
  if (match.rules.moveTimeMs === null || match.turnStartedAt === null) return null
  return Math.max(0, match.rules.moveTimeMs - (now - match.turnStartedAt))
}

/** Restarts the clock, e.g. after the resolution animation has played. */
export function resetClock(match: Match, now: number): Match {
  if (match.rules.moveTimeMs === null || match.turn !== 'human' || match.winner) return match
  return { ...match, turnStartedAt: now }
}

export function shotsFired(match: Match): { human: number; ai: number } {
  return { human: shotCount(match.enemy), ai: shotCount(match.fleet) }
}
