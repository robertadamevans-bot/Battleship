import { useState } from 'react'
import type { Difficulty } from '../ai/admiral'
import styles from './Briefing.module.css'

export interface Settings {
  name: string
  difficulty: Difficulty
  sound: boolean
}

interface BriefingProps {
  settings: Settings
  onDeploy: (settings: Settings) => void
}

const DIFFICULTIES: { id: Difficulty; label: string; note: string }[] = [
  { id: 'admiral', label: 'Admiral', note: 'Parity search, occupancy heatmap, relentless follow-up.' },
  { id: 'cadet', label: 'Cadet', note: 'Hunt and target, but fires without reading the water.' },
]

export default function Briefing({ settings, onDeploy }: BriefingProps) {
  const [name, setName] = useState(settings.name)
  const [difficulty, setDifficulty] = useState<Difficulty>(settings.difficulty)
  const [sound, setSound] = useState(settings.sound)

  const commander = name.trim() === '' ? 'Rob' : name.trim()

  return (
    <main className={styles.screen}>
      <div className={styles.card}>
        <header className={styles.head}>
          <h1 className={`wordmark ${styles.mark}`}>Solent</h1>
          <p className={styles.tagline}>Fleet action. Human vs machine.</p>
        </header>

        <p className={styles.blurb}>
          Ten by ten of cold water between Southampton and the Isle of Wight. Five ships each.
          Admiral North hunts by parity and probability, so place carefully and fire first.
        </p>

        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault()
            onDeploy({ name: commander, difficulty, sound })
          }}
        >
          <label className={styles.field}>
            <span className="eyebrow">Commander</span>
            <input
              value={name}
              maxLength={18}
              autoComplete="off"
              spellCheck={false}
              placeholder="Rob"
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <fieldset className={styles.field}>
            <legend className="eyebrow">Opponent</legend>
            <div className={styles.segments}>
              {DIFFICULTIES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`${styles.segment} ${difficulty === option.id ? styles.on : ''}`}
                  aria-pressed={difficulty === option.id}
                  onClick={() => setDifficulty(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className={styles.note}>
              {DIFFICULTIES.find((d) => d.id === difficulty)!.note}
            </p>
          </fieldset>

          <div className={styles.toggle}>
            <span className="eyebrow" id="sound-label">
              Sound
            </span>
            <button
              type="button"
              className={`${styles.switch} ${sound ? styles.on : ''}`}
              role="switch"
              aria-checked={sound}
              aria-labelledby="sound-label"
              onClick={() => setSound(!sound)}
            >
              <span>{sound ? 'On' : 'Off'}</span>
            </button>
          </div>

          <button type="submit" className={`btn btn-primary ${styles.deploy}`}>
            Deploy fleet
          </button>
        </form>

        <footer className={styles.foot}>A single-match fleet action. No accounts.</footer>
      </div>
    </main>
  )
}
