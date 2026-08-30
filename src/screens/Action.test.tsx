import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../App'

async function reachTheAction(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /deploy fleet/i }))
  await user.click(screen.getByRole('button', { name: /randomise/i }))
  await user.click(screen.getByRole('button', { name: /^engage$/i }))
}

const shotCounter = () => screen.getByText(/·\s*North/i).textContent ?? ''

afterEach(() => {
  vi.useRealTimers()
})

describe('firing', () => {
  it('takes one shot from a fast double tap', async () => {
    const user = userEvent.setup()
    render(<App />)
    await reachTheAction(user)

    const cell = screen.getByRole('button', { name: 'E5 unfired' })
    await user.dblClick(cell)

    expect(shotCounter()).toMatch(/\b1\b/)
    expect(shotCounter()).toMatch(/North 0/)
  })

  it('ignores taps on a square that has already been resolved', async () => {
    const user = userEvent.setup()
    render(<App />)
    await reachTheAction(user)

    await user.click(screen.getByRole('button', { name: 'E5 unfired' }))
    const resolved = screen.getByRole('button', { name: /^E5 (miss|hit|sunk)/ })
    await user.click(resolved)

    expect(shotCounter()).toMatch(/\b1\b/)
  })

  it('refuses a new shot while Admiral North is ranging', async () => {
    const user = userEvent.setup()
    render(<App />)
    await reachTheAction(user)

    await user.click(screen.getByRole('button', { name: 'A1 unfired' }))
    expect(screen.getByText(/Admiral North ranging/i)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'J10 unfired' }))

    expect(shotCounter()).toMatch(/Rob 1/)
  })

  /**
   * Regression: the fire board used to render plain divs while North was
   * ranging, which unmounted every cell button and threw keyboard focus back
   * to the top of the document after each shot.
   */
  it('keeps the focused cell mounted and focused through the turn change', async () => {
    const user = userEvent.setup()
    render(<App />)
    await reachTheAction(user)

    const cell = screen.getByRole('button', { name: 'C3 unfired' })
    cell.focus()
    await user.keyboard('{Enter}')

    const resolved = screen.getByRole('button', { name: /^C3 (miss|hit|sunk)/ })
    expect(document.activeElement).toBe(resolved)
    expect(screen.getByText(/Admiral North ranging/i)).toBeTruthy()
  })

  it('moves the aim with the arrow keys', async () => {
    const user = userEvent.setup()
    render(<App />)
    await reachTheAction(user)

    screen.getByRole('button', { name: 'A1 unfired' }).focus()
    await user.keyboard('{ArrowRight}{ArrowDown}')

    expect(document.activeElement?.getAttribute('aria-label')).toBe('B2 unfired')
  })
})
