// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../../services/encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(),
}));

vi.mock('../../../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

import { handle, applySoulstitchSelection } from './soulstitchSpellsHandler.js';
import * as useRuntimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as combatData from '../../../../services/encounters/combatData.js';
import * as logService from '../../../../services/ui/logService.js';

const campaignName = 'TestCampaign';

function makePlayerStats(overrides = {}) {
  return {
    name: 'TestWizard',
    level: 14,
    proficiency: 6,
    class: { class_levels: [{ level: 14 }] },
    ...overrides,
  };
}

function makeAction(automation = {}, spell = {}) {
  return {
    name: 'Soulstitch Spells',
    automation: { type: 'soulstitch', ...automation },
    spell,
  };
}

function makeEvocationAction(overrides = {}) {
  return makeAction(overrides, { school: 'Evocation', dc: 15 });
}

describe('soulstitchSpellsHandler.handle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('early return guards', () => {
    it('should return null when spell school is not Evocation', async () => {
      const action = makeAction({}, { school: 'Transmutation', dc: 15 });
      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result).toBeNull();
    });

    it('should return null when spell school is empty string', async () => {
      const action = makeAction({}, { school: '', dc: 15 });
      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result).toBeNull();
    });

    it('should return null when spell is missing entirely', async () => {
      const action = makeAction({}, undefined);
      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result).toBeNull();
    });

    it('should return null when spell has no save (no dc or saveType)', async () => {
      const action = makeAction({}, { school: 'Evocation' });
      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result).toBeNull();
    });

    it('should return null when spell dc is falsy (0)', async () => {
      const action = makeAction({}, { school: 'Evocation', dc: 0 });
      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result).toBeNull();
    });

    it('should return null when combat context is missing', async () => {
      const action = makeEvocationAction();
      combatData.getCombatSummary.mockReturnValue(null);

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result).toBeNull();
    });

    it('should return null when combat summary has no creatures array', async () => {
      const action = makeEvocationAction();
      combatData.getCombatSummary.mockReturnValue({});

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result).toBeNull();
    });

    it('should return null when combat summary creatures is null', async () => {
      const action = makeEvocationAction();
      combatData.getCombatSummary.mockReturnValue({ creatures: null });

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result).toBeNull();
    });

    it('should return modal with empty eligibleTargets when combat summary creatures is empty array', async () => {
      const action = makeEvocationAction();
      combatData.getCombatSummary.mockReturnValue({ creatures: [] });

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('modal');
      expect(result.payload.eligibleTargets).toEqual([]);
    });
  });

  describe('modal payload construction', () => {
    it('should return modal type with correct structure', async () => {
      const action = makeEvocationAction();
      combatData.getCombatSummary.mockReturnValue({
        creatures: [{ name: 'Goblin1' }],
      });

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('soulstitchSpells');
    });

    it('should pass mapName through to payload', async () => {
      const action = makeEvocationAction();
      combatData.getCombatSummary.mockReturnValue({
        creatures: [{ name: 'Goblin1' }],
      });

      const result = await handle(action, makePlayerStats(), campaignName, 'DungeonMap');

      expect(result.payload.mapName).toBe('DungeonMap');
    });

    it('should store action and playerStats in payload by reference', async () => {
      const action = makeEvocationAction();
      const stats = makePlayerStats({ name: 'ArcaneCaster' });
      combatData.getCombatSummary.mockReturnValue({
        creatures: [{ name: 'Goblin1' }],
      });

      const result = await handle(action, stats, campaignName, null);

      expect(result.payload.action).toBe(action);
      expect(result.payload.playerStats).toBe(stats);
    });

    it('should include campaignName in payload', async () => {
      const action = makeEvocationAction();
      combatData.getCombatSummary.mockReturnValue({
        creatures: [{ name: 'Goblin1' }],
      });

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.payload.campaignName).toBe(campaignName);
    });

    it('should include spellSchool in payload as lowercase', async () => {
      const action = makeAction({}, { school: 'EVOCATION', dc: 15 });
      combatData.getCombatSummary.mockReturnValue({
        creatures: [{ name: 'Goblin1' }],
      });

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.payload.spellSchool).toBe('evocation');
    });
  });

  describe('spell slot level and max selections', () => {
    it('should use action.spellSlotLevel when set', async () => {
      const action = makeEvocationAction();
      action.spellSlotLevel = 3;
      combatData.getCombatSummary.mockReturnValue({
        creatures: [{ name: 'Goblin1' }],
      });

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.payload.maxSelections).toBe(4);
    });

    it('should fall back to spell.level when action.spellSlotLevel is not set', async () => {
      const action = makeAction({}, { school: 'Evocation', dc: 15, level: 2 });
      combatData.getCombatSummary.mockReturnValue({
        creatures: [{ name: 'Goblin1' }],
      });

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.payload.maxSelections).toBe(3);
    });

    it('should default spell slot level to 1 yielding maxSelections of 2', async () => {
      const action = makeAction({}, { school: 'Evocation', dc: 15 });
      combatData.getCombatSummary.mockReturnValue({
        creatures: [{ name: 'Goblin1' }],
      });

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.payload.maxSelections).toBe(2);
    });

    it('should default spell slot level to 1 when spell.level is 0', async () => {
      const action = makeAction({}, { school: 'Evocation', dc: 15, level: 0 });
      combatData.getCombatSummary.mockReturnValue({
        creatures: [{ name: 'Goblin1' }],
      });

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.payload.maxSelections).toBe(2);
    });

    it('should prefer action.spellSlotLevel over spell.level', async () => {
      const action = makeAction({}, { school: 'Evocation', dc: 15, level: 5 });
      action.spellSlotLevel = 2;
      combatData.getCombatSummary.mockReturnValue({
        creatures: [{ name: 'Goblin1' }],
      });

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.payload.maxSelections).toBe(3);
    });
  });

  describe('target resolution', () => {
    it('should include all combat creatures as eligible targets', async () => {
      const action = makeEvocationAction();
      combatData.getCombatSummary.mockReturnValue({
        creatures: [
          { name: 'Ally1' },
          { name: 'TestWizard' },
          { name: 'Enemy1' },
        ],
      });

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.payload.eligibleTargets).toEqual(['Ally1', 'TestWizard', 'Enemy1']);
    });

    it('should load previously chosen creatures from runtime state', async () => {
      const action = makeEvocationAction();
      combatData.getCombatSummary.mockReturnValue({
        creatures: [{ name: 'Goblin1' }],
      });
      useRuntimeState.getRuntimeValue.mockReturnValue(['Goblin1']);

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.payload.chosenCreatures).toEqual(['Goblin1']);
    });

    it('should default chosenCreatures to empty array when none stored', async () => {
      const action = makeEvocationAction();
      combatData.getCombatSummary.mockReturnValue({
        creatures: [{ name: 'Goblin1' }],
      });
      useRuntimeState.getRuntimeValue.mockReturnValue(undefined);

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.payload.chosenCreatures).toEqual([]);
    });

    it('should default chosenCreatures to empty array when runtime returns null', async () => {
      const action = makeEvocationAction();
      combatData.getCombatSummary.mockReturnValue({
        creatures: [{ name: 'Goblin1' }],
      });
      useRuntimeState.getRuntimeValue.mockReturnValue(null);

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.payload.chosenCreatures).toEqual([]);
    });
  });

  describe('field defaults', () => {
    it('should default featureName to "Soulstitch Spells" when action.name is missing', async () => {
      const action = {
        automation: { type: 'soulstitch' },
        spell: { school: 'Evocation', dc: 15 },
      };
      combatData.getCombatSummary.mockReturnValue({
        creatures: [{ name: 'Goblin1' }],
      });

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.payload.featureName).toBe('Soulstitch Spells');
    });

    it('should read spell from action.payload.spell when action.spell is missing', async () => {
      const action = {
        name: 'Soulstitch Spells',
        automation: { type: 'soulstitch' },
        payload: { spell: { school: 'Evocation', dc: 15, name: 'Lightning Bolt' } },
      };
      combatData.getCombatSummary.mockReturnValue({
        creatures: [{ name: 'Goblin1' }],
      });

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.payload.spellName).toBe('Lightning Bolt');
    });

    it('should default spellName to "Unknown" when no spell name is available', async () => {
      const action = makeEvocationAction();
      action.spell.name = undefined;
      combatData.getCombatSummary.mockReturnValue({
        creatures: [{ name: 'Goblin1' }],
      });

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.payload.spellName).toBe('Unknown');
    });

    it('should use action.name as featureName when provided', async () => {
      const action = {
        name: 'Custom Feature',
        automation: { type: 'soulstitch' },
        spell: { school: 'Evocation', dc: 15 },
      };
      combatData.getCombatSummary.mockReturnValue({
        creatures: [{ name: 'Goblin1' }],
      });

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.payload.featureName).toBe('Custom Feature');
    });
  });

  describe('saveType fallback', () => {
    it('should treat spell as having a save when auto.saveType is present', async () => {
      const action = makeAction({ saveType: 'strength' }, { school: 'Evocation' });
      combatData.getCombatSummary.mockReturnValue({
        creatures: [{ name: 'Goblin1' }],
      });

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result).not.toBeNull();
      expect(result.type).toBe('modal');
    });

    it('should allow spell without dc when auto.saveType is present', async () => {
      const action = makeAction({ saveType: 'constitution' }, { school: 'Evocation' });
      combatData.getCombatSummary.mockReturnValue({
        creatures: [{ name: 'Goblin1' }],
      });

      const result = await handle(action, makePlayerStats(), campaignName, null);

      expect(result.type).toBe('modal');
    });
  });

  describe('player name key construction', () => {
    it('should build castKey with underscores for names containing spaces', async () => {
      const action = makeEvocationAction();
      const stats = makePlayerStats({ name: 'John The Wizard' });
      combatData.getCombatSummary.mockReturnValue({
        creatures: [{ name: 'Goblin1' }],
      });
      useRuntimeState.getRuntimeValue.mockReturnValue([]);

      await handle(action, stats, campaignName, null);

      expect(useRuntimeState.getRuntimeValue).toHaveBeenCalledWith(
        'John The Wizard',
        expect.stringMatching(/_John_The_Wizard_Soulstitch_Spells_cast_/),
        campaignName,
      );
    });
  });
});

describe('soulstitchSpellsHandler.applySoulstitchSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('empty selection handling', () => {
    it('should return info popup when no creatures selected', async () => {
      const result = await applySoulstitchSelection(makeAction(), makePlayerStats(), campaignName, []);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.name).toBe('Soulstitch Spells');
      expect(result.payload.description).toContain('No creatures chosen');
    });

    it('should not store runtime values when no creatures selected', async () => {
      await applySoulstitchSelection(makeAction(), makePlayerStats(), campaignName, []);

      expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
    });

    it('should not call addEntry when no creatures selected', async () => {
      await applySoulstitchSelection(makeAction(), makePlayerStats(), campaignName, []);

      expect(logService.addEntry).not.toHaveBeenCalled();
    });

    it('should return info popup when selectedNames is null', async () => {
      const result = await applySoulstitchSelection(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('No creatures chosen');
    });

    it('should return info popup when selectedNames is undefined', async () => {
      const result = await applySoulstitchSelection(makeAction(), makePlayerStats(), campaignName, undefined);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('No creatures chosen');
    });

    it('should use custom featureName in empty selection popup', async () => {
      const customAction = {
        name: 'Custom Soulstitch',
        automation: { type: 'soulstitch' },
        spell: { school: 'Evocation', dc: 15 },
      };

      const result = await applySoulstitchSelection(customAction, makePlayerStats(), campaignName, []);

      expect(result.payload.name).toBe('Custom Soulstitch');
      expect(result.payload.description).toContain('Custom Soulstitch');
    });
  });

  describe('successful selection', () => {
    it('should store selected creatures with timestamp-based cast key', async () => {
      const selectedNames = ['Goblin1', 'Goblin2'];

      await applySoulstitchSelection(makeAction(), makePlayerStats(), campaignName, selectedNames);

      expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
        'TestWizard',
        expect.stringMatching(/_TestWizard_Soulstitch_Spells_cast_/),
        selectedNames,
        campaignName,
      );
    });

    it('should store persistent active key with creature list', async () => {
      const selectedNames = ['Goblin1'];

      await applySoulstitchSelection(makeAction(), makePlayerStats(), campaignName, selectedNames);

      expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
        'TestWizard',
        '_TestWizard_Soulstitch_Spells_active',
        selectedNames,
        campaignName,
      );
    });

    it('should log ability_use entry with character and ability details', async () => {
      const selectedNames = ['Goblin1', 'Goblin2'];

      await applySoulstitchSelection(makeAction(), makePlayerStats(), campaignName, selectedNames);

      expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
        type: 'ability_use',
        characterName: 'TestWizard',
        abilityName: 'Soulstitch Spells',
      }));
    });

    it('should log description with creature count and names', async () => {
      const selectedNames = ['Goblin1', 'Goblin2', 'Goblin3'];

      await applySoulstitchSelection(makeAction(), makePlayerStats(), campaignName, selectedNames);

      expect(logService.addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
        description: 'Soulstitch Spells: 3 creature(s) chosen for automatic save success: Goblin1, Goblin2, Goblin3',
      }));
    });

    it('should return success popup with creature names and automation payload', async () => {
      const selectedNames = ['Goblin1', 'Goblin2'];

      const result = await applySoulstitchSelection(makeAction(), makePlayerStats(), campaignName, selectedNames);

      expect(result.type).toBe('popup');
      expect(result.payload.type).toBe('automation_info');
      expect(result.payload.description).toContain('Goblin1, Goblin2');
      expect(result.payload.description).toContain('automatically succeed on saves');
      expect(result.payload.automation).toEqual({ type: 'soulstitch' });
    });

    it('should use custom featureName from action.name in popup', async () => {
      const customAction = {
        name: 'Custom Soulstitch',
        automation: { type: 'soulstitch' },
        spell: { school: 'Evocation', dc: 15 },
      };

      const result = await applySoulstitchSelection(customAction, makePlayerStats(), campaignName, ['Goblin1']);

      expect(result.payload.name).toBe('Custom Soulstitch');
      expect(result.payload.description).toContain('Custom Soulstitch');
    });

    it('should call setRuntimeValue twice (cast key + persistent key)', async () => {
      await applySoulstitchSelection(makeAction(), makePlayerStats(), campaignName, ['Goblin1']);

      expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledTimes(2);
    });

    it('should include all creature names in popup description', async () => {
      const selectedNames = ['Goblin1', 'Goblin2', 'Goblin3'];

      const result = await applySoulstitchSelection(makeAction(), makePlayerStats(), campaignName, selectedNames);

      expect(result.payload.description).toContain('Goblin1, Goblin2, Goblin3');
      expect(result.payload.description).toContain('automatically succeed on saves and take no damage');
    });
  });

  describe('player name key construction', () => {
    it('should build castKey with underscores for names containing spaces', async () => {
      const stats = makePlayerStats({ name: 'John The Wizard' });

      await applySoulstitchSelection(makeAction(), stats, campaignName, ['Goblin1']);

      expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
        'John The Wizard',
        expect.stringMatching(/_John_The_Wizard_Soulstitch_Spells_cast_/),
        ['Goblin1'],
        campaignName,
      );
    });

    it('should build persistentKey with underscores for names containing spaces', async () => {
      const stats = makePlayerStats({ name: 'John The Wizard' });

      await applySoulstitchSelection(makeAction(), stats, campaignName, ['Goblin1']);

      expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
        'John The Wizard',
        '_John_The_Wizard_Soulstitch_Spells_active',
        ['Goblin1'],
        campaignName,
      );
    });
  });
});
