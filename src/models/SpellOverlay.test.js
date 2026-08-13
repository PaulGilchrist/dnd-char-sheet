// @improved-by-ai
import { describe, it, expect } from 'vitest';
import { toGrid, createOverlay, hitTestOverlay, svgOrigin, OverlayShape, DEFAULTS } from './SpellOverlay.js';

// ── Constants ───────────────────────────────────────────────────

describe('OverlayShape', () => {
  it('exports all expected shape keys with correct string values', () => {
    expect(OverlayShape.SPHERE).toBe('sphere');
    expect(OverlayShape.CYLINDER).toBe('cylinder');
    expect(OverlayShape.CUBE).toBe('cube');
    expect(OverlayShape.CONE).toBe('cone');
    expect(OverlayShape.LINE).toBe('line');
  });
});

describe('DEFAULTS', () => {
  it('provides defaults for every OverlayShape', () => {
    for (const key of Object.values(OverlayShape)) {
      expect(DEFAULTS[key]).toBeDefined();
      expect(typeof DEFAULTS[key]).toBe('object');
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

// ── toGrid ──────────────────────────────────────────────────────

describe('toGrid', () => {
  it('converts feet to grid units by dividing by 5', () => {
    expect(toGrid(5)).toBe(1);
    expect(toGrid(10)).toBe(2);
    expect(toGrid(20)).toBe(4);
    expect(toGrid(60)).toBe(12);
  });

  it('handles edge cases', () => {
    expect(toGrid(0)).toBe(0);
    expect(toGrid(NaN)).toBeNaN();
    expect(toGrid(-10)).toBe(-2);
    expect(toGrid(2.5)).toBe(0.5);
    expect(toGrid(45)).toBe(9);
  });
});

// ── createOverlay ───────────────────────────────────────────────

describe('createOverlay', () => {
  function makeOverlay(shape, gridX, gridY, angle, params = {}) {
    return createOverlay(shape, gridX, gridY, angle, params);
  }

  it('creates an overlay with shape, position, angle, and defaults', () => {
    const overlay = makeOverlay('sphere', 3, 4);
    expect(overlay.shape).toBe('sphere');
    expect(overlay.startGridX).toBe(3);
    expect(overlay.startGridY).toBe(4);
    expect(overlay.angle).toBe(0);
    expect(overlay.radiusFt).toBe(20);
    expect(overlay.color).toBe('rgba(255,80,60,0.35)');
  });

  it('generates unique ids for each overlay', () => {
    const ids = new Set();
    for (let i = 0; i < 10; i++) {
      ids.add(makeOverlay('sphere', 0, 0).id);
    }
    expect(ids.size).toBe(10);
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

  it('accepts custom angle parameter', () => {
    const overlay = makeOverlay('sphere', 0, 0, 45);
    expect(overlay.angle).toBe(45);
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
});

// ── hitTestOverlay ──────────────────────────────────────────────

describe('hitTestOverlay', () => {
  function makeOverlay(shape, gridX, gridY, angle, params = {}) {
    return createOverlay(shape, gridX, gridY, angle, params);
  }

  // ── SPHERE ──────────────────────────────────────────────────────

  describe('SPHERE', () => {
    it('hits the center point', () => {
      const overlay = makeOverlay('sphere', 5, 5, 0, { radiusFt: 20 });
      expect(hitTestOverlay(overlay, 5, 5)).toBe(true);
    });

    it('hits points within the radius', () => {
      const overlay = makeOverlay('sphere', 5, 5, 0, { radiusFt: 20 });
      expect(hitTestOverlay(overlay, 5, 8)).toBe(true);
    });

    it('misses points outside the radius', () => {
      const overlay = makeOverlay('sphere', 5, 5, 0, { radiusFt: 20 });
      expect(hitTestOverlay(overlay, 5, 10)).toBe(false);
    });

    it('hits points exactly at the radius boundary', () => {
      // radiusFt=25 => rGrid=5 => rPixels=200.
      // Grid (10,5) is exactly 5 cells away from (5,5) => dx=200, dy=0 => dist=200=r.
      const overlay = makeOverlay('sphere', 5, 5, 0, { radiusFt: 25 });
      expect(hitTestOverlay(overlay, 10, 5)).toBe(true);
    });

    it('misses points just beyond the radius boundary', () => {
      // radiusFt=25 => rPixels=200. Grid (11,5) => dx=240 => dist=240>200.
      const overlay = makeOverlay('sphere', 5, 5, 0, { radiusFt: 25 });
      expect(hitTestOverlay(overlay, 11, 5)).toBe(false);
    });

    it('only hits the center when radiusFt=0', () => {
      const overlay = makeOverlay('sphere', 5, 5, 0, { radiusFt: 0 });
      expect(hitTestOverlay(overlay, 5, 5)).toBe(true);
      expect(hitTestOverlay(overlay, 6, 5)).toBe(false);
    });

    it('works with negative grid coordinates', () => {
      const overlay = makeOverlay('sphere', -3, -3, 0, { radiusFt: 5 });
      expect(hitTestOverlay(overlay, -3, -3)).toBe(true);
      expect(hitTestOverlay(overlay, -2, -4)).toBe(false);
    });
  });

  // ── CYLINDER (same code path as sphere) ────────────────────────

  describe('CYLINDER', () => {
    it('hits the center point', () => {
      const overlay = makeOverlay('cylinder', 5, 5, 0, { radiusFt: 20 });
      expect(hitTestOverlay(overlay, 5, 5)).toBe(true);
    });

    it('hits points within the radius', () => {
      const overlay = makeOverlay('cylinder', 5, 5, 0, { radiusFt: 20 });
      expect(hitTestOverlay(overlay, 5, 8)).toBe(true);
    });

    it('misses points outside the radius', () => {
      const overlay = makeOverlay('cylinder', 5, 5, 0, { radiusFt: 20 });
      expect(hitTestOverlay(overlay, 5, 10)).toBe(false);
    });
  });

  // ── CUBE ──────────────────────────────────────────────────────

  describe('CUBE', () => {
    it('hits the center and points within bounds', () => {
      const overlay = makeOverlay('cube', 5, 5, 0, { sizeFt: 15 });
      expect(hitTestOverlay(overlay, 5, 5)).toBe(true);
      expect(hitTestOverlay(overlay, 6, 5)).toBe(true);
    });

    it('misses points outside the cube bounds', () => {
      const overlay = makeOverlay('cube', 5, 5, 0, { sizeFt: 15 });
      expect(hitTestOverlay(overlay, 7, 5)).toBe(false);
    });

    it('hits points exactly at the cube edge boundary', () => {
      // sizeFt=20 => half=(20/5)*40/2=80. Grid (7,5) => dx=80 => rx=80=half.
      const overlay = makeOverlay('cube', 5, 5, 0, { sizeFt: 20 });
      expect(hitTestOverlay(overlay, 7, 5)).toBe(true);
    });

    it('misses points just beyond the cube edge', () => {
      // sizeFt=20 => half=80. Grid (8,5) => dx=120 => rx=120>half.
      const overlay = makeOverlay('cube', 5, 5, 0, { sizeFt: 20 });
      expect(hitTestOverlay(overlay, 8, 5)).toBe(false);
    });

    it('respects rotation', () => {
      const overlay = makeOverlay('cube', 5, 5, 90, { sizeFt: 15 });
      expect(hitTestOverlay(overlay, 6, 5)).toBe(true);
    });

    it('respects 45-degree rotation', () => {
      const overlay = makeOverlay('cube', 5, 5, 45, { sizeFt: 20 });
      expect(hitTestOverlay(overlay, 5, 6)).toBe(true);
    });

    it('only hits the center when sizeFt=0', () => {
      const overlay = makeOverlay('cube', 5, 5, 0, { sizeFt: 0 });
      expect(hitTestOverlay(overlay, 5, 5)).toBe(true);
      expect(hitTestOverlay(overlay, 6, 5)).toBe(false);
    });

    it('works with negative grid coordinates', () => {
      const overlay = makeOverlay('cube', -2, -2, 0, { sizeFt: 10 });
      expect(hitTestOverlay(overlay, -2, -2)).toBe(true);
    });
  });

  // ── CONE ──────────────────────────────────────────────────────

  describe('CONE', () => {
    it('hits the center point (origin)', () => {
      const overlay = makeOverlay('cone', 5, 5, 0, { distanceFt: 60, coneAngle: 53 });
      expect(hitTestOverlay(overlay, 5, 5)).toBe(true);
    });

    it('hits a point within distance and angle on the cone axis', () => {
      const overlay = makeOverlay('cone', 5, 5, 0, { distanceFt: 60, coneAngle: 53 });
      expect(hitTestOverlay(overlay, 8, 5)).toBe(true);
    });

    it('misses points beyond the cone distance', () => {
      const overlay = makeOverlay('cone', 5, 5, 0, { distanceFt: 60, coneAngle: 53 });
      expect(hitTestOverlay(overlay, 20, 5)).toBe(false);
    });

    it('misses points outside the cone angle', () => {
      const overlay = makeOverlay('cone', 5, 5, 0, { distanceFt: 60, coneAngle: 53 });
      expect(hitTestOverlay(overlay, 8, 8)).toBe(false);
    });

    it('respects rotation angle', () => {
      const overlay = makeOverlay('cone', 5, 5, 90, { distanceFt: 60, coneAngle: 53 });
      expect(hitTestOverlay(overlay, 5, 8)).toBe(true);
    });

    it('only hits the origin when distanceFt=0', () => {
      const overlay = makeOverlay('cone', 5, 5, 0, { distanceFt: 0, coneAngle: 53 });
      expect(hitTestOverlay(overlay, 5, 5)).toBe(true);
      expect(hitTestOverlay(overlay, 6, 5)).toBe(false);
    });
  });

  // ── LINE ──────────────────────────────────────────────────────

  describe('LINE', () => {
    it('hits the center point (origin)', () => {
      const overlay = makeOverlay('line', 5, 5, 0, { distanceFt: 60, widthFt: 5 });
      expect(hitTestOverlay(overlay, 5, 5)).toBe(true);
    });

    it('hits a point along the line at angle=0', () => {
      const overlay = makeOverlay('line', 5, 5, 0, { distanceFt: 60, widthFt: 5 });
      expect(hitTestOverlay(overlay, 8, 5)).toBe(true);
    });

    it('misses points beyond the line distance', () => {
      const overlay = makeOverlay('line', 5, 5, 0, { distanceFt: 60, widthFt: 5 });
      expect(hitTestOverlay(overlay, 20, 5)).toBe(false);
    });

    it('misses points behind the line origin', () => {
      const overlay = makeOverlay('line', 5, 5, 0, { distanceFt: 60, widthFt: 5 });
      expect(hitTestOverlay(overlay, 2, 5)).toBe(false);
    });

    it('misses points outside the line width', () => {
      const overlay = makeOverlay('line', 5, 5, 0, { distanceFt: 60, widthFt: 5 });
      expect(hitTestOverlay(overlay, 8, 6)).toBe(false);
    });

    it('respects rotation angle', () => {
      const overlay = makeOverlay('line', 5, 5, 90, { distanceFt: 60, widthFt: 5 });
      expect(hitTestOverlay(overlay, 5, 8)).toBe(true);
    });

    it('only hits the origin when widthFt=0 or distanceFt=0', () => {
      const w0 = makeOverlay('line', 5, 5, 0, { distanceFt: 60, widthFt: 0 });
      expect(hitTestOverlay(w0, 5, 5)).toBe(true);
      expect(hitTestOverlay(w0, 8, 6)).toBe(false);

      const d0 = makeOverlay('line', 5, 5, 0, { distanceFt: 0, widthFt: 5 });
      expect(hitTestOverlay(d0, 5, 5)).toBe(true);
      expect(hitTestOverlay(d0, 6, 5)).toBe(false);
    });
  });

  // ── Unknown shapes ────────────────────────────────────────────

  describe('unknown shape', () => {
    it('returns false for unknown or empty shape strings', () => {
      const overlay = createOverlay('sphere', 5, 5);
      overlay.shape = 'unknown';
      expect(hitTestOverlay(overlay, 5, 5)).toBe(false);

      overlay.shape = '';
      expect(hitTestOverlay(overlay, 5, 5)).toBe(false);
    });
  });
});

// ── svgOrigin ───────────────────────────────────────────────────

describe('svgOrigin', () => {
  it('returns screen coordinates for the overlay origin', () => {
    const overlay = createOverlay('sphere', 3, 4);
    const origin = svgOrigin(overlay);
    expect(origin).toEqual({ x: 140, y: 180 });
  });

  it('handles negative grid coordinates', () => {
    const overlay = createOverlay('sphere', -1, 2);
    expect(svgOrigin(overlay)).toEqual({ x: -20, y: 100 });
  });

  it('returns origin at (20, 20) for grid (0, 0)', () => {
    const overlay = createOverlay('sphere', 0, 0);
    expect(svgOrigin(overlay)).toEqual({ x: 20, y: 20 });
  });
});
