import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpellMetamagicFlow } from './useSpellMetamagicFlow.js';
import { getCombatSummary } from '../../services/encounters/combatData.js';
import { getMultiTargetSpreadForSpell } from '../../services/rules/spells/postCastRiderService.js';

vi.mock('./useMetamagic.js', () => ({
  getCurrentSorceryPoints: vi.fn(() => 5),
  getMaxSorceryPoints: vi.fn(() => 10),
  spendSorceryPoints: vi.fn(),
  logMetamagicUse: vi.fn(),
}));

vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../services/rules/spells/postCastRiderService.js', () => ({
  getMultiTargetSpreadForSpell: vi.fn(() => null),
}));

vi.mock('../../services/npcs/monsterUtils.js', () => ({
  getMonsterData: vi.fn(),
}));

vi.mock('../../services/rules/spells/metamagicRules.js', () => ({
  isPsionicSpell: vi.fn(() => false),
  hasPsionicSorcery: vi.fn(() => false),
}));

vi.mock('../../services/automation/index.js', () => ({
  applyAidEffect: vi.fn(),
  applyHeroesFeastEffect: vi.fn(),
  applyLesserRestorationEffect: vi.fn(),
  applyMageArmorEffect: vi.fn(),
  applyShieldOfFaithEffect: vi.fn(),
  applyProtectionFromEnergyHandler: vi.fn(),
  applyProtectionFromPoisonHandler: vi.fn(() => Promise.resolve(null)),
  applyResistanceEffect: vi.fn(),
  executeHandler: vi.fn(() => Promise.resolve(null)),
  confirmGreaterRestoration: vi.fn(),
  applyHolyAuraEffect: vi.fn(() => Promise.resolve(null)),
  applyBaneEffect: vi.fn(),
  applyBlessEffect: vi.fn(),
  applyFaerieFire: vi.fn(() => Promise.resolve(null)),
  applyHaste: vi.fn(),
  applyEnhanceAbilityEffect: vi.fn(() => Promise.resolve(null)),
  applyBarkskinEffect: vi.fn(() => Promise.resolve(null)),
  applyInvisibility: vi.fn(),
  applyGreaterInvisibility: vi.fn(),
  applyFeignDeath: vi.fn(() => Promise.resolve(null)),
  applyLongstriderEffect: vi.fn(() => Promise.resolve(null)),
  applySpareTheDyingEffect: vi.fn(() => Promise.resolve(null)),
  applyPassWithoutTraceEffect: vi.fn(() => Promise.resolve(null)),
  applyBeaconOfHopeEffect: vi.fn(() => Promise.resolve(null)),
  applyAuraOfLifeEffect: vi.fn(),
  applyAuraOfPurityEffect: vi.fn(),
  applyCircleOfPowerEffect: vi.fn(() => Promise.resolve(null)),
  applyCompulsionEffect: vi.fn(() => Promise.resolve(null)),
  applyAuraOfVitalityEffect: vi.fn(() => Promise.resolve(null)),
  applyDeathWardEffect: vi.fn(() => Promise.resolve(null)),
  applyHeroism: vi.fn(() => Promise.resolve(null)),
  applyProtectionFromEvilAndGood: vi.fn(),
  applyStoneSkinHandler: vi.fn(() => Promise.resolve(null)),
  handleSanctuary: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../services/rules/features/greaterRestorationService.js', () => ({
  confirmGreaterRestoration: vi.fn(),
}));

vi.mock('../../services/rules/features/removeCurseService.js', () => ({
  confirmRemoveCurse: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../services/rules/features/regenerateService.js', () => ({
  confirmRegenerate: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../services/rules/features/foresightService.js', () => ({
  triggerForesight: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../services/rules/features/holdMonsterService.js', () => ({
  triggerHoldMonster: vi.fn(),
}));

vi.mock('../../services/rules/features/charmPersonService.js', () => ({
  triggerCharmPerson: vi.fn(),
}));

vi.mock('../../services/rules/features/charmMonsterService.js', () => ({
  triggerCharmMonster: vi.fn(),
}));

vi.mock('../../services/rules/features/banishmentService.js', () => ({
  triggerBanishment: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../services/rules/features/faerieFireService.js', () => ({
  triggerFaerieFire: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../services/rules/features/healService.js', () => ({
  triggerHeal: vi.fn(),
}));

vi.mock('../../services/rules/features/healingWordService.js', () => ({
  triggerHealingWord: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../services/rules/features/revivifyService.js', () => ({
  triggerRevivify: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../services/automation/handlers/spells/polymorphService.js', () => ({
  applyPolymorph: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../services/automation/handlers/spells/animalShapesService.js', () => ({
  applyAnimalShapes: vi.fn(() => Promise.resolve({ ok: false })),
}));

vi.mock('../../services/automation/handlers/spells/truePolymorphService.js', () => ({
  applyTruePolymorph: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../services/rules/spells/materialComponents.js', () => ({
  getConsumedMaterial: vi.fn(() => null),
  hasMaterial: vi.fn(() => true),
  consumeMaterial: vi.fn(() => Promise.resolve(true)),
  getMaterialRequirementMessage: vi.fn(() => null),
}));

vi.mock('../../services/rules/spells/spellPreparationService.js', () => ({
  prepareSpellCast: vi.fn(() => Promise.resolve({ modifiedSpell: {}, metaCtx: {} })),
  isFreeCastAuthorized: vi.fn(() => false),
  incrementFreeCastResource: vi.fn(),
}));

vi.mock('../runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(() => 3),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../useAllySelection.js', () => ({
  getAllyList: vi.fn((casterName) => [casterName.toLowerCase()]),
}));

vi.mock('../../services/encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(() => ({
    creatures: [
      { name: 'Goblin A' },
      { name: 'Goblin B' },
    ],
  })),
}));

global.fetch = vi.fn((url) => {
  if (url && url.includes('combat-summary')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ creatures: [] }),
    });
  }
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  });
});

Object.defineProperty(window, 'dispatchEvent', {
  value: vi.fn(),
  writable: true,
});

function makePlayerStats(overrides = {}) {
  return {
    name: 'TestSorcerer',
    class: { name: 'Sorcerer' },
    level: 5,
    ...overrides,
  };
}

function makeNonSorcererStats(overrides = {}) {
  return {
    name: 'TestWizard',
    class: { name: 'Wizard' },
    level: 5,
    ...overrides,
  };
}

function makeSpell(overrides = {}) {
  return {
    name: 'Fireball',
    level: 3,
    casting_time: '1 Action',
    range: '150 ft.',
    ...overrides,
  };
}

// ── Beacon of Hope characters fallback ────────────────────────────────────────

describe('useSpellMetamagicFlow — Beacon of Hope characters fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('uses characters list as creatureTargets when combat summary has no creatures', async () => {
    const { getCombatSummary } = await import('../../services/encounters/combatData.js');
    getCombatSummary.mockReturnValue({ creatures: [] });

    const characters = [
      { name: 'Character A' },
      { name: 'Character B' },
    ];
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', vi.fn(), null, characters)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Beacon of Hope', level: 3 }));
    });

    expect(result.current.pendingBeaconOfHope).not.toBeNull();
    expect(result.current.pendingBeaconOfHope.creatureTargets).toEqual(['Character A', 'Character B']);
  });
});

// ── Aura of Vitality freeCastUsed path ────────────────────────────────────────

describe('useSpellMetamagicFlow — Aura of Vitality freeCastUsed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
    getCombatSummary.mockReturnValue({
      creatures: [
        { name: 'Goblin A' },
        { name: 'Goblin B' },
      ],
    });
  });

  it('sets isFreeCast flag when metaCtx.freeCastUsed is true', () => {
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExecute)
    );

    const spell = makeSpell({ name: 'Aura of Vitality', level: 3 });
    act(() => {
      result.current.gateMetamagic(spell, { freeCastUsed: true });
    });

    expect(result.current.pendingAuraOfVitality).not.toBeNull();
    expect(result.current.pendingAuraOfVitality.isFreeCast).toBe(true);
  });

  it('does not set isFreeCast when metaCtx.freeCastUsed is false', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Aura of Vitality', level: 3 }), { freeCastUsed: false });
    });

    expect(result.current.pendingAuraOfVitality).not.toBeNull();
    expect(result.current.pendingAuraOfVitality.isFreeCast).toBeUndefined();
  });
});

// ── Non-Sorcerer cantrip auto-leveling with damage ────────────────────────────

describe('useSpellMetamagicFlow — non-Sorcerer cantrip auto-leveling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('auto-levels cantrip with damage_at_character_level for non-Sorcerer', () => {
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makeNonSorcererStats(), 'TestCampaign', onExecute)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({
        name: 'Firebolt',
        level: 0,
        damage: { damage_at_character_level: { 5: '1d10', 11: '2d10' } },
      }));
    });

    expect(onExecute).toHaveBeenCalled();
    const callArg = onExecute.mock.calls[0][0];
    expect(callArg.level).toBe(5);
    expect(callArg.baseLevel).toBe(0);
  });

  it('auto-levels cantrip with damage_at_slot_level for non-Sorcerer', () => {
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makeNonSorcererStats(), 'TestCampaign', onExecute)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({
        name: 'Firebolt',
        level: 0,
        damage: { damage_at_slot_level: { 1: '1d10', 5: '2d10' } },
      }));
    });

    expect(onExecute).toHaveBeenCalled();
    const callArg = onExecute.mock.calls[0][0];
    // Non-Sorcerer is level 5, so both slot levels 1 and 5 are applicable, max is 5
    expect(callArg.level).toBe(5);
    expect(callArg.baseLevel).toBe(0);
  });

  it('does not auto-level cantrip without damage for non-Sorcerer', () => {
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makeNonSorcererStats(), 'TestCampaign', onExecute)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Friends', level: 0 }));
    });

    // No gate, no damage, no oldConcentrationSpell - should not call onExecute
    expect(onExecute).not.toHaveBeenCalled();
  });

  it('uses oldConcentrationSpell path for non-Sorcerer non-cantrip', () => {
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makeNonSorcererStats(), 'TestCampaign', onExecute)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Fireball', level: 3 }), { oldConcentrationSpell: 'OldSpell' });
    });

    expect(onExecute).toHaveBeenCalled();
  });
});

// ── Sorcerer cantrip auto-leveling with damage ────────────────────────────────

describe('useSpellMetamagicFlow — Sorcerer cantrip auto-leveling with damage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('auto-levels Sorcerer cantrip with damage_at_character_level', () => {
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExecute)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({
        name: 'Firebolt',
        level: 0,
        damage: { damage_at_character_level: { 5: '1d10', 11: '2d10' } },
      }));
    });

    expect(result.current.pendingMetamagic).not.toBeNull();
    expect(result.current.pendingMetamagic.spell.level).toBe(5);
    expect(result.current.pendingMetamagic.spell.baseLevel).toBe(0);
  });

  it('auto-levels Sorcerer cantrip with damage_at_slot_level', () => {
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExecute)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({
        name: 'Firebolt',
        level: 0,
        damage: { damage_at_slot_level: { 1: '1d10', 5: '2d10' } },
      }));
    });

    expect(result.current.pendingMetamagic).not.toBeNull();
    // Sorcerer is level 5, so both slot levels 1 and 5 are applicable, max is 5
    expect(result.current.pendingMetamagic.spell.level).toBe(5);
    expect(result.current.pendingMetamagic.spell.baseLevel).toBe(0);
  });
});
