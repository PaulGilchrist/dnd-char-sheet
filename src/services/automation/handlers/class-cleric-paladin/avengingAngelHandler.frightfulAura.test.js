import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../rules/effects/expirations.js', () => ({
  addExpiration: vi.fn(),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(),
}));

vi.mock('../../../dice/diceRoller.js', () => ({
  rollD20: vi.fn(),
}));

vi.mock('../../../shared/abilityLookup.js', () => ({
  getAbilityModifier: vi.fn(),
}));

vi.mock('../../../combat/conditions/savePromptService.js', () => ({
  sendSaveResult: vi.fn(),
}));

vi.mock('../../../ui/utils.js', () => ({
  default: {
    guid: vi.fn(),
    getName: vi.fn((n) => n),
  },
}));

vi.mock('../../../ui/storage.js', () => ({
  default: {
    set: vi.fn(),
  },
}));

vi.mock('../../../rules/combat/rangeCheck.js', () => ({
  isWithinRange: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../../hooks/useAllySelection.js', () => ({
  getAllyList: vi.fn().mockReturnValue([]),
}));

vi.mock('../../../automation/common/savePrompt.js', () => ({
  createSaveListener: vi.fn().mockReturnValue({
    promptId: 'test-prompt-id',
    promise: Promise.resolve({ success: false, roll: 12, total: 15 }),
  }),
  buildSaveDc: vi.fn().mockReturnValue(14),
}));

import { handle } from './avengingAngelHandler.js';
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../ui/logService.js';
import { addExpiration } from '../../../rules/effects/expirations.js';
import { getCombatContext } from '../../../rules/combat/damageUtils.js';
import { rollD20 } from '../../../dice/diceRoller.js';
import { getAbilityModifier } from '../../../shared/abilityLookup.js';
import { sendSaveResult } from '../../../combat/conditions/savePromptService.js';
import utils from '../../../ui/utils.js';
import { isWithinRange } from '../../../rules/combat/rangeCheck.js';
import { getAllyList } from '../../../../hooks/useAllySelection.js';
import { createSaveListener } from '../../../automation/common/savePrompt.js';

const campaignName = 'test-campaign';

function makePlayerStats(overrides = {}) {
  return {
    name: 'TestPaladin',
    level: 7,
    proficiency: 3,
    abilities: [{ name: 'Charisma', bonus: 3 }],
    ...overrides,
  };
}

function makeAction(automation = {}) {
  return {
    name: 'Avenging Angel',
    automation: { type: 'avenging_angel', flySpeed: 60, hover: false, ...automation },
  };
}

describe('avengingAngelHandler.handle - frightfulAura', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAllyList.mockReturnValue([]);
    isWithinRange.mockResolvedValue(true);
  });

  describe('ally filtering', () => {
    it('should skip creatures in the ally list', async () => {
      getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'avengingAngelActive') return false;
        if (key === 'activeBuffs') return [];
        return null;
      });
      getAllyList.mockReturnValue(['FriendlyNPC']);
      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'FriendlyNPC', type: 'npc', saveBonuses: { wis: 0 }, conditions: [] },
          { name: 'EnemyNPC', type: 'npc', saveBonuses: { wis: 0 }, conditions: [] },
        ],
      });
      rollD20.mockReturnValue(1);
      getAbilityModifier.mockReturnValue(3);
      utils.guid.mockReturnValue('test-guid');

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(sendSaveResult).not.toHaveBeenCalledWith(campaignName, 'FriendlyNPC', expect.anything());
      expect(sendSaveResult).toHaveBeenCalledWith(campaignName, 'EnemyNPC', expect.anything());
    });
  });

  describe('range filtering', () => {
    it('should skip creatures beyond 30 ft aura range', async () => {
      getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'avengingAngelActive') return false;
        if (key === 'activeBuffs') return [];
        return null;
      });
      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'CloseEnemy', type: 'npc', saveBonuses: { wis: 0 }, conditions: [] },
          { name: 'FarEnemy', type: 'npc', saveBonuses: { wis: 0 }, conditions: [] },
        ],
      });
      isWithinRange.mockImplementation(async (source, target) => target === 'CloseEnemy');
      rollD20.mockReturnValue(1);
      getAbilityModifier.mockReturnValue(3);
      utils.guid.mockReturnValue('test-guid');

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(sendSaveResult).toHaveBeenCalledWith(campaignName, 'CloseEnemy', expect.anything());
      expect(sendSaveResult).not.toHaveBeenCalledWith(campaignName, 'FarEnemy', expect.anything());
    });

    it('should skip creatures at the edge if out of range', async () => {
      getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'avengingAngelActive') return false;
        if (key === 'activeBuffs') return [];
        return null;
      });
      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'Goblin', type: 'npc', saveBonuses: { wis: 0 }, conditions: [] },
        ],
      });
      isWithinRange.mockResolvedValue(false);
      rollD20.mockReturnValue(20);
      getAbilityModifier.mockReturnValue(3);
      utils.guid.mockReturnValue('test-guid');

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(sendSaveResult).not.toHaveBeenCalled();
      expect(addExpiration).not.toHaveBeenCalled();
    });
  });

  describe('NPC handling', () => {
    it('should apply frightened and addExpiration when NPC fails save', async () => {
      getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'avengingAngelActive') return false;
        if (key === 'activeBuffs') return [];
        return null;
      });
      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'Goblin', type: 'npc', saveBonuses: { wis: 2 }, conditions: [] },
        ],
      });
      rollD20.mockReturnValue(5);
      getAbilityModifier.mockReturnValue(3);
      utils.guid.mockReturnValue('test-guid');

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      // saveDc = 8 + 3 + 3 = 14, roll 5 + 2 = 7 < 14 = fail
      expect(sendSaveResult).toHaveBeenCalledWith(campaignName, 'Goblin', expect.objectContaining({
        success: false,
        roll: 5,
        saveBonus: 2,
      }));
      expect(addExpiration).toHaveBeenCalledWith(
        'TestPaladin',
        'Goblin',
        expect.any(Array),
        campaignName,
      );
    });

    it('should send save result but not apply frightened when NPC succeeds', async () => {
      getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'avengingAngelActive') return false;
        if (key === 'activeBuffs') return [];
        return null;
      });
      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'Goblin', type: 'npc', saveBonuses: { wis: 20 }, conditions: [] },
        ],
      });
      rollD20.mockReturnValue(1);
      getAbilityModifier.mockReturnValue(3);
      utils.guid.mockReturnValue('test-guid');

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      // saveDc = 8 + 3 + 3 = 14, roll 1 + 20 = 21 >= 14 = success
      expect(sendSaveResult).toHaveBeenCalledWith(campaignName, 'Goblin', expect.objectContaining({
        success: true,
      }));
      expect(addExpiration).not.toHaveBeenCalled();
    });

    it('should handle missing saveBonuses defaulting to 0', async () => {
      getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'avengingAngelActive') return false;
        if (key === 'activeBuffs') return [];
        return null;
      });

      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'Goblin', type: 'npc', conditions: [] },
        ],
      });
      rollD20.mockReturnValue(1);
      getAbilityModifier.mockReturnValue(3);
      utils.guid.mockReturnValue('test-guid');

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      // saveDc = 8 + 3 + 3 = 14, roll 1 + 0 = 1 < 14 = fail
      expect(sendSaveResult).toHaveBeenCalledWith(campaignName, 'Goblin', expect.objectContaining({
        success: false,
        saveBonus: 0,
      }));
    });
  });

  describe('player creature handling', () => {
    it('should use createSaveListener for player-type creatures', async () => {
      getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'avengingAngelActive') return false;
        if (key === 'activeBuffs') return [];
        return null;
      });
      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'EnemyPlayer', type: 'player' },
        ],
      });
      rollD20.mockReturnValue(20);
      getAbilityModifier.mockReturnValue(3);
      utils.guid.mockReturnValue('test-guid');

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(createSaveListener).toHaveBeenCalledWith(campaignName, expect.objectContaining({
        targetName: 'EnemyPlayer',
        saveType: 'WIS',
        saveDc: 14,
        dcSuccess: false,
      }));
      expect(sendSaveResult).not.toHaveBeenCalled();
    });

    it('should apply condition and add to aura targets when player fails save', async () => {
      getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'avengingAngelActive') return false;
        if (key === 'activeBuffs') return [];
        return null;
      });
      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'EnemyPlayer', type: 'player' },
        ],
      });
      rollD20.mockReturnValue(20);
      getAbilityModifier.mockReturnValue(3);
      utils.guid.mockReturnValue('test-guid');

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      // Wait for the async save result handler
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(addExpiration).toHaveBeenCalledWith(
        'TestPaladin',
        'EnemyPlayer',
        expect.any(Array),
        campaignName,
      );
      expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
        type: 'save_result',
        targetName: 'EnemyPlayer',
        success: false,
      }));
    });
  });

  describe('storage', () => {
    it('should store only failed NPCs, not successful NPCs or allies', async () => {
      getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'avengingAngelActive') return false;
        if (key === 'activeBuffs') return [];
        return null;
      });
      getAllyList.mockReturnValue(['Ally']);
      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'Goblin1', type: 'npc', saveBonuses: { wis: 0 }, conditions: [] },
          { name: 'Goblin2', type: 'npc', saveBonuses: { wis: 20 }, conditions: [] },
          { name: 'Ally', type: 'npc', conditions: [] },
        ],
      });
      rollD20.mockReturnValue(1);
      getAbilityModifier.mockReturnValue(3);
      utils.guid.mockReturnValue('test-guid');

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      // Goblin1 fails (1+0 < 14), Goblin2 succeeds (1+20 >= 14), Ally is in ally list (skipped)
      expect(setRuntimeValue).toHaveBeenCalledWith('TestPaladin', 'avengingAngelAuraTargets', ['Goblin1'], campaignName);
    });
  });

  describe('self skipping', () => {
    it('should skip creature that matches the player name', async () => {
      getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'avengingAngelActive') return false;
        if (key === 'activeBuffs') return [];
        return null;
      });
      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'TestPaladin', type: 'npc', saveBonuses: { wis: 0 }, conditions: [] },
          { name: 'Goblin', type: 'npc', saveBonuses: { wis: 0 }, conditions: [] },
        ],
      });
      rollD20.mockReturnValue(1);
      getAbilityModifier.mockReturnValue(3);
      utils.guid.mockReturnValue('test-guid');

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(sendSaveResult).not.toHaveBeenCalledWith(campaignName, 'TestPaladin', expect.anything());
      expect(sendSaveResult).toHaveBeenCalledWith(campaignName, 'Goblin', expect.anything());
    });
  });

  describe('player save success', () => {
    it('should log save_result entry when player succeeds on WIS save', async () => {
      getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'avengingAngelActive') return false;
        if (key === 'activeBuffs') return [];
        return null;
      });
      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'EnemyPlayer', type: 'player' },
        ],
      });
      rollD20.mockReturnValue(20);
      getAbilityModifier.mockReturnValue(3);
      utils.guid.mockReturnValue('test-guid');

      const successResult = { success: true, roll: 15, total: 18 };
      vi.mocked(createSaveListener).mockReturnValue({
        promptId: 'test-prompt-id',
        promise: Promise.resolve(successResult),
      });

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(createSaveListener).toHaveBeenCalledWith(campaignName, expect.objectContaining({
        targetName: 'EnemyPlayer',
        saveType: 'WIS',
        saveDc: 14,
        dcSuccess: false,
      }));
      expect(sendSaveResult).not.toHaveBeenCalled();
      expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
        type: 'save_result',
        targetName: 'EnemyPlayer',
        success: true,
        saveType: 'WIS',
        saveDc: 14,
      }));
      expect(addExpiration).not.toHaveBeenCalled();
    });
  });

  describe('player save with addEntry rejection', () => {
    it('should handle addEntry rejection in player fail save path', async () => {
      getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'avengingAngelActive') return false;
        if (key === 'activeBuffs') return [];
        return null;
      });
      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'EnemyPlayer', type: 'player' },
        ],
      });
      rollD20.mockReturnValue(20);
      getAbilityModifier.mockReturnValue(3);
      utils.guid.mockReturnValue('test-guid');

      vi.mocked(createSaveListener).mockReturnValue({
        promptId: 'test-prompt-id',
        promise: Promise.resolve({ success: false, roll: 5, total: 8 }),
      });
      addEntry.mockRejectedValue(new Error('save entry error'));

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(addEntry).toHaveBeenCalled();
    });

    it('should handle addEntry rejection in player success save path', async () => {
      getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'avengingAngelActive') return false;
        if (key === 'activeBuffs') return [];
        return null;
      });
      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'EnemyPlayer', type: 'player' },
        ],
      });
      rollD20.mockReturnValue(20);
      getAbilityModifier.mockReturnValue(3);
      utils.guid.mockReturnValue('test-guid');

      vi.mocked(createSaveListener).mockReturnValue({
        promptId: 'test-prompt-id',
        promise: Promise.resolve({ success: true, roll: 15, total: 18 }),
      });
      addEntry.mockRejectedValue(new Error('save entry error'));

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(addEntry).toHaveBeenCalled();
    });
  });

  describe('applyFrightenedToCreature conditions iteration', () => {
    it('should iterate conditions array when checking for duplicate frightened', async () => {
      getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'avengingAngelActive') return false;
        if (key === 'activeBuffs') return [];
        if (key === 'activeConditions') return ['frightened', 'blinded'];
        return null;
      });
      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'Goblin', type: 'npc', saveBonuses: { wis: 0 }, conditions: [] },
        ],
      });
      rollD20.mockReturnValue(1);
      getAbilityModifier.mockReturnValue(3);
      utils.guid.mockReturnValue('test-guid');

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(sendSaveResult).toHaveBeenCalledWith(campaignName, 'Goblin', expect.objectContaining({
        success: false,
      }));
      expect(addExpiration).toHaveBeenCalledWith(
        'TestPaladin',
        'Goblin',
        expect.any(Array),
        campaignName,
      );
    });
  });

  describe('player save promise rejection', () => {
    it('should handle createSaveListener promise rejection', async () => {
      getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'avengingAngelActive') return false;
        if (key === 'activeBuffs') return [];
        return null;
      });
      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'EnemyPlayer', type: 'player' },
        ],
      });
      rollD20.mockReturnValue(20);
      getAbilityModifier.mockReturnValue(3);
      utils.guid.mockReturnValue('test-guid');

      vi.mocked(createSaveListener).mockReturnValue({
        promptId: 'test-prompt-id',
        promise: Promise.reject(new Error('save listener error')),
      });

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should handle then callback throwing error', async () => {
      getRuntimeValue.mockImplementation((name, key) => {
        if (key === 'avengingAngelActive') return false;
        if (key === 'activeBuffs') return [];
        if (key === 'avengingAngelAuraTargets') return [];
        return null;
      });
      getCombatContext.mockResolvedValue({
        creatures: [
          { name: 'EnemyPlayer', type: 'player' },
        ],
      });
      rollD20.mockReturnValue(20);
      getAbilityModifier.mockReturnValue(3);
      utils.guid.mockReturnValue('test-guid');
      addExpiration.mockImplementation(() => { throw new Error('expiration error'); });

      vi.mocked(createSaveListener).mockReturnValue({
        promptId: 'test-prompt-id',
        promise: Promise.resolve({ success: false, roll: 5, total: 8 }),
      });

      await handle(makeAction(), makePlayerStats(), campaignName, null);

      await new Promise(resolve => setTimeout(resolve, 10));
    });
  });
});
