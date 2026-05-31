// Pomodoro timer state machine.
//
// Pure logic, no DOM / SDK — easy to reason about and reuse. The host calls
// tick() once a second (or recomputes from a timestamp) and reads the state to
// render. Time is tracked from a target end-timestamp so it stays accurate even
// if the tick interval drifts.

export type Phase = 'work' | 'shortBreak' | 'longBreak'

export interface PomodoroConfig {
  workMin: number
  shortBreakMin: number
  longBreakMin: number
  /** Work sessions completed before a long break. */
  cyclesBeforeLongBreak: number
}

export const DEFAULT_CONFIG: PomodoroConfig = {
  workMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  cyclesBeforeLongBreak: 4,
}

export interface PomodoroState {
  phase: Phase
  remainingSec: number
  running: boolean
  /** Completed work sessions in the current long-break cycle (0..cyclesBeforeLongBreak). */
  completedInCycle: number
  /** Total completed work sessions ever (for stats). */
  totalWork: number
}

const PHASE_LABEL: Record<Phase, string> = {
  work: '作業',
  shortBreak: '休憩',
  longBreak: '長休憩',
}

export function phaseLabel(p: Phase): string {
  return PHASE_LABEL[p]
}

export class Pomodoro {
  private config: PomodoroConfig
  private phase: Phase = 'work'
  private remainingMs: number
  private running = false
  private endAt = 0 // wall-clock ms when the running phase ends
  private completedInCycle = 0
  private totalWork = 0
  /** Called when a phase completes (for chimes / notifications). */
  onPhaseComplete?: (finished: Phase, next: Phase) => void

  constructor(config: PomodoroConfig = DEFAULT_CONFIG) {
    this.config = { ...config }
    this.remainingMs = this.phaseDurationMs('work')
  }

  private phaseDurationMs(p: Phase): number {
    const min =
      p === 'work'
        ? this.config.workMin
        : p === 'shortBreak'
          ? this.config.shortBreakMin
          : this.config.longBreakMin
    return Math.max(1, min) * 60_000
  }

  start(now: number) {
    if (this.running) return
    this.running = true
    this.endAt = now + this.remainingMs
  }

  pause(now: number) {
    if (!this.running) return
    this.remainingMs = Math.max(0, this.endAt - now)
    this.running = false
  }

  toggle(now: number) {
    if (this.running) this.pause(now)
    else this.start(now)
  }

  /** Reset the current phase's clock (keeps phase and cycle progress). */
  reset(now: number) {
    this.remainingMs = this.phaseDurationMs(this.phase)
    if (this.running) this.endAt = now + this.remainingMs
  }

  /** Skip to the next phase immediately. */
  skip(now: number) {
    this.advance(now)
  }

  private advance(now: number) {
    const finished = this.phase
    let next: Phase
    if (finished === 'work') {
      this.completedInCycle++
      this.totalWork++
      next =
        this.completedInCycle >= this.config.cyclesBeforeLongBreak ? 'longBreak' : 'shortBreak'
    } else {
      // A break finished → back to work. A long break closes the cycle.
      if (finished === 'longBreak') this.completedInCycle = 0
      next = 'work'
    }
    this.phase = next
    this.remainingMs = this.phaseDurationMs(next)
    if (this.running) this.endAt = now + this.remainingMs
    this.onPhaseComplete?.(finished, next)
  }

  /** Recompute from the wall clock; advances the phase when time runs out. */
  tick(now: number) {
    if (!this.running) return
    if (now >= this.endAt) this.advance(now)
  }

  applyConfig(config: PomodoroConfig) {
    const wasRunning = this.running
    this.config = { ...config }
    // Re-arm the current phase to the new duration only while not running, so we
    // don't disturb an in-progress countdown.
    if (!wasRunning) this.remainingMs = this.phaseDurationMs(this.phase)
  }

  getState(now: number): PomodoroState {
    const remainingMs = this.running ? Math.max(0, this.endAt - now) : this.remainingMs
    return {
      phase: this.phase,
      remainingSec: Math.ceil(remainingMs / 1000),
      running: this.running,
      completedInCycle: this.completedInCycle,
      totalWork: this.totalWork,
    }
  }

  getConfig(): PomodoroConfig {
    return { ...this.config }
  }
}

/** Seconds → "MM:SS". */
export function formatTime(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
