// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getActionSpellNames,
  getBonusActionSpellNames,
  getReactionSpellNames,
  getExcludedSpellNames,
} from '../../services/ui/spellSectionUtils.js';
import { getRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';

// Minimal mock: only what spellSectionUtils.js actually imports
vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
}));

const actionSpell = { name: 'Fireball', casting_time: '1 action', prepared: 'Prepared', damage: '8d6' };
const bonusActionSpell = { name: 'Shocking Grasp', casting_time: '1 bonus action', prepared: 'Prepared', damage: '1d8' };
const reactionSpell = { name: 'Shield', casting_time: '1 reaction', prepared: 'Prepared', damage: '1d4' };
const alwaysSpell = { name: 'Minor Illusion', casting_time: '1 action', prepared: 'Always', damage: 'Utility' };
const alwaysNoDamageSpell = { name: 'Prestidigitation', casting_time: '1 action', prepared: 'Always' };
const notPreparedSpell = { name: 'Unknown Spell', casting_time: '1 action', prepared: 'Not Prepared', damage: '4d6' };
const healSpell = { name: 'Cure Wounds', casting_time: '1 action', prepared: 'Prepared', heal_at_slot_level: true };
const actionSpellAltCase = { name: 'Lightning Bolt', casting_time: 'Action', prepared: 'Prepared', damage: '8d6' };
const bonusActionSpellAltCase = { name: 'Hunter\'s Mark', casting_time: 'Bonus Action', prepared: 'Prepared', damage: '1d6' };
const reactionSpellAltCase = { name: 'Opportunity Attack', casting_time: 'reaction', prepared: 'Prepared', damage: '1d6' };

function createStats(overrides = {}) {
  return {
    name: 'TestCharacter',
    spellAbilities: { spells: [] },
    automation: {},
    ...overrides,
  };
}

function mockBuffs(buffs) {
  getRuntimeValue.mockImplementation((_name, key) => {
    if (key === 'activeBuffs') return buffs;
    return null;
  });
}

function mockBuffsAndConditions(buffs, conditions) {
  getRuntimeValue.mockImplementation((_name, key) => {
    if (key === 'activeBuffs') return buffs;
    if (key === 'activeConditions') return conditions;
    return null;
  });
}

describe('spellSectionUtils', () => {
  beforeEach(() => {
    getRuntimeValue.mockImplementation(() => null);
  });

  describe('getActionSpellNames', () => {
    it('returns action spells with damage', () => {
      const stats = createStats({ spellAbilities: { spells: [actionSpell] } });
      const result = getActionSpellNames(stats, 'test-campaign');
      expect(result).toEqual(new Set(['Fireball']));
    });

    it('returns action spells with healing', () => {
      const stats = createStats({ spellAbilities: { spells: [healSpell] } });
      const result = getActionSpellNames(stats, 'test-campaign');
      expect(result).toEqual(new Set(['Cure Wounds']));
    });

    it('returns action spells with "Always" prepared status', () => {
      const stats = createStats({ spellAbilities: { spells: [alwaysSpell] } });
      const result = getActionSpellNames(stats, 'test-campaign');
      expect(result).toEqual(new Set(['Minor Illusion']));
    });

    it('excludes "Always" spells without damage or healing', () => {
      const stats = createStats({ spellAbilities: { spells: [alwaysNoDamageSpell] } });
      const result = getActionSpellNames(stats, 'test-campaign');
      expect(result.size).toBe(0);
    });

    it('excludes unprepared spells', () => {
      const stats = createStats({ spellAbilities: { spells: [notPreparedSpell] } });
      const result = getActionSpellNames(stats, 'test-campaign');
      expect(result.size).toBe(0);
    });

    it('excludes non-action spells', () => {
      const stats = createStats({ spellAbilities: { spells: [bonusActionSpell, reactionSpell] } });
      const result = getActionSpellNames(stats, 'test-campaign');
      expect(result.size).toBe(0);
    });

    it('handles alternate casting time casing', () => {
      const stats = createStats({ spellAbilities: { spells: [actionSpellAltCase] } });
      const result = getActionSpellNames(stats, 'test-campaign');
      expect(result).toEqual(new Set(['Lightning Bolt']));
    });

    it('returns empty set when Elder Champion is active', () => {
      mockBuffs([{ name: 'Elder Champion' }]);
      const stats = createStats({ spellAbilities: { spells: [actionSpell] } });
      const result = getActionSpellNames(stats, 'test-campaign');
      expect(result).toEqual(new Set());
    });

    it('returns all matching action spells from multiple spells', () => {
      const stats = createStats({
        spellAbilities: { spells: [actionSpell, healSpell, actionSpellAltCase, notPreparedSpell, bonusActionSpell] },
      });
      const result = getActionSpellNames(stats, 'test-campaign');
      expect(result).toEqual(new Set(['Fireball', 'Cure Wounds', 'Lightning Bolt']));
    });

    it('returns empty set when spellAbilities is undefined', () => {
      const stats = createStats({ spellAbilities: undefined });
      const result = getActionSpellNames(stats, 'test-campaign');
      expect(result).toEqual(new Set());
    });

    it('returns empty set when spellAbilities.spells is undefined', () => {
      const stats = createStats({ spellAbilities: {} });
      const result = getActionSpellNames(stats, 'test-campaign');
      expect(result).toEqual(new Set());
    });

    it('returns empty set when spellAbilities is null', () => {
      const stats = createStats({ spellAbilities: null });
      const result = getActionSpellNames(stats, 'test-campaign');
      expect(result).toEqual(new Set());
    });

    it('returns action spells when Elder Champion check throws (error suppressed)', () => {
      getRuntimeValue.mockImplementation(() => { throw new Error('store error'); });
      const stats = createStats({ spellAbilities: { spells: [actionSpell] } });
      const result = getActionSpellNames(stats, 'test-campaign');
      // isElderChampionActive catches the error and returns false
      expect(result).toEqual(new Set(['Fireball']));
    });
  });

  describe('getBonusActionSpellNames', () => {
    it('returns bonus action spells', () => {
      const stats = createStats({ spellAbilities: { spells: [bonusActionSpell] } });
      const result = getBonusActionSpellNames(stats, 'test-campaign');
      expect(result).toEqual(new Set(['Shocking Grasp']));
    });

    it('handles alternate casting time casing', () => {
      const stats = createStats({ spellAbilities: { spells: [bonusActionSpellAltCase] } });
      const result = getBonusActionSpellNames(stats, 'test-campaign');
      expect(result).toEqual(new Set(["Hunter's Mark"]));
    });

    it('excludes non-bonus-action spells unless Elder Champion is active', () => {
      const stats = createStats({ spellAbilities: { spells: [actionSpell, reactionSpell] } });
      const result = getBonusActionSpellNames(stats, 'test-campaign');
      expect(result.size).toBe(0);
    });

    it('includes action spells when Elder Champion is active', () => {
      mockBuffs([{ name: 'Elder Champion' }]);
      const stats = createStats({ spellAbilities: { spells: [actionSpell, bonusActionSpell] } });
      const result = getBonusActionSpellNames(stats, 'test-campaign');
      expect(result).toEqual(new Set(['Fireball', 'Shocking Grasp']));
    });

    it('excludes unprepared bonus action spells', () => {
      const stats = createStats({
        spellAbilities: { spells: [{ name: 'Hidden Spell', casting_time: '1 bonus action', prepared: 'Not Prepared', damage: '1d6' }] },
      });
      const result = getBonusActionSpellNames(stats, 'test-campaign');
      expect(result.size).toBe(0);
    });

    it('includes spells from active bonus action free_spell features', () => {
      mockBuffsAndConditions([{ name: 'Mantle of Majesty' }], []);
      const stats = createStats({
        spellAbilities: { spells: [{ name: 'Command', casting_time: 'Action', prepared: 'Always' }] },
        automation: {
          bonusActions: [{
            name: 'Mantle of Majesty',
            type: 'free_spell',
            spell: 'Command',
            casting_time: '1 bonus action',
          }],
        },
      });
      const result = getBonusActionSpellNames(stats, 'test-campaign');
      expect(result).toEqual(new Set(['Command']));
    });

    it('excludes spells from inactive bonus action free_spell features', () => {
      const stats = createStats({
        spellAbilities: { spells: [{ name: 'Command', casting_time: 'Action', prepared: 'Always' }] },
        automation: {
          bonusActions: [{
            name: 'Mantle of Majesty',
            type: 'free_spell',
            spell: 'Command',
            casting_time: '1 bonus action',
          }],
        },
      });
      const result = getBonusActionSpellNames(stats, 'test-campaign');
      expect(result.size).toBe(0);
    });

    it('includes spells from active bonus action fey_reinforcements features', () => {
      mockBuffsAndConditions([{ name: 'Fey Presence' }], []);
      const stats = createStats({
        spellAbilities: { spells: [] },
        automation: {
          bonusActions: [{
            name: 'Fey Presence',
            type: 'fey_reinforcements',
            spell: 'Faerie Fire',
            casting_time: '1 bonus action',
          }],
        },
      });
      const result = getBonusActionSpellNames(stats, 'test-campaign');
      expect(result).toEqual(new Set(['Faerie Fire']));
    });

    it('excludes fey_reinforcements with wrong casting time', () => {
      mockBuffsAndConditions([{ name: 'Fey Presence' }], []);
      const stats = createStats({
        spellAbilities: { spells: [] },
        automation: {
          bonusActions: [{
            name: 'Fey Presence',
            type: 'fey_reinforcements',
            spell: 'Fireball',
            casting_time: '1 action',
          }],
        },
      });
      const result = getBonusActionSpellNames(stats, 'test-campaign');
      expect(result.size).toBe(0);
    });

    it('includes spells from active specialActions free_spell/misty_wanderer features', () => {
      mockBuffsAndConditions([{ name: 'Misty Wanderer' }], []);
      const stats = createStats({
        spellAbilities: { spells: [] },
        automation: {
          specialActions: [{
            name: 'Misty Wanderer',
            type: 'misty_wanderer',
            spell: 'Misty Step',
            casting_time: '1 bonus action',
          }],
        },
      });
      const result = getBonusActionSpellNames(stats, 'test-campaign');
      expect(result).toEqual(new Set(['Misty Step']));
    });

    it('excludes inactive specialActions features', () => {
      const stats = createStats({
        spellAbilities: { spells: [] },
        automation: {
          specialActions: [{
            name: 'Misty Wanderer',
            type: 'misty_wanderer',
            spell: 'Misty Step',
            casting_time: '1 bonus action',
          }],
        },
      });
      const result = getBonusActionSpellNames(stats, 'test-campaign');
      expect(result.size).toBe(0);
    });

    it('includes multiple spells from a feature with array spell value', () => {
      mockBuffsAndConditions([{ name: 'Mantle of Majesty' }], []);
      const stats = createStats({
        spellAbilities: { spells: [] },
        automation: {
          bonusActions: [{
            name: 'Mantle of Majesty',
            type: 'free_spell',
            spell: ['Command', 'Thaumaturgy'],
            casting_time: '1 bonus action',
          }],
        },
      });
      const result = getBonusActionSpellNames(stats, 'test-campaign');
      expect(result).toEqual(new Set(['Command', 'Thaumaturgy']));
    });

    it('includes both bonusActions and specialActions features', () => {
      mockBuffsAndConditions([{ name: 'Mantle of Majesty' }, { name: 'Misty Wanderer' }], []);
      const stats = createStats({
        spellAbilities: { spells: [] },
        automation: {
          bonusActions: [{
            name: 'Mantle of Majesty',
            type: 'free_spell',
            spell: 'Command',
            casting_time: '1 bonus action',
          }],
          specialActions: [{
            name: 'Misty Wanderer',
            type: 'misty_wanderer',
            spell: 'Misty Step',
            casting_time: '1 bonus action',
          }],
        },
      });
      const result = getBonusActionSpellNames(stats, 'test-campaign');
      expect(result).toEqual(new Set(['Command', 'Misty Step']));
    });

    it('returns empty set when spellAbilities is undefined', () => {
      const stats = createStats({ spellAbilities: undefined });
      const result = getBonusActionSpellNames(stats, 'test-campaign');
      expect(result).toEqual(new Set());
    });

    it('returns empty set when automation is undefined', () => {
      const stats = createStats({ automation: undefined });
      const result = getBonusActionSpellNames(stats, 'test-campaign');
      expect(result).toEqual(new Set());
    });

    it('skips features without a spell property', () => {
      mockBuffsAndConditions([{ name: 'Mantle of Majesty' }], []);
      const stats = createStats({
        automation: {
          bonusActions: [{
            name: 'Mantle of Majesty',
            type: 'free_spell',
            casting_time: '1 bonus action',
          }],
        },
      });
      const result = getBonusActionSpellNames(stats, 'test-campaign');
      expect(result.size).toBe(0);
    });

    it('skips features without casting_time', () => {
      mockBuffsAndConditions([{ name: 'Mantle of Majesty' }], []);
      const stats = createStats({
        automation: {
          bonusActions: [{
            name: 'Mantle of Majesty',
            type: 'free_spell',
            spell: 'Command',
          }],
        },
      });
      const result = getBonusActionSpellNames(stats, 'test-campaign');
      expect(result.size).toBe(0);
    });

    it('handles Elder Champion with try/catch returning false', () => {
      getRuntimeValue.mockImplementation(() => { throw new Error('store error'); });
      const stats = createStats({ spellAbilities: { spells: [actionSpell, bonusActionSpell] } });
      const result = getBonusActionSpellNames(stats, 'test-campaign');
      // Elder Champion throw should suppress action spells but still return bonus action spells
      expect(result).toEqual(new Set(['Shocking Grasp']));
    });
  });

  describe('getReactionSpellNames', () => {
    it('returns reaction spells', () => {
      const stats = createStats({ spellAbilities: { spells: [reactionSpell] } });
      const result = getReactionSpellNames(stats);
      expect(result).toEqual(new Set(['Shield']));
    });

    it('handles alternate casting time casing', () => {
      const stats = createStats({ spellAbilities: { spells: [reactionSpellAltCase] } });
      const result = getReactionSpellNames(stats);
      expect(result).toEqual(new Set(['Opportunity Attack']));
    });

    it('excludes non-reaction spells', () => {
      const stats = createStats({ spellAbilities: { spells: [actionSpell, bonusActionSpell] } });
      const result = getReactionSpellNames(stats);
      expect(result.size).toBe(0);
    });

    it('excludes unprepared reaction spells', () => {
      const stats = createStats({
        spellAbilities: { spells: [{ name: 'Hidden Reaction', casting_time: '1 reaction', prepared: 'Not Prepared', damage: '1d4' }] },
      });
      const result = getReactionSpellNames(stats);
      expect(result.size).toBe(0);
    });

    it('returns empty set when spellAbilities is undefined', () => {
      const stats = createStats({ spellAbilities: undefined });
      const result = getReactionSpellNames(stats);
      expect(result).toEqual(new Set());
    });

    it('returns empty set when spellAbilities.spells is undefined', () => {
      const stats = createStats({ spellAbilities: {} });
      const result = getReactionSpellNames(stats);
      expect(result).toEqual(new Set());
    });

    it('returns empty set when no spells provided', () => {
      const stats = createStats({ spellAbilities: { spells: [] } });
      const result = getReactionSpellNames(stats);
      expect(result).toEqual(new Set());
    });
  });

  describe('getExcludedSpellNames', () => {
    it('returns union of action, bonus, and reaction spell names', () => {
      const stats = createStats({
        spellAbilities: {
          spells: [actionSpell, bonusActionSpell, reactionSpell, alwaysSpell],
        },
      });
      const result = getExcludedSpellNames(stats, 'test-campaign');
      expect(result).toEqual(new Set(['Fireball', 'Shocking Grasp', 'Shield', 'Minor Illusion']));
    });

    it('excludes spells from automation features too', () => {
      mockBuffsAndConditions([{ name: 'Mantle of Majesty' }], []);
      const stats = createStats({
        spellAbilities: { spells: [actionSpell] },
        automation: {
          bonusActions: [{
            name: 'Mantle of Majesty',
            type: 'free_spell',
            spell: 'Command',
            casting_time: '1 bonus action',
          }],
        },
      });
      const result = getExcludedSpellNames(stats, 'test-campaign');
      expect(result).toEqual(new Set(['Fireball', 'Command']));
    });

    it('returns empty set when spellAbilities is undefined', () => {
      const stats = createStats({ spellAbilities: undefined });
      const result = getExcludedSpellNames(stats, 'test-campaign');
      expect(result).toEqual(new Set());
    });

    it('respects Elder Champion suppression for action spells', () => {
      const ecBuff = [{ name: 'Elder Champion' }];
      getRuntimeValue.mockImplementation(() => ecBuff);
      const stats = createStats({
        spellAbilities: { spells: [actionSpell, bonusActionSpell] },
      });
      const actionResult = getActionSpellNames(stats, 'test-campaign');
      expect(actionResult).toEqual(new Set());

      const bonusResult = getBonusActionSpellNames(stats, 'test-campaign');
      // Elder Champion moves action spells to bonus actions, so both appear
      expect(bonusResult).toEqual(new Set(['Fireball', 'Shocking Grasp']));

      const result = getExcludedSpellNames(stats, 'test-campaign');
      // Action spells suppressed from actions, but bonus actions include both
      expect(result).toEqual(new Set(['Fireball', 'Shocking Grasp']));
    });
  });
});
