import { describe, expect, it } from 'vitest'
import {
  aiFires,
  autoFire,
  humanFires,
  powderLeft,
  resetClock,
  startMatch,
  timeLeft,
  type Match,
} from './match'
import { nextShot } from '../ai/admiral'
import { seeded } from './rng'
import { key, shipCells } from './geometry'
import { randomFleet } from './placement'
import { canFire, shotCount } from './resolve'
import { ruleset, type DifficultyId } from './rules'
import type { Cell } from './types'

const rng = seeded(3)

function match(difficulty: DifficultyId = 'officer', now = 0): Match {
  const rules = ruleset(difficulty)
  const fleet = randomFleet(
    rules.fleet,
    { grid: rules.humanGrid, minShipGap: rules.minShipGap },
    seeded(11),
  )
  return startMatch(fleet, difficulty, seeded(12), now)
}

/** Fires at open water on the enemy board, avoiding every hull. */
function openEnemyWater(state: Match, count: number): Cell[] {
  const taken = new Set(state.enemy.placements.flatMap(shipCells).map(key))
  const cells: Cell[] = []
  for (let row = 0; row < state.enemy.grid.rows && cells.length < count; row += 1) {
    for (let col = 0; col < state.enemy.grid.cols && cells.length < count; col += 1) {
      if (!taken.has(`${row},${col}`) && canFire(state.enemy, { row, col })) {
        cells.push({ row, col })
      }
    }
  }
  return cells
}

/** Plays both sides until the predicate holds or the guard trips. */
function play(state: Match, done: (m: Match) => boolean, guard = 400): Match {
  let current = state
  let steps = 0
  while (!current.winner && !done(current) && steps < guard) {
    steps += 1
    if (current.turn === 'human') {
      const open = openEnemyWater(current, 1)[0] ?? { row: 0, col: 0 }
      const turn = humanFires(current, open, steps)
      if (turn) current = turn.match
      else break
    } else {
      const shot = nextShot(current.memory, current.rules.aiProfile, rng)
      const turn = aiFires(current, shot.cell, steps)
      if (!turn) break
      current = turn.match
    }
  }
  return current
}

describe('turn structure', () => {
  it('gives the human the first shot and then passes the turn', () => {
    const start = match()
    expect(start.turn).toBe('human')
    const turn = humanFires(start, { row: 0, col: 0 })!
    expect(turn.match.turn).toBe('ai')
  })

  it('ignores a second human shot before the AI has replied', () => {
    const turn = humanFires(match(), { row: 0, col: 0 })!
    expect(humanFires(turn.match, { row: 1, col: 1 })).toBeNull()
  })

  it('ignores a repeat shot at an already resolved cell', () => {
    let state = humanFires(match(), { row: 0, col: 0 })!.match
    state = aiFires(state, nextShot(state.memory, 'standard', rng).cell)!.match
    expect(humanFires(state, { row: 0, col: 0 })).toBeNull()
  })

  it('refuses a shot outside the rank grid', () => {
    expect(humanFires(match('commander'), { row: 9, col: 0 })).toBeNull()
  })

  it('ends immediately when the last enemy square falls, with no ghost AI turn', () => {
    let state = match()
    for (const cell of state.enemy.placements.flatMap(shipCells)) {
      const turn = humanFires(state, cell)
      expect(turn).not.toBeNull()
      state = turn!.match
      if (state.winner) break
      state = aiFires(state, nextShot(state.memory, 'standard', rng).cell)!.match
    }
    expect(state.winner).toBe('human')
    expect(state.enemy.sunk).toHaveLength(5)
    expect(aiFires(state, { row: 0, col: 0 })).toBeNull()
    expect(humanFires(state, { row: 9, col: 9 })).toBeNull()
  })

  it('plays a full match at every rank to a single winner', () => {
    for (const rank of ['cadet', 'officer', 'commander', 'admiral', 'legend'] as const) {
      let state = match(rank)
      let guard = 0
      while (!state.winner && guard < 600) {
        guard += 1
        if (state.turn === 'human') {
          const open = state.enemy.placements
            .flatMap(shipCells)
            .find((c) => canFire(state.enemy, c))
          const turn = humanFires(state, open ?? openEnemyWater(state, 1)[0], guard)
          if (turn) state = turn.match
        } else {
          const shot = nextShot(state.memory, state.rules.aiProfile, rng)
          state = aiFires(state, shot.cell, guard)!.match
        }
      }
      expect(state.winner).not.toBeNull()
      expect(state.log[0].result.outcome).toMatch(/miss|hit|sunk/)
      expect(state.log[0].by).toMatch(/human|ai/)
    }
  })

  it('sets the rank on the match and does not carry the last one over', () => {
    expect(match('commander').rules.id).toBe('commander')
    expect(match('legend').enemy.grid).toEqual({ rows: 8, cols: 12 })
    expect(match('legend').fleet.grid).toEqual({ rows: 10, cols: 10 })
  })
})

describe('Commander shot budget', () => {
  it('allows the forty-second shot and refuses the forty-third', () => {
    let state = match('commander')
    expect(powderLeft(state)).toBe(42)

    let fired = 0
    while (fired < 42) {
      const open = openEnemyWater(state, 1)[0]
      const turn = humanFires(state, open)
      expect(turn).not.toBeNull()
      state = turn!.match
      fired += 1
      if (fired === 42) break
      state = aiFires(state, nextShot(state.memory, state.rules.aiProfile, rng).cell)!.match
    }

    expect(shotCount(state.enemy)).toBe(42)
    expect(powderLeft(state)).toBe(0)
    expect(humanFires(state, openEnemyWater(state, 1)[0])).toBeNull()
  })

  it('loses the action the moment the powder runs out with North still afloat', () => {
    const state = play(match('commander'), (m) => powderLeft(m) === 0)
    expect(state.winner).toBe('ai')
    expect(state.ending).toBe('powder-spent')
  })

  it('leaves other ranks unlimited', () => {
    expect(powderLeft(match('officer'))).toBeNull()
    expect(powderLeft(match('legend'))).toBeNull()
  })
})

describe('the clock', () => {
  it('runs only on ranks that have one', () => {
    expect(timeLeft(match('officer', 0), 5000)).toBeNull()
    expect(timeLeft(match('admiral', 0), 5000)).toBe(7000)
    expect(timeLeft(match('legend', 0), 5000)).toBe(3000)
    expect(timeLeft(match('admiral', 0), 99000)).toBe(0)
  })

  it('spends exactly one legal shot when time runs out, and passes the turn', () => {
    const state = match('admiral', 0)
    const turn = autoFire(state, seeded(4), 12000)!
    expect(shotCount(turn.match.enemy)).toBe(1)
    expect(turn.match.turn).toBe('ai')
    expect(canFire(turn.match.enemy, turn.result.cell)).toBe(false)
  })

  it('restarts on the human turn and stops while North is ranging', () => {
    const start = match('admiral', 0)
    const afterHuman = humanFires(start, openEnemyWater(start, 1)[0], 1000)!.match
    expect(afterHuman.turnStartedAt).toBeNull()
    expect(timeLeft(afterHuman, 2000)).toBeNull()

    const afterAi = aiFires(
      afterHuman,
      nextShot(afterHuman.memory, afterHuman.rules.aiProfile, rng).cell,
      3000,
    )!.match
    expect(timeLeft(afterAi, 3000)).toBe(12000)
    expect(timeLeft(resetClock(afterAi, 9000), 9000)).toBe(12000)
  })

  it('never auto-fires once the match is over', () => {
    const state = { ...match('admiral', 0), winner: 'human' as const }
    expect(autoFire(state, seeded(4), 99000)).toBeNull()
  })
})

describe('Fleet Legend', () => {
  it('loses the match on the first human ship sunk', () => {
    let state = match('legend')
    const destroyer = state.fleet.placements.find((p) => p.id === 'destroyer')!
    const cells = shipCells(destroyer)

    state = humanFires(state, openEnemyWater(state, 1)[0])!.match
    state = aiFires(state, cells[0])!.match
    expect(state.winner).toBeNull()

    state = humanFires(state, openEnemyWater(state, 1)[0])!.match
    const killing = aiFires(state, cells[1])!
    expect(killing.result.outcome).toBe('sunk')
    expect(killing.match.winner).toBe('ai')
    expect(killing.match.ending).toBe('one-life')
    // One ship down, four still afloat: the rank, not the fleet, ended it.
    expect(killing.match.fleet.sunk).toEqual(['destroyer'])
  })

  it('does not end the match when only the decoys are sunk', () => {
    let state = match('legend')
    const decoys = state.enemy.placements.filter((p) => p.decoy)
    expect(decoys).toHaveLength(2)
    for (const decoy of decoys) {
      for (const cell of shipCells(decoy)) {
        const turn = humanFires(state, cell)
        if (!turn) continue
        state = turn.match
        if (state.turn === 'ai') {
          state = aiFires(state, nextShot(state.memory, state.rules.aiProfile, rng).cell)!.match
        }
      }
    }
    expect(state.enemy.sunk).toContain('decoy-a')
    expect(state.winner).toBeNull()
  })

  it('slips an untouched destroyer one cell after every fourth human shot', () => {
    let state = match('legend')
    const before = state.enemy.placements.find((p) => p.id === 'destroyer')!
    const water = openEnemyWater(state, 8).filter(
      (c) => !shipCells(before).some((s) => s.row === c.row && s.col === c.col),
    )

    for (let i = 0; i < 4; i += 1) {
      state = humanFires(state, water[i])!.match
      if (i < 3) {
        state = aiFires(state, nextShot(state.memory, state.rules.aiProfile, rng).cell)!.match
      }
    }

    const after = state.enemy.placements.find((p) => p.id === 'destroyer')!
    const distance = Math.abs(after.row - before.row) + Math.abs(after.col - before.col)
    expect(distance).toBe(1)
    expect(after.orientation).toBe(before.orientation)
    expect(shipCells(after).every((c) => state.enemy.shots[key(c)] !== 'hit')).toBe(true)
  })

  it('keeps a wounded destroyer where it lies', () => {
    let state = match('legend')
    const before = state.enemy.placements.find((p) => p.id === 'destroyer')!
    const wound = shipCells(before)[0]

    state = humanFires(state, wound)!.match
    const water = openEnemyWater(state, 6)
    for (let i = 0; i < 3; i += 1) {
      state = aiFires(state, nextShot(state.memory, state.rules.aiProfile, rng).cell)!.match
      state = humanFires(state, water[i])!.match
    }

    const after = state.enemy.placements.find((p) => p.id === 'destroyer')!
    expect({ row: after.row, col: after.col }).toEqual({ row: before.row, col: before.col })
  })

  it('leaves ships still on ranks without movement', () => {
    let state = match('admiral')
    const before = state.enemy.placements.find((p) => p.id === 'destroyer')!
    const water = openEnemyWater(state, 8).filter(
      (c) => !shipCells(before).some((s) => s.row === c.row && s.col === c.col),
    )
    for (let i = 0; i < 4; i += 1) {
      state = humanFires(state, water[i])!.match
      if (i < 3) {
        state = aiFires(state, nextShot(state.memory, state.rules.aiProfile, rng).cell)!.match
      }
    }
    const after = state.enemy.placements.find((p) => p.id === 'destroyer')!
    expect({ row: after.row, col: after.col }).toEqual({ row: before.row, col: before.col })
  })
})

describe('what the AI is allowed to know', () => {
  it('never sees the human placements, only its own results', () => {
    const state = match('legend')
    expect(state.memory.shots).toEqual({})
    expect(Object.keys(state.memory)).not.toContain('placements')
    expect(state.memory.fleet.map((s) => s.id)).toEqual(
      state.rules.fleet.map((s) => s.id),
    )
  })
})
