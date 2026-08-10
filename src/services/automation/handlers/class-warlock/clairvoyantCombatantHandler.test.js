import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../common/savePrompt.js', () => ({
  buildSaveDc: vi.fn(),
  createSaveListener: vi.fn(),
}));

import { handle } from './clairvoyantCombatantHandler.js';
import { getRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';

const campaignName = 'test-campaign';

function makePlayerStats(overrides = {}) {
  return {
    name: 'TestWarlock',
    level: 10,
    proficiency: 4,
    abilities: [{ name: 'Charisma', bonus: 3 }],
    spellAbilities: {
      spell_slots_level_1: 2,
      spell_slots_level_2: 0,
      spell_slots_level_3: 0,
      spell_slots_level_4: 0,
      spell_slots_level_5: 0,
    },
    ...overrides,
  };
}

function makeAction(automation = {}) {
  return {
    name: 'Clairvoyant Combatant',
    automation: { type: 'clairvoyant_combatant', saveType: 'WIS', saveDc: 15, uses: 1, ...automation },
  };
}

describe('clairvoyantCombatantHandler.handle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('early return conditions', () => {
    it('should return info popup when no uses remaining without pact magic recharge', async () => {
      getRuntimeValue.mockImplementation((playerName, key) => {
        if (key === 'clairvoyantCombatantUses') return 1;
        if (key === 'awakenedMindTarget') return 'AwakenedTarget';
        return null;
      });

      const result = await handle(makeAction({ pactMagicRecharge: false }), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('No uses remaining');
      expect(result.payload.description).toContain('Short or Long Rest');
    });

    it('should return info popup when no uses remaining with pact magic recharge but no slots', async () => {
      const emptySlotsStats = {
        name: 'TestWarlock',
        level: 10,
        proficiency: 4,
        abilities: [{ name: 'Charisma', bonus: 3 }],
        spellAbilities: {
          spell_slots_level_1: 0,
          spell_slots_level_2: 0,
          spell_slots_level_3: 0,
          spell_slots_level_4: 0,
          spell_slots_level_5: 0,
        },
      };

      getRuntimeValue.mockImplementation((playerName, key) => {
        if (key === 'clairvoyantCombatantUses') return 1;
        if (key === 'awakenedMindTarget') return 'AwakenedTarget';
        return null;
      });

      const result = await handle(makeAction({ pactMagicRecharge: true }), emptySlotsStats, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('No uses remaining');
      expect(result.payload.description).toContain('No Pact Magic slots available');
    });

    it('should return info popup when no Awakened Mind bond is active', async () => {
      getRuntimeValue.mockImplementation((playerName, key) => {
        if (key === 'clairvoyantCombatantUses') return 0;
        if (key === 'awakenedMindTarget') return null;
        return null;
      });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('requires an active Awakened Mind bond');
      expect(result.payload.description).toContain('Activate Awakened Mind first');
    });
  });

  describe('modal return', () => {
    it('should return modal with correct payload for normal use', async () => {
      getRuntimeValue.mockImplementation((playerName, key) => {
        if (key === 'clairvoyantCombatantUses') return 0;
        if (key === 'awakenedMindTarget') return 'AwakenedTarget';
        return null;
      });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('clairvoyantCombatant');
      expect(result.payload.targetName).toBe('AwakenedTarget');
      expect(result.payload.saveType).toBe('WIS');
      expect(result.payload.saveDc).toBe(15);
      expect(result.payload.currentUses).toBe(0);
      expect(result.payload.maxUses).toBe(1);
      expect(result.payload.pactMagicRecharge).toBe(false);
    });

    it('should return modal with pact magic slot info when recharge is available', async () => {
      const statsWithSlots = {
        ...makePlayerStats(),
        spellAbilities: {
          spell_slots_level_1: 2,
          spell_slots_level_2: 0,
          spell_slots_level_3: 0,
          spell_slots_level_4: 0,
          spell_slots_level_5: 0,
        },
      };

      getRuntimeValue.mockImplementation((playerName, key) => {
        if (key === 'clairvoyantCombatantUses') return 1;
        if (key === 'awakenedMindTarget') return 'AwakenedTarget';
        return null;
      });

      const result = await handle(makeAction({ pactMagicRecharge: true }), statsWithSlots, campaignName, null);

      expect(result.type).toBe('modal');
      expect(result.payload.pactSlotLevel).toBe(1);
      expect(result.payload.pactSlotsAvailable).toBe(true);
      expect(result.payload.pactMagicRecharge).toBe(true);
    });

    it('should use custom feature name in modal', async () => {
      getRuntimeValue.mockImplementation((playerName, key) => {
        if (key === 'clairvoyantCombatantUses') return 0;
        if (key === 'awakenedMindTarget') return 'AwakenedTarget';
        return null;
      });

      const result = await handle(
        { name: 'My Clairvoyance', automation: { type: 'clairvoyant_combatant', saveType: 'WIS', saveDc: 15, uses: 1 } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(result.payload.action.name).toBe('My Clairvoyance');
    });

    it('should return pactSlotsAvailable false when no pact slots', async () => {
      const emptySlotsStats = {
        ...makePlayerStats(),
        spellAbilities: {
          spell_slots_level_1: 0,
          spell_slots_level_2: 0,
          spell_slots_level_3: 0,
          spell_slots_level_4: 0,
          spell_slots_level_5: 0,
        },
      };

      getRuntimeValue.mockImplementation((playerName, key) => {
        if (key === 'clairvoyantCombatantUses') return 1;
        if (key === 'awakenedMindTarget') return 'AwakenedTarget';
        return null;
      });

      const result = await handle(makeAction({ pactMagicRecharge: true }), emptySlotsStats, campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('No Pact Magic slots available');
    });

    it('should find highest pact magic slot level', async () => {
      const highLevelStats = {
        ...makePlayerStats(),
        spellAbilities: {
          spell_slots_level_1: 0,
          spell_slots_level_2: 0,
          spell_slots_level_3: 2,
          spell_slots_level_4: 0,
          spell_slots_level_5: 0,
        },
      };

      getRuntimeValue.mockImplementation((playerName, key) => {
        if (key === 'clairvoyantCombatantUses') return 1;
        if (key === 'awakenedMindTarget') return 'AwakenedTarget';
        return null;
      });

      const result = await handle(makeAction({ pactMagicRecharge: true }), highLevelStats, campaignName, null);

      expect(result.payload.pactSlotLevel).toBe(3);
      expect(result.payload.pactSlotsAvailable).toBe(true);
    });

    it('should use default feature name when action.name is falsy', async () => {
      getRuntimeValue.mockImplementation((playerName, key) => {
        if (key === 'clairvoyantCombatantUses') return 0;
        if (key === 'awakenedMindTarget') return 'AwakenedTarget';
        return null;
      });

      const result = await handle(
        { automation: { type: 'clairvoyant_combatant', saveType: 'WIS', saveDc: 15, uses: 1 } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(result.type).toBe('modal');
      expect(result.payload.action.name).toBeUndefined();
    });

    it('should return popup with default name when no uses and no action name', async () => {
      getRuntimeValue.mockImplementation((playerName, key) => {
        if (key === 'clairvoyantCombatantUses') return 1;
        if (key === 'awakenedMindTarget') return 'AwakenedTarget';
        return null;
      });

      const result = await handle(
        { automation: { type: 'clairvoyant_combatant', saveType: 'WIS', saveDc: 15, uses: 1 } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(result.type).toBe('popup');
      expect(result.payload.name).toBe('Clairvoyant Combatant');
    });

    it('should fallback to 0 when getRuntimeValue returns null for uses', async () => {
      getRuntimeValue.mockReturnValue(null);

      getRuntimeValue.mockImplementation((playerName, key) => {
        if (key === 'clairvoyantCombatantUses') return null;
        if (key === 'awakenedMindTarget') return 'AwakenedTarget';
        return null;
      });

      const result = await handle(
        { automation: { type: 'clairvoyant_combatant', saveType: 'WIS', saveDc: 15 } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(result.type).toBe('modal');
      expect(result.payload.currentUses).toBe(0);
      expect(result.payload.maxUses).toBe(1);
    });

    it('should fallback to 1 when auto.uses is not provided', async () => {
      getRuntimeValue.mockImplementation((playerName, key) => {
        if (key === 'clairvoyantCombatantUses') return 0;
        if (key === 'awakenedMindTarget') return 'AwakenedTarget';
        return null;
      });

      const result = await handle(
        { automation: { type: 'clairvoyant_combatant', saveType: 'WIS', saveDc: 15 } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(result.payload.maxUses).toBe(1);
    });

    it('should compute save DC when auto.saveDc is not provided', async () => {
      getRuntimeValue.mockImplementation((playerName, key) => {
        if (key === 'clairvoyantCombatantUses') return 0;
        if (key === 'awakenedMindTarget') return 'AwakenedTarget';
        return null;
      });

      const stats = makePlayerStats();

      const result = await handle(
        { automation: { type: 'clairvoyant_combatant', saveType: 'WIS' } },
        stats,
        campaignName,
        null,
      );

      // WIS ability not found, so bonus falls back to 3: 8 + 4 + 3 = 15
      expect(result.payload.saveDc).toBe(15);
    });

    it('should fallback to bonus 3 when no matching ability found', async () => {
      getRuntimeValue.mockImplementation((playerName, key) => {
        if (key === 'clairvoyantCombatantUses') return 0;
        if (key === 'awakenedMindTarget') return 'AwakenedTarget';
        return null;
      });

      const statsNoMatchingAbility = {
        name: 'TestWarlock',
        level: 10,
        proficiency: 4,
        abilities: [{ name: 'Charisma', bonus: 3 }],
        spellAbilities: {},
      };

      const result = await handle(
        { automation: { type: 'clairvoyant_combatant', saveType: 'INT' } },
        statsNoMatchingAbility,
        campaignName,
        null,
      );

      expect(result.payload.saveDc).toBe(8 + 4 + 3);
    });

    it('should fallback to WIS saveType when auto.saveType is not provided', async () => {
      getRuntimeValue.mockImplementation((playerName, key) => {
        if (key === 'clairvoyantCombatantUses') return 0;
        if (key === 'awakenedMindTarget') return 'AwakenedTarget';
        return null;
      });

      const result = await handle(
        { automation: { type: 'clairvoyant_combatant', saveDc: 14 } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(result.payload.saveType).toBe('WIS');
    });

    it('should fallback to 0 when slot runtime value and playerStats are both null', async () => {
      const stats = {
        name: 'TestWarlock',
        level: 10,
        proficiency: 4,
        abilities: [{ name: 'Charisma', bonus: 3 }],
        spellAbilities: {},
      };

      getRuntimeValue.mockImplementation((playerName, key) => {
        if (key === 'clairvoyantCombatantUses') return 1;
        if (key === 'awakenedMindTarget') return 'AwakenedTarget';
        return null;
      });

      const result = await handle(
        { automation: { type: 'clairvoyant_combatant', saveType: 'WIS', saveDc: 15, pactMagicRecharge: true } },
        stats,
        campaignName,
        null,
      );

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('No Pact Magic slots available');
    });

    it('should use pactMagicRecharge false in payload when not set', async () => {
      getRuntimeValue.mockImplementation((playerName, key) => {
        if (key === 'clairvoyantCombatantUses') return 0;
        if (key === 'awakenedMindTarget') return 'AwakenedTarget';
        return null;
      });

      const result = await handle(
        { automation: { type: 'clairvoyant_combatant', saveType: 'WIS', saveDc: 15, uses: 1 } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(result.payload.pactMagicRecharge).toBe(false);
    });

    it('should include pactSlotLevel 0 when no spell slots exist', async () => {
      const noSlotsStats = {
        name: 'TestWarlock',
        level: 1,
        proficiency: 2,
        abilities: [{ name: 'Charisma', bonus: 0 }],
        spellAbilities: {},
      };

      getRuntimeValue.mockImplementation((playerName, key) => {
        if (key === 'clairvoyantCombatantUses') return 0;
        if (key === 'awakenedMindTarget') return 'AwakenedTarget';
        return null;
      });

      const result = await handle(makeAction(), noSlotsStats, campaignName, null);

      expect(result.payload.pactSlotLevel).toBe(0);
    });

    it('should fallback to 0 when both runtime and playerStats have no slots for pact magic', async () => {
      const zeroSlotsStats = {
        name: 'TestWarlock',
        level: 10,
        proficiency: 4,
        abilities: [{ name: 'Charisma', bonus: 3 }],
        spellAbilities: {
          spell_slots_level_1: 0,
          spell_slots_level_2: 0,
          spell_slots_level_3: 0,
          spell_slots_level_4: 0,
          spell_slots_level_5: 0,
        },
      };

      getRuntimeValue.mockImplementation((playerName, key) => {
        if (key === 'clairvoyantCombatantUses') return 1;
        if (key === 'awakenedMindTarget') return 'AwakenedTarget';
        return null;
      });

      const result = await handle(
        { automation: { type: 'clairvoyant_combatant', saveType: 'WIS', saveDc: 15, pactMagicRecharge: true } },
        zeroSlotsStats,
        campaignName,
        null,
      );

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('No Pact Magic slots available');
    });

  });
});
