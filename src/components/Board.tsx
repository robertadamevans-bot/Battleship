import { useCallback, useRef, useState } from 'react'
import { BOARD_SIZE, COLUMNS, key, label } from '../game/geometry'
import type { Cell } from '../game/types'
import type { CellView } from '../game/views'
import styles from './Board.module.css'

interface BoardProps {
  /** Visual state per cell key; anything absent is open water. */
  views: Map<string, CellView>
  /** When false the grid is presentational — no buttons, no focus, no pointer. */
  interactive: boolean
  /**
   * Input is refused but the buttons stay mounted, so keyboard focus and the
   * grid's accessibility tree survive a turn change.
   */
  locked?: boolean
  onFire?: (cell: Cell) => void
  onAim?: (cell: Cell | null) => void
  onPress?: (cell: Cell) => void
  onRelease?: (cell: Cell) => void
  onContext?: (cell: Cell) => void
  lastShot?: Cell | null
  /** Accessible name for the whole grid. */
  name: string
}

const DESCRIPTION: Record<CellView, string> = {
  water: 'unfired',
  ship: 'your ship',
  'ship-hit': 'your ship, hit',
  'ship-sunk': 'your ship, sunk',
  miss: 'miss',
  hit: 'hit',
  sunk: 'sunk',
  ghost: 'placement preview',
  'ghost-bad': 'illegal placement',
  reveal: 'enemy ship',
}

export default function Board({
  views,
  interactive,
  locked = false,
  onFire,
  onAim,
  onPress,
  onRelease,
  onContext,
  lastShot,
  name,
}: BoardProps) {
  const [cursor, setCursor] = useState<Cell>({ row: 0, col: 0 })
  const cells = useRef(new Map<string, HTMLButtonElement>())

  const focusCell = useCallback((cell: Cell) => {
    setCursor(cell)
    cells.current.get(key(cell))?.focus()
  }, [])

  const onKeyDown = (event: React.KeyboardEvent, cell: Cell) => {
    const moves: Record<string, Cell> = {
      ArrowUp: { row: cell.row - 1, col: cell.col },
      ArrowDown: { row: cell.row + 1, col: cell.col },
      ArrowLeft: { row: cell.row, col: cell.col - 1 },
      ArrowRight: { row: cell.row, col: cell.col + 1 },
    }
    const next = moves[event.key]
    if (!next) return
    event.preventDefault()
    focusCell({
      row: Math.max(0, Math.min(BOARD_SIZE - 1, next.row)),
      col: Math.max(0, Math.min(BOARD_SIZE - 1, next.col)),
    })
  }

  const rows = Array.from({ length: BOARD_SIZE }, (_, row) => row)

  return (
    <div className={styles.frame} onPointerLeave={() => onAim?.(null)}>
      <div className={styles.columns} aria-hidden="true">
        <span />
        {COLUMNS.map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>
      <div className={styles.body}>
        <div className={styles.rows} aria-hidden="true">
          {rows.map((row) => (
            <span key={row} className="mono-num">
              {row + 1}
            </span>
          ))}
        </div>
        <div
          className={styles.grid}
          role={interactive ? 'grid' : 'presentation'}
          aria-label={interactive ? name : undefined}
        >
          {rows.map((row) =>
            COLUMNS.map((_, col) => {
              const cell = { row, col }
              const k = key(cell)
              const view = views.get(k) ?? 'water'
              const isLast = lastShot?.row === row && lastShot?.col === col
              const className = [
                styles.cell,
                styles[view],
                isLast ? styles.latest : '',
              ]
                .filter(Boolean)
                .join(' ')

              if (!interactive) {
                return <div key={k} className={className} />
              }
              const resolved = view === 'miss' || view === 'hit' || view === 'sunk'
              const blocked = locked || resolved
              return (
                <button
                  key={k}
                  ref={(node) => {
                    if (node) cells.current.set(k, node)
                    else cells.current.delete(k)
                  }}
                  type="button"
                  className={className}
                  tabIndex={cursor.row === row && cursor.col === col ? 0 : -1}
                  aria-label={`${label(cell)} ${DESCRIPTION[view]}`}
                  aria-disabled={blocked}
                  onFocus={() => setCursor(cell)}
                  onKeyDown={(event) => onKeyDown(event, cell)}
                  onPointerEnter={() => !locked && onAim?.(cell)}
                  onPointerDown={() => !locked && onPress?.(cell)}
                  onPointerUp={() => !locked && onRelease?.(cell)}
                  onContextMenu={(event) => {
                    if (!onContext) return
                    event.preventDefault()
                    onContext(cell)
                  }}
                  onClick={() => {
                    if (blocked) return
                    onFire?.(cell)
                  }}
                />
              )
            }),
          )}
        </div>
      </div>
    </div>
  )
}
