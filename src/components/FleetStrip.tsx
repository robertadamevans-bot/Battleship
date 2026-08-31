import type { ShipId, ShipSpec } from '../game/types'
import { useTheme } from '../theme/useTheme'
import styles from './FleetStrip.module.css'

interface FleetStripProps {
  title: string
  /** The ships this rank actually fields. Decoys are never listed. */
  fleet: readonly ShipSpec[]
  sunk: readonly ShipId[]
}

export default function FleetStrip({ title, fleet, sunk }: FleetStripProps) {
  const { copy } = useTheme()
  const real = fleet.filter((s) => !s.decoy)
  const lost = real.filter((s) => sunk.includes(s.id)).length
  return (
    <section className={styles.strip}>
      <header>
        <span className="eyebrow">{title}</span>
        <span className={`${styles.count} mono-num`}>
          {real.length - lost}/{real.length}
        </span>
      </header>
      <ul>
        {real.map((ship) => {
          const down = sunk.includes(ship.id)
          return (
            <li key={ship.id} className={down ? styles.down : undefined}>
              <span className={styles.name}>{copy.shipAlias[ship.id]}</span>
              <span className={styles.pips} aria-hidden="true">
                {Array.from({ length: ship.length }, (_, i) => (
                  <i key={i} />
                ))}
              </span>
              <span className={styles.state}>{down ? 'Sunk' : 'Afloat'}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
