import { DEFAULT_THEME, type Theme } from './theme/themes'

type Cue = 'miss' | 'hit' | 'sunk' | 'lose'

interface Voice {
  frequency: number
  duration: number
  type: OscillatorType
  gain: number
  /** Second, higher partial — a confirm tone or a distant creak. */
  second?: { frequency: number; delay: number; duration: number }
}

/**
 * Each theatre gets its own voices: muffled timber for the old navy, clipped
 * digital ticks for the console, water and cannon for the pirates.
 */
const VOICES: Record<Theme, Record<Cue, Voice>> = {
  solent: {
    miss: { frequency: 220, duration: 0.12, type: 'sine', gain: 0.05 },
    hit: { frequency: 96, duration: 0.2, type: 'square', gain: 0.07 },
    sunk: { frequency: 62, duration: 0.5, type: 'sawtooth', gain: 0.08 },
    lose: { frequency: 48, duration: 0.7, type: 'triangle', gain: 0.09 },
  },
  olde: {
    // Muffled thump, dry crack of timber, a short drum.
    miss: { frequency: 130, duration: 0.16, type: 'sine', gain: 0.06 },
    hit: { frequency: 180, duration: 0.1, type: 'square', gain: 0.06 },
    sunk: { frequency: 74, duration: 0.42, type: 'triangle', gain: 0.09 },
    lose: { frequency: 58, duration: 0.8, type: 'triangle', gain: 0.09 },
  },
  warfare: {
    // Sonar tick, suppressed digital crack, two-tone confirm.
    miss: { frequency: 1180, duration: 0.06, type: 'sine', gain: 0.04 },
    hit: { frequency: 320, duration: 0.07, type: 'square', gain: 0.05 },
    sunk: {
      frequency: 660,
      duration: 0.09,
      type: 'sine',
      gain: 0.05,
      second: { frequency: 880, delay: 0.1, duration: 0.12 },
    },
    lose: { frequency: 140, duration: 0.6, type: 'sawtooth', gain: 0.07 },
  },
  pirates: {
    // Short splash, cannon crack, crack plus a distant creak.
    miss: { frequency: 420, duration: 0.1, type: 'sine', gain: 0.05 },
    hit: { frequency: 84, duration: 0.24, type: 'sawtooth', gain: 0.08 },
    sunk: {
      frequency: 70,
      duration: 0.4,
      type: 'sawtooth',
      gain: 0.09,
      second: { frequency: 240, delay: 0.22, duration: 0.5 },
    },
    lose: { frequency: 52, duration: 0.9, type: 'triangle', gain: 0.09 },
  },
}

let context: AudioContext | null = null

function tone(
  ctx: AudioContext,
  at: number,
  frequency: number,
  duration: number,
  type: OscillatorType,
  gain: number,
): void {
  const osc = ctx.createOscillator()
  const amp = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, at)
  osc.frequency.exponentialRampToValueAtTime(Math.max(30, frequency * 0.6), at + duration)
  amp.gain.setValueAtTime(gain, at)
  amp.gain.exponentialRampToValueAtTime(0.0001, at + duration)
  osc.connect(amp).connect(ctx.destination)
  osc.start(at)
  osc.stop(at + duration)
}

/** Short synthesised cues — no audio files, no autoplay before a user gesture. */
export function play(cue: Cue, enabled: boolean, theme: Theme = DEFAULT_THEME): void {
  if (!enabled || typeof window === 'undefined') return
  const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return
  try {
    context ??= new Ctor()
    void context.resume()
    const voice = VOICES[theme][cue]
    const now = context.currentTime
    tone(context, now, voice.frequency, voice.duration, voice.type, voice.gain)
    if (voice.second) {
      const { frequency, delay, duration } = voice.second
      tone(context, now + delay, frequency, duration, voice.type, voice.gain * 0.8)
    }
  } catch {
    /* audio is decoration; never let it break a turn */
  }
}
