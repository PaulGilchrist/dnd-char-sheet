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

    it('should return null when class_levels is missing', () => {
      expect(getClassLevelData({ class: {}, level: 1 })).toBeNull();
    });

    it('should return null when class_levels is null', () => {
      expect(getClassLevelData({ class: { class_levels: null }, level: 1 })).toBeNull();
    });

    it('should return null when class_levels is undefined', () => {
      expect(getClassLevelData({ class: { class_levels: undefined }, level: 1 })).toBeNull();
    });

    it('should return null when class_levels is an empty array', () => {
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
      expect(getClassLevelData(playerStats)).toEqual(levels[1]);
    });

    it('should return the first class_level when playerStats.level is 1', () => {
      const levels = [
        { level: 1, features: ['First Level'] },
        { level: 2, features: ['Second Level'] },
      ];
      const playerStats = { class: { class_levels: levels }, level: 1 };
      expect(getClassLevelData(playerStats)).toEqual(levels[0]);
    });

    it('should return the last class_level when playerStats.level matches the highest', () => {
      const levels = [
        { level: 1, features: ['First Level'] },
        { level: 2, features: ['Second Level'] },
        { level: 20, features: ['Twentieth Level'] },
      ];
      const playerStats = { class: { class_levels: levels }, level: 20 };
      expect(getClassLevelData(playerStats)).toEqual(levels[2]);
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
      const levels = [
        { level: 1, features: ['First Level'] },
      ];
      const playerStats = { class: { class_levels: levels }, level: 0 };
      expect(getClassLevelData(playerStats)).toBeNull();
    });
  });

  describe('class_level object structure', () => {
    it('should return the full class_level object including class_specific', () => {
      const levels = [
        { level: 4, class_specific: { wild_shape_max_cr: 1 } },
      ];
      const playerStats = { class: { class_levels: levels }, level: 4 };
      const result = getClassLevelData(playerStats);
      expect(result.level).toBe(4);
      expect(result.class_specific).toEqual({ wild_shape_max_cr: 1 });
    });

    it('should return the class_level with subclass_specific', () => {
      const levels = [
        { level: 6, class_specific: { bardic_inspiration_die: 'd8' }, subclass_specific: { additional_magical_secrets_max_lvl: 2 } },
      ];
      const playerStats = { class: { class_levels: levels }, level: 6 };
      const result = getClassLevelData(playerStats);
      expect(result.level).toBe(6);
      expect(result.class_specific).toEqual({ bardic_inspiration_die: 'd8' });
      expect(result.subclass_specific).toEqual({ additional_magical_secrets_max_lvl: 2 });
    });

    it('should return the class_level with features array', () => {
      const levels = [
        { level: 1, features: [{ name: 'Rage' }, { name: 'Unarmored Defense' }] },
      ];
      const playerStats = { class: { class_levels: levels }, level: 1 };
      const result = getClassLevelData(playerStats);
      expect(result.features).toEqual([{ name: 'Rage' }, { name: 'Unarmored Defense' }]);
    });

    it('should return class_level with resource tracking fields', () => {
      const levels = [
        { level: 15, rages: 4, rage_damage_resist: true },
      ];
      const playerStats = { class: { class_levels: levels }, level: 15 };
      const result = getClassLevelData(playerStats);
      expect(result.rages).toBe(4);
      expect(result.rage_damage_resist).toBe(true);
    });
  });
});
