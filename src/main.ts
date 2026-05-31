// Even G2 Pomodoro — plugin entry point.
//
// App logic runs on the phone; the glasses render one text container and report
// touchpad / ring events. Controls:
//   tap            → start / pause
//   swipe up       → skip to next phase
//   swipe down     → reset current phase
//   double-tap     → exit
//
// See README for the development / sideload workflow.

import {
  waitForEvenAppBridge,
  TextContainerProperty,
  CreateStartUpPageContainer,
  TextContainerUpgrade,
  OsEventTypeList,
} from '@evenrealities/even_hub_sdk'
import {
  Pomodoro,
  DEFAULT_CONFIG,
  type PomodoroConfig,
  type PomodoroState,
  phaseLabel,
  formatTime,
} from './pomodoro'
import { mountUi, render as renderUi } from './ui'

// ── Config persistence ─────────────────────────────────────────────────────
const CONFIG_STORAGE = 'eveng2_pomodoro_config'
function loadConfig(): PomodoroConfig {
  try {
    const raw = typeof localStorage !== 'undefined' && localStorage.getItem(CONFIG_STORAGE)
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch {
    /* ignore malformed storage */
  }
  return { ...DEFAULT_CONFIG }
}
function saveConfig(c: PomodoroConfig) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(CONFIG_STORAGE, JSON.stringify(c))
  } catch {
    /* ignore */
  }
}

const now = () => Date.now()
const timer = new Pomodoro(loadConfig())

// Phone buzz on phase change (no speaker on the glasses). Best-effort.
timer.onPhaseComplete = (_finished, next) => {
  try {
    navigator.vibrate?.(next === 'work' ? [120, 80, 120] : 200)
  } catch {
    /* ignore */
  }
  forceRender()
}

// ── Companion UI ────────────────────────────────────────────────────────────
mountUi(timer.getConfig(), {
  onToggle: () => {
    timer.toggle(now())
    forceRender()
  },
  onReset: () => {
    timer.reset(now())
    forceRender()
  },
  onSkip: () => {
    timer.skip(now())
    forceRender()
  },
  onConfigChange: cfg => {
    timer.applyConfig(cfg)
    saveConfig(cfg)
    forceRender()
  },
})

// ── Glasses page ─────────────────────────────────────────────────────────────
const CONTAINER_ID = 1
const CONTAINER_NAME = 'pomodoro'

const bridge = await waitForEvenAppBridge()

const main = new TextContainerProperty({
  xPosition: 0,
  yPosition: 0,
  width: 576,
  height: 288,
  borderWidth: 0,
  borderColor: 5,
  paddingLength: 8,
  containerID: CONTAINER_ID,
  containerName: CONTAINER_NAME,
  content: glassesContent(timer.getState(now())),
  isEventCapture: 1,
})

const created = await bridge.createStartUpPageContainer(
  new CreateStartUpPageContainer({ containerTotalNum: 1, textObject: [main] }),
)
if (created !== 0) console.error('createStartUpPageContainer failed:', created)

// ── Rendering ────────────────────────────────────────────────────────────────
function glassesContent(s: PomodoroState): string {
  let dots = ''
  const total = timer.getConfig().cyclesBeforeLongBreak
  for (let i = 0; i < total; i++) dots += i < s.completedInCycle ? '●' : '○'
  const hint = s.running ? 'タップで一時停止' : 'タップで開始'
  const phase = s.running ? phaseLabel(s.phase) : `${phaseLabel(s.phase)}（停止中）`
  return `${phase}   ${dots}\n\n${formatTime(s.remainingSec)}\n\n${hint}`
}

let lastGlasses = ''
async function renderGlasses(s: PomodoroState) {
  const content = glassesContent(s)
  if (content === lastGlasses) return
  lastGlasses = content
  try {
    await bridge.textContainerUpgrade(
      new TextContainerUpgrade({ containerID: CONTAINER_ID, containerName: CONTAINER_NAME, content }),
    )
  } catch (err) {
    console.error('textContainerUpgrade failed:', err)
  }
}

function renderAll() {
  const s = timer.getState(now())
  renderUi(s, timer.getConfig().cyclesBeforeLongBreak)
  void renderGlasses(s)
}

/** Render immediately after a state change (don't wait for the next tick). */
function forceRender() {
  renderAll()
}

// Drive the clock. 500 ms keeps the seconds display within half a second of
// accurate while staying light on the BLE render queue (renders only on change).
const loop = window.setInterval(() => {
  timer.tick(now())
  renderAll()
}, 500)
renderAll()

// ── Cleanup ──────────────────────────────────────────────────────────────────
let cleanedUp = false
function cleanup() {
  if (cleanedUp) return
  cleanedUp = true
  window.clearInterval(loop)
  unsubscribe()
}

// ── Event routing ──────────────────────────────────────────────────────────────
// Protobuf omits zero-value fields, so CLICK_EVENT (0) arrives with its
// eventType field absent. Treat "sysEvent present but eventType missing" as a
// click, rather than coalescing the whole thing to null.
let lastScroll = 0
const SCROLL_COOLDOWN = 300

const unsubscribe = bridge.onEvenHubEvent((event: any) => {
  const sysType = event.sysEvent ? (event.sysEvent.eventType ?? 0) : null
  const textType = event.textEvent ? (event.textEvent.eventType ?? 0) : null
  const type = sysType ?? textType
  if (type === null) return

  switch (type) {
    case OsEventTypeList.CLICK_EVENT:
      timer.toggle(now())
      forceRender()
      break
    case OsEventTypeList.DOUBLE_CLICK_EVENT:
      bridge.shutDownPageContainer(1)
      break
    case OsEventTypeList.SCROLL_TOP_EVENT:
    case OsEventTypeList.SCROLL_BOTTOM_EVENT: {
      const t = performance.now()
      if (t - lastScroll < SCROLL_COOLDOWN) break
      lastScroll = t
      if (type === OsEventTypeList.SCROLL_TOP_EVENT) timer.skip(now())
      else timer.reset(now())
      forceRender()
      break
    }
    case OsEventTypeList.SYSTEM_EXIT_EVENT:
    case OsEventTypeList.ABNORMAL_EXIT_EVENT:
      cleanup()
      break
  }
})

window.addEventListener('beforeunload', cleanup)
