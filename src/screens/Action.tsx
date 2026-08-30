import Board from '../components/Board'
import FleetStrip from '../components/FleetStrip'
import { fireView, fleetView } from '../game/views'
import { shotsFired, type Match } from '../game/match'
import type { Cell } from '../game/types'
import { resolutionLine } from '../theme/lines'
import TheatreSwitch from '../theme/TheatreSwitch'
import { useTheme } from '../theme/useTheme'
import styles from './Action.module.css'

interface ActionProps {
  commander: string
  match: Match
  /** True while the resolution animation plays or Admiral North is ranging. */
  locked: boolean
  lastHumanShot: Cell | null
  lastAiShot: Cell | null
  onFire: (cell: Cell) => void
}

export default function Action({
  commander,
  match,
  locked,
  lastHumanShot,
  lastAiShot,
  onFire,
}: ActionProps) {
  const { copy } = useTheme()
  const shots = shotsFired(match)
  const banner = match.turn === 'ai' ? copy.theirTurn : copy.yourTurn(commander)
  const latest = match.log[0]

  return (
    <main className={styles.screen}>
      <header className={styles.head}>
        <span className={`wordmark ${styles.mark}`}>Solent</span>
        <span className={`${styles.shots} mono-num`}>
          {commander} {shots.human} · North {shots.ai}
        </span>
        <TheatreSwitch />
      </header>

      <div className={styles.status}>
        <p className={`${styles.banner} ${locked ? styles.waiting : ''}`}>
          <span className={styles.pip} aria-hidden="true" />
          {banner}
        </p>
        <p className={styles.resolution} role="status" aria-live="polite">
          {latest ? resolutionLine(latest, copy) : copy.waiting}
        </p>
      </div>

      <div className={styles.boards}>
        <section className={styles.primary}>
          <h2 className={styles.boardTitle}>
            <span className="eyebrow">Fire</span>
            {copy.aiName}
          </h2>
          <Board
            name="Admiral North's water — choose a target"
            views={fireView(match.enemy, false)}
            interactive={!match.winner}
            locked={locked}
            lastShot={lastHumanShot}
            onFire={onFire}
          />
          <FleetStrip title="North's fleet" sunk={match.enemy.sunk} />
        </section>

        <section className={styles.secondary}>
          <h2 className={styles.boardTitle}>
            <span className="eyebrow">Fleet</span>
            {commander}&rsquo;s water
          </h2>
          <Board
            name={`${commander}'s water`}
            views={fleetView(match.fleet)}
            interactive={false}
            lastShot={lastAiShot}
          />
          <FleetStrip title="Your fleet" sunk={match.fleet.sunk} />
        </section>
      </div>

      {match.log.length > 1 && (
        <details className={styles.logWrap}>
          <summary className="eyebrow">Signal log</summary>
          <ol className={styles.log}>
            {match.log.slice(0, 12).map((entry, i) => (
              <li key={`${entry.result.cell.row}-${entry.result.cell.col}-${entry.by}-${i}`}>
                {resolutionLine(entry, copy)}
              </li>
            ))}
          </ol>
        </details>
      )}
    </main>
  )
}
