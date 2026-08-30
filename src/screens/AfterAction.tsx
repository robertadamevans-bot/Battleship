import Board from '../components/Board'
import FleetStrip from '../components/FleetStrip'
import { shotsFired, type Match } from '../game/match'
import { FLEET } from '../game/types'
import { fireView } from '../game/views'
import styles from './AfterAction.module.css'

interface AfterActionProps {
  commander: string
  match: Match
  onRematch: () => void
  onNewBriefing: () => void
}

export default function AfterAction({
  commander,
  match,
  onRematch,
  onNewBriefing,
}: AfterActionProps) {
  const shots = shotsFired(match)
  const humanWon = match.winner === 'human'
  const survivors = {
    human: FLEET.length - match.fleet.sunk.length,
    ai: FLEET.length - match.enemy.sunk.length,
  }

  return (
    <main className={styles.screen}>
      <header className={styles.head}>
        <span className="eyebrow">After action</span>
        <h1 className={`wordmark ${styles.verdict} ${humanWon ? styles.win : styles.loss}`}>
          {humanWon ? `${commander} holds the Solent` : 'Admiral North holds the Solent'}
        </h1>
        <p className={styles.line}>
          {humanWon
            ? `North's fleet is on the bottom. You had ${survivors.human} ship${
                survivors.human === 1 ? '' : 's'
              } still afloat.`
            : `Your fleet is on the bottom. North still had ${survivors.ai} ship${
                survivors.ai === 1 ? '' : 's'
              } afloat.`}
        </p>
      </header>

      <dl className={styles.stats}>
        <div>
          <dt className="eyebrow">{commander} shots</dt>
          <dd className="mono-num">{shots.human}</dd>
        </div>
        <div>
          <dt className="eyebrow">North shots</dt>
          <dd className="mono-num">{shots.ai}</dd>
        </div>
        <div>
          <dt className="eyebrow">Your ships left</dt>
          <dd className="mono-num">{survivors.human}</dd>
        </div>
        <div>
          <dt className="eyebrow">North ships left</dt>
          <dd className="mono-num">{survivors.ai}</dd>
        </div>
      </dl>

      <section className={styles.reveal}>
        <h2 className={styles.boardTitle}>
          <span className="eyebrow">Reveal</span>
          Admiral North&rsquo;s fleet
        </h2>
        <Board name="Admiral North's revealed fleet" views={fireView(match.enemy, true)} interactive={false} />
        <div className={styles.strips}>
          <FleetStrip title="North's fleet" sunk={match.enemy.sunk} />
          <FleetStrip title="Your fleet" sunk={match.fleet.sunk} />
        </div>
      </section>

      <div className={styles.actions}>
        <button type="button" className="btn btn-primary" onClick={onRematch}>
          Rematch
        </button>
        <button type="button" className="btn" onClick={onNewBriefing}>
          New briefing
        </button>
      </div>
    </main>
  )
}
