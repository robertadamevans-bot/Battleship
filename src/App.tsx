import { useCallback, useEffect, useRef, useState } from 'react'
import { nextShot } from './ai/admiral'
import { aiFires, humanFires, startMatch, type Match } from './game/match'
import type { Cell, Placement } from './game/types'
import Action from './screens/Action'
import AfterAction from './screens/AfterAction'
import Briefing, { type Settings } from './screens/Briefing'
import Deployment from './screens/Deployment'
import { play } from './sound'

type Phase = 'briefing' | 'deployment' | 'action' | 'afteraction'

/** How long the human's own result sits on screen before North replies. */
const THINK_MIN = 700
const THINK_SPREAD = 400
/** Resolution animation; input is ignored while it plays. */
const RESOLVE = 260
const END_BEAT = 900

export default function App() {
  const [phase, setPhase] = useState<Phase>('briefing')
  const [settings, setSettings] = useState<Settings>({
    name: 'Rob',
    difficulty: 'admiral',
    sound: false,
  })
  const [fleet, setFleet] = useState<Placement[]>([])
  const [match, setMatch] = useState<Match | null>(null)
  const [resolving, setResolving] = useState(false)
  const [lastHumanShot, setLastHumanShot] = useState<Cell | null>(null)
  const [lastAiShot, setLastAiShot] = useState<Cell | null>(null)
  const timers = useRef<number[]>([])

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms)
    timers.current.push(id)
    return id
  }, [])

  useEffect(
    () => () => {
      timers.current.forEach(window.clearTimeout)
      timers.current = []
    },
    [],
  )

  const locked = resolving || match?.turn === 'ai' || Boolean(match?.winner)

  const onFire = useCallback(
    (cell: Cell) => {
      if (!match || locked) return
      const turn = humanFires(match, cell)
      if (!turn) return
      setLastHumanShot(cell)
      setMatch(turn.match)
      setResolving(true)
      later(() => setResolving(false), RESOLVE)
      play(turn.result.outcome, settings.sound)
      if (turn.match.winner) later(() => setPhase('afteraction'), END_BEAT)
    },
    [match, locked, later, settings.sound],
  )

  // Admiral North's turn: a deliberate pause, then one shot.
  useEffect(() => {
    if (!match || match.winner || match.turn !== 'ai' || phase !== 'action') return
    const id = window.setTimeout(
      () => {
        const shot = nextShot(match.memory, match.difficulty, Math.random)
        const turn = aiFires(match, shot.cell)
        if (!turn) return
        setLastAiShot(turn.result.cell)
        setMatch(turn.match)
        play(turn.match.winner ? 'lose' : turn.result.outcome, settings.sound)
        if (turn.match.winner) later(() => setPhase('afteraction'), END_BEAT)
      },
      THINK_MIN + Math.random() * THINK_SPREAD,
    )
    return () => window.clearTimeout(id)
  }, [match, phase, later, settings.sound])

  function beginMatch(placements: Placement[]) {
    setFleet(placements)
    setMatch(startMatch(placements, settings.difficulty, Math.random))
    setLastHumanShot(null)
    setLastAiShot(null)
    setResolving(false)
    setPhase('action')
  }

  const briefing = (
    <Briefing
      settings={settings}
      onDeploy={(next) => {
        setSettings(next)
        setPhase('deployment')
      }}
    />
  )

  if (phase === 'briefing') return briefing

  if (phase === 'deployment') {
    return (
      <Deployment
        commander={settings.name}
        initial={fleet}
        onEngage={beginMatch}
        onBack={() => setPhase('briefing')}
      />
    )
  }

  if (!match) return briefing

  if (phase === 'afteraction') {
    return (
      <AfterAction
        commander={settings.name}
        match={match}
        onRematch={() => setPhase('deployment')}
        onNewBriefing={() => {
          setMatch(null)
          setPhase('briefing')
        }}
      />
    )
  }

  return (
    <Action
      commander={settings.name}
      match={match}
      locked={locked}
      lastHumanShot={lastHumanShot}
      lastAiShot={lastAiShot}
      onFire={onFire}
    />
  )
}
