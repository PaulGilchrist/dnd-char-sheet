// @improved-by-ai
import { describe, it, expect, vi } from 'vitest';
import { toGrid, createOverlay, hitTestOverlay, svgOrigin, OverlayShape, DEFAULTS } from './SpellOverlay.js';

// Grid geometry: CELL = 40px per 5ft grid unit, hit-testing is done in
// screen pixels. Helpers below express positions in feet so each test
// reads as the game rule it verifies instead of raw pixel arithmetic.
const cellAt = (ft) => ft / 5;
const pointAt = (originX, originY, dxFt, dyFt) => [
  originX + cellAt(dxFt),
  originY + cellAt(dyFt),
];

const makeOverlay = (shape, gridX, gridY, angle = 0, params = {}) =>
  createOverlay(shape, gridX, gridY, angle, params);

const DIMENSION_KEYS = ['radiusFt', 'coneAngle', 'widthFt', 'distanceFt', 'sizeFt', 'color'];

// ── OverlayShape ───────────────────────────────────────────────────

describe('OverlayShape', () => {
  it('exports all expected shape keys with correct string values', () => {
    expect(OverlayShape.SPHERE).toBe('sphere');
    expect(OverlayShape.CYLINDER).toBe('cylinder');
    expect(OverlayShape.CUBE).toBe('cube');
    expect(OverlayShape.CONE).toBe('cone');
    expect(OverlayShape.LINE).toBe('line');
  });
});

// ── DEFAULTS ───────────────────────────────────────────────────────

describe('DEFAULTS', () => {
  it('provides every dimension key for each shape', () => {
    for (const key of Object.values(OverlayShape)) {
      for (const dim of DIMENSION_KEYS) {
        expect(DEFAULTS[key]).toHaveProperty(dim);
      }
    }
  });

  it('has correct default values per shape', () => {
    expect(DEFAULTS.sphere).toEqual({
      radiusFt: 20, coneAngle: 0, widthFt: 0, distanceFt: 0, sizeFt: 0,
      color: 'rgba(255,80,60,0.35)',
    });
    expect(DEFAULTS.cylinder).toEqual(DEFAULTS.sphere);
    expect(DEFAULTS.cube).toEqual({
      radiusFt: 0, coneAngle: 0, widthFt: 0, distanceFt: 0, sizeFt: 15,
      color: 'rgba(255,80,60,0.35)',
    });
    expect(DEFAULTS.cone).toEqual({
      radiusFt: 0, coneAngle: 53, widthFt: 0, distanceFt: 60, sizeFt: 0,
      color: 'rgba(255,80,60,0.35)',
    });
    expect(DEFAULTS.line).toEqual({
      radiusFt: 0, coneAngle: 0, widthFt: 5, distanceFt: 60, sizeFt: 0,
      color: 'rgba(255,80,60,0.35)',
    });
  });
});

// ── toGrid ─────────────────────────────────────────────────────────

describe('toGrid', () => {
  it('converts feet to grid units by dividing by 5', () => {
    expect(toGrid(5)).toBe(1);
    expect(toGrid(10)).toBe(2);
    expect(toGrid(20)).toBe(4);
    expect(toGrid(45)).toBe(9);
    expect(toGrid(60)).toBe(12);
  });

  it('handles zero, negative, fractional, and NaN input', () => {
    expect(toGrid(0)).toBe(0);
    expect(toGrid(-10)).toBe(-2);
    expect(toGrid(2.5)).toBe(0.5);
    expect(toGrid(NaN)).toBeNaN();
  });
});

// ── createOverlay ──────────────────────────────────────────────────

describe('createOverlay', () => {
  it('creates an overlay with shape, position, angle, and defaults', () => {
    const overlay = makeOverlay('sphere', 3, 4);
    expect(overlay.shape).toBe('sphere');
    expect(overlay.startGridX).toBe(3);
    expect(overlay.startGridY).toBe(4);
    expect(overlay.angle).toBe(0);
    expect(overlay.radiusFt).toBe(20);
    expect(overlay.color).toBe('rgba(255,80,60,0.35)');
  });

  it('assigns a unique id sourced from crypto.randomUUID', () => {
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('mock-uuid-1');
    const overlay = makeOverlay('sphere', 0, 0);
    expect(overlay.id).toBe('mock-uuid-1');
    expect(uuidSpy).toHaveBeenCalledTimes(1);
    uuidSpy.mockRestore();
  });

  it('overrides defaults with params', () => {
    const overlay = makeOverlay('sphere', 3, 4, 0, { radiusFt: 30, color: 'rgba(100,200,50,0.5)' });
    expect(overlay.radiusFt).toBe(30);
    expect(overlay.color).toBe('rgba(100,200,50,0.5)');
    expect(overlay.startGridX).toBe(3);
  });

  it('uses shape-specific defaults', () => {
    const cone = makeOverlay('cone', 1, 1);
    expect(cone.distanceFt).toBe(60);
    expect(cone.coneAngle).toBe(53);
    expect(cone.radiusFt).toBe(0);

    const cube = makeOverlay('cube', 1, 1);
    expect(cube.sizeFt).toBe(15);
    expect(cube.radiusFt).toBe(0);

    const line = makeOverlay('line', 1, 1);
    expect(line.distanceFt).toBe(60);
    expect(line.widthFt).toBe(5);
  });

  it('params override shape-specific defaults', () => {
    const cone = makeOverlay('cone', 1, 1, 0, { distanceFt: 30 });
    expect(cone.distanceFt).toBe(30);
    expect(cone.coneAngle).toBe(53);
  });

  it('accepts a custom angle parameter', () => {
    expect(makeOverlay('sphere', 0, 0, 45).angle).toBe(45);
  });

  it('returns all expected properties', () => {
    const overlay = makeOverlay('sphere', 2, 3, 90, { radiusFt: 10 });
    expect(overlay).toHaveProperty('id');
    expect(overlay).toHaveProperty('shape', 'sphere');
    expect(overlay).toHaveProperty('startGridX', 2);
    expect(overlay).toHaveProperty('startGridY', 3);
    expect(overlay).toHaveProperty('angle', 90);
    expect(overlay).toHaveProperty('radiusFt', 10);
    expect(overlay).toHaveProperty('color');
  });

  it('keeps position, angle, and explicit params for unknown shapes', () => {
    const overlay = makeOverlay('bogus', 1, 2, 90, { radiusFt: 5 });
    expect(overlay.shape).toBe('bogus');
    expect(overlay.startGridX).toBe(1);
    expect(overlay.startGridY).toBe(2);
    expect(overlay.angle).toBe(90);
    expect(overlay.radiusFt).toBe(5);
    expect(overlay).not.toHaveProperty('color');
    expect(overlay).not.toHaveProperty('coneAngle');
  });
});

// ── hitTestOverlay ─────────────────────────────────────────────────

describe('hitTestOverlay', () => {
  // ── SPHERE ────────────────────────────────────────────────────────

  describe('SPHERE', () => {
    it('hits the center point', () => {
      expect(hitTestOverlay(makeOverlay('sphere', 5, 5, 0, { radiusFt: 20 }), 5, 5)).toBe(true);
    });

    it('hits points within the radius', () => {
      const [x, y] = pointAt(5, 5, 15, 0);
      expect(hitTestOverlay(makeOverlay('sphere', 5, 5, 0, { radiusFt: 20 }), x, y)).toBe(true);
    });

    it('misses points outside the radius', () => {
      const [x, y] = pointAt(5, 5, 25, 0);
      expect(hitTestOverlay(makeOverlay('sphere', 5, 5, 0, { radiusFt: 20 }), x, y)).toBe(false);
    });

    it('hits points exactly at the radius boundary', () => {
      const [x, y] = pointAt(5, 5, 25, 0);
      expect(hitTestOverlay(makeOverlay('sphere', 5, 5, 0, { radiusFt: 25 }), x, y)).toBe(true);
    });

    it('misses points just beyond the radius boundary', () => {
      const [x, y] = pointAt(5, 5, 30, 0);
      expect(hitTestOverlay(makeOverlay('sphere', 5, 5, 0, { radiusFt: 25 }), x, y)).toBe(false);
    });

    it('only hits the center when radiusFt=0', () => {
      const overlay = makeOverlay('sphere', 5, 5, 0, { radiusFt: 0 });
      expect(hitTestOverlay(overlay, 5, 5)).toBe(true);
      const [x, y] = pointAt(5, 5, 5, 0);
      expect(hitTestOverlay(overlay, x, y)).toBe(false);
    });

    it('is unaffected by rotation angle', () => {
      const unrotated = makeOverlay('sphere', 5, 5, 0, { radiusFt: 20 });
      const rotated = makeOverlay('sphere', 5, 5, 90, { radiusFt: 20 });
      const [fwdX, fwdY] = pointAt(5, 5, 15, 0);
      const [sideX, sideY] = pointAt(5, 5, 0, 15);
      expect(hitTestOverlay(rotated, fwdX, fwdY)).toBe(hitTestOverlay(unrotated, fwdX, fwdY));
      expect(hitTestOverlay(rotated, sideX, sideY)).toBe(hitTestOverlay(unrotated, sideX, sideY));
    });

    it('works with negative grid coordinates', () => {
      const overlay = makeOverlay('sphere', -3, -3, 0, { radiusFt: 5 });
      expect(hitTestOverlay(overlay, -3, -3)).toBe(true);
      const [x, y] = pointAt(-3, -3, 5, -5);
      expect(hitTestOverlay(overlay, x, y)).toBe(false);
    });
  });

  // ── CYLINDER (shares the sphere code path) ────────────────────────

  describe('CYLINDER', () => {
    it('hits the center point', () => {
      expect(hitTestOverlay(makeOverlay('cylinder', 5, 5, 0, { radiusFt: 20 }), 5, 5)).toBe(true);
    });

    it('hits points within the radius like a sphere', () => {
      const [x, y] = pointAt(5, 5, 15, 0);
      expect(hitTestOverlay(makeOverlay('cylinder', 5, 5, 0, { radiusFt: 20 }), x, y)).toBe(true);
    });

    it('misses points outside the radius like a sphere', () => {
      const [x, y] = pointAt(5, 5, 25, 0);
      expect(hitTestOverlay(makeOverlay('cylinder', 5, 5, 0, { radiusFt: 20 }), x, y)).toBe(false);
    });
  });

  // ── CUBE ─────────────────────────────────────────────────────────

  describe('CUBE', () => {
    it('hits the center and points within bounds', () => {
      const overlay = makeOverlay('cube', 5, 5, 0, { sizeFt: 15 });
      expect(hitTestOverlay(overlay, 5, 5)).toBe(true);
      const [x, y] = pointAt(5, 5, 5, 0);
      expect(hitTestOverlay(overlay, x, y)).toBe(true);
    });

    it('misses points outside the cube bounds', () => {
      const [x, y] = pointAt(5, 5, 10, 0);
      expect(hitTestOverlay(makeOverlay('cube', 5, 5, 0, { sizeFt: 15 }), x, y)).toBe(false);
    });

    it('hits points exactly at the cube edge boundary', () => {
      const [x, y] = pointAt(5, 5, 10, 0);
      expect(hitTestOverlay(makeOverlay('cube', 5, 5, 0, { sizeFt: 20 }), x, y)).toBe(true);
    });

    it('misses points just beyond the cube edge', () => {
      const [x, y] = pointAt(5, 5, 15, 0);
      expect(hitTestOverlay(makeOverlay('cube', 5, 5, 0, { sizeFt: 20 }), x, y)).toBe(false);
    });

    it('rotated 45 degrees reaches further along its axis than unrotated', () => {
      // sizeFt=20 => half-extent is 10ft. A point 12.5ft along the axis
      // misses the unrotated cube but sits inside the cube rotated 45°,
      // whose corner reaches ~14.1ft along that axis.
      const rotated = makeOverlay('cube', 5, 5, 45, { sizeFt: 20 });
      const unrotated = makeOverlay('cube', 5, 5, 0, { sizeFt: 20 });
      const [x, y] = pointAt(5, 5, 12.5, 0);
      expect(hitTestOverlay(rotated, x, y)).toBe(true);
      expect(hitTestOverlay(unrotated, x, y)).toBe(false);
    });

    it('misses diagonal points that would hit when unrotated', () => {
      // 8.75ft forward and 8.75ft sideways sits inside the unrotated
      // square (both < half-extent) but escapes the 45°-rotated square.
      const rotated = makeOverlay('cube', 5, 5, 45, { sizeFt: 20 });
      const unrotated = makeOverlay('cube', 5, 5, 0, { sizeFt: 20 });
      const [x, y] = pointAt(5, 5, 8.75, 8.75);
      expect(hitTestOverlay(rotated, x, y)).toBe(false);
      expect(hitTestOverlay(unrotated, x, y)).toBe(true);
    });

    it('only hits the center when sizeFt=0', () => {
      const overlay = makeOverlay('cube', 5, 5, 0, { sizeFt: 0 });
      expect(hitTestOverlay(overlay, 5, 5)).toBe(true);
      const [x, y] = pointAt(5, 5, 5, 0);
      expect(hitTestOverlay(overlay, x, y)).toBe(false);
    });

    it('works with negative grid coordinates', () => {
      const overlay = makeOverlay('cube', -2, -2, 0, { sizeFt: 10 });
      expect(hitTestOverlay(overlay, -2, -2)).toBe(true);
      const [x, y] = pointAt(-2, -2, 5, 0);
      expect(hitTestOverlay(overlay, x, y)).toBe(true);
    });
  });

  // ── CONE ─────────────────────────────────────────────────────────

  describe('CONE', () => {
    it('hits the center point (origin)', () => {
      expect(hitTestOverlay(makeOverlay('cone', 5, 5, 0, { distanceFt: 60, coneAngle: 53 }), 5, 5)).toBe(true);
    });

    it('hits a point within distance and angle on the cone axis', () => {
      const [x, y] = pointAt(5, 5, 15, 0);
      expect(hitTestOverlay(makeOverlay('cone', 5, 5, 0, { distanceFt: 60, coneAngle: 53 }), x, y)).toBe(true);
    });

    it('hits points exactly at the distance boundary', () => {
      const [x, y] = pointAt(5, 5, 60, 0);
      expect(hitTestOverlay(makeOverlay('cone', 5, 5, 0, { distanceFt: 60, coneAngle: 53 }), x, y)).toBe(true);
    });

    it('misses points just beyond the distance boundary', () => {
      const [x, y] = pointAt(5, 5, 61, 0);
      expect(hitTestOverlay(makeOverlay('cone', 5, 5, 0, { distanceFt: 60, coneAngle: 53 }), x, y)).toBe(false);
    });

    it('misses points outside the cone angle', () => {
      const [x, y] = pointAt(5, 5, 15, 15);
      expect(hitTestOverlay(makeOverlay('cone', 5, 5, 0, { distanceFt: 60, coneAngle: 53 }), x, y)).toBe(false);
    });

    it('respects rotation angle', () => {
      const [x, y] = pointAt(5, 5, 0, 15);
      expect(hitTestOverlay(makeOverlay('cone', 5, 5, 90, { distanceFt: 60, coneAngle: 53 }), x, y)).toBe(true);
    });

    it('hits points exactly at the cone angle edge', () => {
      // coneAngle=90 => half-spread of 45°. A point 35ft forward and
      // 35ft sideways is exactly on the 45° edge and within distance.
      const [x, y] = pointAt(5, 5, 35, 35);
      expect(hitTestOverlay(makeOverlay('cone', 5, 5, 0, { distanceFt: 60, coneAngle: 90 }), x, y)).toBe(true);
    });

    it('misses points just beyond the cone angle edge', () => {
      // 36ft sideways vs 35ft forward pushes the point past 45°.
      const [x, y] = pointAt(5, 5, 35, 36);
      expect(hitTestOverlay(makeOverlay('cone', 5, 5, 0, { distanceFt: 60, coneAngle: 90 }), x, y)).toBe(false);
    });

    it('only hits the origin when distanceFt=0', () => {
      const overlay = makeOverlay('cone', 5, 5, 0, { distanceFt: 0, coneAngle: 53 });
      expect(hitTestOverlay(overlay, 5, 5)).toBe(true);
      const [x, y] = pointAt(5, 5, 5, 0);
      expect(hitTestOverlay(overlay, x, y)).toBe(false);
    });
  });

  // ── LINE ─────────────────────────────────────────────────────────

  describe('LINE', () => {
    it('hits the center point (origin)', () => {
      expect(hitTestOverlay(makeOverlay('line', 5, 5, 0, { distanceFt: 60, widthFt: 5 }), 5, 5)).toBe(true);
    });

    it('hits a point along the line at angle=0', () => {
      const [x, y] = pointAt(5, 5, 15, 0);
      expect(hitTestOverlay(makeOverlay('line', 5, 5, 0, { distanceFt: 60, widthFt: 5 }), x, y)).toBe(true);
    });

    it('hits points exactly at the far end of the line', () => {
      const [x, y] = pointAt(5, 5, 60, 0);
      expect(hitTestOverlay(makeOverlay('line', 5, 5, 0, { distanceFt: 60, widthFt: 5 }), x, y)).toBe(true);
    });

    it('misses points just past the far end of the line', () => {
      const [x, y] = pointAt(5, 5, 61, 0);
      expect(hitTestOverlay(makeOverlay('line', 5, 5, 0, { distanceFt: 60, widthFt: 5 }), x, y)).toBe(false);
    });

    it('misses points behind the line origin', () => {
      const [x, y] = pointAt(5, 5, -15, 0);
      expect(hitTestOverlay(makeOverlay('line', 5, 5, 0, { distanceFt: 60, widthFt: 5 }), x, y)).toBe(false);
    });

    it('misses points outside the line width', () => {
      const [x, y] = pointAt(5, 5, 15, 5);
      expect(hitTestOverlay(makeOverlay('line', 5, 5, 0, { distanceFt: 60, widthFt: 5 }), x, y)).toBe(false);
    });

    it('hits points exactly at the line width edge', () => {
      const [x, y] = pointAt(5, 5, 15, 2.5);
      expect(hitTestOverlay(makeOverlay('line', 5, 5, 0, { distanceFt: 60, widthFt: 5 }), x, y)).toBe(true);
    });

    it('misses points just beyond the line width edge', () => {
      const [x, y] = pointAt(5, 5, 15, 3);
      expect(hitTestOverlay(makeOverlay('line', 5, 5, 0, { distanceFt: 60, widthFt: 5 }), x, y)).toBe(false);
    });

    it('respects rotation angle', () => {
      const [x, y] = pointAt(5, 5, 0, 15);
      expect(hitTestOverlay(makeOverlay('line', 5, 5, 90, { distanceFt: 60, widthFt: 5 }), x, y)).toBe(true);
    });

    it('a 180-degree rotation makes points behind the origin count as hits', () => {
      const [x, y] = pointAt(5, 5, -15, 0);
      const rotated = makeOverlay('line', 5, 5, 180, { distanceFt: 60, widthFt: 5 });
      expect(hitTestOverlay(rotated, x, y)).toBe(true);
    });

    it('only hits the origin when widthFt=0 or distanceFt=0', () => {
      const w0 = makeOverlay('line', 5, 5, 0, { distanceFt: 60, widthFt: 0 });
      expect(hitTestOverlay(w0, 5, 5)).toBe(true);
      const [offX, offY] = pointAt(5, 5, 15, 5);
      expect(hitTestOverlay(w0, offX, offY)).toBe(false);

      const d0 = makeOverlay('line', 5, 5, 0, { distanceFt: 0, widthFt: 5 });
      expect(hitTestOverlay(d0, 5, 5)).toBe(true);
      const [fwdX, fwdY] = pointAt(5, 5, 5, 0);
      expect(hitTestOverlay(d0, fwdX, fwdY)).toBe(false);
    });
  });

  // ── Unknown shapes ────────────────────────────────────────────────

  describe('unknown shape', () => {
    it('returns false for unknown, empty, or missing shape values', () => {
      const overlay = createOverlay('sphere', 5, 5);
      for (const shape of ['unknown', '', undefined, null]) {
        overlay.shape = shape;
        expect(hitTestOverlay(overlay, 5, 5)).toBe(false);
      }
    });
  });
});

// ── svgOrigin ──────────────────────────────────────────────────────
// CELL = 40px; origin maps each grid cell to its center (grid * 40 + 20).

describe('svgOrigin', () => {
  it('returns screen coordinates for the overlay origin', () => {
    const overlay = createOverlay('sphere', 3, 4);
    expect(svgOrigin(overlay)).toEqual({ x: 140, y: 180 });
  });

  it('handles negative grid coordinates', () => {
    const overlay = createOverlay('sphere', -1, 2);
    expect(svgOrigin(overlay)).toEqual({ x: -20, y: 100 });
  });

  it('returns origin at (20, 20) for grid (0, 0)', () => {
    const overlay = createOverlay('sphere', 0, 0);
    expect(svgOrigin(overlay)).toEqual({ x: 20, y: 20 });
  });

  it('returns the same origin regardless of overlay shape', () => {
    const cube = createOverlay('cube', 3, 4);
    const cone = createOverlay('cone', 3, 4);
    expect(svgOrigin(cube)).toEqual({ x: 140, y: 180 });
    expect(svgOrigin(cone)).toEqual({ x: 140, y: 180 });
  });
});
