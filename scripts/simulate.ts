/**
 * Headless AI bench. Plays Admiral North against randomly placed fleets and
 * prints the numbers quoted in docs/AI.md.
 *
 *   npm run sim
 */
import { emptyMemory, nextShot, rememberShot } from '../src/ai/admiral'
import { randomFleet } from '../src/game/placement'
import { isFleetDestroyed, resolveShot, shotCount } from '../src/game/resolve'
import { seeded } from '../src/game/rng'
import { aiFleetSpec, ruleset, type AiProfile, type DifficultyId } from '../src/game/rules'
import { emptySide, type Grid, type ShipSpec } from '../src/game/types'

interface Run {
  shots: number
  hitRate: number
}

/** One game: the AI fires until the fleet in front of it is gone. */
function playGame(seed: number, profile: AiProfile, grid: Grid, fleet: readonly ShipSpec[]): Run {
  const rng = seeded(seed)
  let side = emptySide(grid, randomFleet(fleet, { grid, minShipGap: 0 }, rng))
  let memory = emptyMemory(grid, fleet)
  while (!isFleetDestroyed(side)) {
    const shot = nextShot(memory, profile, rng)
    const step = resolveShot(side, shot.cell)
    side = step.side
    memory = rememberShot(memory, step.result)
  }
  const shots = shotCount(side)
  const squares = fleet.reduce((sum, s) => sum + s.length, 0)
  return { shots, hitRate: squares / shots }
}

function stats(runs: Run[]) {
  const shots = runs.map((r) => r.shots).sort((a, b) => a - b)
  const mean = shots.reduce((a, b) => a + b, 0) / shots.length
  const median = shots[Math.floor(shots.length / 2)]
  const hitRate = runs.reduce((a, r) => a + r.hitRate, 0) / runs.length
  return {
    games: runs.length,
    mean: mean.toFixed(1),
    median,
    best: shots[0],
    worst: shots[shots.length - 1],
    hitRate: `${(hitRate * 100).toFixed(1)}%`,
  }
}

function bench(rank: DifficultyId, games: number) {
  const rules = ruleset(rank)
  const runs: Run[] = []
  for (let seed = 0; seed < games; seed += 1) {
    runs.push(playGame(seed, rules.aiProfile, rules.humanGrid, rules.fleet))
  }
  const grid = `${rules.humanGrid.rows}×${rules.humanGrid.cols}`
  return { rank: rules.label, profile: rules.aiProfile, grid, ...stats(runs) }
}

/** All profiles on the same 10×10 five-ship board, so the ranking is fair. */
function control(games: number) {
  const grid: Grid = { rows: 10, cols: 10 }
  const fleet = ruleset('officer').fleet
  const profiles: AiProfile[] = ['lax', 'standard', 'packedHunt', 'smartTarget', 'probability']
  return profiles.map((profile) => {
    const runs: Run[] = []
    for (let seed = 0; seed < games; seed += 1) runs.push(playGame(seed, profile, grid, fleet))
    return { profile, ...stats(runs) }
  })
}

/**
 * The other half of Fleet Legend: the same brain firing at North's 8×12 water,
 * where two of the seven hulls are decoys that never count towards a win.
 */
function legendFireBoard(games: number) {
  const legend = ruleset('legend')
  const fleet = aiFleetSpec(legend)
  const runs: Run[] = []
  for (let seed = 0; seed < games; seed += 1) {
    runs.push(playGame(seed, 'probability', legend.aiGrid, fleet))
  }
  return { board: '8×12 with 2 decoys', ...stats(runs) }
}

console.log('Per-rank AI, firing at that rank’s human board')
console.table([bench('cadet', 30), bench('officer', 30), bench('commander', 30), bench('admiral', 30), bench('legend', 20)])

console.log('\nControl: every profile on the same 10×10 / 17-square board')
console.table(control(30))

console.log('\nFleet Legend is asymmetric: North’s own water, scored separately')
console.table([legendFireBoard(20)])
