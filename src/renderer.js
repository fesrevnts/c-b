/**
 * Board renderer: draws the wooden triangle, holes, pegs, and all animations.
 */

const PEG_COLORS = ['#f0ece4', '#3b7dd8', '#f0c030', '#e86830'];
const PEG_HIGHLIGHT = {
  '#f0ece4': '#ffffff',
  '#3b7dd8': '#5a9df0',
  '#f0c030': '#ffe060',
  '#e86830': '#ff8858',
};

export function randomPegColor() {
  return PEG_COLORS[Math.floor(Math.random() * PEG_COLORS.length)];
}

/* ── Color Utils ── */
function darken(hex, amt) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * (1 - amt))},${Math.round(g * (1 - amt))},${Math.round(b * (1 - amt))})`;
}

function lighten(hex, amt) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.min(255, Math.round(r + (255 - r) * amt))},${Math.min(255, Math.round(g + (255 - g) * amt))},${Math.min(255, Math.round(b + (255 - b) * amt))})`;
}

/* ── Board Drawing ── */
export function drawBoard(ctx, W, H) {
  const topX = W / 2, topY = H * 0.06;
  const botL = W * 0.07, botR = W * 0.93, botY = H * 0.94;

  // Shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 10;
  ctx.beginPath();
  ctx.moveTo(topX, topY);
  ctx.lineTo(botR, botY);
  ctx.lineTo(botL, botY);
  ctx.closePath();
  ctx.fillStyle = '#a07838';
  ctx.fill();
  ctx.restore();

  // Board gradient
  const grad = ctx.createLinearGradient(0, topY, 0, botY);
  grad.addColorStop(0, '#d4a85a');
  grad.addColorStop(0.25, '#cca052');
  grad.addColorStop(0.6, '#b89040');
  grad.addColorStop(1, '#a07838');
  ctx.beginPath();
  ctx.moveTo(topX, topY);
  ctx.lineTo(botR, botY);
  ctx.lineTo(botL, botY);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Wood grain
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(topX, topY);
  ctx.lineTo(botR, botY);
  ctx.lineTo(botL, botY);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = 'rgba(0,0,0,0.035)';
  ctx.lineWidth = 1.2;
  for (let y = topY; y < botY; y += 7) {
    ctx.beginPath();
    ctx.moveTo(0, y + Math.sin(y * 0.06) * 4);
    ctx.bezierCurveTo(W * 0.3, y + Math.sin(y * 0.04 + 1) * 5, W * 0.7, y + Math.sin(y * 0.05 + 2) * 3, W, y + Math.sin(y * 0.06 + 3) * 4);
    ctx.stroke();
  }
  ctx.restore();

  // Beveled edge highlight
  ctx.beginPath();
  ctx.moveTo(topX, topY + 2);
  ctx.lineTo(botL + 3, botY - 1);
  ctx.strokeStyle = 'rgba(255,255,200,0.08)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Border
  ctx.beginPath();
  ctx.moveTo(topX, topY);
  ctx.lineTo(botR, botY);
  ctx.lineTo(botL, botY);
  ctx.closePath();
  ctx.strokeStyle = '#7a5c28';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Branding text
  ctx.save();
  ctx.font = `bold ${W * 0.035}px 'Playfair Display', serif`;
  ctx.fillStyle = 'rgba(90,65,25,0.3)';
  ctx.textAlign = 'center';
  ctx.fillText('CRACKER BARREL™', W / 2, H * 0.77);

  ctx.font = `500 ${W * 0.02}px 'DM Sans', sans-serif`;
  ctx.fillStyle = 'rgba(90,65,25,0.22)';
  ctx.fillText('Leave one — you\'re a genius!', W / 2, H * 0.81);
  ctx.fillText('Leave two — purty smart', W / 2, H * 0.84);
  ctx.fillText('Leave three or more — just plain dumb', W / 2, H * 0.87);
  ctx.restore();
}

/* ── Hole Drawing ── */
export function drawHole(ctx, x, y, radius) {
  // Outer rim
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#3d2810';
  ctx.fill();

  // Inner
  const inner = ctx.createRadialGradient(x, y - radius * 0.2, 0, x, y, radius * 0.8);
  inner.addColorStop(0, '#1a0e04');
  inner.addColorStop(1, '#2a1a08');
  ctx.beginPath();
  ctx.arc(x, y + 1, radius * 0.78, 0, Math.PI * 2);
  ctx.fillStyle = inner;
  ctx.fill();
}

/* ── Peg Drawing ── */
export function drawPeg(ctx, x, y, color, lifted = false, scale = 1, pegRadius) {
  const r = pegRadius * scale;
  ctx.save();

  const dk = darken(color, 0.3);
  const hi = PEG_HIGHLIGHT[color] || lighten(color, 0.3);

  // Stem shadow
  if (!lifted) {
    ctx.beginPath();
    ctx.arc(x, y + r * 0.35, r * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = dk;
    ctx.fill();
  }

  // Head gradient
  const headGrad = ctx.createRadialGradient(x - r * 0.28, y - r * 0.28, r * 0.08, x, y, r);
  headGrad.addColorStop(0, hi);
  headGrad.addColorStop(0.5, color);
  headGrad.addColorStop(1, dk);

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = headGrad;
  ctx.fill();

  // Cross indentation
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = scale * 1.5;
  ctx.lineCap = 'round';
  const cr = r * 0.42;
  ctx.beginPath();
  ctx.moveTo(x - cr, y); ctx.lineTo(x + cr, y);
  ctx.moveTo(x, y - cr); ctx.lineTo(x, y + cr);
  ctx.stroke();
  const cr2 = cr * 0.55;
  ctx.beginPath();
  ctx.moveTo(x - cr2, y - cr2); ctx.lineTo(x + cr2, y + cr2);
  ctx.moveTo(x + cr2, y - cr2); ctx.lineTo(x - cr2, y + cr2);
  ctx.stroke();

  // Lift glow
  if (lifted) {
    ctx.beginPath();
    ctx.arc(x, y, r + 3, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,200,0.35)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  ctx.restore();
}

/* ── Valid Target Hint ── */
export function drawTargetHint(ctx, x, y, radius, now) {
  const pulse = 0.7 + 0.3 * Math.sin(now * 0.006);
  ctx.save();
  ctx.globalAlpha = 0.4 * pulse;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.85, 0, Math.PI * 2);
  ctx.fillStyle = '#4CAF50';
  ctx.fill();
  // Ring
  ctx.globalAlpha = 0.6 * pulse;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.85, 0, Math.PI * 2);
  ctx.strokeStyle = '#66BB6A';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

/* ── Dragged Peg Shadow ── */
export function drawDragShadow(ctx, x, y, pegRadius) {
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.ellipse(x + 4, y + 8, pegRadius * 1.2, pegRadius * 0.65, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.restore();
}

/* ── Ghost outline of origin hole while dragging ── */
export function drawOriginGhost(ctx, x, y, holeRadius) {
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(x, y, holeRadius * 0.75, 0, Math.PI * 2);
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}
