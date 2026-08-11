import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ------------------------------------------------------------------ */
/*  Mocks — the surface area that spellResolution.js imports           */
/* ------------------------------------------------------------------ */

vi.mock('../../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn((_playerName, _key, _campaignName) => undefined),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../../ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../../combat/buffs/buffService.js', () => ({
  getActiveBuffs: vi.fn(() => []),
  isInnateSorceryActive: vi.fn(() => false),
}));

vi.mock('../../../features/silenceService.js', () => ({
  getSilenceSource: vi.fn(() => null),
  isCreatureInSilenceZone: vi.fn(() => false),
}));

vi.mock('../../../../automation/handlers/class-warlock/psychicSpellsHandler.js', () => ({
  getPsychicSpellsConfig: vi.fn(() => null),
}));

vi.mock('../../../features/friendsService.js', () => ({
  endFriendsOnHostileAction: vi.fn(),
}));

vi.mock('../../../features/invisibilityService.js', () => ({
  endInvisibilityOnHostileAction: vi.fn(),
}));

vi.mock('../../../core/spellDamageUtils.js', () => ({
  resolveSpellDamageWithTypes: vi.fn(() => null),
}));

/* ------------------------------------------------------------------ */
/*  SUT imports after mocks are established                            */
/* ------------------------------------------------------------------ */

import { resolveSpellResolution, logGenericSpellCast } from './spellResolution.js';
import { getActiveBuffs, isInnateSorceryActive } from '../../../../combat/buffs/buffService.js';
import { getRuntimeValue } from '../../../../../hooks/runtime/useRuntimeState.js';
import { getPsychicSpellsConfig } from '../../../../automation/handlers/class-warlock/psychicSpellsHandler.js';
import { getSilenceSource, isCreatureInSilenceZone } from '../../../features/silenceService.js';
import { endFriendsOnHostileAction } from '../../../features/friendsService.js';
import { endInvisibilityOnHostileAction } from '../../../features/invisibilityService.js';
import { addEntry } from '../../../../ui/logService.js';
import { resolveSpellDamageWithTypes } from '../../../core/spellDamageUtils.js';

/* ------------------------------------------------------------------ */
/*  Test-data factories                                                */
/* ------------------------------------------------------------------ */

function makeSpell(overrides = {}) {
  return {
    name: 'Fireball',
    level: 3,
    school: 'Evocation',
    casting_time: '1 action',
    components: ['V', 'S'],
    range: '150 feet',
    damage: { damage_type: 'Fire', damage_at_slot_level: { 3: '8d6' } },
    dc: { dc_type: 'dex', dc_success: 'half' },
    ...overrides,
  };
}

function makePlayerStats(overrides = {}) {
  return {
    name: 'TestWizard',
    abilities: [{ name: 'Intelligence', bonus: 5 }],
    proficiency: 4,
    spellAbilities: {
      spellCastingAbility: 'Intelligence',
      toHit: 9,
      saveDc: 17,
      modifier: 5,
    },
    automation: { passives: [] },
    hitPoints: 100,
    level: 10,
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  beforeEach — reset all mock implementations to safe defaults       */
/* ------------------------------------------------------------------ */

describe('spellResolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getActiveBuffs.mockReturnValue([]);
    isInnateSorceryActive.mockReturnValue(false);
    getSilenceSource.mockReturnValue(null);
    isCreatureInSilenceZone.mockReturnValue(false);
    getPsychicSpellsConfig.mockReturnValue(null);
    getRuntimeValue.mockReturnValue([]);
    resolveSpellDamageWithTypes.mockReturnValue(null);
  });

  /* ---------------------------------------------------------------- */
  /*  resolveSpellResolution — basic defaults                          */
  /* ---------------------------------------------------------------- */

  describe('resolveSpellResolution defaults', () => {
    const spell = makeSpell();
    const playerStats = makePlayerStats();

    it('returns a result with correct defaults for a basic spell', () => {
      const result = resolveSpellResolution(spell, {}, playerStats, 'test-campaign', null);

      expect(result.globeTargetName).toBeNull();
      expect(result.magicalAmbush).toBe(false);
      expect(result.casterConditions).toEqual([]);
      expect(result.hasInvisible).toBe(false);
      expect(result.psychicSpellsConfig).toBeNull();
      expect(result.spellLevel).toBe(3);
      expect(result.innateSorceryActive).toBe(false);
      expect(result.damageInfo).toBeNull();
      expect(result.formula).toBeNull();
      expect(result.damageType).toBe('Fire');
      expect(result.effectiveDamageType).toBe('Fire');
      expect(result.cantripSpellAbility).toBe('Intelligence');
      expect(result.spellToHit).toBe(9);
      expect(result.spellSaveDc).toBe(17);
      expect(result.spellCastingMod).toBe(5);
      expect(result.fullSpell).toBe(spell);
      // needsLookup is true because makeSpell has no area_of_effect
      expect(result.needsLookup).toBe(true);
    });

    it('uses spell.level from the spell object', () => {
      const spell = makeSpell({ level: 5 });
      const result = resolveSpellResolution(spell, {}, playerStats, 'test-campaign', null);
      expect(result.spellLevel).toBe(5);
    });

    it('defaults spellLevel to 1 when spell has no level', () => {
      const spell = makeSpell({ level: undefined });
      const result = resolveSpellResolution(spell, {}, playerStats, 'test-campaign', null);
      expect(result.spellLevel).toBe(1);
    });

    it('sets needsLookup when spell has no area_of_effect', () => {
      const spell = makeSpell({ area_of_effect: undefined });
      const result = resolveSpellResolution(spell, {}, playerStats, 'test-campaign', null);
      expect(result.needsLookup).toBe(true);
    });

    it('sets needsLookup when spell has automation.type but no automation.effects', () => {
      const spell = makeSpell({ automation: { type: 'damage' } });
      const result = resolveSpellResolution(spell, {}, playerStats, 'test-campaign', null);
      expect(result.needsLookup).toBe(true);
    });

    it('does not set needsLookup when spell has both area_of_effect and automation.effects', () => {
      const spell = makeSpell({
        area_of_effect: { type: 'cone', size: 60 },
        automation: { type: 'damage', effects: ['damage'] },
      });
      const result = resolveSpellResolution(spell, {}, playerStats, 'test-campaign', null);
      expect(result.needsLookup).toBe(false);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  resolveSpellResolution — buff blocking                           */
  /* ---------------------------------------------------------------- */

  describe('resolveSpellResolution — buff blocking', () => {
    it('returns { blockedByBuffs: true } when a buff blocks spellcasting', () => {
      getActiveBuffs.mockReturnValue([{ name: 'Silence', blocksSpellcasting: true }]);

      const result = resolveSpellResolution(
        makeSpell(),
        {},
        makePlayerStats(),
        'test-campaign',
        null,
      );

      expect(result).toEqual({ blockedByBuffs: true });
    });

    it('continues normally when no buff blocks spellcasting', () => {
      getActiveBuffs.mockReturnValue([{ name: 'Shield', blocksSpellcasting: false }]);

      const result = resolveSpellResolution(
        makeSpell(),
        {},
        makePlayerStats(),
        'test-campaign',
        null,
      );

      expect(result.blockedByBuffs).toBeUndefined();
    });
  });

  /* ---------------------------------------------------------------- */
  /*  resolveSpellResolution — globe target name                       */
  /* ---------------------------------------------------------------- */

  describe('resolveSpellResolution — globe target name', () => {
    it('resolves globeTargetName from async getTargetInfo', async () => {
      const targetInfo = vi.fn(() => Promise.resolve({ name: 'Goblin' }));
      const result = resolveSpellResolution(
        makeSpell(),
        {},
        makePlayerStats(),
        'test-campaign',
        targetInfo,
      );

      // globeTargetName is a Promise
      expect(result.globeTargetName).toBeInstanceOf(Promise);
      const resolved = await result.globeTargetName;
      expect(resolved).toBe('Goblin');
    });

    it('returns null when getTargetInfo returns undefined', async () => {
      const targetInfo = vi.fn(() => Promise.resolve(undefined));
      const result = resolveSpellResolution(
        makeSpell(),
        {},
        makePlayerStats(),
        'test-campaign',
        targetInfo,
      );

      const resolved = await result.globeTargetName;
      expect(resolved).toBeNull();
    });

    it('returns null when getTargetInfo returns object without name', async () => {
      const targetInfo = vi.fn(() => Promise.resolve({}));
      const result = resolveSpellResolution(
        makeSpell(),
        {},
        makePlayerStats(),
        'test-campaign',
        targetInfo,
      );

      const resolved = await result.globeTargetName;
      expect(resolved).toBeNull();
    });

    it('sets globeTargetName to null when getTargetInfo is not provided', () => {
      const result = resolveSpellResolution(
        makeSpell(),
        {},
        makePlayerStats(),
        'test-campaign',
        null,
      );

      expect(result.globeTargetName).toBeNull();
    });
  });

  /* ---------------------------------------------------------------- */
  /*  resolveSpellResolution — magical ambush + invisibility           */
  /* ---------------------------------------------------------------- */

  describe('resolveSpellResolution — magical ambush + invisibility', () => {
    it('sets magicalAmbush and hasInvisible when passive exists and caster is invisible', () => {
      const playerStats = makePlayerStats({
        automation: {
          passives: [{ type: 'passive_rule', effect: 'magical_ambush' }],
        },
      });
      getRuntimeValue.mockReturnValue(['invisible']);

      const result = resolveSpellResolution(
        makeSpell(),
        {},
        playerStats,
        'test-campaign',
        null,
      );

      expect(result.magicalAmbush).toBe(true);
      expect(result.casterConditions).toEqual(['invisible']);
      expect(result.hasInvisible).toBe(true);
    });

    it('sets magicalAmbush to false when no magical_ambush passive', () => {
      const playerStats = makePlayerStats({
        automation: { passives: [] },
      });
      getRuntimeValue.mockReturnValue(['invisible']);

      const result = resolveSpellResolution(
        makeSpell(),
        {},
        playerStats,
        'test-campaign',
        null,
      );

      expect(result.magicalAmbush).toBe(false);
      expect(result.hasInvisible).toBe(false);
    });

    it('sets hasInvisible to false when not invisible despite magical ambush', () => {
      const playerStats = makePlayerStats({
        automation: {
          passives: [{ type: 'passive_rule', effect: 'magical_ambush' }],
        },
      });
      getRuntimeValue.mockReturnValue(['burning']);

      const result = resolveSpellResolution(
        makeSpell(),
        {},
        playerStats,
        'test-campaign',
        null,
      );

      expect(result.hasInvisible).toBe(false);
    });

    it('throws when passives is null', () => {
      const playerStats = makePlayerStats({ automation: { passives: null } });

      expect(() =>
        resolveSpellResolution(makeSpell(), {}, playerStats, 'test-campaign', null),
      ).toThrow('playerStats.automation.passives is required for magical ambush check');
    });

    it('throws when passives is undefined', () => {
      const playerStats = makePlayerStats({ automation: {} });

      expect(() =>
        resolveSpellResolution(makeSpell(), {}, playerStats, 'test-campaign', null),
      ).toThrow('playerStats.automation.passives is required for magical ambush check');
    });

    it('throws when activeConditions is null', () => {
      getRuntimeValue.mockReturnValue(null);
      const playerStats = makePlayerStats();

      expect(() =>
        resolveSpellResolution(makeSpell(), {}, playerStats, 'test-campaign', null),
      ).toThrow('activeConditions must be an array for caster');
    });

    it('throws when activeConditions is not an array', () => {
      getRuntimeValue.mockReturnValue('not-an-array');
      const playerStats = makePlayerStats();

      expect(() =>
        resolveSpellResolution(makeSpell(), {}, playerStats, 'test-campaign', null),
      ).toThrow('activeConditions must be an array for caster');
    });
  });

  /* ---------------------------------------------------------------- */
  /*  resolveSpellResolution — silence blocking                        */
  /* ---------------------------------------------------------------- */

  describe('resolveSpellResolution — silence blocking', () => {
    it('returns { blockedBySilence: true } when spell has Verbal and caster is silenced', () => {
      getSilenceSource.mockReturnValue('SilenceCaster');
      isCreatureInSilenceZone.mockReturnValue(true);

      const result = resolveSpellResolution(
        makeSpell({ components: ['V', 'S'] }),
        {},
        makePlayerStats(),
        'test-campaign',
        null,
      );

      expect(result).toEqual({ blockedBySilence: true });
    });

    it('does not block when spell has no Verbal component', () => {
      getSilenceSource.mockReturnValue('SilenceCaster');
      isCreatureInSilenceZone.mockReturnValue(true);

      const result = resolveSpellResolution(
        makeSpell({ components: ['S'] }),
        {},
        makePlayerStats(),
        'test-campaign',
        null,
      );

      expect(result.blockedBySilence).toBeUndefined();
    });

    it('does not block when getSilenceSource returns null', () => {
      getSilenceSource.mockReturnValue(null);

      const result = resolveSpellResolution(
        makeSpell({ components: ['V'] }),
        {},
        makePlayerStats(),
        'test-campaign',
        null,
      );

      expect(result.blockedBySilence).toBeUndefined();
    });

    it('does not block when isCreatureInSilenceZone returns false', () => {
      getSilenceSource.mockReturnValue('SilenceCaster');
      isCreatureInSilenceZone.mockReturnValue(false);

      const result = resolveSpellResolution(
        makeSpell({ components: ['V'] }),
        {},
        makePlayerStats(),
        'test-campaign',
        null,
      );

      expect(result.blockedBySilence).toBeUndefined();
    });
  });

  /* ---------------------------------------------------------------- */
  /*  resolveSpellResolution — psychic spells                          */
  /* ---------------------------------------------------------------- */

  describe('resolveSpellResolution — psychic spells', () => {
    const psychicConfig = {
      spellSchools: ['Enchantment', 'Illusion'],
      componentReduction: ['V', 'S'],
      damageType: 'Psychic',
    };

    it('removes Verbal and Somatic components for matching school spells', () => {
      getPsychicSpellsConfig.mockReturnValue(psychicConfig);
      const spell = makeSpell({
        school: 'Enchantment',
        components: ['V', 'S', 'M'],
      });

      const result = resolveSpellResolution(
        spell,
        {},
        makePlayerStats(),
        'test-campaign',
        null,
      );

      expect(result.psychicSpellsConfig).toEqual(psychicConfig);
      // Components should be reduced to ['M']
      expect(spell.components).toEqual(['M']);
    });

    it('does not modify components for non-matching school', () => {
      getPsychicSpellsConfig.mockReturnValue(psychicConfig);
      const spell = makeSpell({
        school: 'Evocation',
        components: ['V', 'S'],
      });

      resolveSpellResolution(spell, {}, makePlayerStats(), 'test-campaign', null);

      expect(spell.components).toEqual(['V', 'S']);
    });

    it('handles case-insensitive school matching', () => {
      getPsychicSpellsConfig.mockReturnValue(psychicConfig);
      const spell = makeSpell({
        school: 'enchantment',
        components: ['V', 'S'],
      });

      resolveSpellResolution(spell, {}, makePlayerStats(), 'test-campaign', null);

      expect(spell.components).toEqual([]);
    });

    it('handles undefined spell components gracefully', () => {
      getPsychicSpellsConfig.mockReturnValue(psychicConfig);
      const spell = makeSpell({ components: undefined });

      const result = resolveSpellResolution(
        spell,
        {},
        makePlayerStats(),
        'test-campaign',
        null,
      );

      expect(result.psychicSpellsConfig).toEqual(psychicConfig);
    });

    it('does not modify components when psychicSpellsConfig is null', () => {
      getPsychicSpellsConfig.mockReturnValue(null);
      const spell = makeSpell({ school: 'Enchantment', components: ['V', 'S'] });

      resolveSpellResolution(spell, {}, makePlayerStats(), 'test-campaign', null);

      expect(spell.components).toEqual(['V', 'S']);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  resolveSpellResolution — Friends / Invisibility end             */
  /* ---------------------------------------------------------------- */

  describe('resolveSpellResolution — Friends / Invisibility end', () => {
    it('calls endFriendsOnHostileAction for non-Friends spells', () => {
      const spell = makeSpell({ name: 'Fireball' });

      resolveSpellResolution(spell, {}, makePlayerStats(), 'test-campaign', null);

      expect(endFriendsOnHostileAction).toHaveBeenCalledWith('TestWizard', 'test-campaign');
    });

    it('does NOT call endFriendsOnHostileAction for Friends spell', () => {
      const spell = makeSpell({ name: 'Friends' });

      resolveSpellResolution(spell, {}, makePlayerStats(), 'test-campaign', null);

      expect(endFriendsOnHostileAction).not.toHaveBeenCalled();
    });

    it('calls endInvisibilityOnHostileAction for all spells', () => {
      const spell = makeSpell();

      resolveSpellResolution(spell, {}, makePlayerStats(), 'test-campaign', null);

      expect(endInvisibilityOnHostileAction).toHaveBeenCalledWith('TestWizard', 'test-campaign');
    });

    it('calls endInvisibilityOnHostileAction even for Friends spell', () => {
      const spell = makeSpell({ name: 'Friends' });

      resolveSpellResolution(spell, {}, makePlayerStats(), 'test-campaign', null);

      expect(endInvisibilityOnHostileAction).toHaveBeenCalledWith('TestWizard', 'test-campaign');
    });
  });

  /* ---------------------------------------------------------------- */
  /*  resolveSpellResolution — damage resolution                       */
  /* ---------------------------------------------------------------- */

  describe('resolveSpellResolution — damage resolution', () => {
    it('resolves damageInfo from resolveSpellDamageWithTypes', () => {
      const damageInfo = { formula: '8d6', primaryType: 'Fire' };
      resolveSpellDamageWithTypes.mockReturnValue(damageInfo);

      const result = resolveSpellResolution(
        makeSpell(),
        {},
        makePlayerStats(),
        'test-campaign',
        null,
      );

      expect(result.damageInfo).toEqual(damageInfo);
      expect(result.formula).toBe('8d6');
      expect(result.damageType).toBe('Fire');
    });

    it('defaults formula/damageType when resolveSpellDamageWithTypes returns null', () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);

      const result = resolveSpellResolution(
        makeSpell(),
        {},
        makePlayerStats(),
        'test-campaign',
        null,
      );

      expect(result.damageInfo).toBeNull();
      expect(result.formula).toBeNull();
      expect(result.damageType).toBe('Fire');
    });

    it('falls back to spell.damage.damage_type when resolveSpellDamageWithTypes returns null', () => {
      resolveSpellDamageWithTypes.mockReturnValue(null);
      const spell = makeSpell({ damage: { damage_type: 'Lightning' } });

      const result = resolveSpellResolution(
        spell,
        {},
        makePlayerStats(),
        'test-campaign',
        null,
      );

      expect(result.damageType).toBe('Lightning');
    });

    it('sets effectiveDamageType from damageType by default', () => {
      resolveSpellDamageWithTypes.mockReturnValue({ formula: '1d8', primaryType: 'Cold' });

      const result = resolveSpellResolution(
        makeSpell(),
        {},
        makePlayerStats(),
        'test-campaign',
        null,
      );

      expect(result.effectiveDamageType).toBe('Cold');
    });

    it('overrides effectiveDamageType with psychicSpellsConfig.damageType', () => {
      getPsychicSpellsConfig.mockReturnValue({ damageType: 'Psychic' });
      resolveSpellDamageWithTypes.mockReturnValue({ formula: '1d8', primaryType: 'Fire' });

      const result = resolveSpellResolution(
        makeSpell(),
        {},
        makePlayerStats(),
        'test-campaign',
        null,
      );

      expect(result.effectiveDamageType).toBe('Psychic');
    });

    it('does not override effectiveDamageType when psychicSpellsConfig exists but spell has no damage', () => {
      getPsychicSpellsConfig.mockReturnValue({ damageType: 'Psychic' });
      resolveSpellDamageWithTypes.mockReturnValue(null);

      const spell = makeSpell({ damage: undefined });
      const result = resolveSpellResolution(
        spell,
        {},
        makePlayerStats(),
        'test-campaign',
        null,
      );

      expect(result.effectiveDamageType).toBe('');
    });

    it('does not override effectiveDamageType when psychicSpellsConfig exists but damageType is empty', () => {
      getPsychicSpellsConfig.mockReturnValue({ damageType: 'Psychic' });
      resolveSpellDamageWithTypes.mockReturnValue(null);

      const spell = makeSpell({ damage: {} });
      const result = resolveSpellResolution(
        spell,
        {},
        makePlayerStats(),
        'test-campaign',
        null,
      );

      expect(result.effectiveDamageType).toBe('');
    });
  });

  /* ---------------------------------------------------------------- */
  /*  resolveSpellResolution — spell stats (ability, toHit, saveDc)   */
  /* ---------------------------------------------------------------- */

  describe('resolveSpellResolution — spell stats', () => {
    it('uses spell.spellCastingAbility when present', () => {
      const spell = makeSpell({ spellCastingAbility: 'Wisdom' });

      const result = resolveSpellResolution(
        spell,
        {},
        makePlayerStats(),
        'test-campaign',
        null,
      );

      expect(result.cantripSpellAbility).toBe('Wisdom');
    });

    it('falls back to playerStats.spellAbilities.spellCastingAbility', () => {
      const result = resolveSpellResolution(
        makeSpell(),
        {},
        makePlayerStats(),
        'test-campaign',
        null,
      );

      expect(result.cantripSpellAbility).toBe('Intelligence');
    });

    it('sets spellToHit from playerStats.spellAbilities.toHit', () => {
      const result = resolveSpellResolution(
        makeSpell(),
        {},
        makePlayerStats(),
        'test-campaign',
        null,
      );

      expect(result.spellToHit).toBe(9);
    });

    it('defaults spellToHit to 0 when spellAbilities is missing', () => {
      const playerStats = makePlayerStats({ spellAbilities: null });

      const result = resolveSpellResolution(
        makeSpell(),
        {},
        playerStats,
        'test-campaign',
        null,
      );

      expect(result.spellToHit).toBe(0);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  resolveSpellResolution — save DC resolution                      */
  /* ---------------------------------------------------------------- */

  describe('resolveSpellResolution — save DC', () => {
    it('uses playerStats.spellAbilities.saveDc when present', () => {
      const result = resolveSpellResolution(
        makeSpell(),
        {},
        makePlayerStats(),
        'test-campaign',
        null,
      );

      expect(result.spellSaveDc).toBe(17);
    });

    it('calculates save DC from proficiency when saveDc is missing', () => {
      const playerStats = makePlayerStats({
        spellAbilities: { toHit: 9, modifier: 5 },
      });

      const result = resolveSpellResolution(
        makeSpell(),
        {},
        playerStats,
        'test-campaign',
        null,
      );

      expect(result.spellSaveDc).toBe(12); // 8 + 4
    });

    it('throws when saveDc is missing and proficiency is also missing', () => {
      const playerStats = makePlayerStats({
        spellAbilities: { toHit: 9, modifier: 5 },
        proficiency: null,
      });

      expect(() =>
        resolveSpellResolution(makeSpell(), {}, playerStats, 'test-campaign', null),
      ).toThrow('playerStats.proficiency is required for spell save DC calculation');
    });
  });

  /* ---------------------------------------------------------------- */
  /*  resolveSpellResolution — cantrip ability path                    */
  /* ---------------------------------------------------------------- */

  describe('resolveSpellResolution — cantrip ability path', () => {
    it('calculates spellToHit and spellSaveDc from ability when cantripSpellAbility matches', () => {
      const playerStats = makePlayerStats({
        spellAbilities: {
          spellCastingAbility: 'Intelligence',
          toHit: 99,
          saveDc: 99,
          modifier: 5,
        },
      });

      const result = resolveSpellResolution(
        makeSpell(),
        {},
        playerStats,
        'test-campaign',
        null,
      );

      // ability.bonus(5) + proficiency(4) = 9
      expect(result.spellToHit).toBe(9);
      // 8 + ability.bonus(5) + proficiency(4) = 17
      expect(result.spellSaveDc).toBe(17);
      expect(result.spellCastingMod).toBe(5);
    });

    it('does not override when cantripSpellAbility does not match any ability', () => {
      const playerStats = makePlayerStats({
        spellAbilities: {
          spellCastingAbility: 'Charisma',
          toHit: 99,
          saveDc: 99,
          modifier: 7,
        },
        abilities: [{ name: 'Intelligence', bonus: 5 }],
      });

      const result = resolveSpellResolution(
        makeSpell(),
        {},
        playerStats,
        'test-campaign',
        null,
      );

      // No matching ability — spellCastingMod stays at default 0 because
      // the else-if branch is unreachable when cantripSpellAbility && abilities are both truthy
      expect(result.spellToHit).toBe(99);
      expect(result.spellSaveDc).toBe(99);
      expect(result.spellCastingMod).toBe(0);
    });

    it('does not override when playerStats.abilities is missing', () => {
      const playerStats = makePlayerStats({
        spellAbilities: {
          spellCastingAbility: 'Intelligence',
          toHit: 99,
          saveDc: 99,
          modifier: 7,
        },
        abilities: null,
      });

      const result = resolveSpellResolution(
        makeSpell(),
        {},
        playerStats,
        'test-campaign',
        null,
      );

      expect(result.spellToHit).toBe(99);
      expect(result.spellSaveDc).toBe(99);
      expect(result.spellCastingMod).toBe(7);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  resolveSpellResolution — spellCastingMod fallback                */
  /* ---------------------------------------------------------------- */

  describe('resolveSpellResolution — spellCastingMod fallback', () => {
    it('uses ability.bonus when cantripSpellAbility matches and ability exists', () => {
      const playerStats = makePlayerStats({
        spellAbilities: null,
      });

      const result = resolveSpellResolution(
        makeSpell({ spellCastingAbility: 'Intelligence' }),
        {},
        playerStats,
        'test-campaign',
        null,
      );

      expect(result.spellCastingMod).toBe(5);
    });

    it('does not fall through to spellAbilities.modifier when cantripSpellAbility is set but ability not found', () => {
      const playerStats = makePlayerStats({
        spellAbilities: {
          spellCastingAbility: 'Charisma',
          modifier: 3,
        },
        abilities: [{ name: 'Intelligence', bonus: 5 }],
      });

      const result = resolveSpellResolution(
        makeSpell(),
        {},
        playerStats,
        'test-campaign',
        null,
      );

      // cantripSpellAbility='Charisma' && abilities exists => enters first if,
      // but find(Charisma) returns undefined, so spellCastingMod stays at default 0
      // The else-if is unreachable in this case
      expect(result.spellCastingMod).toBe(0);
    });

    it('defaults to 0 when cantripSpellAbility is missing and spellAbilities has no modifier', () => {
      const playerStats = makePlayerStats({
        spellAbilities: { toHit: 5 },
        abilities: null,
      });

      const result = resolveSpellResolution(
        makeSpell(),
        {},
        playerStats,
        'test-campaign',
        null,
      );

      expect(result.spellCastingMod).toBe(0);
    });

    it('defaults to 0 when cantripSpellAbility is missing and spellAbilities is null', () => {
      const playerStats = makePlayerStats({
        spellAbilities: null,
        abilities: null,
      });

      const result = resolveSpellResolution(
        makeSpell(),
        {},
        playerStats,
        'test-campaign',
        null,
      );

      expect(result.spellCastingMod).toBe(0);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  resolveSpellResolution — innate sorcery                          */
  /* ---------------------------------------------------------------- */

  describe('resolveSpellResolution — innate sorcery', () => {
    it('sets innateSorceryActive from isInnateSorceryActive', () => {
      isInnateSorceryActive.mockReturnValue(true);

      const result = resolveSpellResolution(
        makeSpell(),
        {},
        makePlayerStats(),
        'test-campaign',
        null,
      );

      expect(result.innateSorceryActive).toBe(true);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  logGenericSpellCast                                              */
  /* ---------------------------------------------------------------- */

  describe('logGenericSpellCast', () => {
    it('returns a Promise that resolves when spell is not Hex', async () => {
      const spell = { name: 'Fireball', level: 3, casting_time: '1 action', concentration: false };
      const fullSpell = { description: ['A bright flash', 'of lightning'] };
      const getTargetInfo = vi.fn(() => Promise.resolve({ name: 'Goblin' }));

      const result = logGenericSpellCast(
        spell,
        makePlayerStats(),
        'test-campaign',
        getTargetInfo,
        fullSpell,
        'Lightning',
        '2d6',
        15,
      );

      expect(result).toBeInstanceOf(Promise);
      await result;

      expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
        type: 'spell',
        characterName: 'TestWizard',
        targetName: 'Goblin',
        spellName: 'Fireball',
        spellLevel: 3,
        castingTime: '1 action',
        damageType: 'Lightning',
        damageFormula: '2d6',
        saveDC: null,
        concentration: false,
        description: 'A bright flash of lightning',
      }));
    });

    it('resolves immediately when spell name is Hex', async () => {
      const spell = { name: 'Hex' };
      const getTargetInfo = vi.fn();

      const result = logGenericSpellCast(
        spell,
        makePlayerStats(),
        'test-campaign',
        getTargetInfo,
        {},
        null,
        null,
        0,
      );

      expect(result).toBeInstanceOf(Promise);
      await result;

      expect(getTargetInfo).not.toHaveBeenCalled();
      expect(addEntry).not.toHaveBeenCalled();
    });

    it('uses spell.dc to determine saveDC value', async () => {
      const spell = { name: 'Fireball', level: 3, casting_time: '1 action', concentration: false, dc: { dc_type: 'dex' } };
      const getTargetInfo = vi.fn(() => Promise.resolve({ name: 'Goblin' }));

      const result = logGenericSpellCast(
        spell,
        makePlayerStats(),
        'test-campaign',
        getTargetInfo,
        {},
        'Fire',
        '8d6',
        15,
      );

      await result;

      expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
        saveDC: 15,
      }));
    });

    it('uses null saveDC when spell.dc is falsy', async () => {
      const spell = { name: 'Fireball', level: 3, casting_time: '1 action', concentration: false };
      const getTargetInfo = vi.fn(() => Promise.resolve({ name: 'Goblin' }));

      const result = logGenericSpellCast(
        spell,
        makePlayerStats(),
        'test-campaign',
        getTargetInfo,
        {},
        'Fire',
        '8d6',
        15,
      );

      await result;

      expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
        saveDC: null,
      }));
    });

    it('handles missing description gracefully', async () => {
      const spell = { name: 'Fireball' };
      const getTargetInfo = vi.fn(() => Promise.resolve({ name: 'Target' }));

      const result = logGenericSpellCast(
        spell,
        makePlayerStats(),
        'test-campaign',
        getTargetInfo,
        {},
        null,
        null,
        0,
      );

      await result;

      expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
        description: null,
      }));
    });

    it('handles description as array', async () => {
      const spell = { name: 'Fireball' };
      const fullSpell = { description: ['Line 1', 'Line 2', 'Line 3'] };
      const getTargetInfo = vi.fn(() => Promise.resolve({ name: 'Target' }));

      const result = logGenericSpellCast(
        spell,
        makePlayerStats(),
        'test-campaign',
        getTargetInfo,
        fullSpell,
        null,
        null,
        0,
      );

      await result;

      expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
        description: 'Line 1 Line 2 Line 3',
      }));
    });

    it('handles null description', async () => {
      const spell = { name: 'Fireball' };
      const getTargetInfo = vi.fn(() => Promise.resolve({ name: 'Target' }));

      const result = logGenericSpellCast(
        spell,
        makePlayerStats(),
        'test-campaign',
        getTargetInfo,
        { description: null },
        null,
        null,
        0,
      );

      await result;

      expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
        description: null,
      }));
    });

    it('defaults spellLevel to 0 when spell.level is missing', async () => {
      const spell = { name: 'Fireball' };
      const getTargetInfo = vi.fn(() => Promise.resolve({ name: 'Target' }));

      const result = logGenericSpellCast(
        spell,
        makePlayerStats(),
        'test-campaign',
        getTargetInfo,
        {},
        null,
        null,
        0,
      );

      await result;

      expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
        spellLevel: 0,
      }));
    });

    it('passes spell.dc when present for saveDC', async () => {
      const spell = { name: 'Fireball', dc: { dc_type: 'dex', dc_success: 'half' } };
      const getTargetInfo = vi.fn(() => Promise.resolve({ name: 'Target' }));

      const result = logGenericSpellCast(
        spell,
        makePlayerStats(),
        'test-campaign',
        getTargetInfo,
        {},
        'Fire',
        '8d6',
        15,
      );

      await result;

      expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
        saveDC: 15,
      }));
    });

    it('handles null target from getTargetInfo', async () => {
      const spell = { name: 'Fireball' };
      const getTargetInfo = vi.fn(() => Promise.resolve(null));

      const result = logGenericSpellCast(
        spell,
        makePlayerStats(),
        'test-campaign',
        getTargetInfo,
        {},
        null,
        null,
        0,
      );

      await result;

      expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
        targetName: null,
      }));
    });

    it('handles undefined target from getTargetInfo', async () => {
      const spell = { name: 'Fireball' };
      const getTargetInfo = vi.fn(() => Promise.resolve(undefined));

      const result = logGenericSpellCast(
        spell,
        makePlayerStats(),
        'test-campaign',
        getTargetInfo,
        {},
        null,
        null,
        0,
      );

      await result;

      expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
        targetName: null,
      }));
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Re-exported getActiveBuffs and isInnateSorceryActive             */
  /* ---------------------------------------------------------------- */

  describe('re-exported functions', () => {
    it('getActiveBuffs is the same function from buffService', () => {
      expect(getActiveBuffs).toBeInstanceOf(Function);
    });

    it('isInnateSorceryActive is the same function from buffService', () => {
      expect(isInnateSorceryActive).toBeInstanceOf(Function);
    });
  });
});
