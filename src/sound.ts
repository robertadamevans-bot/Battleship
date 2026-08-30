type Cue = 'miss' | 'hit' | 'sunk' | 'lose'

interface Voice {
  frequency: number
  duration: number
  type: OscillatorType
  gain: number
}

const VOICES: Record<Cue, Voice> = {
  miss: { frequency: 220, duration: 0.12, type: 'sine', gain: 0.05 },
  hit: { frequency: 96, duration: 0.2, type: 'square', gain: 0.07 },
  sunk: { frequency: 62, duration: 0.5, type: 'sawtooth', gain: 0.08 },
  lose: { frequency: 48, duration: 0.7, type: 'triangle', gain: 0.09 },
}

let context: AudioContext | null = null

/** Short synthesised cues — no audio files, no autoplay before a user gesture. */
export function play(cue: Cue, enabled: boolean): void {
  if (!enabled || typeof window === 'undefined') return
  const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return
  try {
    context ??= new Ctor()
    void context.resume()
    const voice = VOICES[cue]
    const osc = context.createOscillator()
    const amp = context.createGain()
    osc.type = voice.type
    osc.frequency.setValueAtTime(voice.frequency, context.currentTime)
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(30, voice.frequency * 0.6),
      context.currentTime + voice.duration,
    )
    amp.gain.setValueAtTime(voice.gain, context.currentTime)
    amp.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + voice.duration)
    osc.connect(amp).connect(context.destination)
    osc.start()
    osc.stop(context.currentTime + voice.duration)
  } catch {
    /* audio is decoration; never let it break a turn */
  }
}
