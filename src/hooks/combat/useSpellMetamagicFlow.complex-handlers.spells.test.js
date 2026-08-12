import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpellMetamagicFlow } from './useSpellMetamagicFlow.js';
import { addEntry } from '../../services/ui/logService.js';

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
  getMonsterData: vi.fn(() => Promise.resolve({ type: 'humanoid' })),
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
  applyProtectionFromEnergyHandler: vi.fn(),
  applyProtectionFromEvilAndGood: vi.fn(),
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

vi.mock('../runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(() => 3),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../useAllySelection.js', () => ({
  getAllyList: vi.fn((casterName) => [casterName.toLowerCase()]),
}));

vi.mock('../../services/rules/spells/spellPreparationService.js', () => ({
  prepareSpellCast: vi.fn(() => Promise.resolve({ modifiedSpell: {}, metaCtx: {} })),
  isFreeCastAuthorized: vi.fn(() => false),
  incrementFreeCastResource: vi.fn(),
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

describe('useSpellMetamagicFlow — Globe confirm/skip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('executes globe handler and logs entry on confirm', async () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Globe of Invulnerability',
      { level: 4 },
    );

    const automation = await import('../../services/automation/index.js');

    await act(async () => {
      await result.current.handleGlobeConfirm(['Goblin A']);
    });

    expect(automation.executeHandler).toHaveBeenCalled();
    expect(result.current.pendingGlobe).toBeNull();
  });
});

describe('useSpellMetamagicFlow — Antimagic Field confirm/skip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('executes antimagic field handler and logs entry on confirm', async () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Antimagic Field',
      { level: 4 },
    );

    const automation = await import('../../services/automation/index.js');

    await act(async () => {
      await result.current.handleAntimagicFieldConfirm(['Goblin A']);
    });

    expect(automation.executeHandler).toHaveBeenCalled();
    expect(result.current.pendingAntimagicField).toBeNull();
  });
});

describe('useSpellMetamagicFlow — Stinking Cloud confirm/skip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('executes stinking cloud handler and logs entry on confirm', async () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Stinking Cloud',
      { level: 1 },
    );

    const automation = await import('../../services/automation/index.js');

    await act(async () => {
      await result.current.handleStinkingCloudConfirm(['Goblin A']);
    });

    expect(automation.executeHandler).toHaveBeenCalled();
    expect(result.current.pendingStinkingCloud).toBeNull();
  });
});

describe('useSpellMetamagicFlow — Confusion confirm/skip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('executes confusion handler and logs entry on confirm', async () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Confusion',
      { level: 4 },
    );

    const automation = await import('../../services/automation/index.js');

    await act(async () => {
      await result.current.handleConfusionConfirm(['Goblin A']);
    });

    expect(automation.executeHandler).toHaveBeenCalled();
    expect(result.current.pendingConfusion).toBeNull();
  });
});

describe('useSpellMetamagicFlow — Cure Wounds confirm/skip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls onExecute with targetName and slotLevel on confirm', async () => {
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExecute)
    );
    const spell = makeSpell({ name: 'Cure Wounds', level: 1 });
    act(() => {
      result.current.gateMetamagic(spell);
    });

    await act(async () => {
      await result.current.handleCureWoundsConfirm({ targetName: 'Goblin A' });
    });

    expect(onExecute).toHaveBeenCalledWith(spell, { targetName: 'Goblin A', slotLevel: 1 });
    expect(result.current.pendingCureWounds).toBeNull();
  });
});

describe('useSpellMetamagicFlow — Hold Monster confirm/skip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggers hold monster and logs entry on confirm', async () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Hold Monster',
      { level: 5 },
    );

    const { triggerHoldMonster } = await import('../../services/rules/features/holdMonsterService.js');

    await act(async () => {
      await result.current.handleHoldMonsterConfirm(['Goblin A']);
    });

    expect(triggerHoldMonster).toHaveBeenCalled();
    expect(result.current.pendingHoldMonster).toBeNull();
  });
});

describe('useSpellMetamagicFlow — Hold Person confirm/skip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggers hold monster with holdPersonTargets and logs entry on confirm', async () => {
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExecute)
    );

    await act(async () => {
      await result.current.gateMetamagic(makeSpell({ name: 'Hold Person', level: 2 }));
    });

    await act(async () => {
      await result.current.handleHoldPersonConfirm(['Goblin A']);
    });

    expect(addEntry).toHaveBeenCalledWith('TestCampaign', {
      type: 'spell',
      characterName: 'TestSorcerer',
      targetName: 'Goblin A',
      targets: ['Goblin A', 'Goblin B', 'Goblin C'],
      spellName: 'Hold Person',
      spellLevel: 2,
      castingTime: '1 Action',
      timestamp: expect.any(Number),
    });
    expect(result.current.pendingHoldPerson).toBeNull();
  });
});

describe('useSpellMetamagicFlow — Polymorph confirm/skip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies polymorph and logs entry on confirm', async () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Polymorph',
      { level: 4 },
    );

    await act(async () => {
      await result.current.handlePolymorphConfirm(['Goblin A']);
    });

    expect(result.current.pendingPolymorph).toBeNull();
  });
});

describe('useSpellMetamagicFlow — Animal Shapes confirm/skip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets animal shapes target selection modal on confirm', async () => {
    const setPopupHtml = vi.fn();
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExecute, null, [], setPopupHtml)
    );

    const allySel = await import('../../hooks/useAllySelection.js');
    allySel.getAllyList.mockReturnValueOnce(['goblin a']);

    await act(async () => {
      await result.current.gateMetamagic(makeSpell({ name: 'Animal Shapes', level: 8 }));
    });

    expect(result.current.pendingAnimalShapes).not.toBeNull();

    await act(async () => {
      await result.current.handleAnimalShapesTargetConfirm(['Goblin A']);
    });

    expect(setPopupHtml).toHaveBeenCalledWith({
      type: 'animal_shapes_target_selection',
      targets: ['Goblin A'],
      casterName: 'TestSorcerer',
      campaignName: 'TestCampaign',
      spell: expect.any(Object),
      spellLevel: 8,
      maxCR: 4,
    });
    expect(result.current.pendingAnimalShapes).toBeNull();
  });
});

describe('useSpellMetamagicFlow — True Polymorph path select', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets path on pending when not object_into_creature', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'True Polymorph',
      { level: 9 },
    );

    act(() => {
      result.current.handleTruePolymorphPathSelect('creature_to_creature');
    });

    expect(result.current.pendingTruePolymorph.path).toBe('creature_to_creature');
  });

  it('clears pending and applies true polymorph when object_into_creature', async () => {
    const setPopupHtml = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', vi.fn(), null, [], setPopupHtml)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'True Polymorph', level: 9 }));
    });

    await act(async () => {
      await result.current.handleTruePolymorphPathSelect('object_into_creature');
    });

    expect(result.current.pendingTruePolymorph).toBeNull();
  });
});

describe('useSpellMetamagicFlow — True Polymorph target confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies true polymorph with path and target on confirm', async () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'True Polymorph',
      { level: 9 },
    );

    act(() => {
      result.current.handleTruePolymorphPathSelect('creature_to_creature');
    });

    await act(async () => {
      await result.current.handleTruePolymorphTargetConfirm(['Goblin A']);
    });

    expect(result.current.pendingTruePolymorph).toBeNull();
  });
});
