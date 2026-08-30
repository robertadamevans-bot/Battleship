import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ruleset, type DifficultyId } from '../game/rules'
import Deployment from './Deployment'

function setup(rank: DifficultyId = 'officer') {
  const user = userEvent.setup()
  const engaged: unknown[] = []
  render(
    <Deployment
      commander="Rob"
      rules={ruleset(rank)}
      initial={[]}
      onEngage={(placements) => engaged.push(placements)}
      onBack={() => {}}
    />,
  )
  return { user, engaged }
}

describe('deployment', () => {
  it('refuses a ship that would hang off the board', async () => {
    const { user } = setup()

    await user.click(screen.getByRole('button', { name: 'H1 unfired' }))

    expect(screen.getByText(/hang off the board/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /ships placed/i }).textContent).toMatch(/0\/5/)
  })

  it('refuses a ship that would overlap one already at anchor', async () => {
    const { user } = setup()

    await user.click(screen.getByRole('button', { name: 'A1 unfired' })) // carrier A1–E1
    await user.click(screen.getByRole('button', { name: /^Battleship/ }))
    await user.click(screen.getByRole('button', { name: 'D2 unfired' })) // legal, D2–G2
    await user.click(screen.getByRole('button', { name: /^Cruiser/ }))
    await user.click(screen.getByRole('button', { name: 'C2 unfired' })) // would cross the battleship

    expect(screen.getByText(/may touch, but not overlap/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /ships placed/i }).textContent).toMatch(/2\/5/)
  })

  it('only allows engagement once all five ships are legal', async () => {
    const { user, engaged } = setup()

    expect(screen.getByRole('button', { name: /ships placed/i })).toHaveProperty('disabled', true)
    await user.click(screen.getByRole('button', { name: /randomise/i }))
    await user.click(screen.getByRole('button', { name: /^engage$/i }))

    expect(engaged).toHaveLength(1)
  })

  it('clears the water on reset', async () => {
    const { user } = setup()

    await user.click(screen.getByRole('button', { name: /randomise/i }))
    await user.click(screen.getByRole('button', { name: /reset/i }))

    expect(screen.getByRole('button', { name: /ships placed/i }).textContent).toMatch(/0\/5/)
  })

  it('rotates the next ship between across and down', async () => {
    const { user } = setup()

    await user.click(screen.getByRole('button', { name: /rotate/i }))
    await user.click(screen.getByRole('button', { name: 'A1 unfired' }))

    expect(screen.getByRole('button', { name: 'A5 your ship' })).toBeTruthy()
  })
})

describe('deployment follows the rank', () => {
  it('lays out Cadet on twelve columns and forbids touching', async () => {
    const { user } = setup('cadet')

    expect(screen.getByRole('button', { name: 'L12 unfired' })).toBeTruthy()
    expect(screen.getByText(/not even corners/i)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'A1 unfired' })) // carrier A1–E1
    await user.click(screen.getByRole('button', { name: /^Battleship/ }))
    await user.click(screen.getByRole('button', { name: 'A2 unfired' })) // king-adjacent

    expect(screen.getByText(/not even corners/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /ships placed/i }).textContent).toMatch(/1\/5/)
  })

  it('states the Commander cell count and shot budget on a 9×9 board', () => {
    setup('commander')

    expect(screen.getByText(/19 cells\. 42 shots\./)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'J1 unfired' })).toBeNull()
    expect(screen.getByRole('button', { name: 'I9 unfired' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Patrol/ })).toBeTruthy()
  })

  it('keeps the human fleet on ten by ten at Fleet Legend', () => {
    setup('legend')

    expect(screen.getByRole('button', { name: 'J10 unfired' })).toBeTruthy()
    expect(screen.getByText(/17 cells\./)).toBeTruthy()
    // Decoys are North's business: they are never in the player's tray.
    expect(screen.queryByRole('button', { name: /ghost/i })).toBeNull()
  })
})
