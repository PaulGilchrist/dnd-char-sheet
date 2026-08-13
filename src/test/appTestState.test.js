import { describe, it, expect, beforeEach } from 'vitest';
import { mockState, dataLoaderMocks } from './appTestState.js';

describe('appTestState', () => {
  beforeEach(() => {
    for (const key of Object.keys(dataLoaderMocks)) {
      dataLoaderMocks[key].mockReset();
    }
  });

  describe('mockState', () => {
    it('should export a plain object with campaignName and characters properties', () => {
      expect(mockState).toBeTypeOf('object');
      expect(mockState).toHaveProperty('campaignName');
      expect(mockState).toHaveProperty('characters');
    });

    it('should have campaignName set to "test-campaign"', () => {
      expect(mockState.campaignName).toBe('test-campaign');
    });

    it('should have characters as an empty array', () => {
      expect(Array.isArray(mockState.characters)).toBe(true);
      expect(mockState.characters).toHaveLength(0);
    });

    it('should allow mutating campaignName', () => {
      const original = mockState.campaignName;
      mockState.campaignName = 'new-campaign';
      expect(mockState.campaignName).toBe('new-campaign');
      mockState.campaignName = original;
    });

    it('should allow mutating characters array', () => {
      const original = mockState.characters;
      mockState.characters = [{ name: 'Test' }];
      expect(mockState.characters).toHaveLength(1);
      expect(mockState.characters[0].name).toBe('Test');
      mockState.characters = original;
    });
  });

  describe('dataLoaderMocks', () => {
    const expectedKeys = [
      'loadAbilityScores',
      'loadClassData',
      'loadEquipment',
      'loadMagicItems',
      'loadMonsters',
      'loadFightingStyles',
      'loadWildMagicSurgeTable',
      'loadSkills',
      'loadRaceData',
      'loadSpells',
    ];

    it('should export exactly the expected set of mock functions', () => {
      const keys = Object.keys(dataLoaderMocks);
      expect(keys).toHaveLength(expectedKeys.length);
      expect(keys).toEqual(expect.arrayContaining(expectedKeys));
    });

    it('should export vi.fn() instances for each key', () => {
      for (const key of expectedKeys) {
        expect(dataLoaderMocks[key]).toBeTypeOf('function');
      }
    });

    it('should return undefined by default when called', () => {
      for (const key of expectedKeys) {
        expect(dataLoaderMocks[key]()).toBeUndefined();
      }
    });

    it('should support mockReturnValue and mockResolvedValue configurations', () => {
      dataLoaderMocks.loadClassData.mockReturnValue(['fighter', 'wizard']);
      expect(dataLoaderMocks.loadClassData()).toEqual(['fighter', 'wizard']);

      dataLoaderMocks.loadSpells.mockResolvedValue({ spells: [] });
      expect(dataLoaderMocks.loadSpells()).resolves.toEqual({ spells: [] });
    });

    it('should track call arguments and call count independently per mock', () => {
      dataLoaderMocks.loadRaceData('5e');
      dataLoaderMocks.loadRaceData('2024');

      expect(dataLoaderMocks.loadRaceData).toHaveBeenCalledTimes(2);
      expect(dataLoaderMocks.loadRaceData).toHaveBeenNthCalledWith(1, '5e');
      expect(dataLoaderMocks.loadRaceData).toHaveBeenNthCalledWith(2, '2024');
    });

    it('should support mockClear to reset call history without affecting return values', () => {
      dataLoaderMocks.loadAbilityScores.mockReturnValue('score');
      dataLoaderMocks.loadAbilityScores();
      dataLoaderMocks.loadAbilityScores();
      expect(dataLoaderMocks.loadAbilityScores).toHaveBeenCalledTimes(2);

      dataLoaderMocks.loadAbilityScores.mockClear();
      expect(dataLoaderMocks.loadAbilityScores).toHaveBeenCalledTimes(0);

      // Return value configuration should persist after clear
      expect(dataLoaderMocks.loadAbilityScores()).toBe('score');
    });

    it('should support mockReset to clear both call history and return value configuration', () => {
      dataLoaderMocks.loadEquipment.mockReturnValue('equipment');
      dataLoaderMocks.loadEquipment();
      expect(dataLoaderMocks.loadEquipment).toHaveBeenCalledTimes(1);

      dataLoaderMocks.loadEquipment.mockReset();
      expect(dataLoaderMocks.loadEquipment).toHaveBeenCalledTimes(0);
      expect(dataLoaderMocks.loadEquipment()).toBeUndefined();
    });

    it('should support mockImplementation for custom behavior', () => {
      dataLoaderMocks.loadMonsters.mockImplementation((filter) => [
        { name: 'Goblin', ...filter },
      ]);
      expect(dataLoaderMocks.loadMonsters({ cr: 0.25 })).toEqual([{ name: 'Goblin', cr: 0.25 }]);
    });
  });
});
