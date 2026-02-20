/**
 * Image Compositing — overlays equipment onto an AI-generated aerial image.
 *
 * The AI model generates terrain + panels without any electrical equipment.
 * This module takes the returned image and composites stylised equipment
 * shapes at the mathematically-projected positions from the 3D scene.
 *
 * Equipment is drawn as a perspective-correct top-face quadrilateral with
 * shading details to approximate a real aerial view.
 */

import type { ProjectedEquipment } from './equipmentProjection';

// Visual style per equipment type
const STYLE = {
  transformer: {
    fillTop:   '#4a7c59',   // green body top
    fillSide:  '#2d5a3d',   // darker side edge
    stroke:    '#1e3d28',
    label:     'T',
  },
  inverter: {
    fillTop:   '#b0b8c1',   // light gray enclosure top
    fillSide:  '#7a848d',
    stroke:    '#555f6a',
    label:     'I',
  },
  combiner: {
    fillTop:   '#c0a060',   // weathered steel
    fillSide:  '#8a7040',
    stroke:    '#5a4a28',
    label:     'C',
  },
} as const;

/**
 * Load an HTMLImageElement from a base64 PNG string.
 */
function loadImage(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/png;base64,${base64}`;
  });
}

/**
 * Draw a filled quadrilateral using Canvas 2D path.
 */
function fillQuad(
  ctx: CanvasRenderingContext2D,
  pts: ReadonlyArray<readonly [number, number]>,
  color: string,
): void {
  if (pts.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * Stroke a quadrilateral outline.
 */
function strokeQuad(
  ctx: CanvasRenderingContext2D,
  pts: ReadonlyArray<readonly [number, number]>,
  color: string,
  lineWidth: number,
): void {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth   = lineWidth;
  ctx.stroke();
}

/**
 * Draw one piece of equipment onto the canvas.
 * `topFace` corners are in pixel coordinates (already scaled from normalised).
 */
function drawEquipment(
  ctx: CanvasRenderingContext2D,
  item: ProjectedEquipment,
  scale: number, // pixels-per-unit, for shadow/stroke sizing
): void {
  const style = STYLE[item.type];
  const pts   = item.topFace.map(([nx, ny]) => [nx, ny] as [number, number]);

  // Drop shadow
  ctx.save();
  ctx.shadowColor   = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur    = Math.max(4, scale * 0.6);
  ctx.shadowOffsetX = Math.max(2, scale * 0.3);
  ctx.shadowOffsetY = Math.max(3, scale * 0.4);

  // Top face
  fillQuad(ctx, pts, style.fillTop);
  ctx.restore();

  // Faint inner lines on the top face (simulate panel/lid structure)
  if (item.type === 'transformer') {
    // Draw two horizontal lines across the top face to suggest cooling fins
    for (let t = 0.3; t < 1; t += 0.35) {
      const lerp = (a: [number, number], b: [number, number], tt: number): [number, number] =>
        [a[0] + (b[0] - a[0]) * tt, a[1] + (b[1] - a[1]) * tt];
      const left  = lerp(pts[0], pts[3], t);
      const right = lerp(pts[1], pts[2], t);
      ctx.beginPath();
      ctx.moveTo(left[0],  left[1]);
      ctx.lineTo(right[0], right[1]);
      ctx.strokeStyle = style.fillSide;
      ctx.lineWidth   = 1;
      ctx.stroke();
    }
  }

  // Outline
  strokeQuad(ctx, pts, style.stroke, Math.max(1, scale * 0.15));
}

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

  // Draw the AI-generated base image
  ctx.drawImage(img, 0, 0);

  const W = canvas.width;
  const H = canvas.height;

  const visibleItems = equipment.filter(e => e.visible);
  if (visibleItems.length === 0) {
    return canvas.toDataURL('image/png').split(',')[1];
  }

  // Scale normalised coordinates to pixel coordinates
  const scaled = visibleItems.map(item => ({
    ...item,
    topFace: item.topFace.map(([nx, ny]) => [nx * W, ny * H] as [number, number]),
    cx: item.cx * W,
    cy: item.cy * H,
  }));

  // Estimate a representative pixel scale for stroke/shadow sizing
  // using the diagonal of the first item's bounding box
  const first = scaled[0];
  const xs = first.topFace.map(p => p[0]);
  const ys = first.topFace.map(p => p[1]);
  const bboxW = Math.max(...xs) - Math.min(...xs);
  const bboxH = Math.max(...ys) - Math.min(...ys);
  const scale = Math.max(4, Math.sqrt(bboxW * bboxW + bboxH * bboxH) / 4);

  // Draw transformers first (largest, should be underneath inverters if overlapping)
  for (const item of scaled) {
    if (item.type === 'transformer') drawEquipment(ctx, item, scale);
  }
  for (const item of scaled) {
    if (item.type !== 'transformer') drawEquipment(ctx, item, scale);
  }

  return canvas.toDataURL('image/png').split(',')[1];
}
