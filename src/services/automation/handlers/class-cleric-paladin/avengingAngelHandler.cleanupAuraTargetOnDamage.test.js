// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

import { cleanupAuraTargetOnDamage } from './avengingAngelHandler.js';
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../ui/logService.js';

const campaignName = 'test-campaign';
const playerName = 'TestPaladin';

describe('avengingAngelHandler.cleanupAuraTargetOnDamage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockAuraTargets(targets) {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'avengingAngelAuraTargets') return targets;
      return null;
    });
  }

  describe('target present in aura list', () => {
    it('should clear the entire aura targets list and log the removal', async () => {
      mockAuraTargets(['Goblin']);
      const now = Date.now();
      const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(now);

      await cleanupAuraTargetOnDamage(playerName, 'Goblin', campaignName);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        playerName,
        'avengingAngelAuraTargets',
        [],
        campaignName,
      );
      expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
        type: 'condition',
        action: 'removed',
        characterName: 'Goblin',
        condition: 'Frightened',
        reason: 'took damage (Frightful Aura)',
        timestamp: now,
      }));

      dateSpy.mockRestore();
    });

    it('should remove only the damaged target and preserve other aura targets', async () => {
      mockAuraTargets(['Goblin1', 'Goblin2', 'Goblin3']);

      await cleanupAuraTargetOnDamage(playerName, 'Goblin2', campaignName);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        playerName,
        'avengingAngelAuraTargets',
        ['Goblin1', 'Goblin3'],
        campaignName,
      );
      expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
        type: 'condition',
        action: 'removed',
        characterName: 'Goblin2',
        condition: 'Frightened',
        reason: 'took damage (Frightful Aura)',
      }));
    });

    it('should handle removing the last target from a multi-target list', async () => {
      mockAuraTargets(['Goblin']);

      await cleanupAuraTargetOnDamage(playerName, 'Goblin', campaignName);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        playerName,
        'avengingAngelAuraTargets',
        [],
        campaignName,
      );
    });
  });

  describe('target not present in aura list', () => {
    it('should be a no-op when target is absent from the list', async () => {
      mockAuraTargets(['Goblin1', 'Goblin3']);

      await cleanupAuraTargetOnDamage(playerName, 'Goblin2', campaignName);

      expect(setRuntimeValue).not.toHaveBeenCalled();
      expect(addEntry).not.toHaveBeenCalled();
    });

    it('should be a no-op when aura targets list is empty', async () => {
      mockAuraTargets([]);

      await cleanupAuraTargetOnDamage(playerName, 'Goblin', campaignName);

      expect(setRuntimeValue).not.toHaveBeenCalled();
      expect(addEntry).not.toHaveBeenCalled();
    });

    it('should be a no-op when aura targets is undefined', async () => {
      getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'avengingAngelAuraTargets') return undefined;
        return null;
      });

      await cleanupAuraTargetOnDamage(playerName, 'Goblin', campaignName);

      expect(setRuntimeValue).not.toHaveBeenCalled();
      expect(addEntry).not.toHaveBeenCalled();
    });

    it('should be a no-op when aura targets is null', async () => {
      getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'avengingAngelAuraTargets') return null;
        return null;
      });

      await cleanupAuraTargetOnDamage(playerName, 'Goblin', campaignName);

      expect(setRuntimeValue).not.toHaveBeenCalled();
      expect(addEntry).not.toHaveBeenCalled();
    });
  });

  describe('addEntry rejection handling', () => {
    it('should still update aura targets when addEntry rejects', async () => {
      mockAuraTargets(['Goblin']);
      addEntry.mockRejectedValue(new Error('log write failed'));
      const now = Date.now();
      const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(now);

      await cleanupAuraTargetOnDamage(playerName, 'Goblin', campaignName);

      expect(setRuntimeValue).toHaveBeenCalledWith(
        playerName,
        'avengingAngelAuraTargets',
        [],
        campaignName,
      );
      expect(addEntry).toHaveBeenCalled();

      dateSpy.mockRestore();
    });
  });
});
