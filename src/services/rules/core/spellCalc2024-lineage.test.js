// @improved-by-ai
// @cleaned-by-ai
// @cleaned-by-ai
// @improved-by-ai
// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSpellAbilities } from './spellCalc2024.js';

// ── Module-level mocks for all ESM dependencies ──
vi.mock('../../character/classRules2024.js', () => ({
  default: {
    getHighestMajorLevel: vi.fn(() => undefined),
  },
}));

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn((_key, _prop) => null),
}));

// ── Helpers ──

function makePlayerStats(overrides = {}) {
  return {
    name: 'TestCharacter',
    level: 1,
    proficiency: 2,
    class: {
      name: 'Wizard',
      class_levels: [{ level: 1, spellcasting: { cantrips_known: 3, spell_slots_level_1: 2, spell_slots_level_2: 0, spell_slots_level_3: 0, spell_slots_level_4: 0, spell_slots_level_5: 0, spell_slots_level_6: 0, spell_slots_level_7: 0, spell_slots_level_8: 0, spell_slots_level_9: 0, spell_type: 'prepared' } }],
      spell_casting_ability: 'Intelligence',
      ...overrides.class,
    },
    abilities: [
      { name: 'Intelligence', baseScore: 16, featIncrease: 0, miscIncrease: 0, backgroundIncrease: 0, bonus: 3 },
    ],
    spells: [],
    automation: {},
    ...overrides,
  };
}

function makeSpell(name, level = 0, extra = {}) {
  return { name, level, damage: {}, casting_time: '1 action', range: 'Self', ...extra };
}

describe('spellCalc2024-lineage', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await import('../../../hooks/runtime/useRuntimeState.js');
    await import('../../character/classRules2024.js');
  });

  describe('getSpellAbilities', () => {
    // ── Automation: elfish_lineage ──

    it('adds elfish lineage cantrip, level 3, and level 5 spells when lineage matches', () => {
      const allSpells = [
        makeSpell('Blade Ward', 0),
        makeSpell('Burning Hands', 1),
        makeSpell('Crown of Madness', 1),
      ];

      const stats = makePlayerStats();
      stats.automation = {
        passives: [{
          type: 'elfish_lineage',
          options: [{ name: 'Shadow Magic', spellcastingAbility: 'Charisma', cantrip: 'Blade Ward', level3Spell: 'Burning Hands', level5Spell: 'Crown of Madness' }],
        }],
      };

      const result = getSpellAbilities(allSpells, stats, { campaignName: 'TestCampaign', race: { name: 'Elf', subrace: { name: 'Shadow Magic' } } });

      const names = result.spells.map(s => s.name);
      expect(names).toContain('Blade Ward');
      expect(names).toContain('Burning Hands');
      expect(names).toContain('Crown of Madness');
    });

    it('does not add elfish lineage spells when lineage does not match', () => {
      const stats = makePlayerStats();
      stats.automation = {
        passives: [{
          type: 'elfish_lineage',
          options: [{ name: 'Shadow Magic', spellcastingAbility: 'Charisma', cantrip: 'Blade Ward' }],
        }],
      };

      const result = getSpellAbilities([], stats, { campaignName: 'TestCampaign', race: { name: 'Elf', subrace: { name: 'Wood Elf' } } });

      expect(result.spells).toHaveLength(0);
    });

    // ── Automation: gnomish_lineage ──

    it('adds gnomish lineage spells when lineage matches', () => {
      const allSpells = [
        makeSpell('Friends', 0),
        makeSpell('Web', 1),
        makeSpell('Hold Monster', 1),
      ];

      const stats = makePlayerStats();
      stats.automation = {
        passives: [{
          type: 'gnomish_lineage',
          options: [{ name: 'Deep Gnome', spellcastingAbility: 'Intelligence', cantrip: 'Friends', level3Spell: 'Web', level5Spell: 'Hold Monster' }],
        }],
      };

      const result = getSpellAbilities(allSpells, stats, { campaignName: 'TestCampaign', race: { name: 'Gnome', subrace: { name: 'Deep Gnome' } } });

      const names = result.spells.map(s => s.name);
      expect(names).toContain('Friends');
      expect(names).toContain('Web');
      expect(names).toContain('Hold Monster');
    });

    // ── Automation: fiendish_legacy ──

    it('adds fiendish legacy spells when legacy matches', () => {
      const allSpells = [
        makeSpell('Infestation', 0),
        makeSpell('Scorching Ray', 1),
        makeSpell('Dominate Person', 1),
      ];

      const stats = makePlayerStats();
      stats.automation = {
        passives: [{
          type: 'fiendish_legacy',
          options: [{ name: 'Fiend', spellcastingAbility: 'Charisma', cantrip: 'Infestation', level3Spell: 'Scorching Ray', level5Spell: 'Dominate Person' }],
        }],
      };

      const result = getSpellAbilities(allSpells, stats, { campaignName: 'TestCampaign', race: { name: 'Tiefling', subrace: { name: 'Fiend Tiefling' } } });

      const names = result.spells.map(s => s.name);
      expect(names).toContain('Infestation');
      expect(names).toContain('Scorching Ray');
      expect(names).toContain('Dominate Person');
    });

    it('creates spellAbilities for non-spellcasting character with fiendish legacy', () => {
      const allSpells = [
        makeSpell('Fire Bolt', 0),
        makeSpell('Hellish Rebuke', 1),
        makeSpell('Darkness', 2),
      ];

      const stats = makePlayerStats({
        class: {
          name: 'Fighter',
          class_levels: [{ level: 3 }],
          spell_casting_ability: 'Intelligence',
        },
        abilities: [
          { name: 'Charisma', baseScore: 16, featIncrease: 0, miscIncrease: 0, backgroundIncrease: 0, bonus: 3 },
        ],
        automation: {
          specialActions: [{
            type: 'fiendish_legacy',
            options: [{ name: 'Infernal', spellcastingAbility: 'Charisma', cantrip: 'Fire Bolt', level3Spell: 'Hellish Rebuke', level5Spell: 'Darkness' }],
          }],
        },
      });

      const result = getSpellAbilities(allSpells, stats, { campaignName: 'TestCampaign', race: { name: 'Tiefling', subrace: { name: 'Infernal Tiefling' } } });

      expect(result).not.toBeNull();
      const names = result.spells.map(s => s.name);
      expect(names).toContain('Fire Bolt');
      expect(names).toContain('Hellish Rebuke');
      expect(names).toContain('Darkness');
      expect(result.spellCastingAbility).toBe('Charisma');
      expect(result.cantrips_known).toBe(1);
      expect(result.spells_known).toBe(2);
      expect(result.modifier).toBe(3);
      expect(result.toHit).toBe(5);
      expect(result.saveDc).toBe(13);
    });
  });
});
