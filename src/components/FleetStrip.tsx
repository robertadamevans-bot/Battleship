import { FLEET, type ShipId } from '../game/types'
import { useTheme } from '../theme/useTheme'
import styles from './FleetStrip.module.css'

interface FleetStripProps {
  title: string
  sunk: readonly ShipId[]
}

export default function FleetStrip({ title, sunk }: FleetStripProps) {
  const { copy } = useTheme()
  const lost = sunk.length
  return (
    <section className={styles.strip}>
      <header>
        <span className="eyebrow">{title}</span>
        <span className={`${styles.count} mono-num`}>
          {FLEET.length - lost}/{FLEET.length}
        </span>
      </header>
      <ul>
        {FLEET.map((ship) => {
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
