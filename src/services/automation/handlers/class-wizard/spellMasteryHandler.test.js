// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../ui/dataLoader.js', () => ({
  loadSpells: vi.fn(),
}));

import { handle, onSpellMasterySelected } from './spellMasteryHandler.js';
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { loadSpells } from '../../../ui/dataLoader.js';

const campaignName = 'TestCampaign';

function makePlayerStats(overrides = {}) {
  return {
    name: 'TestWizard',
    level: 14,
    proficiency: 6,
    rules: '2024',
    ...overrides,
  };
}

function makeAction(automation = {}) {
  return {
    name: 'Spell Mastery',
    automation: { type: 'spell_mastery', ...automation },
  };
}

function makeWizardSpell(name, level, castingTime = 'Action', extra = {}) {
  return {
    name,
    level,
    casting_time: castingTime,
    range: '120 ft',
    description: '',
    classes: ['Wizard'],
    ...extra,
  };
}

const WIZARD_LEVEL1 = makeWizardSpell('Magic Missile', 1);
const WIZARD_LEVEL2 = makeWizardSpell('Web', 2);

describe('spellMasteryHandler.handle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
  });

  describe('return type', () => {
    it('returns a modal when eligible spells exist and no selection has been made', async () => {
      loadSpells.mockResolvedValue([WIZARD_LEVEL1, WIZARD_LEVEL2]);

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('modal');
      expect(result.modalName).toBe('spellMastery');
    });

    it('returns a popup when no eligible spells exist', async () => {
      loadSpells.mockResolvedValue([makeWizardSpell('Fireball', 3)]);

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toBe('No level 1 or 2 wizard spells with casting time of an action available.');
    });
  });

  describe('spell eligibility filtering', () => {
    it('includes level 1 and 2 wizard spells with action casting time', async () => {
      loadSpells.mockResolvedValue([WIZARD_LEVEL1, WIZARD_LEVEL2]);

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.payload.level1Options).toEqual(['Magic Missile']);
      expect(result.payload.level2Options).toEqual(['Web']);
    });

    it('excludes non-wizard spells and non-action casting times', async () => {
      const nonWizardSpells = [
        { name: 'Burning Hands', level: 1, casting_time: 'Action', range: '', description: '', classes: ['Sorcerer'] },
        { name: 'Aid', level: 2, casting_time: 'Action', range: '', description: '', classes: ['Cleric', 'Paladin'] },
      ];
      loadSpells.mockResolvedValue(nonWizardSpells);

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
    });

    it('filters by casting time allowing both "Action" and "1 Action"', async () => {
      const spells = [
        makeWizardSpell('Reaction Spell', 1, 'Reaction'),
        makeWizardSpell('Bonus Action Spell', 1, '1 Bonus Action'),
        makeWizardSpell('Bonus Action Alt', 2, 'Bonus Action'),
        makeWizardSpell('Action Spell', 1, 'Action'),
        makeWizardSpell('Shield', 1, '1 Action'),
      ];
      loadSpells.mockResolvedValue(spells);

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.payload.level1Options).toEqual(['Action Spell', 'Shield']);
      expect(result.payload.level2Options).toEqual([]);
    });

    it('includes spells where wizard is one of multiple classes', async () => {
      loadSpells.mockResolvedValue([
        { name: 'Magic Missile', level: 1, casting_time: 'Action', range: '', description: '', classes: ['Sorcerer', 'Wizard'] },
      ]);

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.payload.level1Options).toEqual(['Magic Missile']);
    });

    it('excludes spells with missing classes field', async () => {
      loadSpells.mockResolvedValue([
        { name: 'Orphan Spell', level: 1, casting_time: 'Action' },
      ]);

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
    });

    it('excludes spells with missing casting_time field', async () => {
      loadSpells.mockResolvedValue([
        { name: 'Timeless Spell', level: 1, classes: ['Wizard'] },
      ]);

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
    });

    it('excludes spells outside level 1-2 range', async () => {
      const spells = [
        makeWizardSpell('Cantrip', 0),
        makeWizardSpell('Fireball', 3),
        makeWizardSpell('Wish', 9),
      ];
      loadSpells.mockResolvedValue(spells);

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('popup');
    });
  });

  describe('payload structure', () => {
    it('includes optionDetails when no existing selection', async () => {
      loadSpells.mockResolvedValue([WIZARD_LEVEL1, WIZARD_LEVEL2]);

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.payload.optionDetails).toBeDefined();
      expect(result.payload.optionDetails['Magic Missile']).toEqual({
        name: 'Magic Missile',
        level: 1,
        casting_time: 'Action',
        range: '120 ft',
        description: '',
        damage: null,
      });
      expect(result.payload.optionDetails['Web']).toEqual({
        name: 'Web',
        level: 2,
        casting_time: 'Action',
        range: '120 ft',
        description: '',
        damage: null,
      });
      expect(result.payload.currentLevel1).toBe('');
      expect(result.payload.currentLevel2).toBe('');
    });

    it('includes action, playerStats, campaignName in payload', async () => {
      loadSpells.mockResolvedValue([WIZARD_LEVEL1]);

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.payload.action).toEqual(makeAction());
      expect(result.payload.playerStats).toEqual(makePlayerStats());
      expect(result.payload.campaignName).toBe(campaignName);
    });

    it('omits optionDetails when both selections already exist', async () => {
      loadSpells.mockResolvedValue([WIZARD_LEVEL1, WIZARD_LEVEL2]);
      getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'SpellMastery_level1') return 'Magic Missile';
        if (key === 'SpellMastery_level2') return 'Web';
        return undefined;
      });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.payload.optionDetails).toBeUndefined();
      expect(result.payload.currentLevel1).toBe('Magic Missile');
      expect(result.payload.currentLevel2).toBe('Web');
    });

    it('includes optionDetails when only level1 is already set', async () => {
      loadSpells.mockResolvedValue([WIZARD_LEVEL1, WIZARD_LEVEL2]);
      getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'SpellMastery_level1') return 'Magic Missile';
        return undefined;
      });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.payload.optionDetails).toBeDefined();
      expect(result.payload.currentLevel1).toBe('');
      expect(result.payload.currentLevel2).toBe('');
    });

    it('includes optionDetails when only level2 is already set', async () => {
      loadSpells.mockResolvedValue([WIZARD_LEVEL1, WIZARD_LEVEL2]);
      getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'SpellMastery_level2') return 'Web';
        return undefined;
      });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.payload.optionDetails).toBeDefined();
      expect(result.payload.currentLevel1).toBe('');
      expect(result.payload.currentLevel2).toBe('');
    });

    it('uses fallback values when spell fields are missing in optionDetails', async () => {
      const incompleteSpell = {
        name: 'Incomplete',
        level: 1,
        classes: ['Wizard'],
        casting_time: 'Action',
      };
      loadSpells.mockResolvedValue([incompleteSpell]);

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.payload.optionDetails['Incomplete']).toEqual({
        name: 'Incomplete',
        level: 1,
        casting_time: 'Action',
        range: '',
        description: '',
        damage: null,
      });
    });
  });

  describe('existing selection state', () => {
    it('returns modal with current selections when both level1 and level2 are already set', async () => {
      loadSpells.mockResolvedValue([WIZARD_LEVEL1, WIZARD_LEVEL2]);
      getRuntimeValue.mockImplementation((_name, key) => {
        if (key === 'SpellMastery_level1') return 'Magic Missile';
        if (key === 'SpellMastery_level2') return 'Web';
        return undefined;
      });

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('modal');
      expect(result.payload.currentLevel1).toBe('Magic Missile');
      expect(result.payload.currentLevel2).toBe('Web');
    });

    it('returns modal with empty selections when neither is set', async () => {
      loadSpells.mockResolvedValue([WIZARD_LEVEL1, WIZARD_LEVEL2]);

      const result = await handle(makeAction(), makePlayerStats(), campaignName, null);

      expect(result.type).toBe('modal');
      expect(result.payload.currentLevel1).toBe('');
      expect(result.payload.currentLevel2).toBe('');
    });
  });

  describe('ruleset handling', () => {
    it('loads spells for the correct ruleset', async () => {
      loadSpells.mockResolvedValue([WIZARD_LEVEL1]);

      await handle(makeAction(), makePlayerStats({ rules: '5e' }), campaignName, null);

      expect(loadSpells).toHaveBeenCalledWith('5e');
    });

    it('defaults to 2024 when rules is undefined', async () => {
      loadSpells.mockResolvedValue([WIZARD_LEVEL1]);

      await handle(makeAction(), makePlayerStats({ rules: undefined }), campaignName, null);

      expect(loadSpells).toHaveBeenCalledWith('2024');
    });

    it('defaults to 2024 when rules is null', async () => {
      loadSpells.mockResolvedValue([WIZARD_LEVEL1]);

      await handle(makeAction(), makePlayerStats({ rules: null }), campaignName, null);

      expect(loadSpells).toHaveBeenCalledWith('2024');
    });
  });
});

describe('spellMasteryHandler.onSpellMasterySelected', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validation', () => {
    it('returns error when both values are empty strings', async () => {
      const result = await onSpellMasterySelected(makeAction(), makePlayerStats(), campaignName, '', '');

      expect(result.type).toBe('popup');
      expect(result.payload.description).toBe('Both a level 1 and level 2 spell must be selected, and they must be different spells.');
    });

    it('returns error when either spell is missing or both are the same', async () => {
      const result1 = await onSpellMasterySelected(makeAction(), makePlayerStats(), campaignName, null, 'Web');
      expect(result1.type).toBe('popup');
      expect(result1.payload.description).toBe('Both a level 1 and level 2 spell must be selected, and they must be different spells.');

      const result2 = await onSpellMasterySelected(makeAction(), makePlayerStats(), campaignName, 'Magic Missile', null);
      expect(result2.type).toBe('popup');

      const result3 = await onSpellMasterySelected(makeAction(), makePlayerStats(), campaignName, 'Magic Missile', 'Magic Missile');
      expect(result3.type).toBe('popup');
    });

    it('returns error when one spell is an empty string', async () => {
      const result1 = await onSpellMasterySelected(makeAction(), makePlayerStats(), campaignName, '', 'Web');
      expect(result1.type).toBe('popup');

      const result2 = await onSpellMasterySelected(makeAction(), makePlayerStats(), campaignName, 'Magic Missile', '');
      expect(result2.type).toBe('popup');
    });

    it('returns error when one spell is undefined', async () => {
      const result1 = await onSpellMasterySelected(makeAction(), makePlayerStats(), campaignName, undefined, 'Web');
      expect(result1.type).toBe('popup');

      const result2 = await onSpellMasterySelected(makeAction(), makePlayerStats(), campaignName, 'Magic Missile', undefined);
      expect(result2.type).toBe('popup');
    });
  });

  describe('clearing selection', () => {
    it('clears both runtime values when both are null', async () => {
      const result = await onSpellMasterySelected(makeAction(), makePlayerStats(), campaignName, null, null);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toBe('Spell Mastery selection cleared.');
      expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'SpellMastery_level1', null, campaignName, true);
      expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'SpellMastery_level2', null, campaignName, true);
    });

    it('clears both runtime values when both are undefined', async () => {
      const result = await onSpellMasterySelected(makeAction(), makePlayerStats(), campaignName, undefined, undefined);

      expect(result.type).toBe('popup');
      expect(result.payload.description).toBe('Spell Mastery selection cleared.');
      expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'SpellMastery_level1', null, campaignName, true);
      expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'SpellMastery_level2', null, campaignName, true);
    });
  });

  describe('successful selection', () => {
    it('sets runtime values for both selected spells', async () => {
      const result = await onSpellMasterySelected(makeAction(), makePlayerStats(), campaignName, 'Magic Missile', 'Web');

      expect(result.type).toBe('popup');
      expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'SpellMastery_level1', 'Magic Missile', campaignName, true);
      expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'SpellMastery_level2', 'Web', campaignName, true);
    });

    it('returns success message with spell names and key phrases', async () => {
      const result = await onSpellMasterySelected(makeAction(), makePlayerStats(), campaignName, 'Magic Missile', 'Web');

      expect(result.payload.description).toContain('Magic Missile');
      expect(result.payload.description).toContain('Web');
      expect(result.payload.description).toContain('at will');
      expect(result.payload.description).toContain('always prepared');
    });

    it('includes action.automation in the result payload', async () => {
      const result = await onSpellMasterySelected(makeAction(), makePlayerStats(), campaignName, 'Magic Missile', 'Web');

      expect(result.payload.automation).toEqual({ type: 'spell_mastery' });
    });

    it('handles spell names with special characters', async () => {
      const result = await onSpellMasterySelected(makeAction(), makePlayerStats(), campaignName, "Fireball's Flame", 'Ray of Frost');

      expect(result.payload.description).toContain("Fireball's Flame");
      expect(result.payload.description).toContain('Ray of Frost');
      expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'SpellMastery_level1', "Fireball's Flame", campaignName, true);
      expect(setRuntimeValue).toHaveBeenCalledWith('TestWizard', 'SpellMastery_level2', 'Ray of Frost', campaignName, true);
    });
  });
});
