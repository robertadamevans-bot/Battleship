import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import Deployment from './Deployment'

function setup() {
  const user = userEvent.setup()
  const engaged: unknown[] = []
  render(
    <Deployment
      commander="Rob"
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
