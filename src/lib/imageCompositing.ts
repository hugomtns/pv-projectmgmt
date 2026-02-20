/**
 * Image Compositing — overlays equipment onto an AI-generated aerial image.
 *
 * Equipment is drawn as perspective-correct 3D boxes whose corners were
 * projected by the live Three.js camera, so position and perspective match
 * the original schematic view exactly.
 *
 * Corner convention (topFace / bottomFace), clockwise from above:
 *   [0] TL = left-front   [1] TR = right-front
 *   [2] BR = right-back   [3] BL = left-back
 */

import type { ProjectedEquipment } from './equipmentProjection';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadImage(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/png;base64,${base64}`;
  });
}

type Pt = [number, number];

/** Scale a normalised point to pixel coordinates. */
function px(pt: readonly [number, number], W: number, H: number): Pt {
  return [pt[0] * W, pt[1] * H];
}

/** Linear interpolation between two 2-D points. */
function lerp2(a: Pt, b: Pt, t: number): Pt {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Fill an arbitrary polygon path. */
function fillPoly(ctx: CanvasRenderingContext2D, pts: Pt[], color: string): void {
  if (pts.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/** Stroke an arbitrary polygon path. */
function strokePoly(ctx: CanvasRenderingContext2D, pts: Pt[], color: string, lw: number): void {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth   = lw;
  ctx.stroke();
}

/**
 * Determine which of the 4 side faces should be drawn (visible to camera).
 * A face is visible if its outward normal points toward the viewer.
 * We test this using the 2-D cross product of the projected edges — a
 * counter-clockwise winding in screen space means the face is front-facing.
 *
 * Returns the face edge pairs sorted nearest-first (largest screen area first).
 */
function visibleSideFaces(top: Pt[], bot: Pt[]): Array<[number, number]> {
  // Side face edges: [topA, topB] → side quad is [topA, topB, botB, botA]
  const edges: Array<[number, number]> = [[0,1],[1,2],[2,3],[3,0]];

  return edges
    .map(([a, b]) => {
      const quad: Pt[] = [top[a], top[b], bot[b], bot[a]];
      // 2-D signed area — positive = CCW in screen coords (y-down)
      let area = 0;
      for (let i = 0; i < quad.length; i++) {
        const j = (i + 1) % quad.length;
        area += quad[i][0] * quad[j][1] - quad[j][0] * quad[i][1];
      }
      return { edge: [a, b] as [number, number], area };
    })
    .filter(f => f.area > 0)                      // only front-facing
    .sort((a, b) => b.area - a.area)              // largest first
    .map(f => f.edge);
}

// ---------------------------------------------------------------------------
// Per-type drawing
// ---------------------------------------------------------------------------

/**
 * Draw a padmount transformer as a 3-D green box with cooling fins.
 *
 * Visual layers (back to front):
 *  1. Ground shadow (offset polygon)
 *  2. Visible side face(s) — dark green with vertical cooling-fin lines
 *  3. Top face — lighter green, slight gradient, ventilation detail
 *  4. Edge outlines
 */
function drawTransformer(
  ctx: CanvasRenderingContext2D,
  item: ProjectedEquipment,
  W: number,
  H: number,
): void {
  const top = item.topFace.map(c => px(c, W, H));
  const bot = item.bottomFace.map(c => px(c, W, H));

  const topColor  = '#4e8562'; // olive green — roof
  const sideColor = '#2e5c3a'; // darker green — walls
  const finColor  = '#1f4028'; // darkest — fin shadow lines
  const outlineColor = '#162e1c';

  // 1. Ground shadow — offset a copy of the bottom polygon slightly
  const shadowOffset: Pt = [3, 5];
  const shadowPts = bot.map(([x, y]): Pt => [x + shadowOffset[0], y + shadowOffset[1]]);
  ctx.save();
  ctx.globalAlpha = 0.35;
  fillPoly(ctx, shadowPts, '#000');
  ctx.restore();

  // 2. Visible side faces
  const faces = visibleSideFaces(top, bot);
  for (const [a, b] of faces) {
    const sidePts: Pt[] = [top[a], top[b], bot[b], bot[a]];
    fillPoly(ctx, sidePts, sideColor);

    // Cooling fins: vertical lines dividing the side face
    const numFins = 6;
    for (let i = 1; i < numFins; i++) {
      const t  = i / numFins;
      const p0 = lerp2(top[a], top[b], t);
      const p1 = lerp2(bot[a], bot[b], t);
      ctx.beginPath();
      ctx.moveTo(p0[0], p0[1]);
      ctx.lineTo(p1[0], p1[1]);
      ctx.strokeStyle = finColor;
      ctx.lineWidth   = 0.8;
      ctx.stroke();
    }

    // Horizontal cap line at top of side face
    ctx.beginPath();
    ctx.moveTo(top[a][0], top[a][1]);
    ctx.lineTo(top[b][0], top[b][1]);
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth   = 1;
    ctx.stroke();

    strokePoly(ctx, sidePts, outlineColor, 0.8);
  }

  // 3. Top face — lighter green
  fillPoly(ctx, top, topColor);

  // Subtle detail on roof: a small darker rectangle in the centre (lid panel / bushings)
  const cx = top.reduce((s, p) => s + p[0], 0) / 4;
  const cy = top.reduce((s, p) => s + p[1], 0) / 4;

  // Draw two small lines suggesting HV bushings along the long axis
  const axis0 = lerp2(lerp2(top[0], top[3], 0.5), lerp2(top[1], top[2], 0.5), 0.5);
  const bLen  = Math.hypot(top[1][0] - top[0][0], top[1][1] - top[0][1]) * 0.12;
  const ang   = Math.atan2(top[1][1] - top[0][1], top[1][0] - top[0][0]);

  for (let s = -1; s <= 1; s += 2) {
    const bx = axis0[0] + Math.cos(ang) * s * bLen * 1.8;
    const by = axis0[1] + Math.sin(ang) * s * bLen * 1.8;
    ctx.beginPath();
    ctx.arc(bx, by, Math.max(1.5, bLen * 0.4), 0, Math.PI * 2);
    ctx.fillStyle = '#7ab58a';
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  // Outline top face
  strokePoly(ctx, top, outlineColor, 1);

  // Centre dot (neutral bushing)
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(1, bLen * 0.35), 0, Math.PI * 2);
  ctx.fillStyle = '#a0c8a8';
  ctx.fill();
}

/**
 * Draw a string inverter or combiner box as a simple perspective box.
 * These are much smaller, so we keep the rendering lighter.
 */
function drawSimpleBox(
  ctx: CanvasRenderingContext2D,
  item: ProjectedEquipment,
  W: number,
  H: number,
): void {
  const top = item.topFace.map(c => px(c, W, H));
  const bot = item.bottomFace.map(c => px(c, W, H));

  const isInverter = item.type === 'inverter';
  const topColor   = isInverter ? '#c8cfd6' : '#c8b880';
  const sideColor  = isInverter ? '#8c959e' : '#9a8a55';
  const outline    = isInverter ? '#4a5260' : '#5a4a28';

  // Shadow
  const shadowPts = bot.map(([x, y]): Pt => [x + 2, y + 3]);
  ctx.save();
  ctx.globalAlpha = 0.3;
  fillPoly(ctx, shadowPts, '#000');
  ctx.restore();

  // Visible side faces
  const faces = visibleSideFaces(top, bot);
  for (const [a, b] of faces) {
    const sidePts: Pt[] = [top[a], top[b], bot[b], bot[a]];
    fillPoly(ctx, sidePts, sideColor);
    strokePoly(ctx, sidePts, outline, 0.6);
  }

  // Top face
  fillPoly(ctx, top, topColor);
  strokePoly(ctx, top, outline, 0.8);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Composite electrical equipment onto an AI-generated base image.
 *
 * @param aiImageBase64   - Raw base64 PNG returned by the AI model.
 * @param equipment       - Projected equipment items (normalised 0-1 coords).
 * @returns               - Raw base64 PNG of the composited image.
 */
export async function compositeEquipmentOntoImage(
  aiImageBase64: string,
  equipment: ProjectedEquipment[],
): Promise<string> {
  const img = await loadImage(aiImageBase64);

  const canvas  = document.createElement('canvas');
  canvas.width  = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context for compositing');

  ctx.drawImage(img, 0, 0);

  const W = canvas.width;
  const H = canvas.height;

  const visible = equipment.filter(e => e.visible);
  if (visible.length === 0) {
    return canvas.toDataURL('image/png').split(',')[1];
  }

  // Draw transformers first (largest — painters algorithm)
  for (const item of visible) {
    if (item.type === 'transformer') drawTransformer(ctx, item, W, H);
  }
  for (const item of visible) {
    if (item.type !== 'transformer') drawSimpleBox(ctx, item, W, H);
  }

  return canvas.toDataURL('image/png').split(',')[1];
}
