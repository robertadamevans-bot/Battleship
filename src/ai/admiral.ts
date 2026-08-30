import {
  BOARD_SIZE,
  allCells,
  fromKey,
  inBounds,
  key,
  neighbours,
  spanCells,
} from '../game/geometry'
import { pick, type Rng } from '../game/rng'
import { FLEET, shipSpec, type Cell, type Orientation, type ShipId, type ShotResult } from '../game/types'

export type Difficulty = 'admiral' | 'cadet'

/**
 * Everything Admiral North is allowed to know: the results of its own shots.
 * It never sees the human's placements — only what the shot resolver told it.
 */
export interface AiMemory {
  shots: Record<string, 'miss' | 'hit'>
  /** Hit cells attributed to a ship that is already sunk. */
  resolved: string[]
  sunk: ShipId[]
}

export const EMPTY_MEMORY: AiMemory = { shots: {}, resolved: [], sunk: [] }

function hitKeys(memory: AiMemory): string[] {
  return Object.keys(memory.shots).filter((k) => memory.shots[k] === 'hit')
}

function unresolvedHits(memory: AiMemory): Cell[] {
  const resolved = new Set(memory.resolved)
  return hitKeys(memory)
    .filter((k) => !resolved.has(k))
    .map(fromKey)
}

/** Walks the contiguous run of hits through `cell` along one axis. */
function hitRun(hits: Set<string>, cell: Cell, orientation: Orientation): Cell[] {
  const step = orientation === 'horizontal' ? { row: 0, col: 1 } : { row: 1, col: 0 }
  const run: Cell[] = [cell]
  for (const dir of [-1, 1]) {
    let next = { row: cell.row + step.row * dir, col: cell.col + step.col * dir }
    while (inBounds(next) && hits.has(key(next))) {
      if (dir < 0) run.unshift(next)
      else run.push(next)
      next = { row: next.row + step.row * dir, col: next.col + step.col * dir }
    }
  }
  return run
}

/**
 * A sink names the ship but not its squares, so work out which hits belonged to
 * it: the contiguous run through the killing shot that matches the ship length.
 */
function attributeSunkCells(memory: AiMemory, killing: Cell, id: ShipId): string[] {
  const { length } = shipSpec(id)
  const resolved = new Set(memory.resolved)
  const hits = new Set(hitKeys(memory).filter((k) => !resolved.has(k)))
  hits.add(key(killing))

  for (const orientation of ['horizontal', 'vertical'] as Orientation[]) {
    const run = hitRun(hits, killing, orientation)
    if (run.length < length) continue
    const index = run.findIndex((c) => c.row === killing.row && c.col === killing.col)
    const start = Math.max(0, Math.min(index, run.length - length))
    return run.slice(start, start + length).map(key)
  }
  return [key(killing)]
}

export function rememberShot(memory: AiMemory, result: ShotResult): AiMemory {
  const k = key(result.cell)
  const next: AiMemory = {
    shots: { ...memory.shots, [k]: result.outcome === 'miss' ? 'miss' : 'hit' },
    resolved: memory.resolved,
    sunk: memory.sunk,
  }
  if (result.outcome === 'sunk' && result.shipId) {
    next.sunk = [...memory.sunk, result.shipId]
    next.resolved = [...memory.resolved, ...attributeSunkCells(memory, result.cell, result.shipId)]
  }
  return next
}

function afloat(memory: AiMemory): ShipId[] {
  return FLEET.map((s) => s.id).filter((id) => !memory.sunk.includes(id))
}

/**
 * Occupancy heatmap: for every square, how many ways could each remaining ship
 * still sit there given the misses and the ships already sunk. Squares that
 * would complete a known-but-unsunk hit are weighted heavily.
 */
export function heatmap(memory: AiMemory): Map<string, number> {
  const scores = new Map<string, number>()
  const resolved = new Set(memory.resolved)
  const live = new Set(unresolvedHits(memory).map(key))

  const blocked = (c: Cell) => memory.shots[key(c)] === 'miss' || resolved.has(key(c))

  for (const id of afloat(memory)) {
    const { length } = shipSpec(id)
    for (const orientation of ['horizontal', 'vertical'] as Orientation[]) {
      for (let row = 0; row < BOARD_SIZE; row += 1) {
        for (let col = 0; col < BOARD_SIZE; col += 1) {
          const cells = spanCells({ row, col }, length, orientation)
          if (!cells.every(inBounds) || cells.some(blocked)) continue
          const covered = cells.filter((c) => live.has(key(c))).length
          const weight = 1 + covered * 12
          for (const c of cells) {
            if (memory.shots[key(c)] !== undefined) continue
            scores.set(key(c), (scores.get(key(c)) ?? 0) + weight)
          }
        }
      }
    }
  }
  return scores
}

function clusters(hits: Cell[]): Cell[][] {
  const remaining = new Map(hits.map((c) => [key(c), c]))
  const groups: Cell[][] = []
  while (remaining.size > 0) {
    const [firstKey] = remaining.keys()
    const stack = [remaining.get(firstKey)!]
    remaining.delete(firstKey)
    const group: Cell[] = []
    while (stack.length > 0) {
      const cell = stack.pop()!
      group.push(cell)
      for (const n of neighbours(cell)) {
        if (remaining.has(key(n))) {
          stack.push(remaining.get(key(n))!)
          remaining.delete(key(n))
        }
      }
    }
    groups.push(group)
  }
  return groups
}

function unfired(memory: AiMemory, cell: Cell): boolean {
  return inBounds(cell) && memory.shots[key(cell)] === undefined
}

/** Cells worth probing next given an unresolved cluster of hits. */
export function targetCandidates(memory: AiMemory): Cell[] {
  const groups = clusters(unresolvedHits(memory)).sort((a, b) => b.length - a.length)
  for (const group of groups) {
    const sameRow = group.every((c) => c.row === group[0].row)
    const sameCol = group.every((c) => c.col === group[0].col)

    if (group.length > 1 && (sameRow || sameCol)) {
      const orientation: Orientation = sameRow ? 'horizontal' : 'vertical'
      const sorted = [...group].sort((a, b) =>
        orientation === 'horizontal' ? a.col - b.col : a.row - b.row,
      )
      const step = orientation === 'horizontal' ? { row: 0, col: 1 } : { row: 1, col: 0 }
      const head = sorted[0]
      const tail = sorted[sorted.length - 1]
      const ends = [
        { row: head.row - step.row, col: head.col - step.col },
        { row: tail.row + step.row, col: tail.col + step.col },
      ].filter((c) => unfired(memory, c))
      if (ends.length > 0) return ends
    }

    const probes = group.flatMap(neighbours).filter((c) => unfired(memory, c))
    if (probes.length > 0) return probes
  }
  return []
}

function huntCandidates(memory: AiMemory): Cell[] {
  const open = allCells().filter((c) => unfired(memory, c))
  const smallest = Math.min(...afloat(memory).map((id) => shipSpec(id).length))
  const parity = open.filter((c) => (c.row + c.col) % smallest === 0)
  return parity.length > 0 ? parity : open
}

function best(cells: Cell[], memory: AiMemory, difficulty: Difficulty, rng: Rng): Cell {
  if (difficulty === 'cadet') return pick(cells, rng)
  const scores = heatmap(memory)
  const top = cells.reduce((max, c) => Math.max(max, scores.get(key(c)) ?? 0), -1)
  const shortlist = cells.filter((c) => (scores.get(key(c)) ?? 0) === top)
  return pick(shortlist.length > 0 ? shortlist : cells, rng)
}

export interface AiShot {
  cell: Cell
  mode: 'hunt' | 'target'
}

/** Hunt/target with parity search. Never returns a square it has already fired at. */
export function nextShot(memory: AiMemory, difficulty: Difficulty, rng: Rng): AiShot {
  const targets = targetCandidates(memory)
  if (targets.length > 0) {
    return { cell: best(targets, memory, difficulty, rng), mode: 'target' }
  }
  const hunt = huntCandidates(memory)
  if (hunt.length === 0) throw new Error('no squares left to fire at')
  return { cell: best(hunt, memory, difficulty, rng), mode: 'hunt' }
}
