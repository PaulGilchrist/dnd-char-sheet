import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpellMetamagicFlow } from './useSpellMetamagicFlow.js';
import { addEntry } from '../../services/ui/logService.js';
import { getMultiTargetSpreadForSpell } from '../../services/rules/spells/postCastRiderService.js';

const flushMicrotasks = () => new Promise(r => setTimeout(r, 0));

vi.mock('./useMetamagic.js', () => ({
  getCurrentSorceryPoints: vi.fn(() => 5),
  getMaxSorceryPoints: vi.fn(() => 10),
  spendSorceryPoints: vi.fn(),
  logMetamagicUse: vi.fn(),
}));

vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../services/npcs/monsterUtils.js', () => ({
  getMonsterData: vi.fn(() => Promise.resolve({ type: 'beast' })),
}));

vi.mock('../../services/rules/spells/postCastRiderService.js', () => ({
  getMultiTargetSpreadForSpell: vi.fn(() => null),
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
  applyShieldOfFaithEffect: vi.fn(() => Promise.resolve({ payload: 'shieldOfFaith-popup' })),
  applyProtectionFromEnergyHandler: vi.fn(),
  applyProtectionFromPoisonHandler: vi.fn(() => Promise.resolve({ payload: 'protectionFromPoison-popup' })),
  applyResistanceEffect: vi.fn(),
  executeHandler: vi.fn(() => Promise.resolve(null)),
  confirmGreaterRestoration: vi.fn(),
  applyHolyAuraEffect: vi.fn(() => Promise.resolve(null)),
  applyBaneEffect: vi.fn(),
  applyBlessEffect: vi.fn(),
  applyFaerieFire: vi.fn(() => Promise.resolve(null)),
  applyHaste: vi.fn(),
  applyEnhanceAbilityEffect: vi.fn(() => Promise.resolve(null)),
  applyBarkskinEffect: vi.fn(() => Promise.resolve({ payload: 'barkskin-popup' })),
  applyInvisibility: vi.fn(),
  applyGreaterInvisibility: vi.fn(),
  applyFeignDeath: vi.fn(() => Promise.resolve(null)),
  applyLongstriderEffect: vi.fn(() => Promise.resolve(null)),
  applySpareTheDyingEffect: vi.fn(() => Promise.resolve(null)),
  applyPassWithoutTraceEffect: vi.fn(() => Promise.resolve(null)),
  applyBeaconOfHopeEffect: vi.fn(() => Promise.resolve(null)),
  applyAuraOfLifeEffect: vi.fn(),
  applyAuraOfPurityEffect: vi.fn(),
  applyCircleOfPowerEffect: vi.fn(() => Promise.resolve({ payload: 'circleOfPower-popup' })),
  applyCompulsionEffect: vi.fn(() => Promise.resolve(null)),
  applyAuraOfVitalityEffect: vi.fn(() => Promise.resolve({ payload: 'auraOfVitality-popup' })),
  applyDeathWardEffect: vi.fn(() => Promise.resolve({ payload: 'deathWard-popup' })),
  applyHeroism: vi.fn(() => Promise.resolve({ payload: 'heroism-popup' })),
  applyProtectionFromEvilAndGood: vi.fn(),
  applyStoneSkinHandler: vi.fn(() => Promise.resolve({ payload: 'stoneSkin-popup' })),
  handleSanctuary: vi.fn(() => Promise.resolve({ payload: 'sanctuary-popup' })),
}));

vi.mock('../../services/rules/features/greaterRestorationService.js', () => ({
  confirmGreaterRestoration: vi.fn(),
}));

vi.mock('../../services/rules/features/removeCurseService.js', () => ({
  confirmRemoveCurse: vi.fn(() => Promise.resolve({ payload: 'removeCurse-popup' })),
}));

vi.mock('../../services/rules/features/regenerateService.js', () => ({
  confirmRegenerate: vi.fn(() => Promise.resolve({ payload: 'regenerate-popup' })),
}));

vi.mock('../../services/rules/features/foresightService.js', () => ({
  triggerForesight: vi.fn(() => Promise.resolve({ payload: 'foresight-popup' })),
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
  triggerBanishment: vi.fn(() => Promise.resolve({ payload: 'banishment-popup' })),
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
  triggerRevivify: vi.fn(() => Promise.resolve({ payload: 'revivify-popup' })),
}));

vi.mock('../../services/automation/handlers/spells/polymorphService.js', () => ({
  applyPolymorph: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../services/automation/handlers/spells/animalShapesService.js', () => ({
  applyAnimalShapes: vi.fn(() => Promise.resolve({ ok: false })),
}));

vi.mock('../../services/automation/handlers/spells/truePolymorphService.js', () => ({
  applyTruePolymorph: vi.fn(() => Promise.resolve({ payload: 'true-polymorph-popup' })),
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
  getAllyList: vi.fn((casterName) => [casterName.toLowerCase(), 'goblin a', 'goblin b']),
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

// ── handleSkip (metamagic skip) ──────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleSkip (metamagic skip)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending metamagic and logs entry without metamagic when skipping', async () => {
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', onExecute)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Fireball', level: 3 }));
    });

    expect(result.current.pendingMetamagic).not.toBeNull();

    await act(async () => {
      result.current.handleSkip();
    });

    await flushMicrotasks();

    expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
      type: 'spell',
      characterName: 'TestSorcerer',
      spellName: 'Fireball',
      metamagic: [],
      spCost: 0,
    }));
    expect(onExecute).toHaveBeenCalled();
    expect(result.current.pendingMetamagic).toBeNull();
  });

  it('does nothing when there is no pending metamagic', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleSkip();
    });

    expect(result.current.pendingMetamagic).toBeNull();
  });
});

// ── handleConfirm with popup payload paths ────────────────────────────────────

describe('useSpellMetamagicFlow — handleConfirm popup payloads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('calls setPopupHtml with banishment popup payload', async () => {
    const setPopupHtml = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn(), null, [], setPopupHtml)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Banishment', level: 4 }));
    });

    await act(async () => {
      await result.current.handleBanishmentConfirm(['Goblin A']);
    });

    await flushMicrotasks();

    expect(setPopupHtml).toHaveBeenCalledWith('banishment-popup');
  });

  it('calls setPopupHtml with revivify popup payload', async () => {
    const setPopupHtml = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn(), null, [], setPopupHtml)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Revivify', level: 5 }));
    });

    await act(async () => {
      await result.current.handleRevivifyConfirm({ targetName: 'Goblin A' });
    });

    await flushMicrotasks();

    expect(setPopupHtml).toHaveBeenCalledWith('revivify-popup');
  });

  it('calls setPopupHtml with sanctuary popup payload', async () => {
    const setPopupHtml = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn(), null, [], setPopupHtml)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Sanctuary', level: 1 }));
    });

    await act(async () => {
      await result.current.handleSanctuaryConfirm('Goblin A');
    });

    await flushMicrotasks();

    expect(setPopupHtml).toHaveBeenCalledWith('sanctuary-popup');
  });
});

// ── handleBanishmentSkip ──────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleBanishmentSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending banishment on skip', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Banishment', level: 4 }));
    });

    act(() => {
      result.current.handleBanishmentSkip();
    });

    expect(result.current.pendingBanishment).toBeNull();
  });

  it('does nothing when there is no pending banishment', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleBanishmentSkip();
    });

    expect(result.current.pendingBanishment).toBeNull();
  });
});

// ── handlePrismaticSpraySkip ──────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handlePrismaticSpraySkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending prismatic_spray on skip', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Prismatic Spray', level: 7 }));
    });

    act(() => {
      result.current.handlePrismaticSpraySkip();
    });

    expect(result.current.pendingPrismaticSpray).toBeNull();
  });

  it('does nothing when there is no pending prismatic_spray', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handlePrismaticSpraySkip();
    });

    expect(result.current.pendingPrismaticSpray).toBeNull();
  });
});

// ── handleRevivifySkip ────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleRevivifySkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending revivify on skip', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Revivify', level: 5 }));
    });

    act(() => {
      result.current.handleRevivifySkip();
    });

    expect(result.current.pendingRevivify).toBeNull();
  });

  it('does nothing when there is no pending revivify', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleRevivifySkip();
    });

    expect(result.current.pendingRevivify).toBeNull();
  });
});

// ── handleSanctuarySkip ───────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleSanctuarySkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending sanctuary on skip', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Sanctuary', level: 1 }));
    });

    act(() => {
      result.current.handleSanctuarySkip();
    });

    expect(result.current.pendingSanctuary).toBeNull();
  });

  it('does nothing when there is no pending sanctuary', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleSanctuarySkip();
    });

    expect(result.current.pendingSanctuary).toBeNull();
  });
});

// ── handleSleetStormSkip ──────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleSleetStormSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending sleetStorm on skip', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Sleet Storm', level: 3 }));
    });

    act(() => {
      result.current.handleSleetStormSkip();
    });

    expect(result.current.pendingSleetStorm).toBeNull();
  });

  it('does nothing when there is no pending sleetStorm', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleSleetStormSkip();
    });

    expect(result.current.pendingSleetStorm).toBeNull();
  });
});

// ── handleCharmPersonSkip ─────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleCharmPersonSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending charmPerson on skip', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Charm Person', level: 0 }));
    });

    act(() => {
      result.current.handleCharmPersonSkip();
    });

    expect(result.current.pendingCharmPerson).toBeNull();
  });

  it('does nothing when there is no pending charmPerson', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleCharmPersonSkip();
    });

    expect(result.current.pendingCharmPerson).toBeNull();
  });
});

// ── handleCharmMonsterSkip ────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleCharmMonsterSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending charmMonster on skip', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Charm Monster', level: 4 }));
    });

    act(() => {
      result.current.handleCharmMonsterSkip();
    });

    expect(result.current.pendingCharmMonster).toBeNull();
  });

  it('does nothing when there is no pending charmMonster', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleCharmMonsterSkip();
    });

    expect(result.current.pendingCharmMonster).toBeNull();
  });
});

// ── handleTruePolymorphSkip ───────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleTruePolymorphSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending truePolymorph on skip', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'True Polymorph', level: 9 }));
    });

    act(() => {
      result.current.handleTruePolymorphSkip();
    });

    expect(result.current.pendingTruePolymorph).toBeNull();
  });

  it('does nothing when there is no pending truePolymorph', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleTruePolymorphSkip();
    });

    expect(result.current.pendingTruePolymorph).toBeNull();
  });
});

// ── handleAnimalShapesSkip ────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleAnimalShapesSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending animalShapes on skip', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Animal Shapes', level: 8 }));
    });

    act(() => {
      result.current.handleAnimalShapesSkip();
    });

    expect(result.current.pendingAnimalShapes).toBeNull();
  });

  it('does nothing when there is no pending animalShapes', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleAnimalShapesSkip();
    });

    expect(result.current.pendingAnimalShapes).toBeNull();
  });
});

// ── handlePolymorphSkip ───────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handlePolymorphSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending polymorph on skip', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Polymorph', level: 4 }));
    });

    act(() => {
      result.current.handlePolymorphSkip();
    });

    expect(result.current.pendingPolymorph).toBeNull();
  });

  it('does nothing when there is no pending polymorph', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handlePolymorphSkip();
    });

    expect(result.current.pendingPolymorph).toBeNull();
  });
});

// ── handleHoldPersonSkip ──────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleHoldPersonSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending holdPerson on skip', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Hold Person', level: 2 }));
    });

    act(() => {
      result.current.handleHoldPersonSkip();
    });

    expect(result.current.pendingHoldPerson).toBeNull();
  });

  it('does nothing when there is no pending holdPerson', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleHoldPersonSkip();
    });

    expect(result.current.pendingHoldPerson).toBeNull();
  });
});

// ── handleHoldMonsterSkip ─────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleHoldMonsterSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending holdMonster on skip', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Hold Monster', level: 3 }));
    });

    act(() => {
      result.current.handleHoldMonsterSkip();
    });

    expect(result.current.pendingHoldMonster).toBeNull();
  });

  it('does nothing when there is no pending holdMonster', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleHoldMonsterSkip();
    });

    expect(result.current.pendingHoldMonster).toBeNull();
  });
});

// ── handleCureWoundsSkip ──────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleCureWoundsSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending cureWounds on skip', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Cure Wounds', level: 1 }));
    });

    act(() => {
      result.current.handleCureWoundsSkip();
    });

    expect(result.current.pendingCureWounds).toBeNull();
  });

  it('does nothing when there is no pending cureWounds', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleCureWoundsSkip();
    });

    expect(result.current.pendingCureWounds).toBeNull();
  });
});

// ── handleHealingWordSkip ─────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleHealingWordSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending healingWord on skip', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Healing Word', level: 1 }));
    });

    act(() => {
      result.current.handleHealingWordSkip();
    });

    expect(result.current.pendingHealingWord).toBeNull();
  });

  it('does nothing when there is no pending healingWord', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleHealingWordSkip();
    });

    expect(result.current.pendingHealingWord).toBeNull();
  });
});

// ── handleRegenerateSkip ──────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleRegenerateSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending regenerate on skip', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Regenerate', level: 7 }));
    });

    act(() => {
      result.current.handleRegenerateSkip();
    });

    expect(result.current.pendingRegenerate).toBeNull();
  });

  it('does nothing when there is no pending regenerate', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleRegenerateSkip();
    });

    expect(result.current.pendingRegenerate).toBeNull();
  });
});

// ── handleAnimalFriendshipSkip ────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleAnimalFriendshipSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending animalFriendship on skip', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Animal Friendship', level: 1 }));
    });

    act(() => {
      result.current.handleAnimalFriendshipSkip();
    });

    expect(result.current.pendingAnimalFriendship).toBeNull();
  });

  it('does nothing when there is no pending animalFriendship', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleAnimalFriendshipSkip();
    });

    expect(result.current.pendingAnimalFriendship).toBeNull();
  });
});

// ── handleWebSkip ─────────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleWebSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending web on skip', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Web', level: 1 }));
    });

    act(() => {
      result.current.handleWebSkip();
    });

    expect(result.current.pendingWeb).toBeNull();
  });

  it('does nothing when there is no pending web', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleWebSkip();
    });

    expect(result.current.pendingWeb).toBeNull();
  });
});

// ── handleConfusionSkip ───────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleConfusionSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending confusion on skip', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Confusion', level: 4 }));
    });

    act(() => {
      result.current.handleConfusionSkip();
    });

    expect(result.current.pendingConfusion).toBeNull();
  });

  it('does nothing when there is no pending confusion', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleConfusionSkip();
    });

    expect(result.current.pendingConfusion).toBeNull();
  });
});

// ── handleStinkingCloudSkip ───────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleStinkingCloudSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending stinkingCloud on skip', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Stinking Cloud', level: 1 }));
    });

    act(() => {
      result.current.handleStinkingCloudSkip();
    });

    expect(result.current.pendingStinkingCloud).toBeNull();
  });

  it('does nothing when there is no pending stinkingCloud', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleStinkingCloudSkip();
    });

    expect(result.current.pendingStinkingCloud).toBeNull();
  });
});

// ── handleAntimagicFieldSkip ──────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleAntimagicFieldSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending antimagicField on skip', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Antimagic Field', level: 4 }));
    });

    act(() => {
      result.current.handleAntimagicFieldSkip();
    });

    expect(result.current.pendingAntimagicField).toBeNull();
  });

  it('does nothing when there is no pending antimagicField', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleAntimagicFieldSkip();
    });

    expect(result.current.pendingAntimagicField).toBeNull();
  });
});

// ── handleForcecageSkip ───────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleForcecageSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending forcecage on skip', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Forcecage', level: 7 }));
    });

    act(() => {
      result.current.handleForcecageSkip();
    });

    expect(result.current.pendingForcecage).toBeNull();
  });

  it('does nothing when there is no pending forcecage', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleForcecageSkip();
    });

    expect(result.current.pendingForcecage).toBeNull();
  });
});

// ── handleGlobeSkip ───────────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleGlobeSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending globe on skip', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Globe of Invulnerability', level: 4 }));
    });

    act(() => {
      result.current.handleGlobeSkip();
    });

    expect(result.current.pendingGlobe).toBeNull();
  });

  it('does nothing when there is no pending globe', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleGlobeSkip();
    });

    expect(result.current.pendingGlobe).toBeNull();
  });
});

// ── handleResistanceSkip ──────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleResistanceSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending resistance and rolls back slot on skip', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Resistance', level: 0 }));
    });

    act(() => {
      result.current.handleResistanceSkip();
    });

    expect(result.current.pendingResistance).toBeNull();
    expect(result.current.resistanceStage).toBeNull();
  });

  it('does nothing when there is no pending resistance', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleResistanceSkip();
    });

    expect(result.current.pendingResistance).toBeNull();
  });
});

// ── handleProtectionFromPoisonSkip ────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleProtectionFromPoisonSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending protectionFromPoison and rolls back slot on skip', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Protection from Poison', level: 2 }));
    });

    act(() => {
      result.current.handleProtectionFromPoisonSkip();
    });

    expect(result.current.pendingProtectionFromPoison).toBeNull();
  });

  it('does nothing when there is no pending protectionFromPoison', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleProtectionFromPoisonSkip();
    });

    expect(result.current.pendingProtectionFromPoison).toBeNull();
  });
});

// ── handleStoneSkinSkip ───────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleStoneSkinSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending stoneSkin and rolls back slot on skip', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Stone Skin', level: 3 }));
    });

    act(() => {
      result.current.handleStoneSkinSkip();
    });

    expect(result.current.pendingStoneSkin).toBeNull();
  });

  it('does nothing when there is no pending stoneSkin', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleStoneSkinSkip();
    });

    expect(result.current.pendingStoneSkin).toBeNull();
  });
});

// ── handleProtectionFromEvilAndGoodSkip ───────────────────────────────────────

describe('useSpellMetamagicFlow — handleProtectionFromEvilAndGoodSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending protectionFromEvilAndGood on skip', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Protection from Evil and Good', level: 1 }));
    });

    act(() => {
      result.current.handleProtectionFromEvilAndGoodSkip();
    });

    expect(result.current.pendingProtectionFromEvilAndGood).toBeNull();
  });

  it('does nothing when there is no pending protectionFromEvilAndGood', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleProtectionFromEvilAndGoodSkip();
    });

    expect(result.current.pendingProtectionFromEvilAndGood).toBeNull();
  });
});

// ── handleForesightSkip ───────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleForesightSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending foresight on skip', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Foresight', level: 9 }));
    });

    act(() => {
      result.current.handleForesightSkip();
    });

    expect(result.current.pendingForesight).toBeNull();
  });

  it('does nothing when there is no pending foresight', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleForesightSkip();
    });

    expect(result.current.pendingForesight).toBeNull();
  });
});

// ── handleMagicMissileSkip ────────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleMagicMissileSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending magicMissile on skip', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Magic Missile', level: 1 }));
    });

    act(() => {
      result.current.handleMagicMissileSkip();
    });

    expect(result.current.pendingMagicMissile).toBeNull();
  });

  it('does nothing when there is no pending magicMissile', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleMagicMissileSkip();
    });

    expect(result.current.pendingMagicMissile).toBeNull();
  });
});

// ── handleMagicMissileConfirm with distribution ───────────────────────────────

describe('useSpellMetamagicFlow — handleMagicMissileConfirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('calls onExecute with magicMissileDistribution when targets selected', () => {
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', onExecute)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Magic Missile', level: 1 }));
    });

    act(() => {
      result.current.handleMagicMissileConfirm({ distribution: { 'Goblin A': 1, 'Goblin B': 1 } });
    });

    expect(onExecute).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ magicMissileDistribution: { 'Goblin A': 1, 'Goblin B': 1 } })
    );
    expect(result.current.pendingMagicMissile).toBeNull();
  });

  it('does nothing when all distribution values are 0', () => {
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', onExecute)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Magic Missile', level: 1 }));
    });

    act(() => {
      result.current.handleMagicMissileConfirm({ distribution: { 'Goblin A': 0, 'Goblin B': 0 } });
    });

    expect(onExecute).not.toHaveBeenCalled();
  });

  it('does nothing when there is no pending magicMissile', () => {
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', onExecute)
    );

    act(() => {
      result.current.handleMagicMissileConfirm({ distribution: { 'Goblin A': 1 } });
    });

    expect(onExecute).not.toHaveBeenCalled();
  });
});

// ── handleEnhanceAbilityAbilitySelect ─────────────────────────────────────────

describe('useSpellMetamagicFlow — handleEnhanceAbilityAbilitySelect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets enhanceAbilityStage to target and selected ability', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleEnhanceAbilityAbilitySelect('Strength');
    });

    expect(result.current.enhanceAbilityStage).toBe('target');
  });

  it('updates stage when called multiple times', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleEnhanceAbilityAbilitySelect('Strength');
    });
    expect(result.current.enhanceAbilityStage).toBe('target');

    act(() => {
      result.current.handleEnhanceAbilityAbilitySelect('Dexterity');
    });
    expect(result.current.enhanceAbilityStage).toBe('target');
  });
});

// ── handleProtectionFromEnergyTargetSelect ────────────────────────────────────

describe('useSpellMetamagicFlow — handleProtectionFromEnergyTargetSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets protectionFromEnergyStage to type and selected target', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleProtectionFromEnergyTargetSelect('Goblin A');
    });

    expect(result.current.protectionFromEnergyStage).toBe('type');
  });
});

// ── handleProtectionFromEnergyTypeSelect ──────────────────────────────────────

describe('useSpellMetamagicFlow — handleProtectionFromEnergyTypeSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending and applies effect on type select after target select', async () => {
    const setPopupHtml = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn(), null, [], setPopupHtml)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Protection from Energy', level: 3 }));
    });

    act(() => {
      result.current.handleProtectionFromEnergyTargetSelect('Goblin A');
    });

    expect(result.current.protectionFromEnergyStage).toBe('type');

    await act(async () => {
      await result.current.handleProtectionFromEnergyTypeSelect('fire');
    });

    expect(result.current.pendingProtectionFromEnergy).toBeNull();
    expect(result.current.protectionFromEnergyStage).toBeNull();
  });

  it('does nothing when there is no pending protectionFromEnergy', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleProtectionFromEnergyTypeSelect('fire');
    });

    expect(result.current.protectionFromEnergyStage).toBeNull();
  });
});

// ── handleResistanceTargetSelect ──────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleResistanceTargetSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets resistanceStage to type and selected target', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleResistanceTargetSelect('Goblin A');
    });

    expect(result.current.resistanceStage).toBe('type');
  });
});

// ── handleResistanceTypeSelect ────────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleResistanceTypeSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending and applies effect on type select after target select', async () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Resistance', level: 0 }));
    });

    act(() => {
      result.current.handleResistanceTargetSelect('Goblin A');
    });

    expect(result.current.resistanceStage).toBe('type');

    await act(async () => {
      await result.current.handleResistanceTypeSelect('fire');
    });

    expect(result.current.pendingResistance).toBeNull();
    expect(result.current.resistanceStage).toBeNull();
  });

  it('does nothing when there is no pending resistance', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleResistanceTypeSelect('fire');
    });

    expect(result.current.resistanceStage).toBeNull();
  });
});

// ── handleGreaterRestorationNoEffects ─────────────────────────────────────────

describe('useSpellMetamagicFlow — handleGreaterRestorationNoEffects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('refunds spell slot and logs entry when no effects to remove', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Greater Restoration', level: 5 }));
    });

    act(() => {
      result.current.handleGreaterRestorationNoEffects();
    });

    expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
      type: 'spell',
      characterName: 'TestSorcerer',
      spellName: 'Greater Restoration',
      targetName: null,
      targets: [],
    }));
  });

  it('does nothing when there is no pending greaterRestoration', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleGreaterRestorationNoEffects();
    });

    expect(result.current.pendingGreaterRestoration).toBeNull();
  });
});

// ── handleTruePolymorphPathSelect object_into_creature ────────────────────────

describe('useSpellMetamagicFlow — handleTruePolymorphPathSelect object_into_creature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears pending and applies true polymorph when path is object_into_creature', async () => {
    const setPopupHtml = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn(), null, [], setPopupHtml)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'True Polymorph', level: 9 }));
    });

    await act(async () => {
      await result.current.handleTruePolymorphPathSelect('object_into_creature');
    });

    expect(result.current.pendingTruePolymorph).toBeNull();
  });

  it('sets path on pending when path is not object_into_creature', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'True Polymorph', level: 9 }));
    });

    act(() => {
      result.current.handleTruePolymorphPathSelect('creature_to_creature');
    });

    expect(result.current.pendingTruePolymorph).not.toBeNull();
    expect(result.current.pendingTruePolymorph.path).toBe('creature_to_creature');
  });

  it('does nothing when there is no pending truePolymorph', () => {
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn())
    );

    act(() => {
      result.current.handleTruePolymorphPathSelect('creature_to_creature');
    });

    expect(result.current.pendingTruePolymorph).toBeNull();
  });
});

// ── handleAnimalShapesBeastConfirm ────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleAnimalShapesBeastConfirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('clears popup and sets concentration state when result.ok is true', async () => {
    const automation = await import('../../services/automation/handlers/spells/animalShapesService.js');
    automation.applyAnimalShapes.mockResolvedValueOnce({ ok: true });

    const setPopupHtml = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn(), null, [], setPopupHtml)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Animal Shapes', level: 8 }));
    });

    await act(async () => {
      await result.current.handleAnimalShapesTargetConfirm(['Goblin A']);
    });

    await flushMicrotasks();

    expect(setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
      type: 'animal_shapes_target_selection',
    }));

    await act(async () => {
      await result.current.handleAnimalShapesBeastConfirm({ 'Goblin A': 'Wolf' });
    });

    expect(setPopupHtml).toHaveBeenCalledWith(null);
  });

  it('clears popup when result.ok is false', async () => {
    const automation = await import('../../services/automation/handlers/spells/animalShapesService.js');
    automation.applyAnimalShapes.mockResolvedValueOnce({ ok: false });

    const setPopupHtml = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn(), null, [], setPopupHtml)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Animal Shapes', level: 8 }));
    });

    await act(async () => {
      await result.current.handleAnimalShapesTargetConfirm(['Goblin A']);
    });

    await act(async () => {
      await result.current.handleAnimalShapesBeastConfirm({ 'Goblin A': 'Wolf' });
    });

    expect(setPopupHtml).toHaveBeenCalledWith(null);
  });

  it('does nothing when there is no pending animalShapes', async () => {
    const automation = await import('../../services/automation/handlers/spells/animalShapesService.js');
    automation.applyAnimalShapes.mockResolvedValueOnce({ ok: false });

    const setPopupHtml = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn(), null, [], setPopupHtml)
    );

    await act(async () => {
      await result.current.handleAnimalShapesBeastConfirm({});
    });

    expect(result.current.pendingAnimalShapes).toBeNull();
  });
});

// ── handleAnimalShapesBeastConfirm with concentration state (caster in combat) ─

describe('useSpellMetamagicFlow — handleAnimalShapesBeastConfirm concentration caster', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('sets concentration state when caster name matches a creature in combat summary', async () => {
    const automation = await import('../../services/automation/handlers/spells/animalShapesService.js');
    automation.applyAnimalShapes.mockResolvedValueOnce({ ok: true });

    const setPopupHtml = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow({ ...makePlayerStats(), name: 'Goblin A', abilities: { CON: { bonus: 2 } } }, 'test-campaign', vi.fn(), null, [], setPopupHtml)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Animal Shapes', level: 8 }));
    });

    await act(async () => {
      await result.current.handleAnimalShapesTargetConfirm(['Goblin A']);
    });

    await act(async () => {
      await result.current.handleAnimalShapesBeastConfirm({ 'Goblin A': 'Wolf' });
    });

    expect(setPopupHtml).toHaveBeenCalledWith(null);
  });
});

// ── handlePolymorphConfirm with popup payload ─────────────────────────────────

describe('useSpellMetamagicFlow — handlePolymorphConfirm popup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('calls setPopupHtml with polymorph popup payload on confirm', async () => {
    const automation = await import('../../services/automation/handlers/spells/polymorphService.js');
    automation.applyPolymorph.mockResolvedValueOnce({ payload: 'polymorph-popup' });

    const setPopupHtml = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn(), null, [], setPopupHtml)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Polymorph', level: 4 }));
    });

    await act(async () => {
      await result.current.handlePolymorphConfirm(['Goblin A']);
    });

    expect(setPopupHtml).toHaveBeenCalledWith('polymorph-popup');
  });
});

// ── handleTruePolymorphPathSelect with popup payload ──────────────────────────

describe('useSpellMetamagicFlow — handleTruePolymorphPathSelect popup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('calls setPopupHtml with true polymorph popup payload when object_into_creature', async () => {
    const setPopupHtml = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn(), null, [], setPopupHtml)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'True Polymorph', level: 9 }));
    });

    await act(async () => {
      await result.current.handleTruePolymorphPathSelect('object_into_creature');
    });

    expect(setPopupHtml).toHaveBeenCalledWith('true-polymorph-popup');
  });
});

// ── handleHealingWordConfirm with popup payload ───────────────────────────────

describe('useSpellMetamagicFlow — handleHealingWordConfirm popup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('calls setPopupHtml with heal popup when triggerHealingWord returns result', async () => {
    const rulesFeatures = await import('../../services/rules/features/healingWordService.js');
    rulesFeatures.triggerHealingWord.mockResolvedValueOnce({
      formula: '1d4+2',
      rolls: [3],
      rawTotal: 5,
      healAmount: 5,
      targetName: 'Goblin A',
      bonusHeal: 2,
      bonusDetails: [{ amount: 2, name: 'Tavern Heal' }],
    });

    const setPopupHtml = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn(), null, [], setPopupHtml)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Healing Word', level: 1 }));
    });

    await act(async () => {
      await result.current.handleHealingWordConfirm({ targetName: 'Goblin A' });
    });

    expect(setPopupHtml).toHaveBeenCalledWith(expect.objectContaining({
      type: 'heal',
      name: 'Healing Word',
      formula: '1d4+2',
      total: 5,
      targetName: 'Goblin A',
      bonusHeal: 2,
      bonusHealDetail: '2 Tavern Heal',
    }));
  });
});

// ── handleTruePolymorphTargetConfirm with popup payload ───────────────────────

describe('useSpellMetamagicFlow — handleTruePolymorphTargetConfirm popup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('calls setPopupHtml with true polymorph popup payload on confirm', async () => {
    const setPopupHtml = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn(), null, [], setPopupHtml)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'True Polymorph', level: 9 }));
    });

    act(() => {
      result.current.handleTruePolymorphPathSelect('creature_to_creature');
    });

    await act(async () => {
      await result.current.handleTruePolymorphTargetConfirm(['Goblin A']);
    });

    expect(setPopupHtml).toHaveBeenCalledWith('true-polymorph-popup');
  });
});

// ── handleRegenerateConfirm with popup payload ────────────────────────────────

describe('useSpellMetamagicFlow — handleRegenerateConfirm popup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('calls setPopupHtml with regenerate popup payload on confirm', async () => {
    const setPopupHtml = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn(), null, [], setPopupHtml)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Regenerate', level: 7 }));
    });

    await act(async () => {
      await result.current.handleRegenerateConfirm({ targetName: 'Goblin A' });
    });

    expect(setPopupHtml).toHaveBeenCalledWith('regenerate-popup');
  });
});

// ── handleConfusionConfirm with popup payload ─────────────────────────────────

describe('useSpellMetamagicFlow — handleConfusionConfirm popup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('calls setPopupHtml with confusion popup payload on confirm', async () => {
    const automation = await import('../../services/automation/index.js');
    automation.executeHandler.mockResolvedValueOnce({ payload: 'confusion-popup' });

    const setPopupHtml = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn(), null, [], setPopupHtml)
    );

    act(() => {
      result.current.gateMetamagic(makeSpell({ name: 'Confusion', level: 4 }));
    });

    await act(async () => {
      await result.current.handleConfusionConfirm(['Goblin A']);
    });

    expect(setPopupHtml).toHaveBeenCalledWith('confusion-popup');
  });
});

// ── handleAnimalFriendshipConfirm ─────────────────────────────────────────────

describe('useSpellMetamagicFlow — handleAnimalFriendshipConfirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('calls onExecute with prepared spell on confirm', async () => {
    const onExecute = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', onExecute)
    );

    await act(async () => {
      await result.current.gateMetamagic(makeSpell({ name: 'Animal Friendship', level: 1 }));
    });

    await act(async () => {
      await result.current.handleAnimalFriendshipConfirm(['Goblin A']);
    });

    expect(onExecute).toHaveBeenCalled();
    expect(result.current.pendingAnimalFriendship).toBeNull();
  });

  it('calls setPopupHtml with globe popup payload on confirm', async () => {
    const automation = await import('../../services/automation/index.js');
    automation.executeHandler.mockResolvedValueOnce({ payload: 'globe-popup' });

    const setPopupHtml = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn(), null, [], setPopupHtml)
    );

    await act(async () => {
      await result.current.gateMetamagic(makeSpell({ name: 'Globe of Invulnerability', level: 4 }));
    });

    await act(async () => {
      await result.current.handleGlobeConfirm(['Goblin A']);
    });

    expect(setPopupHtml).toHaveBeenCalledWith('globe-popup');
  });

  it('calls setPopupHtml with forcecage popup payload on confirm', async () => {
    const automation = await import('../../services/automation/index.js');
    automation.executeHandler.mockResolvedValueOnce({ payload: 'forcecage-popup' });

    const setPopupHtml = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn(), null, [], setPopupHtml)
    );

    await act(async () => {
      await result.current.gateMetamagic(makeSpell({ name: 'Forcecage', level: 7 }));
    });

    await act(async () => {
      await result.current.handleForcecageConfirm(['Goblin A']);
    });

    expect(setPopupHtml).toHaveBeenCalledWith('forcecage-popup');
  });

  it('calls setPopupHtml with antimagicField popup payload on confirm', async () => {
    const automation = await import('../../services/automation/index.js');
    automation.executeHandler.mockResolvedValueOnce({ payload: 'antimagic-popup' });

    const setPopupHtml = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn(), null, [], setPopupHtml)
    );

    await act(async () => {
      await result.current.gateMetamagic(makeSpell({ name: 'Antimagic Field', level: 4 }));
    });

    await act(async () => {
      await result.current.handleAntimagicFieldConfirm(['Goblin A']);
    });

    expect(setPopupHtml).toHaveBeenCalledWith('antimagic-popup');
  });
});

// ── handleProtectionFromPoisonConfirm with popup payload ──────────────────────

describe('useSpellMetamagicFlow — handleProtectionFromPoisonConfirm popup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('calls setPopupHtml with protectionFromPoison popup payload on confirm', async () => {
    const setPopupHtml = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn(), null, [], setPopupHtml)
    );

    await act(async () => {
      await result.current.gateMetamagic(makeSpell({ name: 'Protection from Poison', level: 2 }));
    });

    await act(async () => {
      await result.current.handleProtectionFromPoisonConfirm(['Goblin A']);
    });

    expect(setPopupHtml).toHaveBeenCalledWith('protectionFromPoison-popup');
  });
});

// ── handleStoneSkinConfirm with popup payload ─────────────────────────────────

describe('useSpellMetamagicFlow — handleStoneSkinConfirm popup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('calls setPopupHtml with stoneSkin popup payload on confirm', async () => {
    const setPopupHtml = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn(), null, [], setPopupHtml)
    );

    await act(async () => {
      await result.current.gateMetamagic(makeSpell({ name: 'Stone Skin', level: 3 }));
    });

    await act(async () => {
      await result.current.handleStoneSkinConfirm('Goblin A');
    });

    expect(setPopupHtml).toHaveBeenCalledWith('stoneSkin-popup');
  });
});

// ── handleRemoveCurseConfirm with popup payload ───────────────────────────────

describe('useSpellMetamagicFlow — handleRemoveCurseConfirm popup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('calls setPopupHtml with removeCurse popup payload on confirm', async () => {
    const setPopupHtml = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn(), null, [], setPopupHtml)
    );

    await act(async () => {
      await result.current.gateMetamagic(makeSpell({ name: 'Remove Curse', level: 3 }));
    });

    await act(async () => {
      await result.current.handleRemoveCurseConfirm(['Goblin A']);
    });

    expect(setPopupHtml).toHaveBeenCalledWith('removeCurse-popup');
  });
});

// ── handleForesightConfirm with popup payload ─────────────────────────────────

describe('useSpellMetamagicFlow — handleForesightConfirm popup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('calls setPopupHtml with foresight popup payload on confirm', async () => {
    const setPopupHtml = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn(), null, [], setPopupHtml)
    );

    await act(async () => {
      await result.current.gateMetamagic(makeSpell({ name: 'Foresight', level: 9 }));
    });

    await act(async () => {
      await result.current.handleForesightConfirm(['Goblin A']);
    });

    expect(setPopupHtml).toHaveBeenCalledWith('foresight-popup');
  });
});

// ── handleDeathWardConfirm with popup payload ─────────────────────────────────

describe('useSpellMetamagicFlow — handleDeathWardConfirm popup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('calls setPopupHtml with deathWard popup payload on confirm', async () => {
    const setPopupHtml = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn(), null, [], setPopupHtml)
    );

    await act(async () => {
      await result.current.gateMetamagic(makeSpell({ name: 'Death Ward', level: 4 }));
    });

    await act(async () => {
      await result.current.handleDeathWardConfirm(['Goblin A']);
    });

    expect(setPopupHtml).toHaveBeenCalledWith('deathWard-popup');
  });
});

// ── handleHeroismConfirm with popup payload ───────────────────────────────────

describe('useSpellMetamagicFlow — handleHeroismConfirm popup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('calls setPopupHtml with heroism popup payload on confirm', async () => {
    const setPopupHtml = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn(), null, [], setPopupHtml)
    );

    await act(async () => {
      await result.current.gateMetamagic(makeSpell({ name: 'Heroism', level: 2 }));
    });

    await act(async () => {
      await result.current.handleHeroismConfirm(['Goblin A']);
    });

    expect(setPopupHtml).toHaveBeenCalledWith('heroism-popup');
  });
});

// ── handleBarkskinConfirm with popup payload ──────────────────────────────────

describe('useSpellMetamagicFlow — handleBarkskinConfirm popup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('calls setPopupHtml with barkskin popup payload on confirm', async () => {
    const setPopupHtml = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn(), null, [], setPopupHtml)
    );

    await act(async () => {
      await result.current.gateMetamagic(makeSpell({ name: 'Barkskin', level: 2 }));
    });

    await act(async () => {
      await result.current.handleBarkskinConfirm(['Goblin A']);
    });

    expect(setPopupHtml).toHaveBeenCalledWith('barkskin-popup');
  });
});

// ── handleAuraOfVitalityConfirm with popup payload ────────────────────────────

describe('useSpellMetamagicFlow — handleAuraOfVitalityConfirm popup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('calls setPopupHtml with auraOfVitality popup payload on confirm', async () => {
    const setPopupHtml = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn(), null, [], setPopupHtml)
    );

    await act(async () => {
      await result.current.gateMetamagic(makeSpell({ name: 'Aura of Vitality', level: 3 }));
    });

    await act(async () => {
      await result.current.handleAuraOfVitalityConfirm(['Goblin A']);
    });

    expect(setPopupHtml).toHaveBeenCalledWith('auraOfVitality-popup');
  });
});

// ── handleCircleOfPowerConfirm with popup payload ─────────────────────────────

describe('useSpellMetamagicFlow — handleCircleOfPowerConfirm popup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
  });

  it('calls setPopupHtml with circleOfPower popup payload on confirm', async () => {
    const setPopupHtml = vi.fn();
    const { result } = renderHook(() =>
      useSpellMetamagicFlow(makePlayerStats(), 'test-campaign', vi.fn(), null, [], setPopupHtml)
    );

    await act(async () => {
      await result.current.gateMetamagic(makeSpell({ name: 'Circle of Power', level: 7 }));
    });

    await act(async () => {
      await result.current.handleCircleOfPowerConfirm(['Goblin A']);
    });

    expect(setPopupHtml).toHaveBeenCalledWith('circleOfPower-popup');
  });
});
