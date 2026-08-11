import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpellMetamagicFlow } from './useSpellMetamagicFlow.js';
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
