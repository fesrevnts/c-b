/**
 * Cracker Barrel Peg Game — main entry point.
 * Ties together game logic, canvas rendering, input handling, and animations.
 */

import {
  ROWS, TOTAL_HOLES, toIdx, fromIdx,
  createBoard, getJumps, applyMove, undoMove as undoMoveLogic,
  hasAnyMoves, pegsRemaining, getRating,
} from './game.js';

import {
  drawBoard, drawHole, drawPeg, drawTargetHint,
  drawDragShadow, drawOriginGhost, randomPegColor,
} from './renderer.js';

import {
  resumeAudio, soundPickup, soundPlace, soundCapture,
  soundIllegal, soundGameOver, soundGameOverBad,
} from './audio.js';

/* ══════════════════════════════════════
   State
   ══════════════════════════════════════ */

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const dpr = window.devicePixelRatio || 1;

let W, H, holeRadius, pegRadius;
let holePositions = []; // [{x, y}] indexed same as game pegs

// Game state
let pegs = [];           // boolean[] — which holes have pegs
let pegColors = [];      // string[] — color of peg at each hole
let moveHistory = [];    // [{from, target, jumped, jumpedColor, fromColor}]
let moveCount = 0;
let bestScore = loadBest();
let gameOver = false;

// Drag state
let dragging = null;     // {idx, offsetX, offsetY, curX, curY} or null
let validTargets = [];   // target indices
let jumpedMap = {};      // targetIdx → jumpedIdx

// Animations
let shakeAnim = null;    // {idx, start}
let removeAnims = [];    // [{x, y, color, start}]
let snapAnims = [];      // [{idx, fromX, fromY, start}]

/* ══════════════════════════════════════
   Layout
   ══════════════════════════════════════ */

function resize() {
  const container = document.getElementById('gameContainer');
  const maxW = Math.min(440, window.innerWidth - 32);
  const maxH = Math.min(460, window.innerHeight - 240);
  const size = Math.min(maxW, maxH);

  W = size; H = size;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  holeRadius = size * 0.052;
  pegRadius = size * 0.042;
  computePositions();
}

function computePositions() {
  const cx = W / 2;
  const topY = W * 0.12;
  const botY = W * 0.7;
  const rowH = (botY - topY) / (ROWS - 1);
  const colW = (W * 0.72) / (ROWS - 1);

  holePositions = [];
  for (let r = 0; r < ROWS; r++) {
    const y = topY + r * rowH;
    const startX = cx - (r * colW) / 2;
    for (let c = 0; c <= r; c++) {
      holePositions.push({ x: startX + c * colW, y });
    }
  }
}

/* ══════════════════════════════════════
   Init / New Game
   ══════════════════════════════════════ */

function initGame(emptyIdx = 0) {
  pegs = createBoard(emptyIdx);
  pegColors = Array.from({ length: TOTAL_HOLES }, () => randomPegColor());
  moveHistory = [];
  moveCount = 0;
  gameOver = false;
  dragging = null;
  validTargets = [];
  jumpedMap = {};
  shakeAnim = null;
  removeAnims = [];
  snapAnims = [];
  hideOverlay();
  updateUI();
}

/* ══════════════════════════════════════
   Move Execution
   ══════════════════════════════════════ */

function executeMove(fromIdx, targetIdx, jumpedIdx) {
  moveHistory.push({
    from: fromIdx,
    target: targetIdx,
    jumped: jumpedIdx,
    jumpedColor: pegColors[jumpedIdx],
    fromColor: pegColors[fromIdx],
  });

  // Animate jumped peg removal
  const jh = holePositions[jumpedIdx];
  removeAnims.push({ x: jh.x, y: jh.y, color: pegColors[jumpedIdx], start: performance.now() });

  // Snap animation for landing peg
  const fh = holePositions[fromIdx];
  snapAnims.push({ idx: targetIdx, fromX: fh.x, fromY: fh.y, start: performance.now() });

  // Update logic
  pegColors[targetIdx] = pegColors[fromIdx];
  pegs = applyMove(pegs, fromIdx, targetIdx, jumpedIdx);
  moveCount++;

  soundPlace();
  setTimeout(() => soundCapture(), 50);
  updateUI();

  // Check game over after animations settle
  setTimeout(() => {
    if (!hasAnyMoves(pegs)) {
      gameOver = true;
      const left = pegsRemaining(pegs);
      const rating = getRating(left);
      if (left < bestScore || bestScore === 0) {
        bestScore = left;
        saveBest(bestScore);
      }
      if (left <= 2) soundGameOver(); else soundGameOverBad();
      showOverlay(rating);
      updateUI();
    }
  }, 350);
}

function undo() {
  if (moveHistory.length === 0 || gameOver) return;
  const m = moveHistory.pop();
  pegColors[m.from] = m.fromColor;
  pegColors[m.jumped] = m.jumpedColor;
  pegs = undoMoveLogic(pegs, m.from, m.target, m.jumped);
  moveCount--;
  gameOver = false;
  hideOverlay();
  updateUI();
}

/* ══════════════════════════════════════
   Input Handling
   ══════════════════════════════════════ */

function hitTest(x, y) {
  const threshold = holeRadius * 1.6;
  for (let i = 0; i < holePositions.length; i++) {
    const h = holePositions[i];
    const dx = x - h.x, dy = y - h.y;
    if (dx * dx + dy * dy < threshold * threshold) return i;
  }
  return -1;
}

function canvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  const src = e.touches ? e.touches[0] : e;
  return { x: src.clientX - rect.left, y: src.clientY - rect.top };
}

function canvasPosEnd(e) {
  const rect = canvas.getBoundingClientRect();
  const src = e.changedTouches ? e.changedTouches[0] : e;
  return { x: src.clientX - rect.left, y: src.clientY - rect.top };
}

function onStart(e) {
  e.preventDefault();
  resumeAudio();
  if (gameOver) return;
  const p = canvasPos(e);
  const idx = hitTest(p.x, p.y);
  if (idx < 0 || !pegs[idx]) return;

  const jumps = getJumps(pegs, idx);
  dragging = {
    idx,
    offsetX: p.x - holePositions[idx].x,
    offsetY: p.y - holePositions[idx].y,
    curX: p.x,
    curY: p.y,
  };
  validTargets = jumps.map(j => j.target);
  jumpedMap = {};
  for (const j of jumps) jumpedMap[j.target] = j.jumped;
  soundPickup();
}

function onMove(e) {
  e.preventDefault();
  if (!dragging) return;
  const p = canvasPos(e);
  dragging.curX = p.x;
  dragging.curY = p.y;
}

function onEnd(e) {
  e.preventDefault();
  if (!dragging) return;
  const p = canvasPosEnd(e);
  const dropIdx = hitTest(p.x, p.y);

  if (dropIdx >= 0 && validTargets.includes(dropIdx)) {
    executeMove(dragging.idx, dropIdx, jumpedMap[dropIdx]);
  } else if (dropIdx >= 0 && dropIdx !== dragging.idx) {
    // Illegal move — shake
    shakeAnim = { idx: dragging.idx, start: performance.now() };
    soundIllegal();
  }

  dragging = null;
  validTargets = [];
  jumpedMap = {};
}

function onCancel() {
  dragging = null;
  validTargets = [];
  jumpedMap = {};
}

// Bind
canvas.addEventListener('mousedown', onStart);
canvas.addEventListener('mousemove', onMove);
canvas.addEventListener('mouseup', onEnd);
canvas.addEventListener('mouseleave', onCancel);
canvas.addEventListener('touchstart', onStart, { passive: false });
canvas.addEventListener('touchmove', onMove, { passive: false });
canvas.addEventListener('touchend', onEnd, { passive: false });

/* ══════════════════════════════════════
   Render Loop
   ══════════════════════════════════════ */

function draw() {
  const now = performance.now();
  ctx.clearRect(0, 0, W, H);

  drawBoard(ctx, W, H);

  // Holes
  for (let i = 0; i < TOTAL_HOLES; i++) {
    drawHole(ctx, holePositions[i].x, holePositions[i].y, holeRadius);
  }

  // Target hints
  if (dragging) {
    drawOriginGhost(ctx, holePositions[dragging.idx].x, holePositions[dragging.idx].y, holeRadius);
    for (const tIdx of validTargets) {
      drawTargetHint(ctx, holePositions[tIdx].x, holePositions[tIdx].y, holeRadius, now);
    }
  }

  // Pegs (skip the one being dragged)
  for (let i = 0; i < TOTAL_HOLES; i++) {
    if (dragging && i === dragging.idx) continue;
    if (!pegs[i]) continue;

    let px = holePositions[i].x;
    let py = holePositions[i].y;

    // Snap animation
    const sa = snapAnims.find(a => a.idx === i);
    if (sa) {
      const t = Math.min((now - sa.start) / 180, 1);
      const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
      px = sa.fromX + (holePositions[i].x - sa.fromX) * ease;
      py = sa.fromY + (holePositions[i].y - sa.fromY) * ease;
      if (t >= 1) snapAnims.splice(snapAnims.indexOf(sa), 1);
    }

    // Shake animation
    let shakeOff = 0;
    if (shakeAnim && shakeAnim.idx === i) {
      const elapsed = now - shakeAnim.start;
      if (elapsed < 380) {
        shakeOff = Math.sin(elapsed * 0.045) * 7 * (1 - elapsed / 380);
      } else {
        shakeAnim = null;
      }
    }

    drawPeg(ctx, px + shakeOff, py, pegColors[i], false, 1, pegRadius);
  }

  // Remove animations (fading captured pegs)
  for (let i = removeAnims.length - 1; i >= 0; i--) {
    const a = removeAnims[i];
    const t = (now - a.start) / 300;
    if (t >= 1) { removeAnims.splice(i, 1); continue; }
    ctx.save();
    ctx.globalAlpha = 1 - t;
    drawPeg(ctx, a.x, a.y, a.color, false, 1 + t * 0.35, pegRadius);
    ctx.restore();
  }

  // Dragged peg (drawn last, on top)
  if (dragging) {
    const dx = dragging.curX - dragging.offsetX;
    const dy = dragging.curY - dragging.offsetY;
    drawDragShadow(ctx, dx, dy, pegRadius);
    drawPeg(ctx, dx, dy, pegColors[dragging.idx], true, 1.18, pegRadius);
  }

  requestAnimationFrame(draw);
}

/* ══════════════════════════════════════
   UI Helpers
   ══════════════════════════════════════ */

function updateUI() {
  document.getElementById('pegsLeft').textContent = pegsRemaining(pegs);
  document.getElementById('moveCount').textContent = moveCount;
  document.getElementById('bestScore').textContent = bestScore > 0 ? bestScore : '—';
  document.getElementById('undoBtn').disabled = moveHistory.length === 0 || gameOver;
}

function showOverlay(rating) {
  document.getElementById('overlayIcon').textContent = rating.icon;
  document.getElementById('overlayTitle').textContent = rating.title;
  document.getElementById('overlaySub').textContent = rating.sub;
  document.getElementById('overlay').classList.add('visible');
}

function hideOverlay() {
  document.getElementById('overlay').classList.remove('visible');
}

/* ── Hole Picker ── */

const pickerCanvas = document.getElementById('pickerCanvas');
const pickerCtx = pickerCanvas.getContext('2d');
let pickerPositions = [];

function showPicker() {
  const overlay = document.getElementById('pickerOverlay');
  overlay.classList.add('visible');
  drawPicker();
}

function hidePicker() {
  document.getElementById('pickerOverlay').classList.remove('visible');
}

function drawPicker() {
  const size = Math.min(280, window.innerWidth - 80);
  const pdpr = dpr;
  pickerCanvas.width = size * pdpr;
  pickerCanvas.height = size * pdpr;
  pickerCanvas.style.width = size + 'px';
  pickerCanvas.style.height = size + 'px';
  pickerCtx.setTransform(pdpr, 0, 0, pdpr, 0, 0);

  const cx = size / 2;
  const topY = size * 0.1;
  const botY = size * 0.85;
  const rowH = (botY - topY) / (ROWS - 1);
  const colW = (size * 0.72) / (ROWS - 1);
  const hr = size * 0.052;

  pickerPositions = [];

  // Draw mini board
  pickerCtx.beginPath();
  pickerCtx.moveTo(cx, topY - hr * 1.5);
  pickerCtx.lineTo(size * 0.92, botY + hr * 1.5);
  pickerCtx.lineTo(size * 0.08, botY + hr * 1.5);
  pickerCtx.closePath();
  pickerCtx.fillStyle = '#b89040';
  pickerCtx.fill();
  pickerCtx.strokeStyle = '#7a5c28';
  pickerCtx.lineWidth = 1.5;
  pickerCtx.stroke();

  for (let r = 0; r < ROWS; r++) {
    const y = topY + r * rowH;
    const startX = cx - (r * colW) / 2;
    for (let c = 0; c <= r; c++) {
      const x = startX + c * colW;
      pickerPositions.push({ x, y });
      // Hole
      pickerCtx.beginPath();
      pickerCtx.arc(x, y, hr, 0, Math.PI * 2);
      pickerCtx.fillStyle = '#3d2810';
      pickerCtx.fill();
      // Peg
      const grad = pickerCtx.createRadialGradient(x - hr * 0.2, y - hr * 0.2, hr * 0.05, x, y, hr * 0.75);
      grad.addColorStop(0, '#ffe880');
      grad.addColorStop(1, '#c89030');
      pickerCtx.beginPath();
      pickerCtx.arc(x, y, hr * 0.72, 0, Math.PI * 2);
      pickerCtx.fillStyle = grad;
      pickerCtx.fill();
    }
  }
}

pickerCanvas.addEventListener('click', (e) => {
  const rect = pickerCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const hr = Math.min(280, window.innerWidth - 80) * 0.052;
  for (let i = 0; i < pickerPositions.length; i++) {
    const p = pickerPositions[i];
    if ((x - p.x) ** 2 + (y - p.y) ** 2 < (hr * 1.4) ** 2) {
      hidePicker();
      initGame(i);
      return;
    }
  }
});

document.getElementById('pickerRandom').addEventListener('click', () => {
  hidePicker();
  initGame(Math.floor(Math.random() * TOTAL_HOLES));
});

/* ── Overlay Buttons ── */
document.getElementById('overlayNewGame').addEventListener('click', () => {
  hideOverlay();
  showPicker();
});

document.getElementById('overlayUndo').addEventListener('click', () => {
  undo();
});

/* ── Control Buttons ── */
document.getElementById('undoBtn').addEventListener('click', () => undo());
document.getElementById('newGameBtn').addEventListener('click', () => {
  hideOverlay();
  showPicker();
});

document.getElementById('rulesBtn').addEventListener('click', () => {
  document.getElementById('rulesModal').classList.add('visible');
});
document.getElementById('closeRules').addEventListener('click', () => {
  document.getElementById('rulesModal').classList.remove('visible');
});
document.getElementById('rulesModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('rulesModal')) {
    document.getElementById('rulesModal').classList.remove('visible');
  }
});

/* ── Persistence ── */
function loadBest() {
  try { return parseInt(localStorage.getItem('cb_best') || '0', 10); } catch { return 0; }
}
function saveBest(v) {
  try { localStorage.setItem('cb_best', String(v)); } catch {}
}

/* ── Resize ── */
window.addEventListener('resize', () => { resize(); });

/* ══════════════════════════════════════
   Boot
   ══════════════════════════════════════ */

resize();
initGame(0); // Start with top hole empty (classic)
requestAnimationFrame(draw);
