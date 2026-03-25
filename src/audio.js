/**
 * Tiny audio engine using Web Audio API.
 * Chess.com-inspired sound design: satisfying clacks and thuds.
 */

let ctx = null;

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return ctx;
}

export function resumeAudio() {
  const c = getCtx();
  if (c.state === 'suspended') c.resume();
}

function playTone(freq, duration, type = 'sine', vol = 0.12, decay = 0.15) {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  gain.gain.setValueAtTime(vol, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + decay);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + duration);
}

function playNoise(duration, vol = 0.06) {
  const c = getCtx();
  const bufferSize = c.sampleRate * duration;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
  }
  const source = c.createBufferSource();
  source.buffer = buffer;
  const gain = c.createGain();
  gain.gain.setValueAtTime(vol, c.currentTime);
  source.connect(gain);
  gain.connect(c.destination);
  source.start();
}

export function soundPickup() {
  playTone(600, 0.08, 'sine', 0.06, 0.08);
}

export function soundPlace() {
  playNoise(0.06, 0.1);
  playTone(400, 0.1, 'triangle', 0.1, 0.1);
}

export function soundCapture() {
  playTone(300, 0.15, 'triangle', 0.08, 0.15);
  setTimeout(() => playNoise(0.05, 0.07), 40);
}

export function soundIllegal() {
  playTone(180, 0.12, 'sawtooth', 0.06, 0.12);
  setTimeout(() => playTone(140, 0.12, 'sawtooth', 0.05, 0.12), 60);
}

export function soundGameOver() {
  playTone(523, 0.2, 'sine', 0.08, 0.2);
  setTimeout(() => playTone(659, 0.2, 'sine', 0.08, 0.2), 120);
  setTimeout(() => playTone(784, 0.3, 'sine', 0.1, 0.3), 240);
}

export function soundGameOverBad() {
  playTone(300, 0.2, 'triangle', 0.08, 0.2);
  setTimeout(() => playTone(250, 0.3, 'triangle', 0.08, 0.3), 150);
}
