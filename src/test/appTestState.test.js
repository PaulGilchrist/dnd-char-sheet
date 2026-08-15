// @improved-by-ai
import { describe, it, expect, beforeEach } from 'vitest';
import { mockState, dataLoaderMocks } from './appTestState.js';

describe('appTestState', () => {
  beforeEach(() => {
    mockState.campaignName = 'test-campaign';
    mockState.characters = [];

    for (const mock of Object.values(dataLoaderMocks)) {
      mock.mockReset();
    }
  });

  describe('mockState', () => {
    it('exports a shared mutable object so consumers can point App at a fixed campaign', () => {
      const reference = mockState;
      mockState.campaignName = 'shared-campaign';
      expect(reference.campaignName).toBe('shared-campaign');

      mockState.characters = [{ name: 'Aragorn' }];
      expect(reference.characters).toEqual([{ name: 'Aragorn' }]);
    });
  });

  describe('dataLoaderMocks', () => {
    it('exports one mock function per data loader used by the app', () => {
      expect(Object.keys(dataLoaderMocks).sort()).toEqual([
        'loadAbilityScores',
        'loadClassData',
        'loadEquipment',
        'loadFightingStyles',
        'loadMagicItems',
        'loadMonsters',
        'loadRaceData',
        'loadSkills',
        'loadSpells',
        'loadWildMagicSurgeTable',
      ]);
    });

    it('returns undefined by default so unstubbed loaders resolve to empty data', () => {
      for (const mock of Object.values(dataLoaderMocks)) {
        expect(mock()).toBeUndefined();
      }
    });

    it('lets each consumer stub independent return values and call history', async () => {
      dataLoaderMocks.loadClassData.mockResolvedValue([{ name: 'Fighter' }]);
      dataLoaderMocks.loadRaceData.mockResolvedValue([{ name: 'Human' }]);

      const classResult = dataLoaderMocks.loadClassData('5e');
      const raceResult = dataLoaderMocks.loadRaceData('2024');

      await expect(classResult).resolves.toEqual([{ name: 'Fighter' }]);
      await expect(raceResult).resolves.toEqual([{ name: 'Human' }]);

      expect(dataLoaderMocks.loadClassData).toHaveBeenCalledTimes(1);
      expect(dataLoaderMocks.loadRaceData).toHaveBeenCalledTimes(1);
      expect(dataLoaderMocks.loadSpells).not.toHaveBeenCalled();

      dataLoaderMocks.loadClassData.mockReset();
      expect(dataLoaderMocks.loadClassData('5e')).toBeUndefined();
      expect(dataLoaderMocks.loadRaceData).toHaveBeenCalledTimes(1);
    });

    it('supports mockImplementation for rule-set-aware loaders', async () => {
      dataLoaderMocks.loadSpells.mockImplementation((ruleset) =>
        Promise.resolve([{ name: ruleset === '2024' ? 'Fireball 2024' : 'Fireball' }]),
      );

      const classicResult = dataLoaderMocks.loadSpells('5e');
      const essentialsResult = dataLoaderMocks.loadSpells('2024');

      await expect(classicResult).resolves.toEqual([{ name: 'Fireball' }]);
      await expect(essentialsResult).resolves.toEqual([{ name: 'Fireball 2024' }]);
    });
  });
});
