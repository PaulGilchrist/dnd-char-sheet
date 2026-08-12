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

import { triggerDispelMagic } from './helpers.js';

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
/*  Tests                                                              */
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
