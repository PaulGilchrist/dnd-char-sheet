import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpellMetamagicFlow } from './useSpellMetamagicFlow.js';
import { getCombatSummary } from '../../services/encounters/combatData.js';
import { getMultiTargetSpreadForSpell } from '../../services/rules/spells/postCastRiderService.js';
import { getMonsterData } from '../../services/npcs/monsterUtils.js';
import { getAllyList } from '../useAllySelection.js';

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

vi.mock('../../services/encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(() => ({
    creatures: [
      { name: 'Goblin A' },
      { name: 'Goblin B' },
      { name: 'Goblin C' },
    ],
  })),
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
  applyProtectionFromPoisonHandler: vi.fn(),
  applyResistanceEffect: vi.fn(),
  executeHandler: vi.fn(),
  confirmGreaterRestoration: vi.fn(),
  applyHolyAuraEffect: vi.fn(),
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

function makeSpell(overrides = {}) {
  return {
    name: 'Fireball',
    level: 3,
    casting_time: '1 Action',
    range: '150 ft.',
    ...overrides,
  };
}

function renderHookWithSpell(hookSetup, spellName, spellOverrides = {}) {
  const onExecute = vi.fn();
  const { result } = renderHook(() =>
    hookSetup(onExecute)
  );
  const spell = makeSpell({ name: spellName, ...spellOverrides });
  act(() => {
    result.current.gateMetamagic(spell);
  });
  return { result, onExecute, spell };
}

// ── Data-driven spell gate tests ─────────────────────────────────────────────

// Each entry tests that gateMetamagic sets the expected pending state for a spell.
// Additional behavior (confirm/skip handlers, two-stage flows, Sorcerer-specific
// logic) is covered by dedicated test files.

// Only spells that had creatureTargets checks in the original tests are listed here.
// Other spells just verify the pending key is set (no creatureTargets assertion).
const gatedSpellsWithCreatureChecks = [
  { name: 'Foresight', level: 9, pendingKey: 'pendingForesight', casterIncluded: true },
  { name: 'Sanctuary', level: 1, pendingKey: 'pendingSanctuary', casterIncluded: true },
  { name: 'Protection from Evil and Good', level: 1, pendingKey: 'pendingProtectionFromEvilAndGood', casterIncluded: true },
  { name: 'Charm Monster', level: 4, pendingKey: 'pendingCharmMonster', casterExcluded: true },
  { name: 'Banishment', level: 4, pendingKey: 'pendingBanishment', casterExcluded: true },
  { name: 'Prismatic Spray', level: 7, pendingKey: 'pendingPrismaticSpray', casterExcluded: true },
  { name: 'Faerie Fire', level: 1, pendingKey: 'pendingFaerieFire', casterExcluded: true },
  { name: 'Enhance Ability', level: 2, pendingKey: 'pendingEnhanceAbility', casterIncluded: true },
  { name: 'Spare The Dying', level: 0, pendingKey: 'pendingSpareTheDying', casterExcluded: true },
  { name: 'Revivify', level: 5, pendingKey: 'pendingRevivify', casterExcluded: true },
];

const simpleGates = [
  { name: 'Protection from Poison', level: 2, pendingKey: 'pendingProtectionFromPoison' },
  { name: 'Stone Skin', level: 3, pendingKey: 'pendingStoneSkin' },
  { name: 'Polymorph', level: 4, pendingKey: 'pendingPolymorph', maxTargets: 1 },
  { name: 'True Polymorph', level: 9, pendingKey: 'pendingTruePolymorph' },
  { name: 'Lesser Restoration', level: 2, pendingKey: 'pendingLesserRestoration' },
  { name: 'Greater Restoration', level: 5, pendingKey: 'pendingGreaterRestoration' },
  { name: 'Remove Curse', level: 3, pendingKey: 'pendingRemoveCurse' },
  { name: 'Aid', level: 1, pendingKey: 'pendingAid', maxTargets: 3 },
  { name: 'Bane', level: 0, pendingKey: 'pendingBane', maxTargets: 3 },
  { name: 'Bless', level: 1, pendingKey: 'pendingBless', maxTargets: 3 },
  { name: 'Holy Aura', level: 8, pendingKey: 'pendingHolyAura', spellLevel: 8 },
  { name: 'Slow', level: 3, pendingKey: 'pendingSlow' },
  { name: 'Haste', level: 3, pendingKey: 'pendingHaste' },
  { name: 'Barkskin', level: 2, pendingKey: 'pendingBarkskin' },
  { name: 'Invisibility', level: 2, pendingKey: 'pendingInvisibility' },
  { name: 'Greater Invisibility', level: 4, pendingKey: 'pendingGreaterInvisibility' },
  { name: 'Feign Death', level: 3, pendingKey: 'pendingFeignDeath' },
  { name: 'Heal', level: 6, pendingKey: 'pendingHeal' },
  { name: 'Longstrider', level: 0, pendingKey: 'pendingLongstrider' },
  { name: 'Pass Without Trace', level: 2, pendingKey: 'pendingPassWithoutTrace' },
  { name: 'Beacon of Hope', level: 3, pendingKey: 'pendingBeaconOfHope' },
  { name: 'Globe of Invulnerability', level: 4, pendingKey: 'pendingGlobe' },
  { name: 'Antimagic Field', level: 4, pendingKey: 'pendingAntimagicField' },
  { name: 'Forcecage', level: 7, pendingKey: 'pendingForcecage' },
  { name: 'Stinking Cloud', level: 1, pendingKey: 'pendingStinkingCloud' },
  { name: 'Confusion', level: 4, pendingKey: 'pendingConfusion' },
  { name: 'Web', level: 1, pendingKey: 'pendingWeb' },
  { name: 'Regenerate', level: 7, pendingKey: 'pendingRegenerate' },
  { name: 'Healing Word', level: 1, pendingKey: 'pendingHealingWord' },
  { name: 'Cure Wounds', level: 1, pendingKey: 'pendingCureWounds' },
  { name: 'Aura of Life', level: 4, pendingKey: 'pendingAuraOfLife' },
  { name: 'Aura of Purity', level: 4, pendingKey: 'pendingAuraOfPurity' },
  { name: 'Circle of Power', level: 9, pendingKey: 'pendingCircleOfPower' },
  { name: 'Compulsion', level: 4, pendingKey: 'pendingCompulsion' },
  { name: 'Aura of Vitality', level: 3, pendingKey: 'pendingAuraOfVitality' },
  { name: 'Death Ward', level: 4, pendingKey: 'pendingDeathWard' },
  { name: 'Heroism', level: 1, pendingKey: 'pendingHeroism' },
  { name: 'Sleet Storm', level: 3, pendingKey: 'pendingSleetStorm' },
  { name: 'Magic Missile', level: 3, pendingKey: 'pendingMagicMissile', totalMissiles: 5 },
  { name: 'Resistance', level: 0, pendingKey: 'pendingResistance', damageTypesLength: 11 },
];

describe('useSpellMetamagicFlow — simple spell gates', () => {
  for (const spell of simpleGates) {
    describe(spell.name, () => {
      beforeEach(() => {
        vi.clearAllMocks();
        getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
      });

      it(`sets ${spell.pendingKey}`, () => {
        const { result } = renderHookWithSpell(
          (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
          spell.name,
          { level: spell.level },
        );

        expect(result.current[spell.pendingKey]).not.toBeNull();

        if (spell.maxTargets !== undefined) {
          expect(result.current[spell.pendingKey].maxTargets).toBe(spell.maxTargets);
        }

        if (spell.spellLevel !== undefined) {
          expect(result.current[spell.pendingKey].spellLevel).toBe(spell.spellLevel);
        }

        if (spell.totalMissiles !== undefined) {
          expect(result.current[spell.pendingKey].totalMissiles).toBe(spell.totalMissiles);
        }

        if (spell.damageTypesLength !== undefined) {
          expect(result.current[spell.pendingKey].damageTypes.length).toBe(spell.damageTypesLength);
        }
      });
    });
  }
});

describe('useSpellMetamagicFlow — gated spells with creatureTargets checks', () => {
  for (const spell of gatedSpellsWithCreatureChecks) {
    describe(spell.name, () => {
      beforeEach(() => {
        vi.clearAllMocks();
        getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
      });

      it(`sets ${spell.pendingKey} with correct creatureTargets`, () => {
        const { result } = renderHookWithSpell(
          (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
          spell.name,
          { level: spell.level },
        );

        expect(result.current[spell.pendingKey]).not.toBeNull();

        if (spell.casterIncluded) {
          expect(result.current[spell.pendingKey].creatureTargets).toContain('TestSorcerer');
        }

        if (spell.casterExcluded) {
          expect(result.current[spell.pendingKey].creatureTargets).not.toContain('TestSorcerer');
          expect(result.current[spell.pendingKey].creatureTargets).toContain('Goblin A');
        }
      });
    });
  }
});

// ── Spells requiring monster data resolution ──────────────────────────────────

describe('useSpellMetamagicFlow — monster-data-gated spells', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending holdMonster with maxTargets from upcast_at_slot_level', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({
        name: 'Hold Monster',
        level: 5,
        upcastLevel: 6,
        upcast_at_slot_level: { '6': '2 targets' },
      }));
    });

    expect(result.current.pendingHoldMonster).not.toBeNull();
    expect(result.current.pendingHoldMonster.creatureTargets).not.toContain('TestSorcerer');
    expect(result.current.pendingHoldMonster.creatureTargets).toContain('Goblin A');
    expect(result.current.pendingHoldMonster.maxTargets).toBe(2);
  });

  it('sets pending holdPerson for humanoid monsters', async () => {
    getMonsterData.mockResolvedValue({ type: 'humanoid' });
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', vi.fn())
    );

    await act(async () => {
      result.current.gateMetamagic(makeSpell({ name: 'Hold Person', level: 2 }));
    });

    expect(result.current.pendingHoldPerson).not.toBeNull();
  });

  it('excludes non-humanoid monsters from holdPerson', async () => {
    getMonsterData.mockResolvedValue({ type: 'Ooze' });
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', vi.fn())
    );

    await act(async () => {
      result.current.gateMetamagic(makeSpell({ name: 'Hold Person', level: 2 }));
    });

    expect(result.current.pendingHoldPerson).toBeNull();
  });

  it('sets pending charmPerson for humanoids', async () => {
    getMonsterData.mockResolvedValue({ type: 'humanoid' });
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', vi.fn())
    );

    await act(async () => {
      result.current.gateMetamagic(makeSpell({ name: 'Charm Person', level: 1 }));
    });

    expect(result.current.pendingCharmPerson).not.toBeNull();
  });

  it('sets pending animalFriendship for beasts', async () => {
    getMonsterData.mockResolvedValue({ type: 'beast' });
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', vi.fn())
    );

    await act(async () => {
      result.current.gateMetamagic(makeSpell({ name: 'Animal Friendship', level: 1 }));
    });

    expect(result.current.pendingAnimalFriendship).not.toBeNull();
  });
});

// ── Sorcerer-only gates ───────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Sorcerer-only gates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending shapechange for Sorcerer', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Shapechange',
      { level: 9 },
    );

    expect(result.current.pendingShapechange).not.toBeNull();
  });

  it('does not set pending shapechange for non-Sorcerer', () => {
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow({ name: 'TestWizard', class: { name: 'Wizard' }, level: 5 }, 'TestCampaign', onExecute)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Shapechange', level: 9 }));
    });

    expect(result.current.pendingShapechange).toBeNull();
  });
});

// ── Animal Shapes gate ────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Animal Shapes gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending animalShapes filtering by allies', () => {
    getAllyList.mockReturnValueOnce(['goblin a']);
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Animal Shapes',
      { level: 8 },
    );

    expect(result.current.pendingAnimalShapes).not.toBeNull();
    expect(result.current.pendingAnimalShapes.maxCR).toBe(4);
  });
});

// ── Protection from Energy gate (additional) ──────────────────────────────────

describe('useSpellMetamagicFlow — Protection from Energy gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending protectionFromEnergy with damageTypes from spell automation', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Protection from Energy',
      { level: 3 },
    );

    expect(result.current.pendingProtectionFromEnergy).not.toBeNull();
  });

  it('uses default damageTypes when spell has no automation', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Protection from Energy', level: 3, automation: null }));
    });

    expect(result.current.pendingProtectionFromEnergy).not.toBeNull();
  });
});

// ── Revivify gate (no creatures) ─────────────────────────────────────────────

describe('useSpellMetamagicFlow — Revivify gate with no creatures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('returns early without setting pending if no creatures', () => {
    getCombatSummary.mockReturnValueOnce({ creatures: [] });
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExecute)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Revivify', level: 5 }));
    });

    expect(result.current.pendingRevivify).toBeNull();
  });
});

// ── Shield of Faith gate (not gated) ──────────────────────────────────────────

describe('useSpellMetamagicFlow — Shield of Faith gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('does not gate Shield of Faith (falls through to Sorcerer flow)', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Shield of Faith',
      { level: 1 },
    );

    // Shield of Faith is not in the gateMetamagic switch - it falls through to the Sorcerer metamagic flow
    expect(result.current.pendingShieldOfFaith).toBeNull();
    expect(result.current.pendingMetamagic).not.toBeNull();
  });
});
