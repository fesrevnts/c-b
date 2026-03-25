/**
 * Pure game logic: board state, move validation, undo stack.
 * No rendering or DOM — just the rules of peg solitaire.
 */

export const ROWS = 5;
export const TOTAL_HOLES = 15;

/**
 * 6 jump directions on a triangular grid.
 * Each entry: [dRow to middle, dCol to middle, dRow to target, dCol to target]
 */
const DIRECTIONS = [
  [-1, -1, -2, -2], // up-left
  [-1,  0, -2,  0], // up-right
  [ 0, -1,  0, -2], // left
  [ 0,  1,  0,  2], // right
  [ 1,  0,  2,  0], // down-left
  [ 1,  1,  2,  2], // down-right
];

/** Convert (row, col) to linear index, or -1 if out of bounds. */
export function toIdx(row, col) {
  if (row < 0 || row >= ROWS || col < 0 || col > row) return -1;
  return (row * (row + 1)) / 2 + col;
}

/** Convert linear index to {row, col}. */
export function fromIdx(idx) {
  let row = 0;
  while ((row + 1) * (row + 2) / 2 <= idx) row++;
  const col = idx - (row * (row + 1)) / 2;
  return { row, col };
}

/** Create a fresh board with all pegs except `emptyIdx`. */
export function createBoard(emptyIdx = 0) {
  const pegs = new Array(TOTAL_HOLES).fill(true);
  pegs[emptyIdx] = false;
  return pegs;
}

/** Get all valid jumps for peg at `idx`. Returns [{target, jumped}]. */
export function getJumps(pegs, idx) {
  if (!pegs[idx]) return [];
  const { row, col } = fromIdx(idx);
  const jumps = [];
  for (const [dr1, dc1, dr2, dc2] of DIRECTIONS) {
    const midIdx = toIdx(row + dr1, col + dc1);
    const tarIdx = toIdx(row + dr2, col + dc2);
    if (midIdx >= 0 && tarIdx >= 0 && pegs[midIdx] && !pegs[tarIdx]) {
      jumps.push({ target: tarIdx, jumped: midIdx });
    }
  }
  return jumps;
}

/** Execute a move. Returns new pegs array (immutable). */
export function applyMove(pegs, from, target, jumped) {
  const next = [...pegs];
  next[from] = false;
  next[jumped] = false;
  next[target] = true;
  return next;
}

/** Undo a move. Returns new pegs array (immutable). */
export function undoMove(pegs, from, target, jumped) {
  const next = [...pegs];
  next[from] = true;
  next[jumped] = true;
  next[target] = false;
  return next;
}

/** Check if any moves remain on the board. */
export function hasAnyMoves(pegs) {
  for (let i = 0; i < TOTAL_HOLES; i++) {
    if (pegs[i] && getJumps(pegs, i).length > 0) return true;
  }
  return false;
}

/** Count remaining pegs. */
export function pegsRemaining(pegs) {
  return pegs.filter(Boolean).length;
}

/** Get game-over rating. */
export function getRating(remaining) {
  if (remaining === 1) return { title: 'Genius!', sub: 'You left only one peg — you\'re a true genius!', icon: '🧠', stars: 4 };
  if (remaining === 2) return { title: 'Pretty Smart', sub: 'Only 2 pegs left. You\'re purty smart!', icon: '🎯', stars: 3 };
  if (remaining === 3) return { title: 'Just Plain Dumb', sub: '3 pegs left — the board\'s words, not mine!', icon: '🤷', stars: 2 };
  return { title: 'Try Again!', sub: `${remaining} pegs left. Give it another go!`, icon: '🔄', stars: 1 };
}
