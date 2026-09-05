import { describe, it, expect, vi, beforeEach } from 'vitest';

import { findFeat } from '../../services/shared/featFinder.js';
import {
  computeFeatBuffs,
  computeAllFeatBuffs,
} from './featBuffService.js';
import { collectAutomationFromFeatures } from '../combat/automation/automationCollector.js';

vi.mock('../../services/shared/featFinder.js', () => ({
  findFeat: vi.fn(),
}));

const RITUAL_MASTER_FEAT = {
  name: 'Ritual Master',
  type: 'General Feat',
  benefits: [
    {
      name: 'Ability Score Increase',
      description: 'Increase your Intelligence, Wisdom, or Charisma score by 1, to a maximum of 20.',
      type: 'ability_score_increase',
    },
    {
      name: 'Ritual Spells',
      description: 'Choose a number of level 1 spells equal to your Proficiency Bonus that have the Ritual tag.',
      type: 'spell',
      automation: {
        type: 'ritual_spells',
        effect: 'ritual_spells',
        chosenSpells: true,
        quickRitual: true,
        casting_time: 'passive',
      },
    },
    {
      name: 'Quick Ritual',
      description: 'With this benefit, you can cast a Ritual spell that you have prepared using its regular casting time rather than the extended time for a Ritual.',
      type: 'utility',
    },
  ],
  ability_score_increase: {
    scores: ['Intelligence', 'Wisdom', 'Charisma'],
    amount: 1,
    max_value: 20,
  },
};

describe('FT-068 Ritual Master feat buffs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('computeFeatBuffs parses the Ritual Spells spell benefit with its chosen-spells automation', () => {
    const buffs = computeFeatBuffs(RITUAL_MASTER_FEAT, '2024');
    const spellFeature = buffs.features.find(f => f.name === 'Ritual Spells');
    expect(spellFeature).toBeDefined();
    expect(spellFeature.automation.type).toBe('ritual_spells');
    expect(spellFeature.automation.effect).toBe('ritual_spells');
    expect(spellFeature.automation.chosenSpells).toBe(true);
    expect(spellFeature.automation.quickRitual).toBe(true);
  });

  it('computeAllFeatBuffs threads the feat ASI choice into the ritual_spells automation spellCastingAbility', () => {
    findFeat.mockImplementation(name => (name === 'Ritual Master' ? RITUAL_MASTER_FEAT : null));
    const result = computeAllFeatBuffs({
      rules: '2024',
      feats: ['Ritual Master'],
      featAbilityChoices: { 'Ritual Master-2': { assignment: 'Charisma' } },
    }, [RITUAL_MASTER_FEAT]);

    const spellFeature = result.features.find(f => f.automation?.effect === 'ritual_spells');
    expect(spellFeature).toBeDefined();
    expect(spellFeature.featName).toBe('Ritual Master');
    expect(spellFeature.automation.spellCastingAbility).toBe('Charisma');
  });

  it('collects the feat ritual_spells automation into the ritualSpells bucket with its markers', () => {
    findFeat.mockImplementation(name => (name === 'Ritual Master' ? RITUAL_MASTER_FEAT : null));
    const buffs = computeAllFeatBuffs({
      rules: '2024',
      feats: ['Ritual Master'],
      featAbilityChoices: { 'Ritual Master-2': { assignment: 'Charisma' } },
    }, [RITUAL_MASTER_FEAT]);

    const spellFeature = buffs.features.find(f => f.automation?.effect === 'ritual_spells');
    const collected = collectAutomationFromFeatures([
      { name: spellFeature.name, type: spellFeature.type, automation: spellFeature.automation },
    ], {});

    expect(collected.ritualSpells).toHaveLength(1);
    expect(collected.ritualSpells[0].name).toBe('Ritual Spells');
    expect(collected.ritualSpells[0].effect).toBe('ritual_spells');
    expect(collected.ritualSpells[0].chosenSpells).toBe(true);
    expect(collected.ritualSpells[0].quickRitual).toBe(true);
    expect(collected.ritualSpells[0].spellCastingAbility).toBe('Charisma');
  });
});
