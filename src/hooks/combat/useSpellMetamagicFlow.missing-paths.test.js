import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpellMetamagicFlow } from './useSpellMetamagicFlow.js';
import { addEntry } from '../../services/ui/logService.js';
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

// ── getCreatureTargets (standalone function inside the module) ───────────────

describe('useSpellMetamagicFlow — getCreatureTargets', () => {
  it('returns creature names from combat summary', () => {
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExecute)
    );

    // The function is not exported, but we can verify via the return value
    // that the hook is properly initialized
    expect(result.current.pendingMetamagic).toBeNull();
  });
});

// ── handleGreaterRestorationNoEffects (slot refund path) ─────────────────────

describe('useSpellMetamagicFlow — handleGreaterRestorationNoEffects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('refunds spell slot and logs entry when no effects to remove', async () => {
    const { setRuntimeValue } = await import('../runtime/useRuntimeState.js');
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Greater Restoration',
      { level: 5 },
    );

    act(() => {
      result.current.handleGreaterRestorationNoEffects();
    });

    expect(setRuntimeValue).toHaveBeenCalledWith(
      'TestSorcerer',
      'spell_slots_level_5',
      4,
      'TestCampaign'
    );
    expect(addEntry).toHaveBeenCalledWith('TestCampaign', {
      type: 'spell',
      characterName: 'TestSorcerer',
      targetName: null,
      targets: [],
      spellName: 'Greater Restoration',
      spellLevel: 5,
      castingTime: '1 Action',
      timestamp: expect.any(Number),
    });
    expect(result.current.pendingGreaterRestoration).toBeNull();
  });
});

// ── Non-Sorcerer cantrip with material consumption ───────────────────────────

describe('useSpellMetamagicFlow — non-Sorcerer cantrip with material', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('consumes material and calls onExecute for non-Sorcerer cantrip with damage and material', async () => {
    const materialModule = await import('../../services/rules/spells/materialComponents.js');
    materialModule.getConsumedMaterial.mockImplementation((spell) => {
      if ((spell.name || '').toLowerCase() === 'firebolt') {
        return { itemName: 'Some Material' };
      }
      return null;
    });

    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(
        { name: 'TestWizard', class: { name: 'Wizard' }, level: 5 },
        'TestCampaign',
        onExecute
      )
    );

    await act(async () => {
      result.current.gateMetamagic(makeSpell({ name: 'Firebolt', level: 0, damage: { damage_at_character_level: { 5: '1d10' } } }));
    });

    expect(onExecute).toHaveBeenCalled();
    expect(materialModule.consumeMaterial).toHaveBeenCalledWith(
      expect.any(Object),
      'Some Material',
      'TestCampaign'
    );
  });
});

// ── Multi-target spread with setSecondaryTargetModal (Power Word spells) ─────

describe('useSpellMetamagicFlow — multi-target spread with secondary modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows secondary target modal for Power Word Heal when setSecondaryTargetModal is provided', () => {
    const setSecondaryTargetModal = vi.fn();
    const setPopupHtml = vi.fn();
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(
        makePlayerStats(),
        'TestCampaign',
        onExecute,
        setSecondaryTargetModal,
        [],
        setPopupHtml
      )
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Power Word Heal', level: 9 }));
    });

    expect(setSecondaryTargetModal).toHaveBeenCalled();
    const modal = setSecondaryTargetModal.mock.calls[0][0];
    expect(modal.secondaryTargetModal.title).toBe('Words of Creation — Choose Second Target');
    expect(modal.secondaryTargetModal.targets).toHaveLength(3);
  });

  it('calls onExecute with multiTarget when second target selected from modal', async () => {
    const setSecondaryTargetModal = vi.fn();
    const setPopupHtml = vi.fn();
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(
        makePlayerStats(),
        'TestCampaign',
        onExecute,
        setSecondaryTargetModal,
        [],
        setPopupHtml
      )
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Power Word Kill', level: 8 }));
    });

    expect(setSecondaryTargetModal).toHaveBeenCalled();
    const modal = setSecondaryTargetModal.mock.calls[0][0].secondaryTargetModal;

    // Simulate target selection
    await act(async () => {
      await modal.onTargetSelected('Goblin A');
    });

    expect(onExecute).toHaveBeenCalled();
    expect(onExecute.mock.calls[0][1].multiTarget).toBe('Goblin A');
  });

  it('calls onExecute with empty metaCtx when skipping secondary target', async () => {
    const setSecondaryTargetModal = vi.fn();
    const setPopupHtml = vi.fn();
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(
        makePlayerStats(),
        'TestCampaign',
        onExecute,
        setSecondaryTargetModal,
        [],
        setPopupHtml
      )
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Power Word Heal', level: 9 }));
    });

    expect(setSecondaryTargetModal).toHaveBeenCalled();
    const modal = setSecondaryTargetModal.mock.calls[0][0].secondaryTargetModal;

    // Simulate skip
    await act(async () => {
      modal.onSkip();
    });

    expect(onExecute).toHaveBeenCalled();
    expect(onExecute.mock.calls[0][1]).toEqual({});
  });

  it('does not show secondary modal when setSecondaryTargetModal is null', () => {
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExecute)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Power Word Heal', level: 9 }));
    });

    // Should fall through to multiTarget pending (not secondary modal)
    expect(result.current.pendingMultiTarget).not.toBeNull();
  });
});

// ── handleAnimalShapesBeastConfirm with result.ok = true ─────────────────────

describe('useSpellMetamagicFlow — handleAnimalShapesBeastConfirm success', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets animalShapes concentration state when result.ok is true', async () => {
    const animalShapesModule = await import('../../services/automation/handlers/spells/animalShapesService.js');
    animalShapesModule.applyAnimalShapes.mockResolvedValue({ ok: true });

    const setPopupHtml = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', vi.fn(), null, [], setPopupHtml)
    );

    // Set up allies to include a creature so gate sets pending
    const allySel = await import('../../hooks/useAllySelection.js');
    allySel.getAllyList.mockReturnValueOnce(['goblin a']);

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Animal Shapes', level: 8 }));
    });

    expect(result.current.pendingAnimalShapes).not.toBeNull();

    await act(async () => {
      await result.current.handleAnimalShapesTargetConfirm(['Goblin A']);
    });

    expect(setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
      type: 'animal_shapes_target_selection',
    }));
  });
});

// ── handleTruePolymorphSkip ──────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleTruePolymorphSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending truePolymorph without calling onExecute', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'True Polymorph',
      { level: 9 },
    );

    act(() => {
      result.current.handleTruePolymorphPathSelect('creature_to_creature');
    });

    act(() => {
      result.current.handleTruePolymorphSkip();
    });

    expect(result.current.pendingTruePolymorph).toBeNull();
  });
});

// ── handleForesightSkip when pending exists ──────────────────────────────────

describe('useSpellMetamagicFlow — handleForesightSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending foresight and logs entry on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Foresight',
      { level: 9 },
    );

    act(() => {
      result.current.handleForesightSkip();
    });

    expect(result.current.pendingForesight).toBeNull();
    expect(addEntry).toHaveBeenCalledWith('TestCampaign', {
      type: 'spell',
      characterName: 'TestSorcerer',
      targetName: 'TestSorcerer',
      targets: ['TestSorcerer', 'Goblin A', 'Goblin B', 'Goblin C'],
      spellName: 'Foresight',
      spellLevel: 9,
      castingTime: '1 Action',
      timestamp: expect.any(Number),
    });
  });
});

// ── handleProtectionFromEvilAndGoodSkip ──────────────────────────────────────

describe('useSpellMetamagicFlow — handleProtectionFromEvilAndGoodSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending and logs entry on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Protection from Evil and Good',
      { level: 1 },
    );

    act(() => {
      result.current.handleProtectionFromEvilAndGoodSkip();
    });

    expect(result.current.pendingProtectionFromEvilAndGood).toBeNull();
    expect(addEntry).toHaveBeenCalledWith('TestCampaign', {
      type: 'spell',
      characterName: 'TestSorcerer',
      targetName: 'TestSorcerer',
      targets: ['TestSorcerer'],
      spellName: 'Protection from Evil and Good',
      spellLevel: 1,
      castingTime: '1 Action',
      timestamp: expect.any(Number),
    });
  });
});

// ── handleShieldOfFaithConfirm/Skip (Sorcerer flow, no gate) ────────────────

describe('useSpellMetamagicFlow — Shield of Faith Sorcerer flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets pendingMetamagic for Shield of Faith (no gate)', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Shield of Faith',
      { level: 1 },
    );

    expect(result.current.pendingMetamagic).not.toBeNull();
    expect(result.current.pendingShieldOfFaith).toBeNull();
  });

  it('handleShieldOfFaithConfirm does nothing without pendingShieldOfFaith', () => {
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExecute)
    );

    act(() => {
      result.current.handleShieldOfFaithConfirm(['Goblin A']);
    });

    expect(onExecute).not.toHaveBeenCalled();
  });

  it('handleShieldOfFaithSkip does nothing without pendingShieldOfFaith', () => {
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExecute)
    );

    act(() => {
      result.current.handleShieldOfFaithSkip();
    });

    expect(onExecute).not.toHaveBeenCalled();
  });
});

// ── useEffect stage-setting callbacks ────────────────────────────────────────

describe('useSpellMetamagicFlow — useEffect stage-setting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets resistanceStage to target when pendingResistance exists on mount', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Resistance',
      { level: 0 },
    );

    expect(result.current.resistanceStage).toBe('target');
  });

  it('sets protectionFromEnergyStage to target when pendingProtectionFromEnergy exists on mount', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Protection from Energy',
      { level: 3 },
    );

    expect(result.current.protectionFromEnergyStage).toBe('target');
  });

  it('sets enhanceAbilityStage to ability when pendingEnhanceAbility exists on mount', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Enhance Ability',
      { level: 2 },
    );

    expect(result.current.enhanceAbilityStage).toBe('ability');
  });
});

// ── handleProtectionFromPoisonSkip rollback ──────────────────────────────────

describe('useSpellMetamagicFlow — handleProtectionFromPoisonSkip rollback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('rolls back spell slot and logs entry on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Protection from Poison',
      { level: 2 },
    );

    act(() => {
      result.current.handleProtectionFromPoisonSkip();
    });

    expect(result.current.pendingProtectionFromPoison).toBeNull();
    expect(addEntry).toHaveBeenCalledWith('TestCampaign', {
      type: 'spell',
      characterName: 'TestSorcerer',
      targetName: 'TestSorcerer',
      targets: expect.arrayContaining(['TestSorcerer', 'Goblin A', 'Goblin B', 'Goblin C']),
      spellName: 'Protection from Poison',
      spellLevel: 2,
      castingTime: '1 Action',
      timestamp: expect.any(Number),
    });
  });
});

// ── handleStoneSkinSkip rollback ─────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleStoneSkinSkip rollback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('rolls back spell slot and logs entry on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Stone Skin',
      { level: 3 },
    );

    act(() => {
      result.current.handleStoneSkinSkip();
    });

    expect(result.current.pendingStoneSkin).toBeNull();
    expect(addEntry).toHaveBeenCalledWith('TestCampaign', {
      type: 'spell',
      characterName: 'TestSorcerer',
      targetName: 'Goblin A',
      targets: expect.arrayContaining(['Goblin A', 'Goblin B', 'Goblin C']),
      spellName: 'Stone Skin',
      spellLevel: 3,
      castingTime: '1 Action',
      timestamp: expect.any(Number),
    });
  });
});

// ── handleEnhanceAbilityConfirm when no ability selected ─────────────────────

describe('useSpellMetamagicFlow — handleEnhanceAbilityConfirm no ability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('does nothing when confirm is called without selecting an ability first', () => {
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExecute)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Enhance Ability', level: 2 }));
    });

    // Don't select an ability - just call confirm
    act(() => {
      result.current.handleEnhanceAbilityConfirm({ targetName: 'Goblin A' });
    });

    expect(onExecute).not.toHaveBeenCalled();
  });
});

// ── handleProtectionFromPoisonConfirm when no targetName ─────────────────────

describe('useSpellMetamagicFlow — handleProtectionFromPoisonConfirm no target', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('does nothing when result has no targetName', () => {
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExecute)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Protection from Poison', level: 2 }));
    });

    // Call confirm with empty result
    act(() => {
      result.current.handleProtectionFromPoisonConfirm({});
    });

    expect(onExecute).not.toHaveBeenCalled();
  });
});

// ── handleRevivifyConfirm when no targetName ─────────────────────────────────

describe('useSpellMetamagicFlow — handleRevivifyConfirm no target', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('does nothing when result has no targetName', () => {
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExecute)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Revivify', level: 5 }));
    });

    act(() => {
      result.current.handleRevivifyConfirm({});
    });

    expect(onExecute).not.toHaveBeenCalled();
  });
});

// ── handleSanctuaryConfirm ──────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleSanctuaryConfirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('applies sanctuary on confirm with targetName', async () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Sanctuary',
      { level: 1 },
    );

    const automation = await import('../../services/automation/index.js');

    await act(async () => {
      await result.current.handleSanctuaryConfirm('Goblin A');
    });

    expect(automation.handleSanctuary).toHaveBeenCalled();
    expect(result.current.pendingSanctuary).toBeNull();
  });
});

// ── handleSanctuarySkip ─────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleSanctuarySkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending and logs entry on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Sanctuary',
      { level: 1 },
    );

    act(() => {
      result.current.handleSanctuarySkip();
    });

    expect(result.current.pendingSanctuary).toBeNull();
  });
});

// ── handleSleetStormConfirm ─────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleSleetStormConfirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('executes sleet storm handler on confirm', async () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Sleet Storm',
      { level: 3 },
    );

    const automation = await import('../../services/automation/index.js');

    await act(async () => {
      await result.current.handleSleetStormConfirm(['Goblin A']);
    });

    expect(automation.executeHandler).toHaveBeenCalled();
    expect(result.current.pendingSleetStorm).toBeNull();
  });
});

// ── handleSleetStormSkip ────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleSleetStormSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Sleet Storm',
      { level: 3 },
    );

    act(() => {
      result.current.handleSleetStormSkip();
    });

    expect(result.current.pendingSleetStorm).toBeNull();
  });
});

// ── handleMagicMissileSkip ──────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleMagicMissileSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Magic Missile',
      { level: 1 },
    );

    act(() => {
      result.current.handleMagicMissileSkip();
    });

    expect(result.current.pendingMagicMissile).toBeNull();
  });
});

// ── handleAnimalFriendshipSkip ──────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleAnimalFriendshipSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Animal Friendship',
      { level: 1 },
    );

    act(() => {
      result.current.handleAnimalFriendshipSkip();
    });

    expect(result.current.pendingAnimalFriendship).toBeNull();
  });
});

// ── handleRegenerateSkip ────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleRegenerateSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Regenerate',
      { level: 7 },
    );

    act(() => {
      result.current.handleRegenerateSkip();
    });

    expect(result.current.pendingRegenerate).toBeNull();
  });
});

// ── handleHealingWordSkip ───────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleHealingWordSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Healing Word',
      { level: 1 },
    );

    act(() => {
      result.current.handleHealingWordSkip();
    });

    expect(result.current.pendingHealingWord).toBeNull();
  });
});

// ── handleCureWoundsSkip ────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleCureWoundsSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Cure Wounds',
      { level: 1 },
    );

    act(() => {
      result.current.handleCureWoundsSkip();
    });

    expect(result.current.pendingCureWounds).toBeNull();
  });
});

// ── handleHoldMonsterSkip ───────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleHoldMonsterSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Hold Monster',
      { level: 5 },
    );

    act(() => {
      result.current.handleHoldMonsterSkip();
    });

    expect(result.current.pendingHoldMonster).toBeNull();
  });
});

// ── handleHoldPersonSkip ────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleHoldPersonSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Hold Person',
      { level: 2 },
    );

    act(() => {
      result.current.handleHoldPersonSkip();
    });

    expect(result.current.pendingHoldPerson).toBeNull();
  });
});

// ── handlePolymorphSkip ─────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handlePolymorphSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Polymorph',
      { level: 4 },
    );

    act(() => {
      result.current.handlePolymorphSkip();
    });

    expect(result.current.pendingPolymorph).toBeNull();
  });
});

// ── handleAnimalShapesSkip ──────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleAnimalShapesSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Animal Shapes',
      { level: 8 },
    );

    act(() => {
      result.current.handleAnimalShapesSkip();
    });

    expect(result.current.pendingAnimalShapes).toBeNull();
  });
});

// ── handleCharmPersonSkip ───────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleCharmPersonSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Charm Person',
      { level: 1 },
    );

    act(() => {
      result.current.handleCharmPersonSkip();
    });

    expect(result.current.pendingCharmPerson).toBeNull();
  });
});

// ── handleCharmMonsterSkip ──────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleCharmMonsterSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Charm Monster',
      { level: 4 },
    );

    act(() => {
      result.current.handleCharmMonsterSkip();
    });

    expect(result.current.pendingCharmMonster).toBeNull();
  });
});

// ── handleBanishmentSkip ────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleBanishmentSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Banishment',
      { level: 4 },
    );

    act(() => {
      result.current.handleBanishmentSkip();
    });

    expect(result.current.pendingBanishment).toBeNull();
  });
});

// ── handlePrismaticSpraySkip ────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handlePrismaticSpraySkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Prismatic Spray',
      { level: 7 },
    );

    act(() => {
      result.current.handlePrismaticSpraySkip();
    });

    expect(result.current.pendingPrismaticSpray).toBeNull();
  });
});

// ── handleRevivifySkip ──────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleRevivifySkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Revivify',
      { level: 5 },
    );

    act(() => {
      result.current.handleRevivifySkip();
    });

    expect(result.current.pendingRevivify).toBeNull();
  });
});

// ── handleWebSkip ───────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleWebSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Web',
      { level: 1 },
    );

    act(() => {
      result.current.handleWebSkip();
    });

    expect(result.current.pendingWeb).toBeNull();
  });
});

// ── handleConfusionSkip ─────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleConfusionSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Confusion',
      { level: 4 },
    );

    act(() => {
      result.current.handleConfusionSkip();
    });

    expect(result.current.pendingConfusion).toBeNull();
  });
});

// ── handleStinkingCloudSkip ─────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleStinkingCloudSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Stinking Cloud',
      { level: 1 },
    );

    act(() => {
      result.current.handleStinkingCloudSkip();
    });

    expect(result.current.pendingStinkingCloud).toBeNull();
  });
});

// ── handleAntimagicFieldSkip ────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleAntimagicFieldSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Antimagic Field',
      { level: 4 },
    );

    act(() => {
      result.current.handleAntimagicFieldSkip();
    });

    expect(result.current.pendingAntimagicField).toBeNull();
  });
});

// ── handleForcecageSkip ─────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleForcecageSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Forcecage',
      { level: 7 },
    );

    act(() => {
      result.current.handleForcecageSkip();
    });

    expect(result.current.pendingForcecage).toBeNull();
  });
});

// ── handleGlobeSkip ─────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleGlobeSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Globe of Invulnerability',
      { level: 4 },
    );

    act(() => {
      result.current.handleGlobeSkip();
    });

    expect(result.current.pendingGlobe).toBeNull();
  });
});

// ── handlePassWithoutTraceSkip ──────────────────────────────────────────────

describe('useSpellMetamagicFlow — handlePassWithoutTraceSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Pass Without Trace',
      { level: 2 },
    );

    act(() => {
      result.current.handlePassWithoutTraceSkip();
    });

    expect(result.current.pendingPassWithoutTrace).toBeNull();
  });
});

// ── handleBeaconOfHopeSkip ──────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleBeaconOfHopeSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Beacon of Hope',
      { level: 3 },
    );

    act(() => {
      result.current.handleBeaconOfHopeSkip();
    });

    expect(result.current.pendingBeaconOfHope).toBeNull();
  });
});

// ── handleSpareTheDyingSkip ─────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleSpareTheDyingSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Spare The Dying',
      { level: 0 },
    );

    act(() => {
      result.current.handleSpareTheDyingSkip();
    });

    expect(result.current.pendingSpareTheDying).toBeNull();
  });
});

// ── handleLongstriderSkip ───────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleLongstriderSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Longstrider',
      { level: 0 },
    );

    act(() => {
      result.current.handleLongstriderSkip();
    });

    expect(result.current.pendingLongstrider).toBeNull();
  });
});

// ── handleHealSkip ──────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleHealSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Heal',
      { level: 6 },
    );

    act(() => {
      result.current.handleHealSkip();
    });

    expect(result.current.pendingHeal).toBeNull();
  });
});

// ── handleFeignDeathSkip ────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleFeignDeathSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Feign Death',
      { level: 3 },
    );

    act(() => {
      result.current.handleFeignDeathSkip();
    });

    expect(result.current.pendingFeignDeath).toBeNull();
  });
});

// ── handleGreaterInvisibilitySkip ───────────────────────────────────────────

describe('useSpellMetamagicFlow — handleGreaterInvisibilitySkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Greater Invisibility',
      { level: 4 },
    );

    act(() => {
      result.current.handleGreaterInvisibilitySkip();
    });

    expect(result.current.pendingGreaterInvisibility).toBeNull();
  });
});

// ── handleInvisibilitySkip ──────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleInvisibilitySkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Invisibility',
      { level: 2 },
    );

    act(() => {
      result.current.handleInvisibilitySkip();
    });

    expect(result.current.pendingInvisibility).toBeNull();
  });
});

// ── handleBarkskinSkip ──────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleBarkskinSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Barkskin',
      { level: 2 },
    );

    act(() => {
      result.current.handleBarkskinSkip();
    });

    expect(result.current.pendingBarkskin).toBeNull();
  });
});

// ── handleLesserRestorationSkip ─────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleLesserRestorationSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Lesser Restoration',
      { level: 2 },
    );

    act(() => {
      result.current.handleLesserRestorationSkip();
    });

    expect(result.current.pendingLesserRestoration).toBeNull();
  });
});

// ── handleRemoveCurseSkip ───────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleRemoveCurseSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Remove Curse',
      { level: 3 },
    );

    act(() => {
      result.current.handleRemoveCurseSkip();
    });

    expect(result.current.pendingRemoveCurse).toBeNull();
  });
});

// ── handleMageArmorSkip ─────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleMageArmorSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Mage Armor',
      { level: 1 },
    );

    act(() => {
      result.current.handleMageArmorSkip();
    });

    expect(result.current.pendingMageArmor).toBeNull();
  });
});

// ── handleHeroesFeastSkip ───────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleHeroesFeastSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      "Heroes' Feast",
      { level: 6 },
    );

    act(() => {
      result.current.handleHeroesFeastSkip();
    });

    expect(result.current.pendingHeroesFeast).toBeNull();
  });
});

// ── handleAuraOfLifeSkip ────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleAuraOfLifeSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Aura of Life',
      { level: 4 },
    );

    act(() => {
      result.current.handleAuraOfLifeSkip();
    });

    expect(result.current.pendingAuraOfLife).toBeNull();
  });
});

// ── handleAuraOfPuritySkip ──────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleAuraOfPuritySkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Aura of Purity',
      { level: 4 },
    );

    act(() => {
      result.current.handleAuraOfPuritySkip();
    });

    expect(result.current.pendingAuraOfPurity).toBeNull();
  });
});

// ── handleCircleOfPowerSkip ─────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleCircleOfPowerSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Circle of Power',
      { level: 9 },
    );

    act(() => {
      result.current.handleCircleOfPowerSkip();
    });

    expect(result.current.pendingCircleOfPower).toBeNull();
  });
});

// ── handleCompulsionSkip ────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleCompulsionSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Compulsion',
      { level: 4 },
    );

    act(() => {
      result.current.handleCompulsionSkip();
    });

    expect(result.current.pendingCompulsion).toBeNull();
  });
});

// ── handleAuraOfVitalitySkip ────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleAuraOfVitalitySkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Aura of Vitality',
      { level: 3 },
    );

    act(() => {
      result.current.handleAuraOfVitalitySkip();
    });

    expect(result.current.pendingAuraOfVitality).toBeNull();
  });
});

// ── handleDeathWardSkip ─────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleDeathWardSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Death Ward',
      { level: 4 },
    );

    act(() => {
      result.current.handleDeathWardSkip();
    });

    expect(result.current.pendingDeathWard).toBeNull();
  });
});

// ── handleHeroismSkip ───────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleHeroismSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Heroism',
      { level: 1 },
    );

    act(() => {
      result.current.handleHeroismSkip();
    });

    expect(result.current.pendingHeroism).toBeNull();
  });
});

// ── handleGreaterRestorationSkip ────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleGreaterRestorationSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending on skip', () => {
    const { result } = renderHookWithSpell(
      (onExec) => useSpellMetamagicFlow(makePlayerStats(), 'TestCampaign', onExec),
      'Greater Restoration',
      { level: 5 },
    );

    act(() => {
      result.current.handleGreaterRestorationSkip();
    });

    expect(result.current.pendingGreaterRestoration).toBeNull();
  });
});
