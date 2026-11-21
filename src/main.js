import './style.css'
import initialRecords from 'virtual:audio-records'
import { getTracks, putTrack, deleteTrack } from './library.js'
import { patterns, stepDuration } from './patterns.js'

const records = [...initialRecords]
const padKeys = ['1', '2', '3', '4', 'Q', 'W', 'E', 'R', 'A', 'S', 'D', 'F', 'Z', 'X', 'C', 'V']
import workletUrl from './vinyl-processor.js?url&no-inline'
import captureUrl from './capture-processor.js?url&no-inline'
import { fadeSplice } from './splice.js'

document.querySelector('#app').innerHTML = `
  <header class="masthead">
    <span class="brand"><i aria-hidden="true"></i> GROOVE DESK</span>
    <div class="header-actions">
      <button id="open-tutorial" type="button" aria-expanded="false" aria-controls="tutorial-menu">Tutorials</button>
      <button id="side-by-side" type="button" aria-pressed="false">Side by side (I)</button>
    </div>
  </header>
  <nav id="tutorial-menu" class="tutorial-menu" aria-label="Tutorials" hidden></nav>
  <aside id="tutorial" class="walkthrough" aria-labelledby="tutorial-title" hidden>
    <div class="tutorial-header">
      <div><span class="tutorial-label" id="tutorial-progress"></span><h2 id="tutorial-title"></h2></div>
      <button id="close-tutorial" type="button" aria-label="Exit walkthrough">Exit</button>
    </div>
    <p id="tutorial-explanation"></p>
    <p id="tutorial-action"></p>
    <div class="tutorial-actions">
      <button id="tutorial-back" type="button">Back</button>
      <button id="tutorial-next" type="button">Next</button>
      <button id="tutorial-skip" type="button">Skip</button>
    </div>
  </aside>
  <section class="intro">
    <h1>Hands on wax.</h1>
    <p>Grab the record and move it around the centre to scratch.</p>
  </section>
  <section class="sessions" aria-labelledby="sessions-title">
    <div class="session-heading">
      <h2 id="sessions-title">Saved sessions</h2>
      <span id="session-recording-indicator" role="status" hidden><span aria-hidden="true">●</span> RECORDING</span>
      <button id="session-record" type="button">Record session (P)</button>
      <button id="session-stop" type="button" disabled>Stop session</button>
    </div>
    <p id="session-status" role="status">Record the combined instrument output.</p>
    <div id="session-list"></div>
  </section>
  <div class="workspace">
    <nav class="view-menu" aria-label="Instrument view">
      <span>VIEW</span>
      <button type="button" data-view="vinyl" aria-pressed="true">Vinyl</button>
      <button type="button" data-view="pads" aria-pressed="false">Drum pads</button>
    </nav>
    <div class="instruments" data-view="vinyl">
  <div class="studio" id="vinyl-panel">
    <section class="deck" aria-label="Turntable">
      <div class="deck-top">
        <span>DIRECT DRIVE</span>
        <span class="status"><i></i><span id="status" role="status">Ready</span></span>
      </div>
      <div class="platter">
        <div id="vinyl" class="vinyl" aria-label="Scratch record">
          <div class="label"><span id="label-title"></span><i></i><small>33 ⅓ RPM</small></div>
          <span class="marker" aria-hidden="true"></span>
        </div>
      </div>
      <div class="tonearm" aria-hidden="true"><i></i></div>
      <div class="track-waveform" aria-label="Track waveform">
        <div class="track-waveform-screen">
          <canvas id="track-waveform" width="800" height="100" aria-hidden="true"></canvas>
          <input id="track-seek" type="range" min="0" max="0" step="0.01" value="0" aria-label="Seek in loaded track" disabled>
        </div>
        <div class="track-times"><span id="track-current">0:00</span><span id="track-duration">0:00</span></div>
      </div>
      <p class="keyboard-hint">Arrow keys change speed. L locks it. I toggles side by side. While splicing, Space saves a section; double-press Space to save and wait, then press Space to capture again. Enter pauses or resumes.</p>
      <div class="transport">
        <button id="splice" type="button">Splice</button>
        <button id="play-splice" type="button">Play &amp; Splice</button>
        <button id="splice-stop" type="button" hidden>Stop splicing</button>
        <button id="play" type="button">Play (Space)</button>
        <button id="restart" type="button">Start from beginning</button>
        <span class="speed-display"><span id="speed">0.00×</span> <span id="speed-lock" role="status">Unlocked</span></span>
      </div>
      <p id="vinyl-record-status" role="status"></p>
      <p id="splice-destination" role="status"></p>
      <div id="splice-final" hidden><span>Save the final segment?</span> <button id="splice-save" type="button">Save</button> <button id="splice-discard" type="button">Discard</button></div>
    </section>
    <aside class="crate" aria-labelledby="crate-title">
      <h2 id="crate-title">Record crate</h2>
      <p>Click or drag a disc onto the deck.</p>
      <div class="library-actions"><button id="add-audio" type="button">Add audio</button><input id="audio-files" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.opus,.webm" multiple hidden><button id="refresh-library" type="button">Refresh library</button></div>
      <p id="library-status" role="status">Added files stay in this browser until its site data is cleared.</p>
      <div class="records">

      </div>
      <div class="crate-note">Clockwise to speed up. Counterclockwise to reverse. Hold still to stop.</div>
    </aside>
  </div>

  <section class="sampler" id="pads-panel" aria-labelledby="sampler-title" hidden>
    <div class="sampler-heading">
      <div><span class="sampler-brand">GROOVE DESK INSTRUMENTS</span><h2 id="sampler-title">FIELDNOTE <span>04</span></h2><p class="model-caption">DIGITAL SAMPLING INSTRUMENT</p></div>
      <div class="sampler-vents" aria-hidden="true"></div>
    </div>
    <div class="sampler-console">
    <div class="sampler-display"><span id="waveform-label">SELECT A PAD</span><div class="waveform-screen"><canvas id="waveform" width="400" height="72" aria-label="Selected pad waveform, with the trimmed section highlighted"></canvas><span id="waveform-playhead" aria-hidden="true" hidden></span></div><p id="sampler-status" role="status">Record up to 30 seconds.</p></div>
    <div class="sampler-controls">
      <label class="volume-control">OUTPUT <input id="pad-level" type="range" min="0" max="1" step="0.01" value="1" aria-label="Sampler output volume"></label>
      <button id="record-take" type="button">● Record</button>
    </div>
    </div>
    <section class="pad-sound" aria-labelledby="pad-sound-title">
      <div class="sound-heading"><strong id="pad-sound-title">Select a pad to edit its sound</strong><button id="pad-sound-reset" type="button" disabled>Reset sound</button></div>
      <div class="sound-knobs">
        <label>Pitch <input class="sound-knob" data-setting="pitch" type="range" min="-24" max="24" step="1" value="0" disabled><output data-value="pitch">0 st</output></label>
        <label>Low-pass <input class="sound-knob" data-setting="filter" type="range" min="0" max="100" step="1" value="100" disabled><output data-value="filter">20.0 kHz</output></label>
        <label>Tone <input class="sound-knob" data-setting="tone" type="range" min="-12" max="12" step="1" value="0" disabled><output data-value="tone">0 dB</output></label>
        <label>Volume <input class="sound-knob" data-setting="volume" type="range" min="0" max="100" step="1" value="100" disabled><output data-value="volume">100%</output></label>
      </div>
    </section>
    <p class="sampler-instructions">Record the deck, then choose a pad. Play using the keys shown on each pad. Press I for side by side and P to start or stop a session recording.</p>
    <div class="pad-tools">
      <button id="multiple-pads" type="button" aria-pressed="false">Multiple pads: off</button>
      <button id="clear-all-pads" type="button">Clear all pads</button>
      <label>Copy from <select id="copy-source">${padKeys.map((key, index) => `<option value="${index}">Pad ${index + 1} (${key})</option>`).join('')}</select></label>
      <label>To <select id="copy-destination">${padKeys.map((key, index) => `<option value="${index}" ${index === 1 ? 'selected' : ''}>Pad ${index + 1} (${key})</option>`).join('')}</select></label>
      <button id="copy-pad" type="button">Copy sound</button>
    </div>
    <div class="pads">
      ${padKeys.map((key, index) => `<button class="pad" type="button" aria-label="Pad ${index + 1}, key ${key}"><strong>${index + 1}</strong><span>${index < 4 ? 'Drum' : 'Empty'}</span><small>KEY ${key}</small></button>`).join('')}
    </div>
    <section class="patterns" aria-labelledby="patterns-title">
      <div class="pattern-heading"><strong id="patterns-title">DRUM PATTERNS</strong><label>BPM <input id="pattern-bpm" type="number" min="40" max="240" value="100"></label></div>
      <div class="pattern-list">${patterns.map((pattern, index) => `<button type="button" data-pattern="${index}" aria-pressed="false">Play ${pattern.name} ? ${pattern.meter}</button>`).join('')}</div>
      <p id="pattern-status" role="status">Patterns stopped.</p>
    </section>
    <div class="pad-settings">
      ${padKeys.map((key, index) => `<div class="pad-row" data-index="${index}">
        <strong>Pad ${index + 1} (${key})</strong>
        <button class="loop-toggle" type="button" aria-pressed="false">Loop off</button>
        <button class="loop-stop" type="button" disabled>Stop</button>
        <button class="edit-pad" type="button" disabled>Trim</button>
        <button class="clear-pad" type="button" disabled>Clear</button>
      </div>`).join('')}
    </div>
    <dialog class="trim-editor" aria-labelledby="trim-title">
      <strong id="trim-title"></strong>
      <p class="trim-instructions">Drag the handles to select a section. Use the arrow keys on a handle for precise adjustments.</p>
      <div class="trim-waveform" id="trim-waveform">
        <canvas id="trim-canvas" width="800" height="180" aria-hidden="true"></canvas>
        <div class="trim-shade trim-shade-start"></div><div class="trim-shade trim-shade-end"></div>
        <div class="trim-handle" id="trim-handle-start" role="slider" tabindex="0" aria-label="Trim start" aria-valuemin="0" aria-orientation="horizontal"></div>
        <div class="trim-handle" id="trim-handle-end" role="slider" tabindex="0" aria-label="Trim end" aria-valuemin="0" aria-orientation="horizontal"></div>
      </div>
      <p id="trim-duration" aria-live="polite"></p>
      <label>Start (seconds) <input id="trim-start" type="number" min="0" step="0.01"></label>
      <label>End (seconds) <input id="trim-end" type="number" min="0" step="0.01"></label>
      <button id="trim-preview" type="button">Preview</button>
      <button id="trim-save" type="button">Save trim</button>
      <button id="trim-cancel" type="button">Cancel</button>
      <p id="trim-message" role="status"></p>
    </dialog>
  </section>
    </div>
  </div>
`

const instruments = document.querySelector('.instruments')
const tutorial = document.querySelector('#tutorial')
const tutorialOpen = document.querySelector('#open-tutorial')
let tutorialStep = 0
let tutorialPad = 0
let tutorialTimer
let tutorialTrimmed = false
let tutorialSoundAdjusted = false
let tutorialPatternStarted = false
let tutorialMultipleEnabled = false
const introSteps = [
  { title: 'Meet the record', explanation: 'Sampling means using a piece of sound to make something new. Here the vinyl is your source, and the pads play your samples.', action: 'Click an example record to play it. Use the track waveform to jump to another part.', view: 'vinyl', targets: ['.crate', '#track-seek'] },
  { title: 'Change the sound', explanation: 'Moving the record changes its speed and pitch together. You can scratch forwards and backwards.', action: 'Drag the record or hold an arrow key and listen. Press L to lock or unlock the speed.', view: 'vinyl', targets: ['#vinyl'] },
  { title: 'Capture a sample', explanation: 'Splice sends each section to an available pad. Seeking saves the current section and waits so the jump is not captured.', action: 'Check the next pad, press Play & Splice, then press Space to save a short sound. Stop splicing when ready.', view: 'vinyl', targets: ['#play-splice', '#splice', '#splice-destination'] },
  { title: 'Play the pad', explanation: 'Each pad plays a sound. The vertical line on its waveform follows playback.', action: '', view: 'pads' },
  { title: 'Trim and shape', explanation: 'Trim selects the part of the sample that plays. Pitch, low-pass and volume change how the selected pad sounds.', action: '', view: 'pads' },
  { title: 'Make a beat', explanation: 'Drum patterns play alongside your pads. Multiple pads mode lets pad sounds overlap.', action: 'Start a drum pattern and turn on Multiple pads, then play some pads.', view: 'pads', targets: ['.patterns', '#multiple-pads'] },
  { title: 'Record a session', explanation: 'Side by side shows both instruments. A session captures the vinyl, pads and drum pattern together.', action: 'Press I or Side by side, press P to record, perform, then press P again. Play your take in Saved sessions.', targets: ['#side-by-side', '#session-record', '#session-list'] },
]
const lessons = [
  { id: 'sampling', title: 'Introduction to Groove Desk', steps: introSteps },
]
let activeLesson = lessons[0]
const tutorialMenu = document.querySelector('#tutorial-menu')
lessons.forEach(lesson => {
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = lesson.title
  button.addEventListener('click', () => {
    clearTimeout(tutorialTimer)
    tutorialTimer = null
    activeLesson = lesson
    tutorialStep = 0
    tutorialPad = 0
    tutorialTrimmed = false
    tutorialSoundAdjusted = false
    tutorialPatternStarted = false
    tutorialMultipleEnabled = false
    tutorialMenu.hidden = true
    tutorialOpen.setAttribute('aria-expanded', 'false')
    tutorial.hidden = false
    renderTutorial()
  })
  tutorialMenu.append(button)
})

function clearTutorialHighlights() {
  document.querySelectorAll('.tutorial-highlight').forEach(element => element.classList.remove('tutorial-highlight'))
}

function renderTutorial() {
  clearTutorialHighlights()
  const step = activeLesson.steps[tutorialStep]
  document.querySelector('#tutorial-progress').textContent = activeLesson.title + '  /  ' + (tutorialStep + 1) + ' OF ' + activeLesson.steps.length
  document.querySelector('#tutorial-title').textContent = step.title
  document.querySelector('#tutorial-explanation').textContent = step.explanation
  let action = step.action
  if (tutorialStep === 3) {
    action = 'Press pad ' + (tutorialPad + 1) + ' or its ' + padKeys[tutorialPad] + ' key, and watch the waveform. Use Side by side to stop splicing when ready.'
  } else if (tutorialStep === 4) {
    action = 'Press Trim for pad ' + (tutorialPad + 1) + ', drag the handles and save. Then adjust a sound control and play the pad again.'
  }
  document.querySelector('#tutorial-action').textContent = action
  document.querySelector('#tutorial-back').disabled = tutorialStep === 0
  document.querySelector('#tutorial-next').textContent = tutorialStep === activeLesson.steps.length - 1 ? 'Finish' : 'Next'
  if (step.view) {
    selectedView = step.view
    updateView()
  }
  const targets = tutorialStep === 3 ? ['.pad:nth-child(' + (tutorialPad + 1) + ')', '.sampler-display']
    : tutorialStep === 4 ? ['.pad-row[data-index="' + tutorialPad + '"] .edit-pad', '.pad-sound']
    : step.targets
  targets.forEach(selector => document.querySelector(selector)?.classList.add('tutorial-highlight'))
}

function advanceTutorial(step) {
  if (tutorial.hidden || activeLesson.id !== 'sampling' || tutorialStep !== step) return
  tutorialStep++
  renderTutorial()
}

function closeTutorial() {
  clearTimeout(tutorialTimer)
  tutorialTimer = null
  tutorial.hidden = true
  clearTutorialHighlights()
  tutorialOpen.focus()
}

tutorialOpen.addEventListener('click', () => {
  tutorialMenu.hidden = !tutorialMenu.hidden
  tutorialOpen.setAttribute('aria-expanded', String(!tutorialMenu.hidden))
})
document.querySelector('#close-tutorial').addEventListener('click', closeTutorial)
document.querySelector('#tutorial-skip').addEventListener('click', closeTutorial)
document.querySelector('#tutorial-back').addEventListener('click', () => {
  clearTimeout(tutorialTimer)
  tutorialTimer = null
  if (tutorialStep > 0) { tutorialStep--; renderTutorial() }
})
document.querySelector('#tutorial-next').addEventListener('click', () => {
  clearTimeout(tutorialTimer)
  tutorialTimer = null
  if (tutorialStep === activeLesson.steps.length - 1) closeTutorial()
  else { tutorialStep++; renderTutorial() }
})
const vinylPanel = document.querySelector('#vinyl-panel')
const padsPanel = document.querySelector('#pads-panel')
const viewButtons = [...document.querySelectorAll('[data-view]')].filter(element => element.tagName === 'BUTTON')
const sideBySideButton = document.querySelector('#side-by-side')
let selectedView = 'vinyl'
let sideBySide = false

function updateView() {
  instruments.dataset.view = sideBySide ? 'both' : selectedView
  vinylPanel.hidden = !sideBySide && selectedView !== 'vinyl'
  padsPanel.hidden = !sideBySide && selectedView !== 'pads'
  viewButtons.forEach(item => item.setAttribute('aria-pressed', String(item.dataset.view === selectedView)))
  sideBySideButton.setAttribute('aria-pressed', String(sideBySide))
}

viewButtons.forEach(button => {
  button.addEventListener('click', () => {
    selectedView = button.dataset.view
    updateView()
  })
})
sideBySideButton.addEventListener('click', () => {
  sideBySide = !sideBySide
  updateView()
})

const vinyl = document.querySelector('#vinyl')
const deck = document.querySelector('.deck')
const play = document.querySelector('#play')
const status = document.querySelector('#status')
const speed = document.querySelector('#speed')
const speedLockStatus = document.querySelector('#speed-lock')
const trackWaveform = document.querySelector('#track-waveform')
const trackSeek = document.querySelector('#track-seek')
const trackCurrent = document.querySelector('#track-current')
const trackDurationLabel = document.querySelector('#track-duration')
const spliceDestination = document.querySelector('#splice-destination')
let trackDuration = 0
let pendingSeekId = null
let seekSequence = 0
let trackDragging = false
const recordControls = [document.querySelector('#record-take')]
const vinylRecordStatus = document.querySelector('#vinyl-record-status')
const spliceButton = document.querySelector('#splice')
const playSpliceButton = document.querySelector('#play-splice')
const spliceStop = document.querySelector('#splice-stop')
const spliceFinal = document.querySelector('#splice-final')
const waveform = document.querySelector('#waveform')
const waveformLabel = document.querySelector('#waveform-label')
const waveformPlayhead = document.querySelector('#waveform-playhead')
let selectedPad = null
let splicing = false
let spliceWaiting = false
let lastSpliceSpace = 0
const spliceDoublePressMs = 300
let spliceBusy = false
let spliceIndex = 0
let pendingSplice = null
let loadedIndex = null
let audioPosition = null
const padRows = [...document.querySelectorAll('.pad-row')]
const trimEditor = document.querySelector('.trim-editor')
const trimStart = document.querySelector('#trim-start')
const trimEnd = document.querySelector('#trim-end')
const trimMessage = document.querySelector('#trim-message')
const trimWaveform = document.querySelector('#trim-waveform')
const trimCanvas = document.querySelector('#trim-canvas')
const trimHandles = [document.querySelector('#trim-handle-start'), document.querySelector('#trim-handle-end')]
const trimShades = [document.querySelector('.trim-shade-start'), document.querySelector('.trim-shade-end')]
const trimDuration = document.querySelector('#trim-duration')
let editingPad = null
let previewSource
function setMessage(message) {
  samplerStatus.textContent = message
  if (!splicing && spliceFinal.hidden) vinylRecordStatus.textContent = message
}
const samplerStatus = document.querySelector('#sampler-status')
const pads = [...document.querySelectorAll('.pad')]
const padBuffers = Array(padKeys.length).fill(null)
const padLoops = Array(padKeys.length).fill(false)
const padTrim = Array(padKeys.length).fill(null)
const defaultPadSound = () => ({ pitch: 0, filter: 100, tone: 0, volume: 100 })
const padSounds = padKeys.map(() => defaultPadSound())
const soundKnobs = [...document.querySelectorAll('.sound-knob')]
const soundReset = document.querySelector('#pad-sound-reset')
let defaultDrums
let capture
let audioSetup
let capturePending = false
let sessionRecording = false
let sessionPending = false
let sessionCount = 0
const sessionRecord = document.querySelector('#session-record')
const sessionStop = document.querySelector('#session-stop')
const sessionStatus = document.querySelector('#session-status')
const sessionIndicator = document.querySelector('#session-recording-indicator')
const sessionList = document.querySelector('#session-list')
const padSources = Array(padKeys.length).fill(null)
const padPlayback = Array(padKeys.length).fill(null)
const padVersions = Array(padKeys.length).fill(0)
let multiplePads = false
const padLevel = document.querySelector('#pad-level')
const padLights = Array(padKeys.length).fill(null)
let padTriggerVersion = 0
let take = null
let recording = false
let recordButtons = []
const normalOmega = (33 + 1 / 3) * 2 * Math.PI / 60
const dragType = 'application/x-groove-desk-record'
let selected = 0
let context
let player
let master
let starting
let playing = false
let angle = 0
let visualRate = 0
let targetRate = 0
let pointer
let lastFrame = performance.now()
let keyboardRate = 1
let speedLocked = false
let lockedRate = 1
const heldKeys = new Set()
let loadVersion = 0
const decodedTracks = new Map()

function formatTrackTime(seconds) {
  const whole = Math.max(0, Math.floor(seconds))
  return Math.floor(whole / 60) + ':' + String(whole % 60).padStart(2, '0')
}

function drawTrackWaveform(channels) {
  const ctx = trackWaveform.getContext('2d')
  const width = trackWaveform.width
  const height = trackWaveform.height
  const samples = channels[0]
  ctx.clearRect(0, 0, width, height)
  ctx.strokeStyle = '#b8db86'
  ctx.beginPath()
  for (let x = 0; x < width; x++) {
    const start = Math.floor(x * samples.length / width)
    const end = Math.max(start + 1, Math.floor((x + 1) * samples.length / width))
    let low = 0
    let high = 0
    for (let i = start; i < Math.min(end, samples.length); i++) {
      low = Math.min(low, samples[i])
      high = Math.max(high, samples[i])
    }
    ctx.moveTo(x + 0.5, height / 2 - high * height * 0.48)
    ctx.lineTo(x + 0.5, height / 2 - low * height * 0.48 + 1)
  }
  ctx.stroke()
}

function seekTrack(seconds) {
  if (!player || !trackDuration) return
  if (splicing && (spliceBusy || pendingSplice)) {
    spliceStatus('Finish the current splice before seeking.')
    return
  }
  const finishRecording = splicing && !spliceWaiting
  if (finishRecording) {
    spliceWaiting = true
    spliceBusy = true
    spliceButton.disabled = spliceStop.disabled = true
    lastSpliceSpace = 0
    spliceStatus('Seeking: saving the current segment and waiting. Press Space to capture again.')
  }
  pendingSeekId = ++seekSequence
  const position = Math.max(0, Math.min(trackDuration, seconds))
  trackSeek.value = position
  trackCurrent.textContent = formatTrackTime(position)
  player.port.postMessage({ seek: 'position', fraction: position / trackDuration, id: pendingSeekId, finishRecording })
}

trackSeek.addEventListener('pointerdown', () => { trackDragging = true })
for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  trackSeek.addEventListener(eventName, () => { trackDragging = false })
}
trackSeek.addEventListener('input', () => seekTrack(Number(trackSeek.value)))

function sendRate() {
  targetRate = playing ? (pointer?.rate ?? (heldKeys.size ? keyboardRate : (speedLocked ? lockedRate : 1))) : 0
  player?.port.postMessage({ rate: targetRate, released: playing && !pointer && !heldKeys.size, recordPaused: splicing && !playing })
}

async function loadRecord(index) {
  const record = records[index]
  if (!record) return false
  const version = ++loadVersion
  status.textContent = 'Loading ' + record.title + '?'
  try {
    let channels = decodedTracks.get(record)
    if (!channels) {
      const bytes = record.file ? await record.file.arrayBuffer() : await (async () => {
        const response = await fetch(import.meta.env.BASE_URL + record.url.slice(1))
        if (!response.ok) throw new Error('File could not be fetched')
        return response.arrayBuffer()
      })()
      const audio = await context.decodeAudioData(bytes)
      channels = Array.from({ length: audio.numberOfChannels }, (_, i) => audio.getChannelData(i).slice())
      decodedTracks.set(record, channels)
    }
    if (version !== loadVersion) return false
    player.port.postMessage({ samples: channels })
    loadedIndex = index
    trackDuration = channels[0].length / context.sampleRate
    trackSeek.max = trackDuration
    trackSeek.value = 0
    trackSeek.disabled = false
    trackCurrent.textContent = '0:00'
    trackDurationLabel.textContent = formatTrackTime(trackDuration)
    drawTrackWaveform(channels)
    status.textContent = playing ? 'Playing' : 'Ready'
    if (playing) advanceTutorial(0)
    return true
  } catch (error) {
    if (version === loadVersion) {
      status.textContent = 'Could not load or decode ' + record.title
      console.error(error)
    }
    return false
  }
}

function updateTransport() {
  play.textContent = playing ? (splicing ? 'Pause vinyl & capture (Enter)' : 'Pause (Space)') : (splicing ? 'Resume vinyl & capture (Enter)' : 'Play (Space)')
  if (splicing) showSpliceState()
  deck.classList.toggle('playing', playing)
  status.textContent = playing ? 'Playing' : 'Ready'
  sendRate()
  if (playing) advanceTutorial(0)
}

function makeDrums() {
  return [0, 1, 2, 3].map(index => {
    const duration = [0.35, 0.22, 0.09, 0.28][index]
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate)
    const samples = buffer.getChannelData(0)
    let seed = 42 + index
    for (let i = 0; i < samples.length; i++) {
      const t = i / context.sampleRate
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      const noise = seed / 2147483648 - 1
      const attack = Math.min(1, t * 500)
      if (index === 0) samples[i] = attack * 0.8 * Math.sin(2 * Math.PI * (48 * t + 2 * (1 - Math.exp(-35 * t)))) * Math.exp(-13 * t)
      if (index === 1) samples[i] = attack * (noise * 0.35 + Math.sin(2 * Math.PI * 180 * t) * 0.3) * Math.exp(-22 * t)
      if (index === 2) samples[i] = attack * noise * 0.32 * Math.exp(-65 * t)
      if (index === 3) samples[i] = attack * (noise * 0.22 + Math.sin(2 * Math.PI * 290 * t) * 0.4) * Math.exp(-16 * t)
    }
    return buffer
  })
}

async function ensureAudio() {
  if (!audioSetup) {
    audioSetup = (async () => {
      context ??= new AudioContext()
      await Promise.all([context.resume(), context.audioWorklet.addModule(workletUrl), context.audioWorklet.addModule(captureUrl)])
      master = context.createGain()
      capture = new AudioWorkletNode(context, 'capture-output', { outputChannelCount: [2] })
      master.connect(capture).connect(context.destination)
      defaultDrums = makeDrums()
      drawWaveform()
      capture.port.onmessage = ({ data }) => {
        if (!data.recording) return
        const length = data.recording[0].reduce((total, chunk) => total + chunk.length, 0)
        const audible = data.recording.some(chunks => chunks.some(chunk => chunk.some(sample => Math.abs(sample) > 0.00001)))
        if (data.id === 'pad') {
          recording = false
          capturePending = false
          recordControls.forEach(button => { button.textContent = '? Record to pad'; button.disabled = false; button.classList.remove('recording') })
        } else {
          sessionRecording = false
          sessionPending = false
          sessionRecord.disabled = false
          sessionRecord.classList.remove('recording')
          sessionStop.disabled = true
          sessionIndicator.hidden = true
        }
        if (!length || !audible) {
          const message = 'No sound captured. Play the vinyl or a pad and try again.'
          if (data.id === 'pad') setMessage(message)
          else sessionStatus.textContent = message
          return
        }
        const buffer = context.createBuffer(2, length, context.sampleRate)
        data.recording.forEach((chunks, channel) => {
          let offset = 0
          for (const chunk of chunks) {
            buffer.copyToChannel(chunk, channel, offset)
            offset += chunk.length
          }
        })
        if (data.id === 'pad') {
          take = buffer
          setMessage('Pad recording ready. Choose a pad to assign it.')
          pads.forEach(pad => pad.classList.add('assigning'))
        } else {
          addSession(buffer)
          sessionStatus.textContent = 'Session saved.'
        }
      }
    })().catch(error => { audioSetup = null; throw error })
  }
  await audioSetup
  if (context.state !== 'running') await context.resume()
}

async function startAudio() {
  if (playing || !records.length) return
  if (!starting) {
    starting = (async () => {
      try {
        await ensureAudio()
        if (!player) {
          player = new AudioWorkletNode(context, 'vinyl-player', { outputChannelCount: [2] })
          player.connect(master)
          player.port.onmessage = handleSplice
        }
        if (loadedIndex !== selected && !await loadRecord(selected)) return
        playing = true
        updateTransport()
      } catch (error) {
        status.textContent = 'Audio unavailable'
        console.error(error)
      }
    })().finally(() => { starting = null })
  }
  await starting
}

function selectRecord(index, activate = true) {
  if (!records[index]) return
  const changed = index !== selected
  selected = index
  const record = records[index]
  deck.style.setProperty('--accent', record.color)
  document.querySelector('#label-title').textContent = record.title
  recordButtons.forEach((button, i) => {
    button.setAttribute('aria-pressed', String(i === index))
  })
  if (changed && player && playing) void loadRecord(index)
  if (activate && !playing) void startAudio()
}

function wavBlob(buffer) {
  const channels = buffer.numberOfChannels
  const bytes = new ArrayBuffer(44 + buffer.length * channels * 2)
  const view = new DataView(bytes)
  const write = (offset, value) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)))
  write(0, 'RIFF')
  view.setUint32(4, bytes.byteLength - 8, true)
  write(8, 'WAVE')
  write(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, buffer.sampleRate, true)
  view.setUint32(28, buffer.sampleRate * channels * 2, true)
  view.setUint16(32, channels * 2, true)
  view.setUint16(34, 16, true)
  write(36, 'data')
  view.setUint32(40, bytes.byteLength - 44, true)
  const samples = Array.from({ length: channels }, (_, channel) => buffer.getChannelData(channel))
  let offset = 44
  for (let frame = 0; frame < buffer.length; frame++) {
    for (let channel = 0; channel < channels; channel++) {
      const sample = Math.max(-1, Math.min(1, samples[channel][frame]))
      view.setInt16(offset, sample < 0 ? sample * 32768 : sample * 32767, true)
      offset += 2
    }
  }
  return new Blob([bytes], { type: 'audio/wav' })
}

function addSession(buffer) {
  const name = 'Session ' + (++sessionCount)
  const url = URL.createObjectURL(wavBlob(buffer))
  const row = document.createElement('div')
  row.className = 'session-row'
  const label = document.createElement('strong')
  label.textContent = name
  const audio = document.createElement('audio')
  audio.controls = true
  audio.src = url
  audio.setAttribute('aria-label', name + ' playback')
  const download = document.createElement('a')
  download.href = url
  download.download = name + '.wav'
  download.textContent = 'Download'
  const remove = document.createElement('button')
  remove.type = 'button'
  remove.textContent = 'Delete'
  remove.setAttribute('aria-label', 'Delete ' + name)
  remove.addEventListener('click', () => {
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    URL.revokeObjectURL(url)
    row.remove()
  })
  row.append(label, audio, download, remove)
  sessionList.append(row)
}

recordControls.forEach(button => button.addEventListener('click', async () => {
  if (capturePending) return
  if (recording) {
    capturePending = true
    recordControls.forEach(control => { control.disabled = true; control.textContent = 'Finishing?' })
    capture.port.postMessage({ action: 'stop', id: 'pad' })
    return
  }
  capturePending = true
  recordControls.forEach(control => { control.disabled = true })
  try {
    await ensureAudio()
    take = null
    pads.forEach(pad => pad.classList.remove('assigning'))
    recording = true
    capture.port.postMessage({ action: 'start', id: 'pad' })
    recordControls.forEach(control => { control.disabled = false; control.textContent = '? Stop pad recording'; control.classList.add('recording') })
    setMessage('Recording to pad. Stop when ready (30 seconds maximum).')
  } catch (error) {
    recordControls.forEach(control => { control.disabled = false })
    setMessage('Audio recording is unavailable.')
    console.error(error)
  } finally {
    capturePending = false
  }
}))

sessionRecord.addEventListener('click', async () => {
  if (sessionRecording || sessionPending) return
  sessionPending = true
  sessionRecord.disabled = true
  try {
    await ensureAudio()
    capture.port.postMessage({ action: 'start', id: 'session' })
    sessionRecording = true
    sessionRecord.classList.add('recording')
    sessionIndicator.hidden = false
    sessionStop.disabled = false
    sessionStatus.textContent = 'Session recording active. Stop when ready (5 minutes maximum).'
  } catch (error) {
    sessionRecord.disabled = false
    sessionStatus.textContent = 'Session recording is unavailable.'
    console.error(error)
  } finally {
    sessionPending = false
  }
})
sessionStop.addEventListener('click', () => {
  if (!sessionRecording || sessionPending) return
  sessionPending = true
  sessionStop.disabled = true
  sessionStatus.textContent = 'Finishing session?'
  capture.port.postMessage({ action: 'stop', id: 'session' })
})

function spliceStatus(message) {
  vinylRecordStatus.textContent = message
}

function nextAvailablePad() {
  for (let offset = 0; offset < padBuffers.length; offset++) {
    const index = (spliceIndex + offset) % padBuffers.length
    if (!padBuffers[index]) return index
  }
  return null
}

function updateSpliceDestination() {
  const next = nextAvailablePad()
  spliceDestination.textContent = next === null
    ? 'All pads contain recordings. Clear a pad before saving another splice.'
    : 'Next splice destination: pad ' + (next + 1) + ' (' + padKeys[next] + ').'
}

function showSpliceState() {
  const state = spliceWaiting ? 'Splicing waiting' : 'Splicing capturing'
  const next = nextAvailablePad()
  spliceStatus(state + (playing ? '' : ' (vinyl paused)') + (next === null ? '. Clear a pad before continuing.' : '. Next segment goes to pad ' + (next + 1) + '.'))
  spliceButton.textContent = spliceWaiting ? 'Start capture (Space)' : 'Splice to pad (Space)'
  updateSpliceDestination()
}

function assignSplice(buffer) {
  const destination = nextAvailablePad()
  if (destination === null) return false
  stopPad(destination)
  tutorialPad = destination
  padBuffers[destination] = buffer
  padTrim[destination] = { start: 0, end: buffer.duration }
  selectPad(destination)
  spliceIndex = (destination + 1) % pads.length
  updatePad(destination)
  advanceTutorial(2)
  return true
}

function handleSplice({ data }) {
  if (data.position !== undefined) {
    audioPosition = data
    if (data.seekId !== undefined && pendingSeekId !== null && data.seekId >= pendingSeekId) pendingSeekId = null
    return
  }
  if (!data.recording) return
  spliceBusy = false
  spliceButton.disabled = false
  spliceStop.disabled = false
  const length = data.recording[0].reduce((sum, chunk) => sum + chunk.length, 0)
  const audible = data.recording.some(chunks => chunks.some(chunk => chunk.some(value => Math.abs(value) > 0.00001)))
  let buffer = null
  if (length && audible) {
    buffer = context.createBuffer(2, length, context.sampleRate)
    data.recording.forEach((chunks, channel) => {
      let offset = 0
      for (const chunk of chunks) {
        buffer.copyToChannel(chunk, channel, offset)
        offset += chunk.length
      }
    })
    fadeSplice(buffer)
  }
  if (data.final) {
    splicing = false
    spliceWaiting = false
    lastSpliceSpace = 0
    spliceButton.textContent = 'Splice'
    playSpliceButton.disabled = false
    updateTransport()
    spliceButton.classList.remove('recording')
    spliceStop.hidden = true
    if (buffer) {
      pendingSplice = buffer
      spliceFinal.hidden = false
      spliceButton.disabled = true
      const destination = nextAvailablePad()
      spliceStatus(destination === null ? 'Final segment ready. Clear a pad, then save it or discard it.' : 'Final segment ready for pad ' + (destination + 1) + '. Save or discard it.')
    } else {
      spliceStatus(data.limit ? 'Splicing stopped at the 30-second segment limit. No audio to save.' : 'Splicing stopped. No audio in the final segment.')
    }
    return
  }
  if (buffer) {
    if (!assignSplice(buffer)) {
      if (splicing && !spliceWaiting) {
        player.port.postMessage({ record: 'wait' })
        spliceWaiting = true
      }
      pendingSplice = buffer
      spliceFinal.hidden = false
      spliceButton.disabled = true
      spliceStatus('All pads contain recordings. Capture is waiting; clear a pad, then save or discard this segment.')
      return
    }
    if (splicing && nextAvailablePad() === null && !spliceWaiting) {
      player.port.postMessage({ record: 'wait' })
      spliceWaiting = true
    }
    if (data.reason === 'seek') {
      showSpliceState()
      spliceStatus('Seek saved the current segment and paused capture. Press Space to capture again.')
    } else showSpliceState()
  } else {
    showSpliceState()
    if (data.reason === 'seek') spliceStatus('Seek ended an empty segment and paused capture. Press Space to capture again.')
  }
}

function beginSpliceCapture() {
  if (!playing || !player) {
    spliceBusy = false
    spliceButton.disabled = false
    spliceStatus('Load and play a record to start splicing.')
    return
  }
  if (nextAvailablePad() === null) {
    spliceBusy = false
    spliceButton.disabled = false
    spliceStatus('All pads contain recordings. Clear a pad before starting a splice.')
    updateSpliceDestination()
    return
  }
  player.port.postMessage({ record: 'start' })
  splicing = true
  spliceWaiting = false
  lastSpliceSpace = 0
  spliceBusy = false
  spliceButton.disabled = false
  playSpliceButton.disabled = true
  spliceButton.classList.add('recording')
  spliceStop.hidden = false
  spliceStop.disabled = false
  updateTransport()
  showSpliceState()
}

async function startSplicing() {
  if (splicing || spliceBusy || pendingSplice) return
  spliceBusy = true
  spliceButton.disabled = true
  if (!playing) await startAudio()
  beginSpliceCapture()
}

spliceButton.addEventListener('click', () => {
  if (spliceBusy || pendingSplice) return
  if (splicing) {
    lastSpliceSpace = 0
    if (spliceWaiting) {
      if (nextAvailablePad() === null) {
        showSpliceState()
        return
      }
      player.port.postMessage({ record: 'start', paused: !playing })
      spliceWaiting = false
      showSpliceState()
      return
    }
    spliceBusy = true
    spliceButton.disabled = spliceStop.disabled = true
    player.port.postMessage({ record: 'splice' })
    return
  }
  void startSplicing()
})

spliceStop.addEventListener('click', () => {
  if (!splicing || spliceBusy || pendingSplice) return
  lastSpliceSpace = 0
  spliceBusy = true
  spliceButton.disabled = spliceStop.disabled = true
  player.port.postMessage({ record: 'stop' })
})

document.querySelector('#splice-save').addEventListener('click', () => {
  if (!pendingSplice || !assignSplice(pendingSplice)) return
  pendingSplice = null
  spliceFinal.hidden = true
  spliceButton.disabled = false
  if (splicing) showSpliceState()
  else spliceStatus('Final segment saved.')
})
document.querySelector('#splice-discard').addEventListener('click', () => {
  pendingSplice = null
  spliceFinal.hidden = true
  spliceButton.disabled = false
  if (splicing) showSpliceState()
  else spliceStatus('Final segment discarded.')
})

function stopPad(index) {
  padVersions[index]++
  if (padSources[index]) {
    const source = padSources[index]
    padSources[index] = null
    source.stop()
  }
  padPlayback[index] = null
  if (selectedPad === index) updateWaveformPlayhead()
  padRows[index].querySelector('.loop-stop').disabled = true
}

function filterFrequency(value) {
  return 120 * Math.pow(20000 / 120, value / 100)
}

function createPadVoice(index, buffer) {
  const source = context.createBufferSource()
  const lowPass = context.createBiquadFilter()
  const tone = context.createBiquadFilter()
  const gain = context.createGain()
  const sound = padSounds[index]
  source.buffer = buffer
  source.playbackRate.value = Math.pow(2, sound.pitch / 12)
  lowPass.type = 'lowpass'
  lowPass.frequency.value = Math.min(filterFrequency(sound.filter), context.sampleRate * 0.49)
  tone.type = 'highshelf'
  tone.frequency.value = Math.min(1500, context.sampleRate * 0.49)
  tone.gain.value = sound.tone
  gain.gain.value = Number(padLevel.value) * sound.volume / 100
  source.connect(lowPass).connect(tone).connect(gain).connect(master)
  return {
    source,
    disconnect() {
      source.disconnect()
      lowPass.disconnect()
      tone.disconnect()
      gain.disconnect()
    },
  }
}

function updateSoundControls() {
  const selected = selectedPad !== null
  document.querySelector('#pad-sound-title').textContent = selected ? 'PAD ' + (selectedPad + 1) + ' / SOUND' : 'Select a pad to edit its sound'
  soundReset.disabled = !selected
  soundKnobs.forEach(knob => {
    knob.disabled = !selected
    if (!selected) return
    const setting = knob.dataset.setting
    const value = padSounds[selectedPad][setting]
    knob.value = value
    const label = setting === 'pitch' ? value + ' st' : setting === 'filter' ? (filterFrequency(value) / 1000).toFixed(1) + ' kHz' : setting === 'tone' ? value + ' dB' : value + '%'
    document.querySelector('[data-value="' + setting + '"]').textContent = label
    knob.setAttribute('aria-valuetext', label)
  })
}

function selectPad(index) {
  selectedPad = index
  updateSoundControls()
  drawWaveform()
}

soundKnobs.forEach(knob => knob.addEventListener('input', () => {
  if (selectedPad === null) return
  padSounds[selectedPad][knob.dataset.setting] = Number(knob.value)
  updateSoundControls()
  if (!tutorial.hidden && tutorialStep === 4 && selectedPad === tutorialPad) {
    tutorialSoundAdjusted = true
    if (tutorialTrimmed) advanceTutorial(4)
  }
}))
soundReset.addEventListener('click', () => {
  if (selectedPad === null) return
  padSounds[selectedPad] = defaultPadSound()
  updateSoundControls()
})

function drawWaveform() {
  const ctx = waveform.getContext('2d')
  ctx.clearRect(0, 0, waveform.width, waveform.height)
  if (selectedPad === null) {
    waveformLabel.textContent = 'SELECT A PAD'
    waveformPlayhead.hidden = true
    return
  }
  const buffer = padBuffers[selectedPad] || defaultDrums?.[selectedPad]
  if (!buffer) {
    waveformLabel.textContent = 'PAD ' + (selectedPad + 1) + ' / EMPTY'
    waveformPlayhead.hidden = true
    return
  }
  const range = padTrim[selectedPad] || { start: 0, end: buffer.duration }
  const samples = buffer.getChannelData(0)
  const start = 0
  const end = samples.length
  waveformLabel.textContent = 'PAD ' + (selectedPad + 1) + (padBuffers[selectedPad] ? ' / SAMPLE' : ' / DRUM')
  ctx.fillStyle = '#385a414d'
  ctx.fillRect(0, 0, waveform.width * range.start / buffer.duration, waveform.height)
  const endX = waveform.width * range.end / buffer.duration
  ctx.fillRect(endX, 0, waveform.width - endX, waveform.height)
  ctx.strokeStyle = '#294c37'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 0; x < waveform.width; x++) {
    const from = start + Math.floor(x * (end - start) / waveform.width)
    const to = Math.max(from + 1, start + Math.floor((x + 1) * (end - start) / waveform.width))
    let low = 0
    let high = 0
    for (let i = from; i < Math.min(to, end); i++) {
      low = Math.min(low, samples[i])
      high = Math.max(high, samples[i])
    }
    ctx.moveTo(x + 0.5, 36 - high * 34)
    ctx.lineTo(x + 0.5, 36 - low * 34 + 1)
  }
  ctx.stroke()
  updateWaveformPlayhead()
}

function updateWaveformPlayhead() {
  const buffer = selectedPad === null ? null : padBuffers[selectedPad] || defaultDrums?.[selectedPad]
  if (!buffer) {
    waveformPlayhead.hidden = true
    return
  }
  const range = padTrim[selectedPad] || { start: 0, end: buffer.duration }
  const playback = padPlayback[selectedPad]
  let position = range.start
  if (playback && context) {
    const span = playback.end - playback.start
    const elapsed = Math.max(0, context.currentTime - playback.startedAt) * playback.rate
    if (playback.loop) position = playback.start + elapsed % span
    else if (elapsed < span) position = playback.start + elapsed
  }
  waveformPlayhead.hidden = false
  waveformPlayhead.style.left = Math.max(0, Math.min(100, position / buffer.duration * 100)) + '%'
}

function updatePad(index) {
  const saved = !!padBuffers[index]
  pads[index].querySelector('span').textContent = saved ? 'Sample' : (index < 4 ? 'Drum' : 'Empty')
  padRows[index].querySelector('.edit-pad').disabled = !saved
  padRows[index].querySelector('.clear-pad').disabled = !saved
  if (selectedPad === index) drawWaveform()
  updateSpliceDestination()
}

async function triggerPad(index) {
  if (multiplePads) stopPad(index)
  else {
    padTriggerVersion++
    padSources.forEach((_, padIndex) => stopPad(padIndex))
  }
  const version = padVersions[index]
  const generation = padTriggerVersion
  const pad = pads[index]
  selectPad(index)
  clearTimeout(padLights[index])
  pad.classList.add('lit')
  padLights[index] = setTimeout(() => pad.classList.remove('lit'), 150)
  if (take) {
    padBuffers[index] = take
    padTrim[index] = { start: 0, end: take.duration }
    take = null
    updatePad(index)
    pads.forEach(item => item.classList.remove('assigning'))
    setMessage('Take saved. Press a pad to play it.')
    return
  }
  try {
    await ensureAudio()
    if (version !== padVersions[index] || generation !== padTriggerVersion) return
    drawWaveform()
    const buffer = padBuffers[index] || defaultDrums[index]
    if (!buffer) {
      setMessage('Pad ' + (index + 1) + ' is empty. Assign a recording to play it.')
      return
    }
    const range = padTrim[index] || { start: 0, end: buffer.duration }
    const voice = createPadVoice(index, buffer)
    const { source } = voice
    source.loop = padLoops[index]
    source.loopStart = range.start
    source.loopEnd = range.end
    padSources[index] = source
    source.onended = () => {
      if (padSources[index] === source) {
        padSources[index] = null
        padPlayback[index] = null
        padRows[index].querySelector('.loop-stop').disabled = true
        if (selectedPad === index) updateWaveformPlayhead()
      }
      voice.disconnect()
    }
    const startedAt = context.currentTime
    if (source.loop) source.start(0, range.start)
    else source.start(0, range.start, range.end - range.start)
    padPlayback[index] = { startedAt, start: range.start, end: range.end, rate: source.playbackRate.value, loop: source.loop }
    updateWaveformPlayhead()
    if (index === tutorialPad && !tutorial.hidden && tutorialStep === 3) {
      clearTimeout(tutorialTimer)
      tutorialTimer = setTimeout(() => { tutorialTimer = null; advanceTutorial(3) }, 1200)
    }
    padRows[index].querySelector('.loop-stop').disabled = !source.loop
  } catch (error) {
    setMessage('Could not play pad audio.')
    console.error(error)
  }
}

pads.forEach((pad, index) => pad.addEventListener('click', () => void triggerPad(index)))

padRows.forEach((row, index) => {
  const loop = row.querySelector('.loop-toggle')
  loop.addEventListener('click', () => {
    padLoops[index] = !padLoops[index]
    if (!padLoops[index]) stopPad(index)
    loop.setAttribute('aria-pressed', String(padLoops[index]))
    loop.textContent = padLoops[index] ? 'Loop on' : 'Loop off'
  })
  row.querySelector('.loop-stop').addEventListener('click', () => stopPad(index))
  row.querySelector('.clear-pad').addEventListener('click', () => {
    stopPad(index)
    padBuffers[index] = null
    padTrim[index] = null
    if (editingPad === index && trimEditor.open) trimEditor.close()
    updatePad(index)
    setMessage(index < 4 ? 'Pad ' + (index + 1) + ' restored to its drum sound.' : 'Pad ' + (index + 1) + ' is empty.')
  })
  row.querySelector('.edit-pad').addEventListener('click', () => {
    editingPad = index
    selectPad(index)
    document.querySelector('#trim-title').textContent = 'Editing pad ' + (index + 1)
    trimStart.value = padTrim[index].start
    trimEnd.value = padTrim[index].end
    trimStart.max = trimEnd.max = padBuffers[index].duration
    trimMessage.textContent = ''
    trimEditor.showModal()
    drawTrimWaveform()
    updateTrimSelection()
  })
})

document.querySelector('#multiple-pads').addEventListener('click', event => {
  multiplePads = !multiplePads
  if (!multiplePads) {
    padTriggerVersion++
    padSources.forEach((_, index) => stopPad(index))
  }
  event.currentTarget.setAttribute('aria-pressed', String(multiplePads))
  event.currentTarget.textContent = multiplePads ? 'Multiple pads: on' : 'Multiple pads: off'
  if (!tutorial.hidden && tutorialStep === 5 && multiplePads) {
    tutorialMultipleEnabled = true
    if (tutorialPatternStarted) advanceTutorial(5)
  }
})

document.querySelector('#clear-all-pads').addEventListener('click', () => {
  if (!window.confirm('Clear every assigned pad recording and restore the original pad sounds?')) return
  padTriggerVersion++
  padSources.forEach((_, index) => stopPad(index))
  padBuffers.fill(null)
  padTrim.fill(null)
  if (trimEditor.open) trimEditor.close()
  pads.forEach((_, index) => updatePad(index))
  setMessage('All pad recordings cleared. Original sounds restored.')
})

document.querySelector('#copy-pad').addEventListener('click', async () => {
  const sourceIndex = Number(document.querySelector('#copy-source').value)
  const destinationIndex = Number(document.querySelector('#copy-destination').value)
  if (sourceIndex === destinationIndex) {
    setMessage('Choose different source and destination pads.')
    return
  }
  try {
    await ensureAudio()
    const buffer = padBuffers[sourceIndex] || defaultDrums[sourceIndex]
    if (!buffer) {
      setMessage('Pad ' + (sourceIndex + 1) + ' is empty. Choose a pad with a sound.')
      return
    }
    stopPad(destinationIndex)
    padBuffers[destinationIndex] = buffer
    padTrim[destinationIndex] = padTrim[sourceIndex] ? { ...padTrim[sourceIndex] } : { start: 0, end: buffer.duration }
    updatePad(destinationIndex)
    setMessage('Copied pad ' + (sourceIndex + 1) + ' to pad ' + (destinationIndex + 1) + '.')
  } catch (error) {
    setMessage('Could not copy that pad sound.')
    console.error(error)
  }
})

function trimRange() {
  if (editingPad === null || !padBuffers[editingPad]) return null
  const start = Number(trimStart.value)
  const end = Number(trimEnd.value)
  if (trimStart.value === '' || trimEnd.value === '' || !Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > padBuffers[editingPad].duration || end <= start) {
    trimMessage.textContent = 'Enter a start and end within the recording, with end after start.'
    return null
  }
  return { start, end }
}

function drawTrimWaveform() {
  const ctx = trimCanvas.getContext('2d')
  const buffer = padBuffers[editingPad]
  ctx.clearRect(0, 0, trimCanvas.width, trimCanvas.height)
  ctx.strokeStyle = '#274e37'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 0; x < trimCanvas.width; x++) {
    const from = Math.floor(x * buffer.length / trimCanvas.width)
    const to = Math.max(from + 1, Math.floor((x + 1) * buffer.length / trimCanvas.width))
    let low = 0
    let high = 0
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const samples = buffer.getChannelData(channel)
      for (let i = from; i < Math.min(to, buffer.length); i++) {
        low = Math.min(low, samples[i])
        high = Math.max(high, samples[i])
      }
    }
    ctx.moveTo(x + 0.5, 90 - high * 85)
    ctx.lineTo(x + 0.5, 91 - low * 85)
  }
  ctx.stroke()
}

function updateTrimSelection() {
  const range = trimRange()
  if (!range) return
  const duration = padBuffers[editingPad].duration
  const start = range.start / duration * 100
  const end = range.end / duration * 100
  trimHandles[0].style.left = start + '%'
  trimHandles[1].style.left = end + '%'
  trimShades[0].style.width = start + '%'
  trimShades[1].style.width = (100 - end) + '%'
  trimDuration.textContent = 'Selected ' + (range.end - range.start).toFixed(2) + ' seconds'
  trimHandles.forEach((handle, index) => {
    const value = index === 0 ? range.start : range.end
    handle.setAttribute('aria-valuemin', String(index === 0 ? 0 : range.start))
    handle.setAttribute('aria-valuemax', String(index === 0 ? range.end : duration))
    handle.setAttribute('aria-valuenow', String(value))
    handle.setAttribute('aria-valuetext', value.toFixed(2) + ' seconds')
  })
}

function moveTrimHandle(index, seconds) {
  const duration = padBuffers[editingPad].duration
  const minimum = Math.min(0.01, duration / 2)
  if (index === 0) trimStart.value = Math.max(0, Math.min(seconds, Number(trimEnd.value) - minimum))
  else trimEnd.value = Math.min(duration, Math.max(seconds, Number(trimStart.value) + minimum))
  trimMessage.textContent = ''
  updateTrimSelection()
}

trimHandles.forEach((handle, index) => {
  const move = event => {
    const bounds = trimWaveform.getBoundingClientRect()
    const fraction = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width))
    moveTrimHandle(index, fraction * padBuffers[editingPad].duration)
  }
  handle.addEventListener('pointerdown', event => {
    if (event.button !== 0) return
    event.preventDefault()
    handle.focus()
    handle.setPointerCapture(event.pointerId)
    move(event)
  })
  handle.addEventListener('pointermove', event => {
    if (handle.hasPointerCapture(event.pointerId)) move(event)
  })
  handle.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const current = Number(index === 0 ? trimStart.value : trimEnd.value)
    const amount = event.shiftKey ? 1 : 0.1
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? padBuffers[editingPad].duration : current + (event.key === 'ArrowRight' ? amount : -amount)
    moveTrimHandle(index, next)
  })
})
trimStart.addEventListener('input', updateTrimSelection)
trimEnd.addEventListener('input', updateTrimSelection)

document.querySelector('#trim-preview').addEventListener('click', () => {
  const range = trimRange()
  if (!range) return
  if (previewSource) previewSource.stop()
  const voice = createPadVoice(editingPad, padBuffers[editingPad])
  const { source } = voice
  previewSource = source
  source.onended = () => { if (previewSource === source) previewSource = null; voice.disconnect() }
  source.start(0, range.start, range.end - range.start)
  trimMessage.textContent = 'Previewing selection.'
})
document.querySelector('#trim-save').addEventListener('click', () => {
  const range = trimRange()
  if (!range) return
  stopPad(editingPad)
  padTrim[editingPad] = range
  drawWaveform()
  const completedTutorialTrim = !tutorial.hidden && tutorialStep === 4 && editingPad === tutorialPad
  setMessage('Trim saved for pad ' + (editingPad + 1) + '.')
  trimEditor.close()
  if (completedTutorialTrim) {
    tutorialTrimmed = true
    if (tutorialSoundAdjusted) advanceTutorial(4)
  }
})
document.querySelector('#trim-cancel').addEventListener('click', () => {
  trimEditor.close()
})
trimEditor.addEventListener('close', () => {
  if (previewSource) { previewSource.stop(); previewSource = null }
  if (editingPad !== null) padRows[editingPad].querySelector('.edit-pad').focus()
  editingPad = null
})

window.addEventListener('keydown', (event) => {
  if (trimEditor.open || event.repeat || event.ctrlKey || event.altKey || event.metaKey || padsPanel.hidden) return
  if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), #tutorial-menu')) return
  const index = padKeys.indexOf(event.key.toUpperCase())
  if (index < 0) return
  event.preventDefault()
  triggerPad(index)
})

function togglePlayback() {
  if (!playing) {
    void startAudio()
    return
  }
  playing = false
  updateTransport()
}

play.addEventListener('click', togglePlayback)
playSpliceButton.addEventListener('click', () => {
  void startSplicing()
})

window.addEventListener('keydown', (event) => {
  if (trimEditor.open || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return
  if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), dialog, [role="dialog"], [role="slider"]')) return
  if (event.key.toLowerCase() === 'i') {
    event.preventDefault()
    sideBySideButton.click()
    return
  }
  if (event.target instanceof Element && event.target.closest('audio, video, a, #tutorial, #tutorial-menu')) return
  if (event.key !== ' ') lastSpliceSpace = 0
  if (event.key.toLowerCase() === 'p') {
    event.preventDefault()
    if (!sessionPending) (sessionRecording ? sessionStop : sessionRecord).click()
    return
  }
  if (event.key === ' ') {
    event.preventDefault()
    if (splicing) {
      if (pendingSplice) return
      const now = performance.now()
      if (!spliceWaiting && lastSpliceSpace && now - lastSpliceSpace <= spliceDoublePressMs) {
        player.port.postMessage({ record: 'wait' })
        spliceWaiting = true
        lastSpliceSpace = 0
        showSpliceState()
      } else {
        if (spliceBusy) return
        const wasWaiting = spliceWaiting
        spliceButton.click()
        lastSpliceSpace = wasWaiting ? 0 : now
      }
      if (!playing) void startAudio()
    } else {
      togglePlayback()
    }
  } else if (event.key === 'Enter') {
    event.preventDefault()
    if (splicing) togglePlayback()
    else void startSplicing()
  }
})

document.querySelector('#restart').addEventListener('click', () => {
  if (!player || loadedIndex === null) {
    angle = 0
    return
  }
  seekTrack(0)
})

function pointerAngle(event, centre) {
  const x = event.clientX - centre.x
  const y = event.clientY - centre.y
  return Math.hypot(x, y) < 16 ? null : Math.atan2(y, x)
}

vinyl.addEventListener('pointerdown', (event) => {
  if (pointer || event.button !== 0) return
  const bounds = vinyl.parentElement.getBoundingClientRect()
  const centre = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }
  vinyl.setPointerCapture(event.pointerId)
  pointer = { id: event.pointerId, centre, angle: pointerAngle(event, centre),
    time: event.timeStamp, lastMotion: performance.now(), rate: 0 }
  sendRate()
  if (!splicing || playing) void startAudio()
})

vinyl.addEventListener('pointermove', (event) => {
  if (event.pointerId !== pointer?.id) return
  const nextAngle = pointerAngle(event, pointer.centre)
  if (nextAngle !== null && pointer.angle !== null) {
    if (!tutorial.hidden && tutorialStep === 1 && !tutorialTimer) {
      tutorialTimer = setTimeout(() => { tutorialTimer = null; advanceTutorial(1) }, 1000)
    }
    const delta = Math.atan2(Math.sin(nextAngle - pointer.angle), Math.cos(nextAngle - pointer.angle))
    const seconds = Math.max(0.004, (event.timeStamp - pointer.time) / 1000)
    pointer.rate = Math.max(-6, Math.min(6, delta / seconds / normalOmega))
    pointer.lastMotion = performance.now()
  } else {
    pointer.rate = 0
  }
  pointer.angle = nextAngle
  pointer.time = event.timeStamp
  sendRate()
})

function release(event) {
  if (event.pointerId !== pointer?.id) return
  pointer = null
  sendRate()
}

for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  vinyl.addEventListener(type, release)
}


const libraryList = document.querySelector('.records')
const libraryStatus = document.querySelector('#library-status')
const audioFiles = document.querySelector('#audio-files')

function renderLibrary() {
  libraryList.replaceChildren()
  recordButtons = records.map((record, index) => {
    const row = document.createElement('div')
    row.className = 'record-entry'
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'record'
    button.draggable = true
    button.style.setProperty('--accent', record.color)
    button.setAttribute('aria-pressed', String(index === selected))
    const disc = document.createElement('span')
    disc.className = 'mini-disc'
    disc.setAttribute('aria-hidden', 'true')
    const track = document.createElement('span')
    track.className = 'track'
    const title = document.createElement('strong')
    title.textContent = record.title
    const artist = document.createElement('small')
    artist.textContent = record.filename || record.artist
    track.append(title, artist)
    button.append(disc, track)
    button.addEventListener('click', () => selectRecord(records.indexOf(record)))
    button.addEventListener('dragstart', event => {
      event.dataTransfer.setData(dragType, String(records.indexOf(record)))
      event.dataTransfer.effectAllowed = 'copy'
    })
    button.addEventListener('dragend', () => deck.classList.remove('drop-target'))
    row.append(button)
    if (record.id) {
      const actions = document.createElement('div')
      actions.className = 'record-actions'
      const rename = document.createElement('button')
      rename.type = 'button'
      rename.textContent = 'Rename'
      rename.setAttribute('aria-label', 'Rename ' + record.title)
      rename.addEventListener('click', async () => {
        const name = window.prompt('Record name', record.title)
        if (name === null || !name.trim()) return
        const previous = record.title
        record.title = name.trim()
        try {
          await putTrack(record)
          renderLibrary()
        } catch (error) {
          record.title = previous
          libraryStatus.textContent = 'Could not save the new name in browser storage.'
        }
      })
      const remove = document.createElement('button')
      remove.type = 'button'
      remove.textContent = 'Remove'
      remove.setAttribute('aria-label', 'Remove ' + record.title)
      remove.addEventListener('click', async () => {
        try {
          await deleteTrack(record.id)
          replaceLibrary(records.filter(item => item !== record))
          libraryStatus.textContent = 'Removed ' + record.filename + '.'
        } catch (error) {
          libraryStatus.textContent = 'Could not remove the file from browser storage.'
        }
      })
      actions.append(rename, remove)
      row.append(actions)
    }
    libraryList.append(row)
    return button
  })
  play.disabled = records.length === 0
}

function replaceLibrary(next) {
  const selectedRecord = records[selected]
  const loadedRecord = records[loadedIndex]
  const selectedUrl = selectedRecord?.url
  const loadedUrl = loadedRecord?.url
  records.splice(0, records.length, ...next)
  let selectedNext = records.indexOf(selectedRecord)
  if (selectedNext < 0 && selectedUrl) selectedNext = records.findIndex(record => record.url === selectedUrl)
  selected = Math.max(0, selectedNext)
  loadedIndex = records.indexOf(loadedRecord)
  if (loadedIndex < 0 && loadedUrl) loadedIndex = records.findIndex(record => record.url === loadedUrl)
  if (loadedIndex < 0) loadedIndex = null
  renderLibrary()
  if (records.length && selectedNext < 0) {
    // Keep a removed track playing until the user chooses another record.
    deck.style.setProperty('--accent', records[selected].color)
    document.querySelector('#label-title').textContent = records[selected].title
    if (playing && player) void loadRecord(selected)
  }
}

async function restoreLibrary() {
  try {
    const imported = await getTracks()
    replaceLibrary([...records.filter(record => !record.id), ...imported])
  } catch (error) {
    libraryStatus.textContent = 'Browser storage is unavailable. Added files cannot be saved.'
  }
}

document.querySelector('#add-audio').addEventListener('click', () => audioFiles.click())
audioFiles.addEventListener('change', async () => {
  const errors = []
  let added = 0
  for (const file of audioFiles.files) {
    if (!/\.(mp3|wav|ogg|m4a|aac|flac|opus|webm)$/i.test(file.name)) {
      errors.push(file.name + ' has an unsupported format.')
      continue
    }
    try {
      await ensureAudio()
      await context.decodeAudioData(await file.arrayBuffer())
      const record = { id: crypto.randomUUID(), title: file.name.replace(/\.[^.]+$/, ''), filename: file.name, artist: 'Your audio', file, color: '#eaa5d1' }
      await putTrack(record)
      records.push(record)
      added++
    } catch (error) {
      errors.push('Could not decode or save ' + file.name + '.')
    }
  }
  renderLibrary()
  libraryStatus.textContent = [added ? 'Added ' + added + ' file(s). Stored in this browser until site data is cleared.' : '', ...errors].filter(Boolean).join(' ')
  audioFiles.value = ''
})

document.querySelector('#refresh-library').addEventListener('click', async () => {
  if (!import.meta.env.DEV) {
    libraryStatus.textContent = 'Files in public/audio are included when the app is built. Rebuild to refresh them.'
    return
  }
  try {
    const response = await fetch(import.meta.env.BASE_URL + '__audio-library', { cache: 'no-store' })
    if (!response.ok) throw new Error('Library unavailable')
    const diskRecords = await response.json()
    replaceLibrary([...diskRecords, ...records.filter(record => record.id)])
    libraryStatus.textContent = 'Library refreshed. Added files remain in browser storage.'
  } catch (error) {
    libraryStatus.textContent = 'Could not refresh the public audio library.'
  }
})

const patternButtons = [...document.querySelectorAll('[data-pattern]')]
const patternBpm = document.querySelector('#pattern-bpm')
const patternStatus = document.querySelector('#pattern-status')
let activePattern = null
let patternTimer
let patternStep = 0
let nextPatternTime = 0
let patternGeneration = 0
const scheduledPatternSources = new Set()

function stopPattern() {
  patternGeneration++
  clearTimeout(patternTimer)
  for (const source of scheduledPatternSources) {
    try { source.stop() } catch {}
  }
  scheduledPatternSources.clear()
  activePattern = null
  patternButtons.forEach((button, index) => {
    button.setAttribute('aria-pressed', 'false')
    button.textContent = 'Play ' + patterns[index].name + ' ? ' + patterns[index].meter
  })
  patternStatus.textContent = 'Patterns stopped.'
}

function schedulePattern(generation) {
  if (generation !== patternGeneration || activePattern === null) return
  const pattern = patterns[activePattern]
  const bpm = Math.max(40, Math.min(240, Number(patternBpm.value) || 100))
  while (nextPatternTime < context.currentTime + 0.1) {
    for (const drum of pattern.steps[patternStep]) {
      const source = context.createBufferSource()
      const gain = context.createGain()
      source.buffer = defaultDrums[drum]
      gain.gain.value = Number(padLevel.value)
      source.connect(gain).connect(master)
      scheduledPatternSources.add(source)
      source.onended = () => { scheduledPatternSources.delete(source); source.disconnect(); gain.disconnect() }
      source.start(nextPatternTime)
    }
    patternStep = (patternStep + 1) % pattern.steps.length
    nextPatternTime += stepDuration(bpm)
  }
  patternTimer = setTimeout(() => schedulePattern(generation), 25)
}

patternButtons.forEach((button, index) => button.addEventListener('click', async () => {
  if (activePattern === index) { stopPattern(); return }
  stopPattern()
  const generation = patternGeneration
  try {
    await ensureAudio()
    if (generation !== patternGeneration) return
    activePattern = index
    patternStep = 0
    nextPatternTime = context.currentTime + 0.03
    button.setAttribute('aria-pressed', 'true')
    button.textContent = 'Stop ' + patterns[index].name + ' ? ' + patterns[index].meter
    patternStatus.textContent = patterns[index].name + ' ? ' + patterns[index].meter + ' ? ' + (Number(patternBpm.value) || 100) + ' BPM'
    schedulePattern(generation)
    if (!tutorial.hidden && tutorialStep === 5) {
      tutorialPatternStarted = true
      if (tutorialMultipleEnabled) advanceTutorial(5)
    }
  } catch (error) {
    patternStatus.textContent = 'Could not start the drum pattern.'
  }
}))

patternBpm.addEventListener('change', () => {
  const bpm = Math.max(40, Math.min(240, Number(patternBpm.value) || 100))
  patternBpm.value = bpm
  if (activePattern !== null) patternStatus.textContent = patterns[activePattern].name + ' ? ' + patterns[activePattern].meter + ' ? ' + bpm + ' BPM'
})

deck.addEventListener('dragover', (event) => {
  if (!event.dataTransfer.types.includes(dragType)) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'copy'
  deck.classList.add('drop-target')
})
deck.addEventListener('dragleave', (event) => {
  if (!deck.contains(event.relatedTarget)) deck.classList.remove('drop-target')
})
deck.addEventListener('drop', (event) => {
  if (!event.dataTransfer.types.includes(dragType)) return
  event.preventDefault()
  deck.classList.remove('drop-target')
  selectRecord(Number(event.dataTransfer.getData(dragType)))
})

window.addEventListener('keydown', (event) => {
  if (trimEditor.open) return
  if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return
  if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), #tutorial-menu')) return
  if (event.key.toLowerCase() === 'l') {
    event.preventDefault()
    speedLocked = !speedLocked
    if (speedLocked) {
      lockedRate = heldKeys.size ? keyboardRate : (playing ? (audioPosition?.rate ?? visualRate) : 1)
      keyboardRate = lockedRate
    }
    speedLockStatus.textContent = speedLocked ? 'Locked' : 'Unlocked'
    deck.classList.toggle('speed-locked', speedLocked)
    sendRate()
    return
  }
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
  event.preventDefault()
  if (!tutorial.hidden && tutorialStep === 1 && !tutorialTimer) {
    tutorialTimer = setTimeout(() => { tutorialTimer = null; advanceTutorial(1) }, 1000)
  }
  if (!heldKeys.size) keyboardRate = speedLocked ? lockedRate : (playing ? (audioPosition?.rate ?? visualRate) : 1)
  heldKeys.add(event.key)
  if (!splicing || playing) void startAudio()
})
window.addEventListener('keyup', (event) => {
  if (!heldKeys.has(event.key)) return
  event.preventDefault()
  heldKeys.delete(event.key)
  sendRate()
})
window.addEventListener('blur', () => {
  heldKeys.clear()
  sendRate()
})

function draw(now) {
  const elapsed = Math.min(0.05, (now - lastFrame) / 1000)
  lastFrame = now
  if (heldKeys.size && !pointer) {
    const direction = Number(heldKeys.has('ArrowRight')) - Number(heldKeys.has('ArrowLeft'))
    keyboardRate = Math.max(-6, Math.min(6, keyboardRate + direction * elapsed * 1.5))
    if (speedLocked) lockedRate = keyboardRate
    sendRate()
  }
  if (pointer?.rate && now - pointer.lastMotion > 55) {
    pointer.rate = 0
    sendRate()
  }
  visualRate += (targetRate - visualRate) * (1 - Math.exp(-elapsed / (pointer || !playing ? 0.008 : 0.065)))
  if (audioPosition && context) {
    const elapsedAudio = Math.max(0, Math.min(0.025, context.currentTime - audioPosition.audioTime))
    angle = (audioPosition.position / context.sampleRate + elapsedAudio * audioPosition.rate) * normalOmega
    if (trackDuration && audioPosition.head !== undefined && !trackDragging && pendingSeekId === null) {
      const length = audioPosition.length
      const frame = ((audioPosition.head + elapsedAudio * audioPosition.rate * context.sampleRate) % length + length) % length
      const seconds = frame / context.sampleRate
      trackSeek.value = seconds
      trackCurrent.textContent = formatTrackTime(seconds)
      trackSeek.setAttribute('aria-valuetext', formatTrackTime(seconds) + ' of ' + formatTrackTime(trackDuration))
    }
  }
  vinyl.style.transform = `rotate(${angle}rad)`
  updateWaveformPlayhead()
  const displayedRate = audioPosition?.rate ?? visualRate
  speed.textContent = `${(Math.abs(displayedRate) < 0.005 ? 0 : displayedRate).toFixed(2)}×`
  requestAnimationFrame(draw)
}

renderLibrary()
updateSpliceDestination()
void restoreLibrary()
if (records.length) selectRecord(0, false)
else {
  play.disabled = true
  status.textContent = 'No audio files'
  document.querySelector('#label-title').textContent = 'No record'
  deck.style.setProperty('--accent', '#f4b752')
}
requestAnimationFrame(draw)
