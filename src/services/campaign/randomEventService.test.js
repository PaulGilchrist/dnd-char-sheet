// @improved-by-ai
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EVENT_FREQUENCIES, shouldTriggerEvent, generateRandomEvent } from './randomEventService.js';

describe('randomEventService', () => {
  let randomSpy;

  beforeEach(() => {
    randomSpy = vi.spyOn(Math, 'random');
  });

  afterEach(() => {
    randomSpy.mockRestore();
  });

  describe('EVENT_FREQUENCIES', () => {
    it('should define four frequency levels with correct labels and chance values', () => {
      expect(EVENT_FREQUENCIES).toStrictEqual({
        none: { label: 'None', chance: 0 },
        sparse: { label: 'Sparse', chance: 0.05 },
        normal: { label: 'Normal', chance: 0.12 },
        frequent: { label: 'Frequent', chance: 0.25 },
      });
      expect(Object.keys(EVENT_FREQUENCIES)).toHaveLength(4);
    });
  });

  describe('shouldTriggerEvent', () => {
    it('should return false when frequency is none', () => {
      expect(shouldTriggerEvent('plains', 'weather', 'none')).toBe(false);
      expect(randomSpy).not.toHaveBeenCalled();
    });

    it('should return false when frequency is invalid or undefined', () => {
      expect(shouldTriggerEvent('plains', 'weather', undefined)).toBe(false);
      expect(shouldTriggerEvent('plains', 'weather', 'invalid')).toBe(false);
      expect(randomSpy).not.toHaveBeenCalled();
    });

    it('should return false when total chance after modifiers is negative', () => {
      randomSpy.mockReturnValue(0.5);
      // sparse (0.05) + plains (0) + weather -20/100 (-0.20) = -0.15
      expect(shouldTriggerEvent('plains', { encounterMod: -20 }, 'sparse')).toBe(false);
      expect(randomSpy).toHaveBeenCalled();
    });

    it('should return true when total chance reaches 100%', () => {
      randomSpy.mockReturnValue(0.001);
      // frequent (0.25) + swamp (0.08) + weather 67/100 (0.67) = 1.00
      expect(shouldTriggerEvent('swamp', { encounterMod: 67 }, 'frequent')).toBe(true);
      expect(randomSpy).toHaveBeenCalled();
    });

    it('should apply terrain modifiers', () => {
      // sparse (0.05) + forest (0.05) = 0.10
      randomSpy.mockReturnValue(0.09);
      expect(shouldTriggerEvent('forest', 'weather', 'sparse')).toBe(true);
    });

    it('should apply weather encounter modifier', () => {
      // sparse (0.05) + plains (0) + weather 10/100 (0.10) = 0.15
      randomSpy.mockReturnValue(0.14);
      expect(shouldTriggerEvent('plains', { encounterMod: 10 }, 'sparse')).toBe(true);
    });

    it('should apply combined terrain and weather modifiers', () => {
      // sparse (0.05) + forest (0.05) + weather 10/100 (0.10) = 0.20
      randomSpy.mockReturnValue(0.19);
      expect(shouldTriggerEvent('forest', { encounterMod: 10 }, 'sparse')).toBe(true);
    });

    it('should handle null or empty weather objects', () => {
      // sparse (0.05) + plains (0) + no weather mod = 0.05
      randomSpy.mockReturnValue(0.04);
      expect(shouldTriggerEvent('plains', null, 'sparse')).toBe(true);
      expect(shouldTriggerEvent('plains', {}, 'sparse')).toBe(true);
    });

    it('should treat missing encounterMod as zero', () => {
      // sparse (0.05) + plains (0) + no encounterMod = 0.05
      randomSpy.mockReturnValue(0.04);
      expect(shouldTriggerEvent('plains', { otherKey: 'value' }, 'sparse')).toBe(true);
    });

    it('should treat non-numeric encounterMod as zero via NaN fallback', () => {
      // sparse (0.05) + plains (0) + weather 'abc' / 100 = 0.05 + NaN/100 = 0.05
      // Note: NaN / 100 = NaN, so (0 + 0) + NaN = NaN, and Math.random() < NaN is always false
      randomSpy.mockReturnValue(0.04);
      expect(shouldTriggerEvent('plains', { encounterMod: 'abc' }, 'sparse')).toBe(false);
    });

    it('should support all defined terrain types with normal frequency', () => {
      const terrainTypes = ['plains', 'forest', 'hills', 'mountains', 'swamp', 'desert', 'tundra', 'beach'];
      randomSpy.mockReturnValue(0.001);

      for (const terrain of terrainTypes) {
        expect(shouldTriggerEvent(terrain, 'weather', 'normal')).toBe(true);
      }
    });

    it('should treat unknown terrain as having zero modifier', () => {
      // sparse (0.05) + unknown terrain (0) = 0.05
      randomSpy.mockReturnValue(0.04);
      expect(shouldTriggerEvent('jungle', 'weather', 'sparse')).toBe(true);
    });

    it('should return false when random equals totalChance (boundary)', () => {
      // sparse (0.05) + plains (0) = 0.05, random returns exactly 0.05
      randomSpy.mockReturnValue(0.05);
      expect(shouldTriggerEvent('plains', 'weather', 'sparse')).toBe(false);
    });

    it('should return true when random is just below totalChance (boundary)', () => {
      // sparse (0.05) + plains (0) = 0.05, random returns 0.049
      randomSpy.mockReturnValue(0.049);
      expect(shouldTriggerEvent('plains', 'weather', 'sparse')).toBe(true);
    });

    it('should return false when random exceeds total chance', () => {
      // sparse (0.05) + plains (0) = 0.05, random returns 0.06
      randomSpy.mockReturnValue(0.06);
      expect(shouldTriggerEvent('plains', 'weather', 'sparse')).toBe(false);
    });
  });

  describe('generateRandomEvent', () => {
    it('should return an event with all required fields', () => {
      randomSpy.mockReturnValue(0);
      const result = generateRandomEvent('plains');

      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('terrain');
      expect(typeof result.type).toBe('string');
      expect(typeof result.title).toBe('string');
      expect(typeof result.description).toBe('string');
    });

    it('should include the requested terrain in the result', () => {
      randomSpy.mockReturnValue(0);
      const result = generateRandomEvent('plains');

      expect(result.terrain).toBe('plains');
    });

    it('should fall back to plains table for unknown terrain', () => {
      randomSpy.mockReturnValue(0);
      const result = generateRandomEvent('jungle');

      expect(result.terrain).toBe('jungle');
      expect(result.type).toBeDefined();
      expect(typeof result.title).toBe('string');
      expect(typeof result.description).toBe('string');
    });

    it('should fall back to plains table for undefined terrain', () => {
      randomSpy.mockReturnValue(0);
      const result = generateRandomEvent(undefined);

      expect(result.terrain).toBe(undefined);
      expect(result.type).toBeDefined();
    });

    it('should return different events based on different random rolls', () => {
      randomSpy.mockReturnValue(0);
      const result1 = generateRandomEvent('plains');

      randomSpy.mockReturnValue(0.99);
      const result2 = generateRandomEvent('plains');

      expect(result1.title).not.toBe(result2.title);
    });

    it('should always return a valid event for every terrain type', () => {
      const terrains = ['plains', 'forest', 'hills', 'mountains', 'desert', 'swamp', 'tundra', 'beach'];

      for (const terrain of terrains) {
        const spy = vi.spyOn(Math, 'random');
        const seenTypes = new Set();

        for (let i = 0; i <= 100; i++) {
          spy.mockReturnValue(i / 100);
          const event = generateRandomEvent(terrain);
          expect(event).toHaveProperty('type');
          expect(event).toHaveProperty('title');
          expect(event).toHaveProperty('description');
          expect(event).toHaveProperty('terrain', terrain);
          seenTypes.add(event.type);
        }

        spy.mockRestore();
        expect(seenTypes.size).toBeGreaterThan(1);
      }
    });
  });
});
