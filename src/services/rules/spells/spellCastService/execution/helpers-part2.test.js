import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ------------------------------------------------------------------ */
/*  Mocks — dependencies of helpers.js                                */
/* ------------------------------------------------------------------ */

vi.mock('../../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../../ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../../automation/index.js', () => ({
  executeHandler: vi.fn(),
}));

vi.mock('../../../effects/expirations.js', () => ({
  addExpiration: vi.fn(),
}));

vi.mock('../../../features/spellUtils.js', () => ({
  usesSpellSlot: vi.fn(() => true),
}));

vi.mock('../../../../automation/handlers/class-wizard/arcaneWardHandler.js', () => ({
  onAbjurationSpellCast: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../../combat/applyHealing.js', () => ({
  applyHealingToTarget: vi.fn(),
}));

vi.mock('../../../../../services/rules/combat/applyDamage.js', () => ({
  applyDamageToTarget: vi.fn(),
}));

vi.mock('../../../../../services/encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(() => null),
}));

vi.mock('../../../../dice/diceRoller.js', () => ({
  rollExpression: vi.fn(() => ({ total: 5, rolls: [5] })),
  rollExpressionMaximized: vi.fn(() => ({ total: 8, rolls: [8] })),
  applyHealingRerollOnes: vi.fn(() => ({ displayRolls: [5], originalRolls: [5] })),
}));

vi.mock('../../../../combat/automation/automationService.js', () => ({
  resolveHealingBonusesWithDetails: vi.fn(() => ({ totalBonus: 0, details: [] })),
  hasHealingMaximizationForTarget: vi.fn(() => false),
  hasRerollHealingOnes: vi.fn(() => false),
}));

vi.mock('../../../features/invisibilityService.js', () => ({
  endInvisibilityOnHostileAction: vi.fn(),
}));

/* ------------------------------------------------------------------ */
/*  SUT imports after mocks                                            */
/* ------------------------------------------------------------------ */

import {
  triggerDispelMagic,
  refundSpellBreakerSlot,
  applyPowerWordHealToTarget,
  applyPowerWordKillToTarget,
  triggerExpertDivination,
  applyRegenerateSpell,
  isMagicMissile,
  getMagicMissileCount,
} from './helpers.js';
import { getRuntimeValue, setRuntimeValue } from '../../../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../../ui/logService.js';
import { executeHandler } from '../../../../automation/index.js';
import { rollExpression, rollExpressionMaximized } from '../../../../dice/diceRoller.js';
import { addExpiration } from '../../../effects/expirations.js';
import { applyHealingToTarget } from '../../../combat/applyHealing.js';
import { applyDamageToTarget } from '../../../../../services/rules/combat/applyDamage.js';
import { getCombatContext } from '../../../combat/damageUtils.js';
import {
  resolveHealingBonusesWithDetails,
  hasHealingMaximizationForTarget,
  hasRerollHealingOnes,
} from '../../../../combat/automation/automationService.js';
import { usesSpellSlot } from '../../../features/spellUtils.js';

// Reference mock modules for vi.mocked() usage in tests
void rollExpression;
void rollExpressionMaximized;
void addExpiration;
void applyHealingToTarget;
void applyDamageToTarget;
void getCombatContext;
void resolveHealingBonusesWithDetails;
void hasHealingMaximizationForTarget;
void hasRerollHealingOnes;
void usesSpellSlot;

/* ------------------------------------------------------------------ */
/*  Test-data factories                                                */
/* ------------------------------------------------------------------ */

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

describe('helpers.js — triggerDispelMagic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dispatches spell-result event with correct details', () => {
    const metaCtx = { targetName: 'Goblin', slotLevel: 3 };
    const playerStats = makePlayerStats();
    const events = [];
    const handler = (e) => events.push(e.detail);
    window.addEventListener('spell-result', handler);

    triggerDispelMagic(metaCtx, {}, playerStats, 'test-campaign', 'test-map');

    const dispelEvent = events.find((e) => e.isDispelMagic);
    expect(dispelEvent).toBeDefined();
    expect(dispelEvent.spellName).toBe('Dispel Magic');
    expect(dispelEvent.targetName).toBe('Goblin');
    expect(dispelEvent.targetDC).toBe(13); // 10 + 3
    expect(dispelEvent.isDispelMagic).toBe(true);

    window.removeEventListener('spell-result', handler);
  });

  it('uses spell.spellCastingAbility when present', () => {
    const metaCtx = { targetName: 'Goblin', slotLevel: 2 };
    const spell = { spellCastingAbility: 'Wisdom' };
    const playerStats = makePlayerStats({
      abilities: [
        { name: 'Intelligence', bonus: 5 },
        { name: 'Wisdom', bonus: 3 },
      ],
      spellAbilities: {
        spellCastingAbility: 'Intelligence',
        modifier: 5,
      },
    });

    const events = [];
    const handler = (e) => events.push(e.detail);
    window.addEventListener('spell-result', handler);

    triggerDispelMagic(metaCtx, spell, playerStats, 'test-campaign', 'test-map');

    const dispelEvent = events.find((e) => e.isDispelMagic);
    // abilityMod(3) + profBonus(4) + dispelAbilityCheckBonus(0) = 7
    expect(dispelEvent.checkBonus).toBe(7);

    window.removeEventListener('spell-result', handler);
  });

  it('handles missing targetName with "unknown target"', () => {
    const metaCtx = { slotLevel: 1 };
    const playerStats = makePlayerStats();

    const events = [];
    const handler = (e) => events.push(e.detail);
    window.addEventListener('spell-result', handler);

    triggerDispelMagic(metaCtx, {}, playerStats, 'test-campaign', 'test-map');

    const dispelEvent = events.find((e) => e.isDispelMagic);
    expect(dispelEvent.targetName).toBe('unknown target');

    window.removeEventListener('spell-result', handler);
  });

  it('includes dispelAbilityCheckBonus from metaCtx', () => {
    const metaCtx = { targetName: 'Goblin', slotLevel: 2, dispelAbilityCheckBonus: 2 };
    const playerStats = makePlayerStats({
      spellAbilities: { modifier: 3 },
      level: 5, // profBonus = floor((5-1)/4+2) = floor(1+2) = 3
    });

    const events = [];
    const handler = (e) => events.push(e.detail);
    window.addEventListener('spell-result', handler);

    triggerDispelMagic(metaCtx, {}, playerStats, 'test-campaign', 'test-map');

    const dispelEvent = events.find((e) => e.isDispelMagic);
    // abilityMod(3) + profBonus(3) + dispelAbilityCheckBonus(2) = 8
    expect(dispelEvent.checkBonus).toBe(8);

    window.removeEventListener('spell-result', handler);
  });
});

describe('helpers.js — refundSpellBreakerSlot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(2);
    setRuntimeValue.mockResolvedValue(undefined);
  });

  it('increments spell slot by 1', () => {
    refundSpellBreakerSlot('TestWizard', 3, 'test-campaign');

    expect(getRuntimeValue).toHaveBeenCalledWith('TestWizard', 'spell_slots_level_3');
    expect(setRuntimeValue).toHaveBeenCalledWith(
      'TestWizard',
      'spell_slots_level_3',
      3,
      'test-campaign',
    );
  });

  it('does nothing when current slots is null', () => {
    getRuntimeValue.mockReturnValue(null);

    refundSpellBreakerSlot('TestWizard', 3, 'test-campaign');

    expect(setRuntimeValue).not.toHaveBeenCalled();
  });

  it('does nothing when current slots is negative', () => {
    getRuntimeValue.mockReturnValue(-1);

    refundSpellBreakerSlot('TestWizard', 3, 'test-campaign');

    expect(setRuntimeValue).not.toHaveBeenCalled();
  });
});

describe('helpers.js — applyPowerWordHealToTarget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue([]);
    setRuntimeValue.mockResolvedValue(undefined);
    applyHealingToTarget.mockReturnValue({ actualHeal: 50, oldHp: 50, newHp: 100 });
    getCombatContext.mockResolvedValue({
      creatures: [{ name: 'Goblin', maxHp: 100, currentHp: 50 }],
    });
  });

  it('heals target to full HP and removes conditions', async () => {
    getRuntimeValue.mockImplementation((char, key) => {
      if (key === 'activeConditions') return ['charmed', 'frightened', 'poisoned'];
      return undefined;
    });

    const playerStats = makePlayerStats();
    await applyPowerWordHealToTarget('Goblin', playerStats, 'test-campaign');

    expect(applyHealingToTarget).toHaveBeenCalled();
    expect(setRuntimeValue).toHaveBeenCalledWith(
      'Goblin',
      'activeConditions',
      [],
      'test-campaign',
    );
    expect(addEntry).toHaveBeenCalledWith(
      'test-campaign',
      expect.objectContaining({
        type: 'condition',
        action: 'removed',
        condition: 'Charmed',
        reason: 'Power Word Heal',
      }),
    );
  });

  it('does not set powerWordHealStandPermission when target is not prone', async () => {
    getRuntimeValue.mockImplementation((char, key) => {
      if (key === 'activeConditions') return ['charmed'];
      return undefined;
    });

    const playerStats = makePlayerStats();
    await applyPowerWordHealToTarget('Goblin', playerStats, 'test-campaign');

    expect(setRuntimeValue).not.toHaveBeenCalledWith(
      'Goblin',
      'powerWordHealStandPermission',
      true,
      'test-campaign',
    );
  });

  it('sets powerWordHealStandPermission when target is prone', async () => {
    getRuntimeValue.mockImplementation((char, key) => {
      if (key === 'activeConditions') return ['prone'];
      if (key === 'powerWordHealStandPermission') return false;
      return undefined;
    });

    const playerStats = makePlayerStats();
    await applyPowerWordHealToTarget('Goblin', playerStats, 'test-campaign');

    expect(setRuntimeValue).toHaveBeenCalledWith(
      'Goblin',
      'powerWordHealStandPermission',
      true,
      'test-campaign',
    );
  });

  it('does not set powerWordHealStandPermission when already set', async () => {
    getRuntimeValue.mockImplementation((char, key) => {
      if (key === 'activeConditions') return ['prone'];
      if (key === 'powerWordHealStandPermission') return true;
      return undefined;
    });

    const playerStats = makePlayerStats();
    await applyPowerWordHealToTarget('Goblin', playerStats, 'test-campaign');

    const permCalls = vi.mocked(setRuntimeValue).mock.calls.filter(
      (c) => c[1] === 'powerWordHealStandPermission',
    );
    expect(permCalls.length).toBe(0);
  });

  it('returns early when combat context is null', async () => {
    getCombatContext.mockResolvedValue(null);

    const playerStats = makePlayerStats();
    await applyPowerWordHealToTarget('Goblin', playerStats, 'test-campaign');

    expect(applyHealingToTarget).not.toHaveBeenCalled();
  });

  it('does not heal when target is already at full HP', async () => {
    getCombatContext.mockResolvedValue({
      creatures: [{ name: 'Goblin', maxHp: 100, currentHp: 100 }],
    });

    const playerStats = makePlayerStats();
    await applyPowerWordHealToTarget('Goblin', playerStats, 'test-campaign');

    expect(applyHealingToTarget).not.toHaveBeenCalled();
  });

  it('handles player-type creature using runtime HP values', async () => {
    getCombatContext.mockResolvedValue({
      creatures: [{ name: 'TestWizard', maxHp: 100, currentHp: 50, type: 'player' }],
    });
    getRuntimeValue.mockImplementation((char, key) => {
      if (key === 'currentHitPoints') return 30;
      if (key === 'activeConditions') return [];
      return undefined;
    });

    const playerStats = makePlayerStats();
    await applyPowerWordHealToTarget('TestWizard', playerStats, 'test-campaign');

    // Should heal from 30 (runtime) to 100 (max) = 70 HP
    expect(applyHealingToTarget).toHaveBeenCalled();
  });

  it('throws when activeConditions is not an array', async () => {
    getRuntimeValue.mockReturnValue(null);

    const playerStats = makePlayerStats();

    await expect(
      applyPowerWordHealToTarget('Goblin', playerStats, 'test-campaign'),
    ).rejects.toThrow('activeConditions must be an array');
  });

  it('disables conditions case-insensitively', async () => {
    getRuntimeValue.mockImplementation((char, key) => {
      if (key === 'activeConditions') return ['CHARMED', 'Frightened', 'PARALYZED', 'Poisoned', 'Stunned', 'PRONE'];
      return undefined;
    });

    const playerStats = makePlayerStats();
    await applyPowerWordHealToTarget('Goblin', playerStats, 'test-campaign');

    const newConditions = vi.mocked(setRuntimeValue).mock.calls.find(
      (c) => c[1] === 'activeConditions',
    )?.[2];
    expect(newConditions).toEqual(['PRONE']);
  });
});

describe('helpers.js — applyPowerWordKillToTarget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(undefined);
    applyDamageToTarget.mockReturnValue({ finalDamage: 50, damageReduced: false });
  });

  it('kills target when HP <= 100', async () => {
    getCombatContext.mockResolvedValue({
      creatures: [{ name: 'Goblin', maxHp: 80, currentHp: 80 }],
    });

    const playerStats = makePlayerStats();
    await applyPowerWordKillToTarget('Goblin', playerStats, 'test-campaign');

    expect(applyDamageToTarget).toHaveBeenCalledWith(
      expect.anything(),
      'Goblin',
      80,
      ['Psychic'],
      'test-campaign',
      [],
      false,
      'TestWizard',
    );
    expect(addEntry).toHaveBeenCalledWith(
      'test-campaign',
      expect.objectContaining({
        type: 'hp_change',
        targetName: 'Goblin',
        note: 'Power Word Kill',
        threshold: 'dead',
      }),
    );
  });

  it('deals 12d12 Psychic damage when HP > 100', async () => {
    getCombatContext.mockResolvedValue({
      creatures: [{ name: 'Dragon', maxHp: 200, currentHp: 150 }],
    });

    const playerStats = makePlayerStats();
    await applyPowerWordKillToTarget('Dragon', playerStats, 'test-campaign');

    expect(rollExpression).toHaveBeenCalledWith('12d12');
    expect(applyDamageToTarget).toHaveBeenCalledWith(
      expect.anything(),
      'Dragon',
      expect.any(Number),
      ['Psychic'],
      'test-campaign',
      [],
      false,
      'TestWizard',
    );
  });

  it('returns early when combat context is null', async () => {
    getCombatContext.mockResolvedValue(null);

    const playerStats = makePlayerStats();
    await applyPowerWordKillToTarget('Goblin', playerStats, 'test-campaign');

    expect(applyDamageToTarget).not.toHaveBeenCalled();
  });

  it('returns early when creature not found', async () => {
    getCombatContext.mockResolvedValue({
      creatures: [{ name: 'OtherCreature', maxHp: 50, currentHp: 50 }],
    });

    const playerStats = makePlayerStats();
    await applyPowerWordKillToTarget('NonExistent', playerStats, 'test-campaign');

    expect(applyDamageToTarget).not.toHaveBeenCalled();
  });
});

describe('helpers.js — triggerExpertDivination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usesSpellSlot.mockReturnValue(true);
    executeHandler.mockResolvedValue({ result: 'precognition' });
  });

  it('executes handler for divination school spells level 2+', async () => {
    const spell = { name: 'Arcane Eye', school: 'Divination' };
    const metaCtx = { slotLevel: 3 };
    const playerStats = makePlayerStats({
      automation: {
        passives: [{ name: 'Expert Divination', type: 'expert_divination' }],
      },
    });

    const result = await triggerExpertDivination(
      spell,
      metaCtx,
      playerStats,
      'test-campaign',
      'test-map',
    );

    expect(executeHandler).toHaveBeenCalled();
    expect(result).toEqual({ result: 'precognition' });
  });

  it('returns null for non-divination spells', async () => {
    const spell = { name: 'Fireball', school: 'Evocation' };
    const metaCtx = { slotLevel: 3 };
    const playerStats = makePlayerStats({
      automation: {
        passives: [{ name: 'Expert Divination', type: 'expert_divination' }],
      },
    });

    const result = await triggerExpertDivination(
      spell,
      metaCtx,
      playerStats,
      'test-campaign',
      'test-map',
    );

    expect(result).toBeNull();
    expect(executeHandler).not.toHaveBeenCalled();
  });

  it('returns null for cantrips (level 0)', async () => {
    const spell = { name: 'Arcane Eye', school: 'Divination' };
    const metaCtx = { slotLevel: 0 };
    const playerStats = makePlayerStats({
      automation: {
        passives: [{ name: 'Expert Divination', type: 'expert_divination' }],
      },
    });

    const result = await triggerExpertDivination(
      spell,
      metaCtx,
      playerStats,
      'test-campaign',
      'test-map',
    );

    expect(result).toBeNull();
  });

  it('returns null for level 1 divination spells', async () => {
    const spell = { name: 'Arcane Eye', school: 'Divination' };
    const metaCtx = { slotLevel: 1 };
    const playerStats = makePlayerStats({
      automation: {
        passives: [{ name: 'Expert Divination', type: 'expert_divination' }],
      },
    });

    const result = await triggerExpertDivination(
      spell,
      metaCtx,
      playerStats,
      'test-campaign',
      'test-map',
    );

    expect(result).toBeNull();
  });

  it('returns null when spell does not use a spell slot', async () => {
    usesSpellSlot.mockReturnValue(false);
    const spell = { name: 'Arcane Eye', school: 'Divination' };
    const metaCtx = { slotLevel: 3 };
    const playerStats = makePlayerStats({
      automation: {
        passives: [{ name: 'Expert Divination', type: 'expert_divination' }],
      },
    });

    const result = await triggerExpertDivination(
      spell,
      metaCtx,
      playerStats,
      'test-campaign',
      'test-map',
    );

    expect(result).toBeNull();
  });

  it('throws when passives is null', async () => {
    const spell = { name: 'Arcane Eye', school: 'Divination' };
    const metaCtx = { slotLevel: 3 };
    const playerStats = makePlayerStats({
      automation: { passives: null },
    });

    await expect(
      triggerExpertDivination(spell, metaCtx, playerStats, 'test-campaign', 'test-map'),
    ).rejects.toThrow('playerStats.automation.passives is required for expert divination');
  });

  it('handles executeHandler errors gracefully', async () => {
    const spell = { name: 'Arcane Eye', school: 'Divination' };
    const metaCtx = { slotLevel: 3 };
    const playerStats = makePlayerStats({
      automation: {
        passives: [{ name: 'Expert Divination', type: 'expert_divination' }],
      },
    });

    executeHandler.mockRejectedValue(new Error('handler error'));

    const result = await triggerExpertDivination(
      spell,
      metaCtx,
      playerStats,
      'test-campaign',
      'test-map',
    );

    expect(result).toBeNull();
  });
});

describe('helpers.js — applyRegenerateSpell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(50);
    setRuntimeValue.mockResolvedValue(undefined);
    applyHealingToTarget.mockReturnValue({ actualHeal: 20, oldHp: 50, newHp: 70 });
    getCombatContext.mockResolvedValue({
      creatures: [{ name: 'Goblin', maxHp: 100, currentHp: 50 }],
    });
    rollExpression.mockReturnValue({ total: 20, rolls: [5, 5, 5, 5] });
    resolveHealingBonusesWithDetails.mockReturnValue({ totalBonus: 0, details: [] });
  });

  it('heals target and sets up regenerateActive', async () => {
    const spell = { name: 'Regenerate', level: 7, heal_at_slot_level: { 7: '4d8 + 15' } };
    const caster = makePlayerStats();

    const result = await applyRegenerateSpell(spell, { name: 'Goblin' }, caster, 'test-campaign');

    expect(applyHealingToTarget).toHaveBeenCalled();
    expect(setRuntimeValue).toHaveBeenCalledWith('Goblin', 'regenerateActive', true, 'test-campaign');
    expect(setRuntimeValue).toHaveBeenCalledWith('Goblin', 'regenerateSource', 'TestWizard', 'test-campaign');
    expect(addExpiration).toHaveBeenCalledWith(
      'TestWizard',
      'Goblin',
      expect.arrayContaining([expect.objectContaining({ type: 'remove_regenerate_buff' })]),
      'test-campaign',
    );
    expect(result).toEqual(
      expect.objectContaining({
        targetName: 'Goblin',
        healAmount: expect.any(Number),
        formula: '4d8 + 15',
      }),
    );
  });

  it('falls back to highest slot level when exact level not found', async () => {
    const spell = { name: 'Regenerate', level: 8, heal_at_slot_level: { 7: '4d8 + 15', 9: '8d8 + 30' } };
    const caster = makePlayerStats();

    const result = await applyRegenerateSpell(spell, { name: 'Goblin' }, caster, 'test-campaign');

    expect(result.formula).toBe('4d8 + 15');
  });

  it('uses spell.level when metaCtx slotLevel is not provided', async () => {
    const spell = { name: 'Regenerate', level: 7, heal_at_slot_level: { 7: '4d8 + 15' } };
    const caster = makePlayerStats();

    await applyRegenerateSpell(spell, { name: 'Goblin' }, caster, 'test-campaign');

    expect(applyHealingToTarget).toHaveBeenCalled();
  });

  it('throws when spell.level is null', async () => {
    const spell = { name: 'Regenerate', level: null, heal_at_slot_level: { 7: '4d8 + 15' } };
    const caster = makePlayerStats();

    await expect(
      applyRegenerateSpell(spell, { name: 'Goblin' }, caster, 'test-campaign'),
    ).rejects.toThrow('spell.level is required for regenerate spell');
  });

  it('throws when heal_at_slot_level is not an object', async () => {
    const spell = { name: 'Regenerate', level: 7, heal_at_slot_level: null };
    const caster = makePlayerStats();

    await expect(
      applyRegenerateSpell(spell, { name: 'Goblin' }, caster, 'test-campaign'),
    ).rejects.toThrow('heal_at_slot_level must be an object');
  });

  it('applies healing bonus from resolveHealingBonusesWithDetails', async () => {
    resolveHealingBonusesWithDetails.mockReturnValue({ totalBonus: 5, details: [{ amount: 5, name: 'Spell Power' }] });

    const spell = { name: 'Regenerate', level: 7, heal_at_slot_level: { 7: '4d8' } };
    const caster = makePlayerStats();

    const result = await applyRegenerateSpell(spell, { name: 'Goblin' }, caster, 'test-campaign');

    expect(result.rawTotal).toBe(25); // 20 from roll + 5 bonus
    expect(result.bonusHeal).toBe(5);
  });

  it('handles maximized healing', async () => {
    hasHealingMaximizationForTarget.mockReturnValue(true);
    rollExpressionMaximized.mockReturnValue({ total: 47, rolls: [8, 8, 8, 8] });

    const spell = { name: 'Regenerate', level: 7, heal_at_slot_level: { 7: '4d8 + 15' } };
    const caster = makePlayerStats();

    await applyRegenerateSpell(spell, { name: 'Goblin' }, caster, 'test-campaign');

    expect(rollExpressionMaximized).toHaveBeenCalledWith('4d8 + 15');
  });

  it('applies reroll ones when enabled', async () => {
    hasRerollHealingOnes.mockReturnValue(true);
    hasHealingMaximizationForTarget.mockReturnValue(false);
    rollExpression.mockReturnValue({ total: 15, rolls: [1, 5, 5, 4] });
    getCombatContext.mockResolvedValue({
      creatures: [{ name: 'Goblin', maxHp: 100, currentHp: 50 }],
    });

    const spell = { name: 'Regenerate', level: 7, heal_at_slot_level: { 7: '4d8 + 15' } };
    const caster = makePlayerStats();

    await applyRegenerateSpell(spell, { name: 'Goblin' }, caster, 'test-campaign');

    expect(rollExpression).toHaveBeenCalledWith('4d8 + 15');
  });

  it('throws when max HP is missing for both creature and caster', async () => {
    getCombatContext.mockResolvedValue({
      creatures: [{ name: 'Goblin', maxHp: null, currentHp: null }],
    });
    getRuntimeValue.mockReturnValue(null);

    const spell = { name: 'Regenerate', level: 7, heal_at_slot_level: { 7: '4d8 + 15' } };
    const caster = makePlayerStats({ hitPoints: null });

    await expect(
      applyRegenerateSpell(spell, { name: 'Goblin' }, caster, 'test-campaign'),
    ).rejects.toThrow('max HP is required for regenerate spell');
  });

  it('returns result with empty arrays when expression is missing', async () => {
    const spell = { name: 'Regenerate', level: 7, heal_at_slot_level: {} };
    const caster = makePlayerStats();

    const result = await applyRegenerateSpell(spell, { name: 'Goblin' }, caster, 'test-campaign');

    expect(result.rolls).toEqual([]);
    expect(result.formula).toBeUndefined();
    expect(setRuntimeValue).toHaveBeenCalledWith('Goblin', 'regenerateActive', true, 'test-campaign');
  });
});

describe('helpers.js — isMagicMissile', () => {
  it('returns true for Magic Missile', () => {
    expect(isMagicMissile({ name: 'Magic Missile' })).toBe(true);
  });

  it('returns false for other spells', () => {
    expect(isMagicMissile({ name: 'Fireball' })).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isMagicMissile({ name: 'magic missile' })).toBe(true);
    expect(isMagicMissile({ name: 'MAGIC MISSILE' })).toBe(true);
  });

  it('handles null/undefined name gracefully', () => {
    expect(isMagicMissile({})).toBeFalsy();
    expect(() => isMagicMissile(null)).toThrow();
  });
});

describe('helpers.js — getMagicMissileCount', () => {
  it('returns 3 for level 1', () => {
    expect(getMagicMissileCount(1)).toBe(3);
  });

  it('returns 4 for level 2', () => {
    expect(getMagicMissileCount(2)).toBe(4);
  });

  it('returns 5 for level 3', () => {
    expect(getMagicMissileCount(3)).toBe(5);
  });

  it('returns 6 for level 4', () => {
    expect(getMagicMissileCount(4)).toBe(6);
  });

  it('returns 10 for level 8', () => {
    expect(getMagicMissileCount(8)).toBe(10);
  });
});
