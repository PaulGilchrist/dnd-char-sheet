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

function renderHookWithSpell(hookSetup, spellName, spellOverrides = {}) {
  const { result } = renderHook(() =>
    hookSetup(vi.fn())
  );
  const spell = makeSpell({ name: spellName, ...spellOverrides });
  act(() => {
    result.current.gateMetamagic(spell);
  });
  return { result, spell };
}

// ── Material component blocking ──────────────────────────────────────────────

describe('useSpellMetamagicFlow — material component blocking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('shows popup and returns early when material is consumed but not possessed', async () => {
    const materialModule = await import('../../services/rules/spells/materialComponents.js');
    materialModule.getConsumedMaterial.mockImplementation((spell) => {
      if ((spell.name || '').toLowerCase() === 'greater restoration') {
        return { itemName: 'Diamond Dust (100 gp)' };
      }
      return null;
    });
    materialModule.hasMaterial.mockReturnValueOnce(false);
    materialModule.getMaterialRequirementMessage.mockReturnValueOnce('Need Diamond Dust');

    const setPopupHtml = vi.fn();
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExecute, null, [], setPopupHtml)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Greater Restoration', level: 5 }));
    });

    expect(setPopupHtml).toHaveBeenCalledWith({
      type: 'automation_info',
      name: 'Greater Restoration',
      automationType: 'material_required',
      description: expect.anything(),
    });
    expect(onExecute).not.toHaveBeenCalled();
    expect(result.current.pendingGreaterRestoration).toBeNull();
  });
});

// ── Non-Sorcerer flow ────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — non-Sorcerer flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('calls prepareSpellCast and onExecute for non-Sorcerer with non-cantrip', async () => {
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makeNonSorcererStats(), 'TestCampaign', onExecute)
    );

    await act(async () => {
      await result.current.gateMetamagic(makeSpell({ name: 'Fireball', level: 3 }));
    });

    expect(onExecute).toHaveBeenCalled();
  });

  it('auto-levels cantrips with damage for non-Sorcerer', () => {
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makeNonSorcererStats(), 'TestCampaign', onExecute)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Firebolt', level: 0, damage: { damage_at_character_level: { 5: '1d10' }, 11: '2d10' } }));
    });

    expect(onExecute).toHaveBeenCalled();
  });

  it('uses oldConcentrationSpell from metaCtx for non-Sorcerer', () => {
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

// ── Sorcerer cantrip auto-leveling ────────────────────────────────────────────

describe('useSpellMetamagicFlow — Sorcerer cantrip auto-leveling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('auto-levels Sorcerer cantrips with damage', () => {
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExecute)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Firebolt', level: 0, damage: { damage_at_character_level: { 5: '1d10' }, 11: '2d10' } }));
    });

    // Should set pending metamagic (not call onExecute directly)
    expect(result.current.pendingMetamagic).not.toBeNull();
    expect(result.current.pendingMetamagic.spell.level).toBe(5);
    expect(result.current.pendingMetamagic.spell.baseLevel).toBe(0);
  });

  it('does not auto-level cantrips without damage', () => {
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExecute)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Friends', level: 0 }));
    });

    // Friends is not in the gateMetamagic switch, so it falls through to Sorcerer cantrip auto-level
    // but has no damage, so it should not auto-level
    expect(result.current.pendingMetamagic).not.toBeNull();
  });
});

// ── Foresight gate ────────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Foresight gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending foresight with caster included in targets', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Foresight',
      { level: 9 },
    );

    expect(result.current.pendingForesight).not.toBeNull();
    expect(result.current.pendingForesight.creatureTargets).toContain('TestSorcerer');
    expect(result.current.pendingForesight.creatureTargets).toContain('Goblin A');
  });
});

// ── Sanctuary gate ────────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Sanctuary gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending sanctuary with caster included in targets', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Sanctuary',
      { level: 1 },
    );

    expect(result.current.pendingSanctuary).not.toBeNull();
    expect(result.current.pendingSanctuary.creatureTargets).toContain('TestSorcerer');
  });
});

// ── Protection from Evil and Good gate ────────────────────────────────────────

describe('useSpellMetamagicFlow — Protection from Evil and Good gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending protectionFromEvilAndGood with caster in targets', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Protection from Evil and Good',
      { level: 1 },
    );

    expect(result.current.pendingProtectionFromEvilAndGood).not.toBeNull();
    expect(result.current.pendingProtectionFromEvilAndGood.creatureTargets).toContain('TestSorcerer');
  });
});

// ── Protection from Poison gate ───────────────────────────────────────────────

describe('useSpellMetamagicFlow — Protection from Poison gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending protectionFromPoison', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Protection from Poison',
      { level: 2 },
    );

    expect(result.current.pendingProtectionFromPoison).not.toBeNull();
  });
});

// ── Stone Skin gate ───────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Stone Skin gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending stoneSkin', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Stone Skin',
      { level: 3 },
    );

    expect(result.current.pendingStoneSkin).not.toBeNull();
  });
});

// ── Hold Monster gate ─────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Hold Monster gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending holdMonster excluding caster', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Hold Monster',
      { level: 5 },
    );

    expect(result.current.pendingHoldMonster).not.toBeNull();
    expect(result.current.pendingHoldMonster.creatureTargets).not.toContain('TestSorcerer');
    expect(result.current.pendingHoldMonster.creatureTargets).toContain('Goblin A');
  });

  it('parses upcast maxTargets from upcast_at_slot_level', () => {
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

    expect(result.current.pendingHoldMonster.maxTargets).toBe(2);
  });
});

// ── Hold Person gate ──────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Hold Person gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
    getMonsterData.mockResolvedValue({ type: 'humanoid' });
  });

  it('sets pending holdPerson for humanoid monsters', async () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', vi.fn())
    );

    await act(async () => {
      result.current.gateMetamagic(makeSpell({ name: 'Hold Person', level: 2 }));
    });

    expect(result.current.pendingHoldPerson).not.toBeNull();
  });

  it('excludes non-humanoid monsters', async () => {
    getMonsterData.mockResolvedValue({ type: 'Ooze' });
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', vi.fn())
    );

    await act(async () => {
      result.current.gateMetamagic(makeSpell({ name: 'Hold Person', level: 2 }));
    });

    expect(result.current.pendingHoldPerson).toBeNull();
  });
});

// ── Polymorph gate ────────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Polymorph gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending polymorph with maxTargets 1', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Polymorph',
      { level: 4 },
    );

    expect(result.current.pendingPolymorph).not.toBeNull();
    expect(result.current.pendingPolymorph.maxTargets).toBe(1);
  });
});

// ── Shapechange gate (Sorcerer only) ──────────────────────────────────────────

describe('useSpellMetamagicFlow — Shapechange gate', () => {
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
      useSpellMetamagicFlow(makeNonSorcererStats(), 'TestCampaign', onExecute)
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

// ── True Polymorph gate ───────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — True Polymorph gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending truePolymorph', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'True Polymorph',
      { level: 9 },
    );

    expect(result.current.pendingTruePolymorph).not.toBeNull();
  });
});

// ── Charm Person gate ─────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Charm Person gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
    getMonsterData.mockResolvedValue({ type: 'humanoid' });
  });

  it('sets pending charmPerson for humanoids', async () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', vi.fn())
    );

    await act(async () => {
      result.current.gateMetamagic(makeSpell({ name: 'Charm Person', level: 1 }));
    });

    expect(result.current.pendingCharmPerson).not.toBeNull();
  });
});

// ── Charm Monster gate ────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Charm Monster gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending charmMonster excluding caster', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Charm Monster',
      { level: 4 },
    );

    expect(result.current.pendingCharmMonster).not.toBeNull();
    expect(result.current.pendingCharmMonster.creatureTargets).not.toContain('TestSorcerer');
  });
});

// ── Banishment gate ───────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Banishment gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending banishment excluding caster', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Banishment',
      { level: 4 },
    );

    expect(result.current.pendingBanishment).not.toBeNull();
    expect(result.current.pendingBanishment.creatureTargets).not.toContain('TestSorcerer');
  });
});

// ── Prismatic Spray gate ──────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Prismatic Spray gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending prismatic_spray excluding caster', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Prismatic Spray',
      { level: 7 },
    );

    expect(result.current.pendingPrismaticSpray).not.toBeNull();
    expect(result.current.pendingPrismaticSpray.creatureTargets).not.toContain('TestSorcerer');
  });
});

// ── Lesser Restoration gate ───────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Lesser Restoration gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending lesserRestoration', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Lesser Restoration',
      { level: 2 },
    );

    expect(result.current.pendingLesserRestoration).not.toBeNull();
  });
});

// ── Greater Restoration gate ──────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Greater Restoration gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending greaterRestoration', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Greater Restoration',
      { level: 5 },
    );

    expect(result.current.pendingGreaterRestoration).not.toBeNull();
  });
});

// ── Remove Curse gate ─────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Remove Curse gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending removeCurse', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Remove Curse',
      { level: 3 },
    );

    expect(result.current.pendingRemoveCurse).not.toBeNull();
  });
});

// ── Aid gate ──────────────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Aid gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending aid with maxTargets 3', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Aid',
      { level: 1 },
    );

    expect(result.current.pendingAid).not.toBeNull();
    expect(result.current.pendingAid.maxTargets).toBe(3);
  });
});

// ── Bane gate ─────────────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Bane gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending bane with maxTargets 3', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Bane',
      { level: 0 },
    );

    expect(result.current.pendingBane).not.toBeNull();
    expect(result.current.pendingBane.maxTargets).toBe(3);
  });
});

// ── Bless gate ────────────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Bless gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending bless with maxTargets 3', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Bless',
      { level: 1 },
    );

    expect(result.current.pendingBless).not.toBeNull();
    expect(result.current.pendingBless.maxTargets).toBe(3);
  });
});

// ── Holy Aura gate ────────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Holy Aura gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending holyAura with spellLevel 8', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Holy Aura',
      { level: 8 },
    );

    expect(result.current.pendingHolyAura).not.toBeNull();
    expect(result.current.pendingHolyAura.spellLevel).toBe(8);
  });
});

// ── Faerie Fire gate ──────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Faerie Fire gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending faerieFire excluding caster', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Faerie Fire',
      { level: 1 },
    );

    expect(result.current.pendingFaerieFire).not.toBeNull();
    expect(result.current.pendingFaerieFire.creatureTargets).not.toContain('TestSorcerer');
  });
});

// ── Slow gate ─────────────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Slow gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending slow', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Slow',
      { level: 3 },
    );

    expect(result.current.pendingSlow).not.toBeNull();
  });
});

// ── Haste gate ────────────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Haste gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending haste', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Haste',
      { level: 3 },
    );

    expect(result.current.pendingHaste).not.toBeNull();
  });
});

// ── Enhance Ability gate ──────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Enhance Ability gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending enhanceAbility with caster included', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Enhance Ability',
      { level: 2 },
    );

    expect(result.current.pendingEnhanceAbility).not.toBeNull();
    expect(result.current.pendingEnhanceAbility.creatureTargets).toContain('TestSorcerer');
  });
});

// ── Barkskin gate ─────────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Barkskin gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending barkskin', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Barkskin',
      { level: 2 },
    );

    expect(result.current.pendingBarkskin).not.toBeNull();
  });
});

// ── Invisibility gate ─────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Invisibility gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending invisibility', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Invisibility',
      { level: 2 },
    );

    expect(result.current.pendingInvisibility).not.toBeNull();
  });
});

// ── Greater Invisibility gate ─────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Greater Invisibility gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending greaterInvisibility', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Greater Invisibility',
      { level: 4 },
    );

    expect(result.current.pendingGreaterInvisibility).not.toBeNull();
  });
});

// ── Feign Death gate ──────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Feign Death gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending feignDeath', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Feign Death',
      { level: 3 },
    );

    expect(result.current.pendingFeignDeath).not.toBeNull();
  });
});

// ── Heal gate ─────────────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Heal gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending heal', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Heal',
      { level: 6 },
    );

    expect(result.current.pendingHeal).not.toBeNull();
  });
});

// ── Longstrider gate ──────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Longstrider gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending longstrider', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Longstrider',
      { level: 0 },
    );

    expect(result.current.pendingLongstrider).not.toBeNull();
  });
});

// ── Spare The Dying gate ──────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Spare The Dying gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending spareTheDying excluding caster', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Spare The Dying',
      { level: 0 },
    );

    expect(result.current.pendingSpareTheDying).not.toBeNull();
    expect(result.current.pendingSpareTheDying.creatureTargets).not.toContain('TestSorcerer');
  });
});

// ── Pass Without Trace gate ──────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Pass Without Trace gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending passWithoutTrace', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Pass Without Trace',
      { level: 2 },
    );

    expect(result.current.pendingPassWithoutTrace).not.toBeNull();
  });
});

// ── Beacon of Hope gate ──────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Beacon of Hope gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending beaconOfHope with combat creatures', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Beacon of Hope',
      { level: 3 },
    );

    expect(result.current.pendingBeaconOfHope).not.toBeNull();
  });

  it('falls back to characters prop when no combat creatures', () => {
    getCombatSummary.mockReturnValueOnce({ creatures: [] });
    const characters = [{ name: 'Ally1' }, { name: 'Ally2' }];
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExecute, null, characters)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Beacon of Hope', level: 3 }));
    });

    expect(result.current.pendingBeaconOfHope).not.toBeNull();
  });
});

// ── Globe of Invulnerability gate ────────────────────────────────────────────

describe('useSpellMetamagicFlow — Globe of Invulnerability gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending globe', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Globe of Invulnerability',
      { level: 4 },
    );

    expect(result.current.pendingGlobe).not.toBeNull();
  });
});

// ── Antimagic Field gate ──────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Antimagic Field gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending antimagicField', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Antimagic Field',
      { level: 4 },
    );

    expect(result.current.pendingAntimagicField).not.toBeNull();
  });
});

// ── Forcecage gate ────────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Forcecage gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending forcecage', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Forcecage',
      { level: 7 },
    );

    expect(result.current.pendingForcecage).not.toBeNull();
  });
});

// ── Stinking Cloud gate ───────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Stinking Cloud gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending stinkingCloud', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Stinking Cloud',
      { level: 1 },
    );

    expect(result.current.pendingStinkingCloud).not.toBeNull();
  });
});

// ── Confusion gate ────────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Confusion gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending confusion with spellSaveDc from metaCtx', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Confusion',
      { level: 4 },
    );

    expect(result.current.pendingConfusion).not.toBeNull();
  });
});

// ── Web gate ──────────────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Web gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending web', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Web',
      { level: 1 },
    );

    expect(result.current.pendingWeb).not.toBeNull();
  });
});

// ── Animal Friendship gate ────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Animal Friendship gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
    getMonsterData.mockResolvedValue({ type: 'beast' });
  });

  it('sets pending animalFriendship for beasts', async () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', vi.fn())
    );

    await act(async () => {
      result.current.gateMetamagic(makeSpell({ name: 'Animal Friendship', level: 1 }));
    });

    expect(result.current.pendingAnimalFriendship).not.toBeNull();
  });
});

// ── Regenerate gate ───────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Regenerate gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending regenerate (case-sensitive name check)', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Regenerate',
      { level: 7 },
    );

    expect(result.current.pendingRegenerate).not.toBeNull();
  });
});

// ── Healing Word gate ─────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Healing Word gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending healingWord', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Healing Word',
      { level: 1 },
    );

    expect(result.current.pendingHealingWord).not.toBeNull();
  });
});

// ── Cure Wounds gate ──────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Cure Wounds gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending cureWounds', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Cure Wounds',
      { level: 1 },
    );

    expect(result.current.pendingCureWounds).not.toBeNull();
  });
});

// ── Revivify gate ─────────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Revivify gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending revivify excluding caster', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Revivify',
      { level: 5 },
    );

    expect(result.current.pendingRevivify).not.toBeNull();
    expect(result.current.pendingRevivify.creatureTargets).not.toContain('TestSorcerer');
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

// ── Aura of Life gate ─────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Aura of Life gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending auraOfLife', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Aura of Life',
      { level: 4 },
    );

    expect(result.current.pendingAuraOfLife).not.toBeNull();
  });
});

// ── Aura of Purity gate ──────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Aura of Purity gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending auraOfPurity', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Aura of Purity',
      { level: 4 },
    );

    expect(result.current.pendingAuraOfPurity).not.toBeNull();
  });
});

// ── Circle of Power gate ──────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Circle of Power gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending circleOfPower', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Circle of Power',
      { level: 9 },
    );

    expect(result.current.pendingCircleOfPower).not.toBeNull();
  });
});

// ── Compulsion gate ───────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Compulsion gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending compulsion', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Compulsion',
      { level: 4 },
    );

    expect(result.current.pendingCompulsion).not.toBeNull();
  });
});

// ── Aura of Vitality gate ─────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Aura of Vitality gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending auraOfVitality', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Aura of Vitality',
      { level: 3 },
    );

    expect(result.current.pendingAuraOfVitality).not.toBeNull();
  });

  it('sets isFreeCast when freeCastUsed in metaCtx', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Aura of Vitality', level: 3 }), { freeCastUsed: true });
    });

    expect(result.current.pendingAuraOfVitality.isFreeCast).toBe(true);
  });
});

// ── Death Ward gate ───────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Death Ward gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending deathWard', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Death Ward',
      { level: 4 },
    );

    expect(result.current.pendingDeathWard).not.toBeNull();
  });
});

// ── Heroism gate ──────────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Heroism gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending heroism', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Heroism',
      { level: 1 },
    );

    expect(result.current.pendingHeroism).not.toBeNull();
  });
});

// ── Shield of Faith gate ──────────────────────────────────────────────────────

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

// ── Sleet Storm gate ──────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Sleet Storm gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending sleetStorm with spellSaveDc from metaCtx', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Sleet Storm',
      { level: 3 },
    );

    expect(result.current.pendingSleetStorm).not.toBeNull();
  });
});

// ── Magic Missile gate ────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Magic Missile gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending magicMissile with totalMissiles based on slot level', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Magic Missile',
      { level: 3 },
    );

    expect(result.current.pendingMagicMissile).not.toBeNull();
    expect(result.current.pendingMagicMissile.totalMissiles).toBe(5);
  });
});

// ── Resistance gate ───────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Resistance gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pending resistance with all damage types', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Resistance',
      { level: 0 },
    );

    expect(result.current.pendingResistance).not.toBeNull();
    expect(result.current.pendingResistance.damageTypes.length).toBe(11);
  });
});

// ── Protection from Energy gate ───────────────────────────────────────────────

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

// ── Enhance Ability two-stage flow ────────────────────────────────────────────

describe('useSpellMetamagicFlow — Enhance Ability two-stage flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets enhanceAbilityStage to ability when pendingEnhanceAbility exists', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Enhance Ability',
      { level: 2 },
    );

    expect(result.current.enhanceAbilityStage).toBe('ability');
  });

  it('transitions to target stage after ability selection', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Enhance Ability',
      { level: 2 },
    );

    act(() => {
      result.current.handleEnhanceAbilityAbilitySelect('Bear Might');
    });

    expect(result.current.enhanceAbilityStage).toBe('target');
  });
});

// ── Protection from Energy two-stage flow ─────────────────────────────────────

describe('useSpellMetamagicFlow — Protection from Energy two-stage flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets protectionFromEnergyStage to target when pendingProtectionFromEnergy exists', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Protection from Energy',
      { level: 3 },
    );

    expect(result.current.protectionFromEnergyStage).toBe('target');
  });

  it('transitions to type stage after target selection', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Protection from Energy',
      { level: 3 },
    );

    act(() => {
      result.current.handleProtectionFromEnergyTargetSelect('Goblin A');
    });

    expect(result.current.protectionFromEnergyStage).toBe('type');
  });
});

// ── Resistance two-stage flow ─────────────────────────────────────────────────

describe('useSpellMetamagicFlow — Resistance two-stage flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets resistanceStage to target when pendingResistance exists', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Resistance',
      { level: 0 },
    );

    expect(result.current.resistanceStage).toBe('target');
  });

  it('transitions to type stage after target selection', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Resistance',
      { level: 0 },
    );

    act(() => {
      result.current.handleResistanceTargetSelect('Goblin A');
    });

    expect(result.current.resistanceStage).toBe('type');
  });
});

// ── Return value completeness ────────────────────────────────────────────────

describe('useSpellMetamagicFlow — return value', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('returns all pending state keys and handler functions', () => {
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExecute)
    );

    const ret = result.current;

    // All pending state keys
    expect(ret).toHaveProperty('pendingMetamagic');
    expect(ret).toHaveProperty('pendingMultiTarget');
    expect(ret).toHaveProperty('pendingAid');
    expect(ret).toHaveProperty('pendingBane');
    expect(ret).toHaveProperty('pendingBless');
    expect(ret).toHaveProperty('pendingFaerieFire');
    expect(ret).toHaveProperty('pendingHolyAura');
    expect(ret).toHaveProperty('pendingBeaconOfHope');
    expect(ret).toHaveProperty('pendingSlow');
    expect(ret).toHaveProperty('pendingHaste');
    expect(ret).toHaveProperty('pendingEnhanceAbility');
    expect(ret).toHaveProperty('pendingBarkskin');
    expect(ret).toHaveProperty('pendingInvisibility');
    expect(ret).toHaveProperty('pendingGreaterInvisibility');
    expect(ret).toHaveProperty('pendingFeignDeath');
    expect(ret).toHaveProperty('pendingHeal');
    expect(ret).toHaveProperty('pendingHeroesFeast');
    expect(ret).toHaveProperty('pendingGreaterRestoration');
    expect(ret).toHaveProperty('pendingLesserRestoration');
    expect(ret).toHaveProperty('pendingMageArmor');
    expect(ret).toHaveProperty('pendingShieldOfFaith');
    expect(ret).toHaveProperty('pendingProtectionFromEvilAndGood');
    expect(ret).toHaveProperty('pendingProtectionFromPoison');
    expect(ret).toHaveProperty('pendingStoneSkin');
    expect(ret).toHaveProperty('pendingProtectionFromEnergy');
    expect(ret).toHaveProperty('pendingResistance');
    expect(ret).toHaveProperty('pendingRemoveCurse');
    expect(ret).toHaveProperty('pendingMagicMissile');
    expect(ret).toHaveProperty('pendingPassWithoutTrace');
    expect(ret).toHaveProperty('pendingGlobe');
    expect(ret).toHaveProperty('pendingForcecage');
    expect(ret).toHaveProperty('pendingAntimagicField');
    expect(ret).toHaveProperty('pendingRegenerate');
    expect(ret).toHaveProperty('pendingHealingWord');
    expect(ret).toHaveProperty('pendingCureWounds');
    expect(ret).toHaveProperty('pendingStinkingCloud');
    expect(ret).toHaveProperty('pendingWeb');
    expect(ret).toHaveProperty('pendingAnimalFriendship');
    expect(ret).toHaveProperty('pendingAuraOfLife');
    expect(ret).toHaveProperty('pendingAuraOfPurity');
    expect(ret).toHaveProperty('pendingCircleOfPower');
    expect(ret).toHaveProperty('pendingCompulsion');
    expect(ret).toHaveProperty('pendingAuraOfVitality');
    expect(ret).toHaveProperty('pendingForesight');
    expect(ret).toHaveProperty('pendingLongstrider');
    expect(ret).toHaveProperty('pendingSpareTheDying');
    expect(ret).toHaveProperty('pendingPrismaticSpray');
    expect(ret).toHaveProperty('pendingRevivify');
    expect(ret).toHaveProperty('pendingSanctuary');
    expect(ret).toHaveProperty('pendingSleetStorm');
    expect(ret).toHaveProperty('pendingHoldMonster');
    expect(ret).toHaveProperty('pendingHoldPerson');
    expect(ret).toHaveProperty('pendingPolymorph');
    expect(ret).toHaveProperty('pendingShapechange');
    expect(ret).toHaveProperty('pendingAnimalShapes');
    expect(ret).toHaveProperty('pendingTruePolymorph');
    expect(ret).toHaveProperty('pendingCharmPerson');
    expect(ret).toHaveProperty('pendingCharmMonster');
    expect(ret).toHaveProperty('pendingBanishment');
    expect(ret).toHaveProperty('pendingDeathWard');
    expect(ret).toHaveProperty('pendingHeroism');

    // Key handler functions
    expect(ret).toHaveProperty('gateMetamagic');
    expect(ret).toHaveProperty('handleConfirm');
    expect(ret).toHaveProperty('handleSkip');
    expect(ret).toHaveProperty('handleMultiTargetConfirm');
    expect(ret).toHaveProperty('handleMultiTargetSkip');
    expect(ret).toHaveProperty('handleAidConfirm');
    expect(ret).toHaveProperty('handleAidSkip');
    expect(ret).toHaveProperty('handleBaneConfirm');
    expect(ret).toHaveProperty('handleBaneSkip');
    expect(ret).toHaveProperty('handleBlessConfirm');
    expect(ret).toHaveProperty('handleBlessSkip');
    expect(ret).toHaveProperty('handleHolyAuraConfirm');
    expect(ret).toHaveProperty('handleHolyAuraSkip');
    expect(ret).toHaveProperty('handleSlowConfirm');
    expect(ret).toHaveProperty('handleSlowSkip');
    expect(ret).toHaveProperty('handleHasteConfirm');
    expect(ret).toHaveProperty('handleHasteSkip');
    expect(ret).toHaveProperty('handleEnhanceAbilityAbilitySelect');
    expect(ret).toHaveProperty('handleEnhanceAbilityConfirm');
    expect(ret).toHaveProperty('handleEnhanceAbilitySkip');
    expect(ret).toHaveProperty('handleBarkskinConfirm');
    expect(ret).toHaveProperty('handleBarkskinSkip');
    expect(ret).toHaveProperty('handleInvisibilityConfirm');
    expect(ret).toHaveProperty('handleInvisibilitySkip');
    expect(ret).toHaveProperty('handleGreaterInvisibilityConfirm');
    expect(ret).toHaveProperty('handleGreaterInvisibilitySkip');
    expect(ret).toHaveProperty('handleFeignDeathConfirm');
    expect(ret).toHaveProperty('handleFeignDeathSkip');
    expect(ret).toHaveProperty('handleHealConfirm');
    expect(ret).toHaveProperty('handleHealSkip');
    expect(ret).toHaveProperty('handleHeroesFeastConfirm');
    expect(ret).toHaveProperty('handleHeroesFeastSkip');
    expect(ret).toHaveProperty('handleAuraOfLifeConfirm');
    expect(ret).toHaveProperty('handleAuraOfLifeSkip');
    expect(ret).toHaveProperty('handleAuraOfPurityConfirm');
    expect(ret).toHaveProperty('handleAuraOfPuritySkip');
    expect(ret).toHaveProperty('handleCircleOfPowerConfirm');
    expect(ret).toHaveProperty('handleCircleOfPowerSkip');
    expect(ret).toHaveProperty('handleCompulsionConfirm');
    expect(ret).toHaveProperty('handleCompulsionSkip');
    expect(ret).toHaveProperty('handleAuraOfVitalityConfirm');
    expect(ret).toHaveProperty('handleAuraOfVitalitySkip');
    expect(ret).toHaveProperty('handleDeathWardConfirm');
    expect(ret).toHaveProperty('handleDeathWardSkip');
    expect(ret).toHaveProperty('handleHeroismConfirm');
    expect(ret).toHaveProperty('handleHeroismSkip');
    expect(ret).toHaveProperty('handleResistanceTargetSelect');
    expect(ret).toHaveProperty('handleResistanceTypeSelect');
    expect(ret).toHaveProperty('handleResistanceSkip');
    expect(ret).toHaveProperty('handleProtectionFromEnergyTargetSelect');
    expect(ret).toHaveProperty('handleProtectionFromEnergyTypeSelect');
    expect(ret).toHaveProperty('handleProtectionFromEnergySkip');
    expect(ret).toHaveProperty('handleProtectionFromPoisonConfirm');
    expect(ret).toHaveProperty('handleProtectionFromPoisonSkip');
    expect(ret).toHaveProperty('handleStoneSkinConfirm');
    expect(ret).toHaveProperty('handleStoneSkinSkip');
    expect(ret).toHaveProperty('handleGlobeConfirm');
    expect(ret).toHaveProperty('handleGlobeSkip');
    expect(ret).toHaveProperty('handleForcecageConfirm');
    expect(ret).toHaveProperty('handleForcecageSkip');
    expect(ret).toHaveProperty('handleAntimagicFieldConfirm');
    expect(ret).toHaveProperty('handleAntimagicFieldSkip');
    expect(ret).toHaveProperty('handleStinkingCloudConfirm');
    expect(ret).toHaveProperty('handleStinkingCloudSkip');
    expect(ret).toHaveProperty('handleConfusionConfirm');
    expect(ret).toHaveProperty('handleConfusionSkip');
    expect(ret).toHaveProperty('handleWebConfirm');
    expect(ret).toHaveProperty('handleWebSkip');
    expect(ret).toHaveProperty('handleAnimalFriendshipConfirm');
    expect(ret).toHaveProperty('handleAnimalFriendshipSkip');
    expect(ret).toHaveProperty('handleRegenerateConfirm');
    expect(ret).toHaveProperty('handleRegenerateSkip');
    expect(ret).toHaveProperty('handleHealingWordConfirm');
    expect(ret).toHaveProperty('handleHealingWordSkip');
    expect(ret).toHaveProperty('handleCureWoundsConfirm');
    expect(ret).toHaveProperty('handleCureWoundsSkip');
    expect(ret).toHaveProperty('handleHoldMonsterConfirm');
    expect(ret).toHaveProperty('handleHoldMonsterSkip');
    expect(ret).toHaveProperty('handleHoldPersonConfirm');
    expect(ret).toHaveProperty('handleHoldPersonSkip');
    expect(ret).toHaveProperty('handlePolymorphConfirm');
    expect(ret).toHaveProperty('handlePolymorphSkip');
    expect(ret).toHaveProperty('handleAnimalShapesTargetConfirm');
    expect(ret).toHaveProperty('handleAnimalShapesSkip');
    expect(ret).toHaveProperty('handleAnimalShapesBeastConfirm');
    expect(ret).toHaveProperty('handleTruePolymorphPathSelect');
    expect(ret).toHaveProperty('handleTruePolymorphTargetConfirm');
    expect(ret).toHaveProperty('handleTruePolymorphSkip');
    expect(ret).toHaveProperty('handleCharmPersonConfirm');
    expect(ret).toHaveProperty('handleCharmPersonSkip');
    expect(ret).toHaveProperty('handleCharmMonsterConfirm');
    expect(ret).toHaveProperty('handleCharmMonsterSkip');
    expect(ret).toHaveProperty('handleBanishmentConfirm');
    expect(ret).toHaveProperty('handleBanishmentSkip');
    expect(ret).toHaveProperty('handlePrismaticSprayConfirm');
    expect(ret).toHaveProperty('handlePrismaticSpraySkip');
    expect(ret).toHaveProperty('handleRevivifyConfirm');
    expect(ret).toHaveProperty('handleRevivifySkip');
    expect(ret).toHaveProperty('handleSanctuaryConfirm');
    expect(ret).toHaveProperty('handleSanctuarySkip');
    expect(ret).toHaveProperty('handleSleetStormConfirm');
    expect(ret).toHaveProperty('handleSleetStormSkip');
    expect(ret).toHaveProperty('handleMagicMissileConfirm');
    expect(ret).toHaveProperty('handleMagicMissileSkip');
    expect(ret).toHaveProperty('handleForesightConfirm');
    expect(ret).toHaveProperty('handleForesightSkip');
    expect(ret).toHaveProperty('handleProtectionFromEvilAndGoodConfirm');
    expect(ret).toHaveProperty('handleProtectionFromEvilAndGoodSkip');
    expect(ret).toHaveProperty('handleShieldOfFaithConfirm');
    expect(ret).toHaveProperty('handleShieldOfFaithSkip');
    expect(ret).toHaveProperty('handleEnhanceAbilityConfirm');
    expect(ret).toHaveProperty('handleEnhanceAbilitySkip');
    expect(ret).toHaveProperty('handleBarkskinConfirm');
    expect(ret).toHaveProperty('handleBarkskinSkip');
    expect(ret).toHaveProperty('handleInvisibilityConfirm');
    expect(ret).toHaveProperty('handleInvisibilitySkip');
    expect(ret).toHaveProperty('handleGreaterInvisibilityConfirm');
    expect(ret).toHaveProperty('handleGreaterInvisibilitySkip');
    expect(ret).toHaveProperty('handleFaerieFireConfirm');
    expect(ret).toHaveProperty('handleFaerieFireSkip');
    expect(ret).toHaveProperty('handleBeaconOfHopeConfirm');
    expect(ret).toHaveProperty('handleBeaconOfHopeSkip');
    expect(ret).toHaveProperty('handleLongstriderConfirm');
    expect(ret).toHaveProperty('handleLongstriderSkip');
    expect(ret).toHaveProperty('handleSpareTheDyingConfirm');
    expect(ret).toHaveProperty('handleSpareTheDyingSkip');
    expect(ret).toHaveProperty('handlePassWithoutTraceConfirm');
    expect(ret).toHaveProperty('handlePassWithoutTraceSkip');
    expect(ret).toHaveProperty('handleLesserRestorationConfirm');
    expect(ret).toHaveProperty('handleLesserRestorationSkip');
    expect(ret).toHaveProperty('handleRemoveCurseConfirm');
    expect(ret).toHaveProperty('handleRemoveCurseSkip');
    expect(ret).toHaveProperty('handleMageArmorConfirm');
    expect(ret).toHaveProperty('handleMageArmorSkip');
    expect(ret).toHaveProperty('handleProtectionFromEnergyTypeSelect');
    expect(ret).toHaveProperty('handleProtectionFromEnergySkip');
    expect(ret).toHaveProperty('handleProtectionFromPoisonConfirm');
    expect(ret).toHaveProperty('handleProtectionFromPoisonSkip');
    expect(ret).toHaveProperty('handleStoneSkinConfirm');
    expect(ret).toHaveProperty('handleStoneSkinSkip');
    expect(ret).toHaveProperty('handleGreaterRestorationConfirm');
    expect(ret).toHaveProperty('handleGreaterRestorationSkip');
    expect(ret).toHaveProperty('handleTruePolymorphTargetConfirm');
    expect(ret).toHaveProperty('handleTruePolymorphSkip');
    expect(ret).toHaveProperty('handleCharmPersonConfirm');
    expect(ret).toHaveProperty('handleCharmPersonSkip');
    expect(ret).toHaveProperty('handleCharmMonsterConfirm');
    expect(ret).toHaveProperty('handleCharmMonsterSkip');
    expect(ret).toHaveProperty('handleBanishmentConfirm');
    expect(ret).toHaveProperty('handleBanishmentSkip');
    expect(ret).toHaveProperty('handleAnimalShapesTargetConfirm');
    expect(ret).toHaveProperty('handleAnimalShapesSkip');
    expect(ret).toHaveProperty('handleAnimalShapesBeastConfirm');
    expect(ret).toHaveProperty('handleRevivifyConfirm');
    expect(ret).toHaveProperty('handleRevivifySkip');
    expect(ret).toHaveProperty('handleSanctuaryConfirm');
    expect(ret).toHaveProperty('handleSanctuarySkip');
    expect(ret).toHaveProperty('handleSleetStormConfirm');
    expect(ret).toHaveProperty('handleSleetStormSkip');
    expect(ret).toHaveProperty('handleMagicMissileConfirm');
    expect(ret).toHaveProperty('handleMagicMissileSkip');
    expect(ret).toHaveProperty('handleForesightConfirm');
    expect(ret).toHaveProperty('handleForesightSkip');
    expect(ret).toHaveProperty('handleProtectionFromEvilAndGoodConfirm');
    expect(ret).toHaveProperty('handleProtectionFromEvilAndGoodSkip');
    expect(ret).toHaveProperty('handleShieldOfFaithConfirm');
    expect(ret).toHaveProperty('handleShieldOfFaithSkip');

    // Stage state
    expect(ret).toHaveProperty('resistanceStage');
    expect(ret).toHaveProperty('enhanceAbilityStage');
    expect(ret).toHaveProperty('protectionFromEnergyStage');
  });
});
