import { useMemo, useRef, useState } from 'react'
import Board from '../components/Board'
import type { CellView } from '../game/views'
import { key, shipCells } from '../game/geometry'
import { checkPlacement, randomFleet, withPlacement } from '../game/placement'
import { FLEET, type Cell, type Orientation, type Placement, type ShipId } from '../game/types'
import { useTheme } from '../theme/useTheme'
import styles from './Deployment.module.css'

interface DeploymentProps {
  commander: string
  initial: Placement[]
  onEngage: (placements: Placement[]) => void
  onBack: () => void
}

const nextUnplaced = (placements: Placement[]): ShipId | null =>
  FLEET.find((s) => !placements.some((p) => p.id === s.id))?.id ?? null

export default function Deployment({ commander, initial, onEngage, onBack }: DeploymentProps) {
  const { copy } = useTheme()
  const alias = copy.shipAlias
  const [placements, setPlacements] = useState<Placement[]>(initial)
  const [selected, setSelected] = useState<ShipId | null>(
    nextUnplaced(initial) ?? FLEET[0].id,
  )
  const [orientation, setOrientation] = useState<Orientation>('horizontal')
  const [aim, setAim] = useState<Cell | null>(null)
  const [refused, setRefused] = useState<{ cells: string[]; nonce: number } | null>(null)
  const [message, setMessage] = useState('Select a ship, then tap the water.')
  const pressed = useRef<{ cell: Cell; id: ShipId } | null>(null)
  const refuseTimer = useRef<number | undefined>(undefined)

  const placed = placements.length
  const ready = placed === FLEET.length

  function refuse(cells: Cell[], reason: string) {
    window.clearTimeout(refuseTimer.current)
    setRefused({ cells: cells.map(key), nonce: Date.now() })
    setMessage(reason)
    refuseTimer.current = window.setTimeout(() => setRefused(null), 420)
  }

  function place(stem: Cell, id: ShipId, facing: Orientation = orientation) {
    const candidate: Placement = { id, orientation: facing, ...stem }
    const check = checkPlacement(placements, candidate)
    if (check.error) {
      refuse(
        check.cells,
        check.error === 'off-board'
          ? 'That ship would hang off the board.'
          : 'Ships may touch, but not overlap.',
      )
      return
    }
    const next = withPlacement(placements, candidate)
    setPlacements(next)
    const following = nextUnplaced(next)
    setSelected(following)
    setMessage(
      following
        ? `${alias[following]} next.`
        : 'Fleet deployed. Engage when ready.',
    )
  }

  function onCellPress(cell: Cell) {
    const occupant = placements.find((p) => shipCells(p).some((c) => key(c) === key(cell)))
    pressed.current = occupant ? { cell, id: occupant.id } : null
    if (!occupant) return
    // Pressing a placed ship selects it; dragging away moves it.
    setSelected(occupant.id)
    setOrientation(occupant.orientation)
    setMessage(`${alias[occupant.id]} selected. Drag or tap to move it.`)
  }

  function onCellRelease(cell: Cell) {
    const grab = pressed.current
    if (!grab || key(grab.cell) === key(cell)) return
    pressed.current = null
    place(cell, grab.id)
  }

  function onCellClick(cell: Cell) {
    const grab = pressed.current
    pressed.current = null
    // A press-and-release on the ship itself only selects it.
    if (grab && key(grab.cell) === key(cell)) return
    if (!selected) {
      setMessage('Select a ship from the tray first.')
      return
    }
    place(cell, selected)
  }

  function rotate() {
    setOrientation((o) => (o === 'horizontal' ? 'vertical' : 'horizontal'))
  }

  const views = useMemo(() => {
    const map = new Map<string, CellView>()
    for (const placement of placements) {
      for (const cell of shipCells(placement)) map.set(key(cell), 'ship')
    }
    if (selected && aim) {
      const check = checkPlacement(placements, { id: selected, orientation, ...aim })
      for (const cell of check.cells) {
        map.set(key(cell), check.error ? 'ghost-bad' : 'ghost')
      }
    }
    if (refused) {
      for (const k of refused.cells) map.set(k, 'ghost-bad')
    }
    return map
  }, [placements, selected, aim, orientation, refused])

  return (
    <main className={styles.screen}>
      <header className={styles.head}>
        <div>
          <span className="eyebrow">Deployment</span>
          <h2 className={styles.title}>{commander}&rsquo;s water</h2>
        </div>
        <button type="button" className={styles.back} onClick={onBack}>
          Briefing
        </button>
      </header>

      <p className={styles.rules}>{copy.rules}</p>

      <div className={styles.layout}>
        <div className={styles.boardWrap}>
          <Board
            name="Your water — place your fleet"
            views={views}
            interactive
            onFire={onCellClick}
            onAim={setAim}
            onPress={onCellPress}
            onRelease={onCellRelease}
            onContext={rotate}
          />
        </div>

        <div className={styles.side}>
          <ul className={styles.tray}>
            {FLEET.map((ship) => {
              const done = placements.some((p) => p.id === ship.id)
              const active = selected === ship.id
              return (
                <li key={ship.id}>
                  <button
                    type="button"
                    className={`${styles.trayItem} ${active ? styles.active : ''} ${
                      done ? styles.done : ''
                    }`}
                    aria-pressed={active}
                    onClick={() => {
                      setSelected(ship.id)
                      setMessage(
                        done
                          ? `Tap the water to move the ${alias[ship.id]}.`
                          : `Tap a stem cell for the ${alias[ship.id]}.`,
                      )
                    }}
                  >
                    <span className={styles.shipName}>{alias[ship.id]}</span>
                    <span className={styles.marks} aria-hidden="true">
                      {Array.from({ length: ship.length }, (_, i) => (
                        <i key={i} />
                      ))}
                    </span>
                    <span className={styles.status}>{done ? 'Set' : `${ship.length}`}</span>
                  </button>
                </li>
              )
            })}
          </ul>

          <div className={styles.controls}>
            <button type="button" className="btn" onClick={rotate}>
              Rotate · {orientation === 'horizontal' ? 'across' : 'down'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                const fleet = randomFleet(Math.random)
                setPlacements(fleet)
                setSelected(null)
                setMessage('Fleet scattered. Engage when ready.')
              }}
            >
              Randomise
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setPlacements([])
                setSelected(FLEET[0].id)
                setMessage(`Board cleared. ${alias.carrier} first.`)
              }}
            >
              Reset
            </button>
          </div>

          <p className={styles.hint} role="status">
            {message}
          </p>

          <button
            type="button"
            className={`btn btn-primary ${styles.engage}`}
            disabled={!ready}
            onClick={() => ready && onEngage(placements)}
          >
            {ready ? copy.engage : `${placed}/5 ships placed`}
          </button>
        </div>
      </div>
    </main>
  )
}
