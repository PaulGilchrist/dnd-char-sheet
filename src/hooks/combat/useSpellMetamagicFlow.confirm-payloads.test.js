import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpellMetamagicFlow } from './useSpellMetamagicFlow.js';
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

// ── handleBanishmentConfirm with popup payload ──────────────────────────────

describe('useSpellMetamagicFlow — handleBanishmentConfirm popup', () => {
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
});

// ── handleRevivifyConfirm with popup payload ────────────────────────────────

describe('useSpellMetamagicFlow — handleRevivifyConfirm popup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
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
});

// ── handleSanctuaryConfirm with popup payload ───────────────────────────────

describe('useSpellMetamagicFlow — handleSanctuaryConfirm popup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
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

// ── handlePolymorphConfirm with popup payload ───────────────────────────────

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

// ── handleTruePolymorphPathSelect with popup payload ────────────────────────

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

// ── handleTruePolymorphTargetConfirm with popup payload ─────────────────────

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

// ── handleHealingWordConfirm with popup payload ─────────────────────────────

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

// ── handleRegenerateConfirm with popup payload ──────────────────────────────

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

// ── handleConfusionConfirm with popup payload ───────────────────────────────

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

// ── handleAnimalFriendshipConfirm with popup payload ────────────────────────

describe('useSpellMetamagicFlow — handleAnimalFriendshipConfirm popup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMultiTargetSpreadForSpell.mockReturnValueOnce(null);
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

// ── handleProtectionFromPoisonConfirm with popup payload ────────────────────

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

// ── handleStoneSkinConfirm with popup payload ───────────────────────────────

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

// ── handleRemoveCurseConfirm with popup payload ─────────────────────────────

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

// ── handleForesightConfirm with popup payload ───────────────────────────────

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

// ── handleDeathWardConfirm with popup payload ───────────────────────────────

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

// ── handleHeroismConfirm with popup payload ─────────────────────────────────

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

// ── handleBarkskinConfirm with popup payload ────────────────────────────────

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

// ── handleAuraOfVitalityConfirm with popup payload ──────────────────────────

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

// ── handleCircleOfPowerConfirm with popup payload ───────────────────────────

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
