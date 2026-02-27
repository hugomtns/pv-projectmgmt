/**
 * Procedural textures for the 3D DXF viewer.
 *
 * All textures are generated via the Canvas 2D API and cached at module level —
 * each texture is only created once regardless of how many components reference it.
 *
 * Ported and adapted from combined_prototype_v3.html (pvcase-mocks).
 */

import { CanvasTexture } from 'three';

const _cache = new Map<string, CanvasTexture>();

function cached(key: string, draw: () => HTMLCanvasElement): CanvasTexture {
  const hit = _cache.get(key);
  if (hit) return hit;
  const tex = new CanvasTexture(draw());
  _cache.set(key, tex);
  return tex;
}

// ─── Solar Panel ─────────────────────────────────────────────────────────────

/**
 * Monocrystalline solar panel texture.
 * Silver aluminium frame border, dark blue-black cell area, thin cell grid
 * lines, horizontal bus bars, and a subtle anti-reflection coating tint.
 */
export function createPanelTexture(): CanvasTexture {
  return cached('panel', () => {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 256;
    const ctx = c.getContext('2d')!;

    // Silver aluminium frame
    ctx.fillStyle = '#b8c8d8';
    ctx.fillRect(0, 0, 512, 256);

    // Inner shadow strip (recessed frame look)
    ctx.fillStyle = '#7a8ea0';
    ctx.fillRect(12, 12, 488, 232);

    // Cell glass area
    ctx.fillStyle = '#0a1526';
    ctx.fillRect(14, 14, 484, 228);

    // Thin cell column + row grid lines
    ctx.strokeStyle = '#162034';
    ctx.lineWidth = 1;
    for (let x = 14; x <= 498; x += 28) {
      ctx.beginPath(); ctx.moveTo(x, 14); ctx.lineTo(x, 242); ctx.stroke();
    }
    for (let y = 14; y <= 242; y += 28) {
      ctx.beginPath(); ctx.moveTo(14, y); ctx.lineTo(498, y); ctx.stroke();
    }

    // Bus bars — slightly brighter metallic horizontal lines
    ctx.strokeStyle = '#485d70';
    ctx.lineWidth = 2;
    for (let y = 28; y < 242; y += 56) {
      ctx.beginPath(); ctx.moveTo(14, y); ctx.lineTo(498, y); ctx.stroke();
    }

    // Anti-reflection coating: subtle blue-to-dark gradient tint
    const grad = ctx.createLinearGradient(0, 14, 0, 242);
    grad.addColorStop(0, 'rgba(30,70,120,0.10)');
    grad.addColorStop(1, 'rgba(5,15,40,0.18)');
    ctx.fillStyle = grad;
    ctx.fillRect(14, 14, 484, 228);

    return c;
  });
}

// ─── Transformer ─────────────────────────────────────────────────────────────

/**
 * Pad-mounted utility transformer texture.
 * Vertical cooling fins, metal nameplate, hazard warning stripe, oil drain
 * port, bolt heads along the top cap, and subtle weld seam lines.
 */
export function createTransformerTexture(): CanvasTexture {
  return cached('transformer', () => {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 512;
    const ctx = c.getContext('2d')!;

    // Base: dark charcoal-green typical of utility transformers
    ctx.fillStyle = '#2e332e';
    ctx.fillRect(0, 0, 512, 512);

    // Vertical cooling fins — alternating light/shadow ribs
    for (let x = 0; x < 512; x += 22) {
      ctx.fillStyle = (Math.floor(x / 22) % 2 === 0) ? '#363c36' : '#282d28';
      ctx.fillRect(x, 20, 18, 420);
      // Highlight edge on each fin
      ctx.fillStyle = '#454d45';
      ctx.fillRect(x, 20, 2, 420);
    }

    // Top cap bar
    ctx.fillStyle = '#1e221e';
    ctx.fillRect(0, 0, 512, 22);

    // Bottom base trim
    ctx.fillStyle = '#1e221e';
    ctx.fillRect(0, 440, 512, 72);

    // Yellow/black hazard stripe band near base
    const stripeY = 442; const stripeH = 28; const sw = 28;
    for (let x = 0; x < 512; x += sw * 2) {
      ctx.fillStyle = '#f0c000'; ctx.fillRect(x, stripeY, sw, stripeH);
      ctx.fillStyle = '#111111'; ctx.fillRect(x + sw, stripeY, sw, stripeH);
    }

    // Metal nameplate rectangle (centre)
    ctx.fillStyle = '#c8c0a0';
    ctx.fillRect(186, 170, 140, 80);
    ctx.strokeStyle = '#7a7058'; ctx.lineWidth = 2;
    ctx.strokeRect(186, 170, 140, 80);

    // Nameplate text lines (simulated as filled bars)
    ctx.fillStyle = '#3a3020';
    ctx.fillRect(198, 185, 116, 8);
    ctx.fillRect(198, 200,  80, 6);
    ctx.fillRect(198, 213,  96, 6);
    ctx.fillRect(198, 226,  60, 6);

    // Oil drain/fill port on lower body
    ctx.beginPath(); ctx.arc(256, 400, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1e1a'; ctx.fill();
    ctx.strokeStyle = '#555d55'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.arc(256, 400, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#444c44'; ctx.fill();

    // Bolt heads along top cap
    ctx.fillStyle = '#555d55';
    for (let bx = 30; bx < 512; bx += 48) {
      ctx.beginPath(); ctx.arc(bx, 11, 5, 0, Math.PI * 2); ctx.fill();
    }

    // Subtle horizontal weld seam lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
    [80, 160, 260, 340].forEach(y => {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
    });

    return c;
  });
}

// ─── String / Central Inverter ───────────────────────────────────────────────

/**
 * Inverter enclosure texture.
 * Brushed-metal housing, recessed status display with green LED readout,
 * ventilation louvres, status LED with glow, and a high-voltage warning sticker.
 */
export function createInverterTexture(): CanvasTexture {
  return cached('inverter', () => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 512;
    const ctx = c.getContext('2d')!;

    // Enclosure body — brushed light gray
    ctx.fillStyle = '#d4d8dc';
    ctx.fillRect(0, 0, 256, 512);

    // Subtle noise grain
    for (let i = 0; i < 8000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)';
      ctx.fillRect(Math.random() * 256, Math.random() * 512, 2, 1);
    }

    // Top display panel (darker recess)
    ctx.fillStyle = '#1a1e22';
    ctx.fillRect(24, 20, 208, 80);

    // Display screen
    ctx.fillStyle = '#001a00';
    ctx.fillRect(30, 26, 196, 68);

    // Green LED readout text (simulated as coloured bars)
    ctx.fillStyle = '#00cc44';
    ctx.fillRect(36, 36, 100, 10); // AC voltage line
    ctx.fillRect(36, 54,  80,  8); // Power line
    ctx.fillRect(36, 68,  90,  8); // Efficiency line

    // Ventilation louvres (centre band)
    for (let y = 130; y < 380; y += 14) {
      ctx.fillStyle = '#b8bcc0';
      ctx.fillRect(20, y, 216, 8);
      ctx.fillStyle = '#888c90';
      ctx.fillRect(20, y + 8, 216, 3);
    }

    // Status LED — green (online)
    ctx.fillStyle = '#22ff44';
    ctx.beginPath(); ctx.arc(230, 30, 6, 0, Math.PI * 2); ctx.fill();
    // LED glow
    ctx.fillStyle = 'rgba(34,255,68,0.3)';
    ctx.beginPath(); ctx.arc(230, 30, 12, 0, Math.PI * 2); ctx.fill();

    // Bottom high-voltage warning sticker
    ctx.fillStyle = '#f5c400';
    ctx.fillRect(70, 420, 116, 52);
    ctx.strokeStyle = '#b8940a'; ctx.lineWidth = 2;
    ctx.strokeRect(70, 420, 116, 52);
    // Warning bars (text simulation)
    ctx.fillStyle = '#1a1400';
    ctx.fillRect(86, 432, 84, 8);
    ctx.fillRect(86, 448, 84, 8);

    // Cabinet door seam / edge trim
    ctx.strokeStyle = '#a0a8b0'; ctx.lineWidth = 1.5;
    ctx.strokeRect(16, 16, 224, 480);

    return c;
  });
}

// ─── Combiner / BESS container ───────────────────────────────────────────────

/**
 * Combiner box / BESS container texture.
 * Corrugated steel cladding with vertical ribs, branded colour band,
 * hazard warning stripe at the base, and ventilation grate.
 */
export function createCombinerTexture(): CanvasTexture {
  return cached('combiner', () => {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 256;
    const ctx = c.getContext('2d')!;

    // Base cladding — light gray
    ctx.fillStyle = '#e4e8ec';
    ctx.fillRect(0, 0, 512, 256);

    // Corrugated rib pattern (vertical lines)
    ctx.strokeStyle = '#c8cdd2'; ctx.lineWidth = 4;
    for (let x = 0; x < 512; x += 8) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke();
    }
    // Rib shadow detail
    ctx.strokeStyle = '#b0b5ba'; ctx.lineWidth = 1;
    for (let x = 4; x < 512; x += 8) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke();
    }

    // Branded colour band (centre)
    ctx.fillStyle = '#1a73e8';
    ctx.fillRect(0, 108, 512, 40);
    // Band edge highlights
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 109); ctx.lineTo(512, 109); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 146); ctx.lineTo(512, 146); ctx.stroke();

    // Hazard stripe at base
    const sw = 24;
    for (let x = 0; x < 512; x += sw * 2) {
      ctx.fillStyle = '#f5c400'; ctx.fillRect(x,      224, sw, 32);
      ctx.fillStyle = '#1a1400'; ctx.fillRect(x + sw, 224, sw, 32);
    }

    // Ventilation grate (left panel area)
    for (let y = 20; y < 100; y += 12) {
      ctx.fillStyle = '#bbbfc3';
      ctx.fillRect(20, y, 80, 6);
    }

    return c;
  });
}
