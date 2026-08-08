import { describe, it, expect, beforeEach } from 'vitest';
import { mockState, dataLoaderMocks } from './appTestState.js';

describe('appTestState', () => {
  beforeEach(() => {
    for (const key of Object.keys(dataLoaderMocks)) {
      dataLoaderMocks[key].mockClear();
    }
  });

  describe('mockState', () => {
    it('should export mockState with campaignName set to test-campaign', () => {
      expect(mockState).toHaveProperty('campaignName', 'test-campaign');
    });

    it('should export mockState with characters as an empty array', () => {
      expect(mockState).toHaveProperty('characters');
      expect(Array.isArray(mockState.characters)).toBe(true);
      expect(mockState.characters.length).toBe(0);
    });

    it('should not have extra properties beyond campaignName and characters', () => {
      const keys = Object.keys(mockState);
      expect(keys).toEqual(['campaignName', 'characters']);
    });
  });

  describe('dataLoaderMocks', () => {
    const expectedKeys = [
      'loadAbilityScores',
      'loadClassData',
      'loadEquipment',
      'loadMagicItems',
      'loadRaceData',
      'loadSpells',
    ];

    it('should export all expected mock function keys', () => {
      const keys = Object.keys(dataLoaderMocks);
      for (const key of expectedKeys) {
        expect(keys).toContain(key);
      }
    });

    it('should not have extra keys beyond the expected ones', () => {
      const keys = Object.keys(dataLoaderMocks);
      for (const key of keys) {
        expect(expectedKeys).toContain(key);
      }
    });

    it('should export vi.fn() instances for each key', () => {
      for (const key of expectedKeys) {
        expect(dataLoaderMocks[key]).toBeTypeOf('function');
      }
    });

    it('should allow calling each mock function without error', () => {
      for (const key of expectedKeys) {
        expect(() => dataLoaderMocks[key]()).not.toThrow();
      }
    });

    it('should track call counts for each mock', () => {
      for (const key of expectedKeys) {
        dataLoaderMocks[key]();
        dataLoaderMocks[key]();
        expect(dataLoaderMocks[key].mock.calls.length).toBe(2);
      }
    });

    it('should allow mocking return values per key', () => {
      dataLoaderMocks.loadClassData.mockReturnValue(['fighter', 'wizard']);
      expect(dataLoaderMocks.loadClassData()).toEqual(['fighter', 'wizard']);

      dataLoaderMocks.loadSpells.mockResolvedValue({ spells: [] });
      expect(dataLoaderMocks.loadSpells()).resolves.toEqual({ spells: [] });
    });

    it('should reset mock call history when reset is called', () => {
      dataLoaderMocks.loadRaceData('5e');
      expect(dataLoaderMocks.loadRaceData.mock.calls.length).toBe(1);
      dataLoaderMocks.loadRaceData.mockClear();
      expect(dataLoaderMocks.loadRaceData.mock.calls.length).toBe(0);
    });
  });
});
