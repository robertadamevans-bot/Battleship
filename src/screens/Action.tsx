import Board from '../components/Board'
import FleetStrip from '../components/FleetStrip'
import { fireView, fleetView } from '../game/views'
import { shotsFired, type Match } from '../game/match'
import type { Cell } from '../game/types'
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
  const shots = shotsFired(match)
  const banner =
    match.turn === 'ai' ? 'Admiral North ranging' : `${commander} to fire`

  return (
    <main className={styles.screen}>
      <header className={styles.head}>
        <span className={`wordmark ${styles.mark}`}>Solent</span>
        <span className={`${styles.shots} mono-num`}>
          {commander} {shots.human} · North {shots.ai}
        </span>
      </header>

      <div className={styles.status}>
        <p className={`${styles.banner} ${locked ? styles.waiting : ''}`}>
          <span className={styles.pip} aria-hidden="true" />
          {banner}
        </p>
        <p className={styles.resolution} role="status" aria-live="polite">
          {match.log[0] ?? 'Open fire when ready.'}
        </p>
      </div>

      <div className={styles.boards}>
        <section className={styles.primary}>
          <h2 className={styles.boardTitle}>
            <span className="eyebrow">Fire</span>
            Admiral North&rsquo;s water
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
            {match.log.slice(0, 12).map((line, i) => (
              <li key={`${line}-${i}`}>{line}</li>
            ))}
          </ol>
        </details>
      )}
    </main>
  )
}
