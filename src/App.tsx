import { useCallback, useEffect, useRef, useState } from 'react'
import { nextShot } from './ai/admiral'
import { aiFires, autoFire, humanFires, startMatch, timeLeft, type Match } from './game/match'
import type { Cell, Placement } from './game/types'
import Action from './screens/Action'
import AfterAction from './screens/AfterAction'
import Briefing, { type Settings } from './screens/Briefing'
import Deployment from './screens/Deployment'
import { play } from './sound'
import {
  rememberCommander,
  rememberDifficulty,
  storedCommander,
  storedDifficulty,
} from './theme/storage'
import { ruleset } from './game/rules'
import { useTheme } from './theme/useTheme'

type Phase = 'briefing' | 'deployment' | 'action' | 'afteraction'

/** How long the human's own result sits on screen before North replies. */
const THINK_MIN = 700
const THINK_SPREAD = 400
/** Resolution animation; input is ignored while it plays. */
const RESOLVE = 260
const END_BEAT = 900
/** Clock refresh. Fine enough to read, coarse enough to be cheap. */
const TICK = 100

export default function App() {
  const { theme } = useTheme()
  const [phase, setPhase] = useState<Phase>('briefing')
  const [settings, setSettings] = useState<Settings>(() => ({
    name: storedCommander('Rob'),
    difficulty: storedDifficulty(),
    sound: false,
  }))
  const [fleet, setFleet] = useState<Placement[]>([])
  const [match, setMatch] = useState<Match | null>(null)
  const [resolving, setResolving] = useState(false)
  const [lastHumanShot, setLastHumanShot] = useState<Cell | null>(null)
  const [lastAiShot, setLastAiShot] = useState<Cell | null>(null)
  const [now, setNow] = useState(() => Date.now())
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
  const msLeft = match && phase === 'action' ? timeLeft(match, now) : null

  const onFire = useCallback(
    (cell: Cell) => {
      if (!match || locked) return
      const turn = humanFires(match, cell)
      if (!turn) return
      setLastHumanShot(cell)
      setMatch(turn.match)
      setResolving(true)
      later(() => setResolving(false), RESOLVE)
      play(turn.result.outcome, settings.sound, theme)
      if (turn.match.winner) later(() => setPhase('afteraction'), END_BEAT)
    },
    [match, locked, later, settings.sound, theme],
  )

  /**
   * The clock only runs while the human is genuinely on turn, and running out
   * spends one legal shot rather than freezing the board.
   */
  useEffect(() => {
    if (!match || match.winner || match.turnStartedAt === null || phase !== 'action') return
    const id = window.setInterval(() => {
      const stamp = Date.now()
      if ((timeLeft(match, stamp) ?? 1) > 0) {
        setNow(stamp)
        return
      }
      const turn = autoFire(match, Math.random, stamp)
      if (!turn) return
      setLastHumanShot(turn.result.cell)
      setMatch(turn.match)
      setNow(stamp)
      setResolving(true)
      later(() => setResolving(false), RESOLVE)
      play(turn.result.outcome, settings.sound, theme)
      if (turn.match.winner) later(() => setPhase('afteraction'), END_BEAT)
    }, TICK)
    return () => window.clearInterval(id)
  }, [match, phase, later, settings.sound, theme])

  // Admiral North's turn: a deliberate pause, then one shot.
  useEffect(() => {
    if (!match || match.winner || match.turn !== 'ai' || phase !== 'action') return
    const id = window.setTimeout(
      () => {
        const shot = nextShot(match.memory, match.rules.aiProfile, Math.random)
        const turn = aiFires(match, shot.cell)
        if (!turn) return
        setLastAiShot(turn.result.cell)
        setMatch(turn.match)
        setNow(Date.now())
        play(turn.match.winner ? 'lose' : turn.result.outcome, settings.sound, theme)
        if (turn.match.winner) later(() => setPhase('afteraction'), END_BEAT)
      },
      THINK_MIN + Math.random() * THINK_SPREAD,
    )
    return () => window.clearTimeout(id)
  }, [match, phase, later, settings.sound, theme])

  function beginMatch(placements: Placement[]) {
    setFleet(placements)
    setMatch(startMatch(placements, settings.difficulty, Math.random))
    setLastHumanShot(null)
    setLastAiShot(null)
    setResolving(false)
    setNow(Date.now())
    setPhase('action')
  }

  const briefing = (
    <Briefing
      settings={settings}
      onDeploy={(next) => {
        setSettings(next)
        rememberCommander(next.name)
        rememberDifficulty(next.difficulty)
        // A different rank means a different board: old placements cannot follow.
        if (next.difficulty !== settings.difficulty) setFleet([])
        setPhase('deployment')
      }}
    />
  )

  if (phase === 'briefing') return briefing

  if (phase === 'deployment') {
    return (
      <Deployment
        commander={settings.name}
        rules={ruleset(settings.difficulty)}
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
      msLeft={msLeft}
      onFire={onFire}
    />
  )
}
