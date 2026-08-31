import { describe, expect, it } from 'vitest'
import {
  aiFleetSpec,
  DEFAULT_DIFFICULTY,
  gridBadge,
  isDifficultyId,
  RULESETS,
  ruleset,
} from './rules'
import { fleetSquares } from './types'

describe('ranks', () => {
  it('defines exactly the five ranks in order', () => {
    expect(RULESETS.map((r) => r.id)).toEqual([
      'cadet',
      'officer',
      'commander',
      'admiral',
      'legend',
    ])
  })

  it('starts a new commander on Officer', () => {
    expect(DEFAULT_DIFFICULTY).toBe('officer')
    expect(isDifficultyId('officer')).toBe(true)
    expect(isDifficultyId('midshipman')).toBe(false)
  })

  it('gives Cadet wide water, one-cell separation and no clock', () => {
    const cadet = ruleset('cadet')
    expect(cadet.humanGrid).toEqual({ rows: 12, cols: 12 })
    expect(cadet.aiGrid).toEqual({ rows: 12, cols: 12 })
    expect(cadet.minShipGap).toBe(1)
    expect(cadet.moveTimeMs).toBeNull()
    expect(cadet.matchShotBudgetHuman).toBeNull()
    expect(cadet.hints.adjacentHitIndicators).toBe(true)
    expect(cadet.fog.enabled).toBe(false)
    expect(cadet.aiProfile).toBe('lax')
  })

  it('keeps Officer as the classic control group', () => {
    const officer = ruleset('officer')
    expect(officer.humanGrid).toEqual({ rows: 10, cols: 10 })
    expect(officer.minShipGap).toBe(0)
    expect(officer.fleet).toHaveLength(5)
    expect(fleetSquares(officer.fleet)).toBe(17)
    expect(officer.hints.adjacentHitIndicators).toBe(false)
    expect(officer.aiProfile).toBe('standard')
  })

  it('packs Commander into 9×9 with nineteen cells and forty-two shots', () => {
    const commander = ruleset('commander')
    expect(commander.humanGrid).toEqual({ rows: 9, cols: 9 })
    expect(commander.fleet.map((s) => s.id)).toContain('patrol')
    expect(fleetSquares(commander.fleet)).toBe(19)
    expect(commander.matchShotBudgetHuman).toBe(42)
    expect(commander.aiProfile).toBe('packedHunt')
  })

  it('runs a twelve second clock and fog on Admiral', () => {
    const admiral = ruleset('admiral')
    expect(admiral.moveTimeMs).toBe(12000)
    expect(admiral.fog).toEqual({ enabled: true, fadeAfterRounds: 3 })
    expect(admiral.oneLife).toBe(false)
    expect(admiral.aiProfile).toBe('smartTarget')
  })

  it('gives Fleet Legend an asymmetric board, decoys, movement and one life', () => {
    const legend = ruleset('legend')
    expect(legend.humanGrid).toEqual({ rows: 10, cols: 10 })
    expect(legend.aiGrid).toEqual({ rows: 8, cols: 12 })
    expect(legend.moveTimeMs).toBe(8000)
    expect(legend.fog.fadeAfterRounds).toBe(2)
    expect(legend.decoys).toBe(2)
    expect(legend.movingShips).toBe(true)
    expect(legend.oneLife).toBe(true)
    expect(legend.aiProfile).toBe('probability')
    const ai = aiFleetSpec(legend)
    expect(ai).toHaveLength(7)
    expect(ai.filter((s) => s.decoy)).toHaveLength(2)
    // Decoy cells never count toward the squares that must be sunk.
    expect(fleetSquares(ai)).toBe(17)
  })

  it('badges every rank with the water it is fought on', () => {
    expect(RULESETS.map(gridBadge)).toEqual([
      '12×12',
      '10×10',
      '9×9',
      '10×10 fog',
      '10×10 / 8×12',
    ])
  })

  it('states one line of stakes per rank', () => {
    expect(RULESETS.map((r) => r.stakes)).toEqual([
      'Wide water. Clear signals. No clock.',
      'Standard action. No favours.',
      'Tight water. Count your powder.',
      'The chart forgets. The clock does not.',
      'One life. Moving prey. No mercy.',
    ])
  })

  it('gives every rank one shot per side per turn', () => {
    for (const rank of RULESETS) {
      expect(rank.shotsPerTurnHuman).toBe(1)
      expect(rank.shotsPerTurnAi).toBe(1)
    }
  })
})
