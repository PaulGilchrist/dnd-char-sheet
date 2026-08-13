// @improved-by-ai
import { describe, it, expect } from 'vitest';
import { getClassLevelData } from './getClassLevelData.js';

describe('getClassLevelData', () => {
  describe('null / missing inputs', () => {
    it('should return null when playerStats is null', () => {
      expect(getClassLevelData(null)).toBeNull();
    });

    it('should return null when playerStats is undefined', () => {
      expect(getClassLevelData(undefined)).toBeNull();
    });

    it('should return null when playerStats.class is missing', () => {
      expect(getClassLevelData({ level: 1 })).toBeNull();
    });

    it('should return null when playerStats.class is null', () => {
      expect(getClassLevelData({ class: null, level: 1 })).toBeNull();
    });

    it('should return null when class_levels is null, undefined, or empty', () => {
      expect(getClassLevelData({ class: { class_levels: null }, level: 1 })).toBeNull();
      expect(getClassLevelData({ class: { class_levels: undefined }, level: 1 })).toBeNull();
      expect(getClassLevelData({ class: { class_levels: [] }, level: 1 })).toBeNull();
    });
  });

  describe('level matching', () => {
    it('should return the class_level matching playerStats.level', () => {
      const levels = [
        { level: 1, features: ['First Level'] },
        { level: 3, features: ['Third Level'] },
        { level: 5, features: ['Fifth Level'] },
      ];
      const playerStats = { class: { class_levels: levels }, level: 3 };
      const result = getClassLevelData(playerStats);
      expect(result).not.toBeNull();
      expect(result.level).toBe(3);
      expect(result.features).toEqual(['Third Level']);
    });

    it('should return the first class_level when playerStats.level matches it', () => {
      const levels = [
        { level: 1, features: ['First Level'] },
        { level: 2, features: ['Second Level'] },
      ];
      const playerStats = { class: { class_levels: levels }, level: 1 };
      const result = getClassLevelData(playerStats);
      expect(result).not.toBeNull();
      expect(result.level).toBe(1);
    });

    it('should return null when playerStats.level does not match any class_level', () => {
      const levels = [
        { level: 1, features: ['First Level'] },
        { level: 3, features: ['Third Level'] },
      ];
      const playerStats = { class: { class_levels: levels }, level: 5 };
      expect(getClassLevelData(playerStats)).toBeNull();
    });

    it('should return null when playerStats.level is 0 and no class_level has level 0', () => {
      const levels = [{ level: 1 }];
      const playerStats = { class: { class_levels: levels }, level: 0 };
      expect(getClassLevelData(playerStats)).toBeNull();
    });

    it('should return null when playerStats.level is negative', () => {
      const levels = [{ level: 1 }];
      const playerStats = { class: { class_levels: levels }, level: -1 };
      expect(getClassLevelData(playerStats)).toBeNull();
    });

    it('should return null when class_levels entries lack a level property', () => {
      const levels = [{ features: ['No level entry'] }];
      const playerStats = { class: { class_levels: levels }, level: 1 };
      expect(getClassLevelData(playerStats)).toBeNull();
    });
  });

  describe('returned object structure', () => {
    it('should return the full class_level object with all properties', () => {
      const levels = [
        {
          level: 4,
          features: [{ name: 'Wild Shape' }],
          class_specific: { wild_shape_max_cr: 1 },
          subclass_specific: { extra_feature: true },
          rages: 2,
          rage_damage_resist: true,
        },
      ];
      const playerStats = { class: { class_levels: levels }, level: 4 };
      const result = getClassLevelData(playerStats);

      expect(result).not.toBeNull();
      expect(result.level).toBe(4);
      expect(result.features).toEqual([{ name: 'Wild Shape' }]);
      expect(result.class_specific).toEqual({ wild_shape_max_cr: 1 });
      expect(result.subclass_specific).toEqual({ extra_feature: true });
      expect(result.rages).toBe(2);
      expect(result.rage_damage_resist).toBe(true);
    });
  });
});
