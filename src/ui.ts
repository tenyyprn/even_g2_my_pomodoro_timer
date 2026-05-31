// Companion phone UI for the Pomodoro timer.
//
// Mirrors what the glasses show (phase + countdown + cycle progress) and exposes
// the controls and duration settings. The single source of truth is the
// Pomodoro instance in main.ts; this module just renders state and reports
// user intent through callbacks.

import { type PomodoroConfig, type PomodoroState, phaseLabel, formatTime } from './pomodoro'

export interface UiCallbacks {
  onToggle: () => void
  onReset: () => void
  onSkip: () => void
  onConfigChange: (config: PomodoroConfig) => void
}

let phaseEl: HTMLDivElement
let timeEl: HTMLDivElement
let dotsEl: HTMLDivElement
let totalEl: HTMLDivElement
let toggleBtn: HTMLButtonElement
const cfgInputs: Record<keyof PomodoroConfig, HTMLInputElement> = {} as never

export function mountUi(initialConfig: PomodoroConfig, cb: UiCallbacks) {
  const app = document.querySelector<HTMLDivElement>('#app')!
  app.innerHTML = `
    <main class="panel">
      <header><h1>ポモドーロ</h1></header>

      <section class="timer">
        <div id="phase" class="phase">作業</div>
        <div id="time" class="time">25:00</div>
        <div id="dots" class="dots"></div>
        <div id="total" class="total">完了 0</div>
      </section>

      <section class="buttons">
        <button id="toggle" class="btn btn-primary">開始</button>
        <button id="reset" class="btn">リセット</button>
        <button id="skip" class="btn">スキップ</button>
      </section>

      <section class="settings">
        <h2>設定（分）</h2>
        <div class="grid">
          <label>作業<input id="cfg-workMin" type="number" min="1" max="180" /></label>
          <label>休憩<input id="cfg-shortBreakMin" type="number" min="1" max="60" /></label>
          <label>長休憩<input id="cfg-longBreakMin" type="number" min="1" max="120" /></label>
          <label>長休憩まで<input id="cfg-cyclesBeforeLongBreak" type="number" min="1" max="12" /></label>
        </div>
      </section>

      <footer>グラス: タップ=開始/一時停止 · 上スワイプ=スキップ · 下スワイプ=リセット · ダブルタップ=終了</footer>
    </main>
  `
  phaseEl = app.querySelector<HTMLDivElement>('#phase')!
  timeEl = app.querySelector<HTMLDivElement>('#time')!
  dotsEl = app.querySelector<HTMLDivElement>('#dots')!
  totalEl = app.querySelector<HTMLDivElement>('#total')!
  toggleBtn = app.querySelector<HTMLButtonElement>('#toggle')!

  toggleBtn.addEventListener('click', cb.onToggle)
  app.querySelector<HTMLButtonElement>('#reset')!.addEventListener('click', cb.onReset)
  app.querySelector<HTMLButtonElement>('#skip')!.addEventListener('click', cb.onSkip)

  const keys: Array<keyof PomodoroConfig> = [
    'workMin',
    'shortBreakMin',
    'longBreakMin',
    'cyclesBeforeLongBreak',
  ]
  for (const k of keys) {
    const el = app.querySelector<HTMLInputElement>(`#cfg-${k}`)!
    el.value = String(initialConfig[k])
    cfgInputs[k] = el
    el.addEventListener('change', () => cb.onConfigChange(readConfig()))
  }

  injectStyles()
}

function readConfig(): PomodoroConfig {
  const num = (k: keyof PomodoroConfig, dflt: number) => {
    const v = parseInt(cfgInputs[k].value, 10)
    return Number.isFinite(v) && v > 0 ? v : dflt
  }
  return {
    workMin: num('workMin', 25),
    shortBreakMin: num('shortBreakMin', 5),
    longBreakMin: num('longBreakMin', 15),
    cyclesBeforeLongBreak: num('cyclesBeforeLongBreak', 4),
  }
}

export function render(state: PomodoroState, cyclesBeforeLongBreak: number) {
  if (!phaseEl) return
  phaseEl.textContent = state.running ? phaseLabel(state.phase) : `${phaseLabel(state.phase)}（一時停止）`
  phaseEl.className = `phase phase-${state.phase}`
  timeEl.textContent = formatTime(state.remainingSec)
  toggleBtn.textContent = state.running ? '一時停止' : '開始'

  let dots = ''
  for (let i = 0; i < cyclesBeforeLongBreak; i++) dots += i < state.completedInCycle ? '●' : '○'
  dotsEl.textContent = dots
  totalEl.textContent = `完了 ${state.totalWork}`
}

function injectStyles() {
  const css = `
    :root { color-scheme: dark; }
    html, body { margin: 0; height: 100%; background: #232323; color: #E5E5E5;
      font: 16px/1.4 -apple-system, BlinkMacSystemFont, 'Helvetica Neue', system-ui, sans-serif;
      touch-action: manipulation; -webkit-text-size-adjust: 100%; overscroll-behavior: none; }
    #app { display: flex; min-height: 100%; }
    .panel { display: flex; flex-direction: column; gap: 20px;
      width: 100%; max-width: 560px; margin: 0 auto; padding: 24px; box-sizing: border-box; }
    h1 { font-size: 18px; font-weight: 600; margin: 0; letter-spacing: 0.02em; }
    h2 { font-size: 13px; font-weight: 600; margin: 0 0 10px; color: #A7A7A7; }
    .timer { text-align: center; padding: 16px 0 8px; }
    .phase { font-size: 15px; letter-spacing: 0.1em; color: #A7A7A7; margin-bottom: 4px; }
    .phase-work { color: #3CFA44; }
    .phase-shortBreak, .phase-longBreak { color: #4AB8FF; }
    .time { font-size: 72px; font-weight: 700; font-variant-numeric: tabular-nums;
      letter-spacing: 0.02em; line-height: 1.1; }
    .dots { font-size: 20px; letter-spacing: 0.3em; color: #3CFA44; margin-top: 8px; }
    .total { font-size: 12px; color: #7B7B7B; margin-top: 6px; }
    .buttons { display: flex; gap: 12px; }
    .btn { flex: 1; padding: 14px 0; font-size: 15px; border-radius: 12px;
      border: 1px solid #3E3E3E; background: #2E2E2E; color: #E5E5E5; cursor: pointer; }
    .btn:active { background: #3A3A3A; }
    .btn-primary { background: #3CFA44; color: #0A2A0C; border-color: #3CFA44; font-weight: 600; }
    .settings .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .settings label { display: flex; align-items: center; justify-content: space-between;
      gap: 8px; font-size: 14px; color: #C9C9C9; background: #2E2E2E;
      border: 1px solid #3E3E3E; border-radius: 10px; padding: 8px 12px; }
    .settings input { width: 64px; background: #1E1E1E; color: #E5E5E5; border: 1px solid #3E3E3E;
      border-radius: 8px; padding: 6px 8px; font-size: 15px; text-align: right; }
    footer { font-size: 12px; color: #7B7B7B; text-align: center; line-height: 1.6; }
  `
  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)
}
