// Effets sonores ET musique de fond, entièrement synthétisés (WebAudio,
// AUCUN fichier audio externe -- cahier des charges V0, section 5 : "petite
// ambiance musicale adaptée, discrète et non envahissante, avec contrôles
// simples permettant de couper/réactiver". 100% synthèse procédurale :
// aucun échantillon, aucune question de droits, remplaçable plus tard par
// de vrais fichiers sans changer l'API (setAudioEnabled/setMusicEnabled).
let ctx = null;
let enabled = true;
let volume = 0.5;
let musicEnabled = true;
let musicVolume = 0.14; // volontairement bas -- ne doit jamais masquer les SFX de gameplay

let audioContextCreations = 0; // QA uniquement -- doit toujours rester à 1 réel (jamais recréé)

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    audioContextCreations++;
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// Hook de QA/tests UNIQUEMENT (scripts/check-mobile.mjs) -- lecture seule,
// jamais utilisé par le jeu lui-même.
export function getAudioDebugState() {
  return {
    musicEnabled,
    musicRunning: musicTimer !== null,
    audioContextState: ctx ? ctx.state : "none",
    audioContextCreations,
  };
}

function tone({ freq, duration, type = "sine", gain = 0.2, glideTo = null }) {
  if (!enabled) return;
  const c = getCtx();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  if (glideTo) osc.frequency.linearRampToValueAtTime(glideTo, c.currentTime + duration);
  g.gain.setValueAtTime(gain * volume, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(g).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration + 0.02);
}

function noiseBurst({ duration, gain = 0.2, highpass = 1800 }) {
  if (!enabled) return;
  const c = getCtx();
  const bufferSize = Math.floor(c.sampleRate * duration);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(highpass, c.currentTime);
  const g = c.createGain();
  g.gain.setValueAtTime(gain * volume, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  src.connect(filter).connect(g).connect(c.destination);
  src.start();
  src.stop(c.currentTime + duration + 0.02);
}

export const sfx = {
  build: () => tone({ freq: 300, duration: 0.1, type: "triangle", gain: 0.18, glideTo: 480 }),
  upgrade: () => tone({ freq: 420, duration: 0.16, type: "triangle", gain: 0.2, glideTo: 720 }),
  shootRapide: () => tone({ freq: 700, duration: 0.04, type: "square", gain: 0.08 }),
  shootCanon: () => noiseBurst({ duration: 0.14, gain: 0.24, highpass: 200 }),
  shootLongue: () => tone({ freq: 1400, duration: 0.05, type: "sine", gain: 0.14 }),
  shootControle: () => tone({ freq: 500, duration: 0.09, type: "sine", gain: 0.12, glideTo: 260 }),
  enemyKilled: () => tone({ freq: 520, duration: 0.09, type: "sine", gain: 0.16, glideTo: 220 }),
  baseHit: () => tone({ freq: 180, duration: 0.28, type: "sawtooth", gain: 0.2, glideTo: 60 }),
  waveStart: () => tone({ freq: 330, duration: 0.22, type: "triangle", gain: 0.2, glideTo: 440 }),
  waveCleared: () => tone({ freq: 440, duration: 0.24, type: "triangle", gain: 0.2, glideTo: 660 }),
  win: () => tone({ freq: 523, duration: 0.4, type: "triangle", gain: 0.22, glideTo: 1046 }),
  lose: () => tone({ freq: 220, duration: 0.5, type: "sawtooth", gain: 0.2, glideTo: 55 }),
};

export function setAudioEnabled(value) {
  enabled = value;
}

export function setAudioVolume(value) {
  volume = value;
}

export function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

// --- Musique de fond ------------------------------------------------------
// Boucle de 8 mesures en Mi mineur (Em-C-G-D), ~92 BPM (rythme calme, adapté
// à un TD où le joueur observe autant qu'il agit), deux variantes de
// mélodie sur chaque moitié de la boucle pour ne jamais répéter note pour
// note. Ordonnancement par "lookahead scheduler" sur l'horloge audio
// elle-même (AudioContext.currentTime), jamais setTimeout/Date.now(), pour
// une boucle sans dérive ni coupure audible sur mobile.
const BPM = 92;
const SEC_PER_BEAT = 60 / BPM;
const SEC_PER_BAR = SEC_PER_BEAT * 4;
const SCHEDULE_AHEAD_SEC = 0.15;
const SCHEDULER_INTERVAL_MS = 40;

const NOTE = {
  E2: 82.41,
  G2: 98.0,
  A2: 110.0,
  B2: 123.47,
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  G3: 196.0,
  A3: 220.0,
  B3: 246.94,
  D4: 293.66,
  E4: 329.63,
  G4: 392.0,
};

const CHORDS = [
  { root: NOTE.E2, third: NOTE.G2, fifth: NOTE.B2 }, // Em
  { root: NOTE.C3 / 2, third: NOTE.E3 / 2, fifth: NOTE.G3 / 2 }, // C (grave)
  { root: NOTE.G2, third: NOTE.B2, fifth: NOTE.D3 }, // G
  { root: NOTE.D3 / 2, third: NOTE.A2, fifth: NOTE.A3 / 2 }, // D (approx grave)
];

function bassNotesForBar(barInLoop) {
  const chord = CHORDS[barInLoop % 4];
  return [chord.root, chord.root, chord.fifth, chord.root];
}

const LEAD_PATTERN_A = [
  [0, 1, 2, 1],
  [1, 0, 2, 0],
  [2, 1, 0, 1],
  [0, 2, 1, 2],
];
const LEAD_PATTERN_B = [
  [2, 0, 1, 0],
  [0, 1, 2, 1],
  [1, 2, 0, 2],
  [0, 1, 0, 2],
];
function leadNotesForBar(barInLoop) {
  const chord = CHORDS[barInLoop % 4];
  const degrees = [chord.root * 2, chord.third * 2, chord.fifth * 2];
  const pattern = barInLoop < 4 ? LEAD_PATTERN_A : LEAD_PATTERN_B;
  return pattern[barInLoop % 4].map((d) => degrees[d]);
}

let musicTimer = null;
let nextNoteTime = 0;
let currentBar = 0;
let currentBeat = 0;

function scheduleBassNote(freq, time, dur) {
  const c = getCtx();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, time);
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(0.5 * musicVolume, time + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, time + dur);
  osc.connect(g).connect(c.destination);
  osc.start(time);
  osc.stop(time + dur + 0.02);
}

function scheduleLeadNote(freq, time, dur) {
  const c = getCtx();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, time);
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(0.3 * musicVolume, time + 0.015);
  g.gain.exponentialRampToValueAtTime(0.001, time + dur);
  osc.connect(g).connect(c.destination);
  osc.start(time);
  osc.stop(time + dur + 0.02);
}

function scheduleChordPad(chord, time, dur) {
  const c = getCtx();
  const g = c.createGain();
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(0.09 * musicVolume, time + 0.3);
  g.gain.exponentialRampToValueAtTime(0.001, time + dur);
  g.connect(c.destination);
  for (const freq of [chord.root, chord.third, chord.fifth]) {
    const osc = c.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, time);
    osc.connect(g);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }
}

function scheduleBeat(barInLoop, beat, time) {
  const chord = CHORDS[barInLoop % 4];
  if (beat === 0) scheduleChordPad(chord, time, SEC_PER_BAR * 0.95);
  const bassNote = bassNotesForBar(barInLoop)[beat];
  scheduleBassNote(bassNote, time, SEC_PER_BEAT * 0.85);
  const leadNote = leadNotesForBar(barInLoop)[beat];
  scheduleLeadNote(leadNote, time + SEC_PER_BEAT * 0.02, SEC_PER_BEAT * 0.4);
}

function musicSchedulerStep() {
  const c = getCtx();
  while (nextNoteTime < c.currentTime + SCHEDULE_AHEAD_SEC) {
    scheduleBeat(currentBar, currentBeat, nextNoteTime);
    nextNoteTime += SEC_PER_BEAT;
    currentBeat++;
    if (currentBeat >= 4) {
      currentBeat = 0;
      currentBar = (currentBar + 1) % 8;
    }
  }
}

export function startMusic() {
  if (!musicEnabled || musicTimer) return; // jamais deux instances superposées
  const c = getCtx();
  currentBar = 0;
  currentBeat = 0;
  nextNoteTime = c.currentTime + 0.05;
  musicSchedulerStep();
  musicTimer = setInterval(musicSchedulerStep, SCHEDULER_INTERVAL_MS);
}

export function stopMusic() {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}

export function resumeMusic() {
  if (musicEnabled && !musicTimer) startMusic();
}

export function setMusicEnabled(value) {
  musicEnabled = value;
  if (!musicEnabled) stopMusic();
}
