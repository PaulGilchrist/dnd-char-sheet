// @improved-by-ai
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
const playerName = 'TestWarlock';

function makePlayerStats(overrides = {}) {
  return {
    name: playerName,
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

function mockRuntimeValues(uses, target) {
  getRuntimeValue.mockImplementation((playerName, key) => {
    if (key === 'clairvoyantCombatantUses') return uses;
    if (key === 'awakenedMindTarget') return target;
    return null;
  });
}

describe('clairvoyantCombatantHandler.handle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('early return: no uses remaining', () => {
    it('should return info popup when no uses remaining without pact magic recharge', async () => {
      mockRuntimeValues(1, 'AwakenedTarget');

      const result = await handle(makeAction({ pactMagicRecharge: false }), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.name).toBe('Clairvoyant Combatant');
      expect(result.payload.description).toContain('No uses remaining');
      expect(result.payload.description).toContain('Short or Long Rest');
    });

    it('should return info popup when no uses remaining with pact magic recharge but no slots', async () => {
      mockRuntimeValues(1, 'AwakenedTarget');

      const result = await handle(
        makeAction({ pactMagicRecharge: true }),
        makePlayerStats({ spellAbilities: {} }),
        campaignName,
        null,
      );

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.name).toBe('Clairvoyant Combatant');
      expect(result.payload.description).toContain('No Pact Magic slots available');
    });

    it('should return info popup when pact magic recharge is true but runtime slot value blocks use', async () => {
      getRuntimeValue.mockImplementation((playerName, key) => {
        if (key === 'clairvoyantCombatantUses') return 1;
        if (key === 'awakenedMindTarget') return 'AwakenedTarget';
        if (key === 'spell_slots_level_1') return 0;
        return null;
      });

      const result = await handle(
        makeAction({ pactMagicRecharge: true }),
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('No Pact Magic slots available');
    });
  });

  describe('early return: no Awakened Mind bond', () => {
    it('should return info popup when no Awakened Mind bond is active', async () => {
      mockRuntimeValues(0, null);

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('requires an active Awakened Mind bond');
      expect(result.payload.description).toContain('Activate Awakened Mind first');
    });
  });

  describe('modal return', () => {
    it('should return modal with correct payload for normal use', async () => {
      mockRuntimeValues(0, 'AwakenedTarget');

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('clairvoyantCombatant');
      expect(result.payload.targetName).toBe('AwakenedTarget');
      expect(result.payload.saveType).toBe('WIS');
      expect(result.payload.saveDc).toBe(15);
      expect(result.payload.currentUses).toBe(0);
      expect(result.payload.maxUses).toBe(1);
      expect(result.payload.pactMagicRecharge).toBe(false);
      expect(result.payload.pactSlotLevel).toBe(1);
      expect(result.payload.pactSlotsAvailable).toBe(false);
    });

    it('should return modal with pact magic slot info when recharge is available', async () => {
      mockRuntimeValues(1, 'AwakenedTarget');

      const result = await handle(
        makeAction({ pactMagicRecharge: true }),
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('clairvoyantCombatant');
      expect(result.payload.pactSlotLevel).toBe(1);
      expect(result.payload.pactSlotsAvailable).toBe(true);
      expect(result.payload.pactMagicRecharge).toBe(true);
    });

    it('should find highest pact magic slot level', async () => {
      mockRuntimeValues(1, 'AwakenedTarget');

      const result = await handle(
        makeAction({ pactMagicRecharge: true }),
        makePlayerStats({
          spellAbilities: {
            spell_slots_level_1: 0,
            spell_slots_level_2: 0,
            spell_slots_level_3: 2,
            spell_slots_level_4: 0,
            spell_slots_level_5: 0,
          },
        }),
        campaignName,
        null,
      );

      expect(result.payload.pactSlotLevel).toBe(3);
      expect(result.payload.pactSlotsAvailable).toBe(true);
    });

    it('should use custom feature name in modal action', async () => {
      mockRuntimeValues(0, 'AwakenedTarget');

      const result = await handle(
        { name: 'My Clairvoyance', automation: { type: 'clairvoyant_combatant', saveType: 'WIS', saveDc: 15, uses: 1 } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('clairvoyantCombatant');
      expect(result.payload.action.name).toBe('My Clairvoyance');
    });

    it('should pass action and playerStats in modal payload', async () => {
      mockRuntimeValues(0, 'AwakenedTarget');

      const action = { name: 'Clairvoyant Combatant', automation: { type: 'clairvoyant_combatant', saveType: 'WIS', saveDc: 15, uses: 1 } };
      const stats = makePlayerStats();

      const result = await handle(action, stats, campaignName, null);

      expect(result.payload.action).toBe(action);
      expect(result.payload.playerStats).toBe(stats);
      expect(result.payload.campaignName).toBe(campaignName);
    });

    it('should fallback to 0 when getRuntimeValue returns null for uses', async () => {
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
      mockRuntimeValues(0, 'AwakenedTarget');

      const result = await handle(
        { automation: { type: 'clairvoyant_combatant', saveType: 'WIS', saveDc: 15 } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(result.payload.maxUses).toBe(1);
    });

    it('should fallback to 0 when slot runtime value and playerStats are both null', async () => {
      mockRuntimeValues(1, 'AwakenedTarget');

      const result = await handle(
        { automation: { type: 'clairvoyant_combatant', saveType: 'WIS', saveDc: 15, pactMagicRecharge: true } },
        makePlayerStats({ spellAbilities: null }),
        campaignName,
        null,
      );

      expect(result.type).toBe('popup');
      expect(result.payload.description).toContain('No Pact Magic slots available');
    });

    it('should include pactSlotLevel 0 when no spell slots exist', async () => {
      mockRuntimeValues(0, 'AwakenedTarget');

      const result = await handle(
        makeAction(),
        makePlayerStats({
          level: 1,
          proficiency: 2,
          abilities: [{ name: 'Charisma', bonus: 0 }],
          spellAbilities: {},
        }),
        campaignName,
        null,
      );

      expect(result.payload.pactSlotLevel).toBe(0);
    });

    it('should fallback to default feature name when action.name is falsy', async () => {
      mockRuntimeValues(0, 'AwakenedTarget');

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
      mockRuntimeValues(1, 'AwakenedTarget');

      const result = await handle(
        { automation: { type: 'clairvoyant_combatant', saveType: 'WIS', saveDc: 15 } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(result.type).toBe('popup');
      expect(result.payload.name).toBe('Clairvoyant Combatant');
    });
  });

  describe('save DC computation', () => {
    it('should use custom saveDc when provided', async () => {
      mockRuntimeValues(0, 'AwakenedTarget');

      const result = await handle(
        { automation: { type: 'clairvoyant_combatant', saveDc: 18 } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(result.payload.saveDc).toBe(18);
    });

    it('should compute save DC when auto.saveDc is not provided', async () => {
      mockRuntimeValues(0, 'AwakenedTarget');

      const result = await handle(
        { automation: { type: 'clairvoyant_combatant', saveType: 'WIS' } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(result.payload.saveDc).toBe(15);
    });

    it('should fallback to bonus 3 when no matching ability found', async () => {
      mockRuntimeValues(0, 'AwakenedTarget');

      const result = await handle(
        { automation: { type: 'clairvoyant_combatant', saveType: 'INT' } },
        makePlayerStats({ abilities: [{ name: 'Charisma', bonus: 3 }] }),
        campaignName,
        null,
      );

      expect(result.payload.saveDc).toBe(8 + 4 + 3);
    });

    it('should fallback to WIS saveType when auto.saveType is not provided', async () => {
      mockRuntimeValues(0, 'AwakenedTarget');

      const result = await handle(
        { automation: { type: 'clairvoyant_combatant', saveDc: 14 } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(result.payload.saveType).toBe('WIS');
    });

    it('should compute save DC with correct ability bonus when ability exists', async () => {
      mockRuntimeValues(0, 'AwakenedTarget');

      const result = await handle(
        { automation: { type: 'clairvoyant_combatant', saveType: 'CHA' } },
        makePlayerStats(),
        campaignName,
        null,
      );

      expect(result.payload.saveDc).toBe(8 + 4 + 3);
      expect(result.payload.saveType).toBe('CHA');
    });
  });
});
