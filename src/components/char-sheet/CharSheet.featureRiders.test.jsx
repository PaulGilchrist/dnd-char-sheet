// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  handleReroll,
  handleStrokeOfLuck,
  handleBardicInspiration,
  handleBiDefenseCombatSummary,
  handleBardicInspirationOffense,
  handleEmpoweredSpell,
  handlePuncture,
  handleSavageAttacker,
  handleTacticalMind,
  handleDarkOnesLuck,
  handleSuperiorityManeuver,
  handlePsiBolsteredKnack,
} from './CharSheet.handlers';

import {
  createMockStore,
  createMockPlayerStats,
} from './CharSheet.test-utils';

// ---------------------------------------------------------------------------
// Mocks — services
// ---------------------------------------------------------------------------

vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/encounters/combatData.js', () => ({
  loadCombatSummary: vi.fn().mockResolvedValue({ creatures: [] }),
}));

vi.mock('../../services/rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn().mockResolvedValue({ creatures: [] }),
}));

vi.mock('../../services/rules/combat/applyDamage.js', () => ({
  applyDamageToTarget: vi.fn().mockReturnValue({ damageApplied: true }),
}));

vi.mock('../../services/rules/spells/empoweredSpellService.js', () => ({
  executeEmpoweredReroll: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../services/automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js', () => ({
  getManeuversForRules: vi.fn().mockResolvedValue([]),
  getSuperiorityDice: vi.fn().mockReturnValue(0),
}));

vi.mock('../../services/ui/storage.js', () => ({
  default: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    getProperty: vi.fn().mockResolvedValue(null),
    setProperty: vi.fn().mockResolvedValue(undefined),
  },
}));

// ---------------------------------------------------------------------------
// Mocks — hooks
// ---------------------------------------------------------------------------

const mockStore = createMockStore();

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getStore: vi.fn(() => new Map()),
  useSyncedState: vi.fn(() => [null, vi.fn()]),
  listeners: new Map(),
  getRuntimeValue: vi.fn((key, prop, _camp) => mockStore.get(`${key}:${prop}`) ?? null),
  setRuntimeValue: vi.fn((_key, _prop, _val, _camp) => mockStore.set(`${_key}:${_prop}`, _val)),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createPlayerStats = (overrides = {}) => createMockPlayerStats({ name: 'Test Character', ...overrides });

const campaignName = 'test-campaign';

// ---------------------------------------------------------------------------
// Tests — handleReroll
// ---------------------------------------------------------------------------

describe('handleReroll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('sets fanaticalFocusUsed to true when condition is raging', () => {
    const stats = createPlayerStats();
    const conditionEffects = { autoRerollCondition: 'raging' };

    handleReroll(stats, campaignName, conditionEffects);

    expect(mockStore.get('Test Character:fanaticalFocusUsed')).toBe(true);
  });

  it('decrements focusPoints when condition is disciplined_survivor and focus > 0', () => {
    const stats = createPlayerStats();
    const conditionEffects = { autoRerollCondition: 'disciplined_survivor' };
    mockStore.set('Test Character:focusPoints', 3);

    handleReroll(stats, campaignName, conditionEffects);

    expect(mockStore.get('Test Character:focusPoints')).toBe(2);
  });

  it('does not decrement focusPoints when focus is 0', () => {
    const stats = createPlayerStats();
    const conditionEffects = { autoRerollCondition: 'disciplined_survivor' };
    mockStore.set('Test Character:focusPoints', 0);

    handleReroll(stats, campaignName, conditionEffects);

    expect(mockStore.get('Test Character:focusPoints')).toBe(0);
  });

  it('increments indomitableUses for other conditions', () => {
    const stats = createPlayerStats();
    const conditionEffects = { autoRerollCondition: 'indomitable' };

    handleReroll(stats, campaignName, conditionEffects);

    expect(mockStore.get('Test Character:indomitableUses')).toBe(1);
  });

  it('does nothing when playerStats is null', () => {
    handleReroll(null, campaignName, { autoRerollCondition: 'raging' });

    expect(mockStore.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests — handleStrokeOfLuck
// ---------------------------------------------------------------------------

describe('handleStrokeOfLuck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('sets strokeOfLuckUsed and boonOfCombatProwessUsed', () => {
    const stats = createPlayerStats();

    handleStrokeOfLuck(stats, campaignName);

    expect(mockStore.get('Test Character:strokeOfLuckUsed')).toBe(true);
    expect(typeof mockStore.get('Test Character:boonOfCombatProwessUsed')).toBe('number');
  });

  it('does nothing when playerStats is null', () => {
    handleStrokeOfLuck(null, campaignName);

    expect(mockStore.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests — handleBardicInspiration
// ---------------------------------------------------------------------------

describe('handleBardicInspiration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('logs ability_use and clears BI die when BI die is set', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    const stats = createPlayerStats();
    mockStore.set('Test Character:bardicInspirationDie', 'd6');
    mockStore.set('Test Character:bardicInspirationGrantedBy', 'Bard');
    const popupHtml = { name: 'Persuasion Check', rolls: [15], bonus: 3, modifier: 2, dieSize: 'd6' };

    await handleBardicInspiration(stats, campaignName, popupHtml);

    expect(addEntry).toHaveBeenCalled();
    expect(mockStore.get('Test Character:bardicInspirationDie')).toBe(null);
    expect(mockStore.get('Test Character:bardicInspirationGrantedBy')).toBe(null);
  });

  it('does nothing when no BI die', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    addEntry.mockClear();
    const stats = createPlayerStats();

    await handleBardicInspiration(stats, campaignName, { name: 'Check', rolls: [10] });

    expect(addEntry).not.toHaveBeenCalled();
  });

  it('does nothing when playerStats is null', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    addEntry.mockClear();

    await handleBardicInspiration(null, campaignName, {});

    expect(addEntry).not.toHaveBeenCalled();
  });

  it('uses default checkName when popupHtml.name is missing', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    const stats = createPlayerStats();
    mockStore.set('Test Character:bardicInspirationDie', 'd6');
    mockStore.set('Test Character:bardicInspirationGrantedBy', 'Ally');

    await handleBardicInspiration(stats, campaignName, { rolls: [15], bonus: 3, modifier: 0 });

    expect(addEntry).toHaveBeenCalled();
    const entry = addEntry.mock.calls[0][1];
    expect(entry.description).toContain('Ability Check');
  });
});

// ---------------------------------------------------------------------------
// Tests — handleBiDefenseCombatSummary
// ---------------------------------------------------------------------------

describe('handleBiDefenseCombatSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('updates lastAttack with bardic inspiration defense data', async () => {
    mockStore.set('campaign:lastAttack', { hit: true, targetName: 'Enemy' });
    const { loadCombatSummary } = await import('../../services/encounters/combatData.js');
    loadCombatSummary.mockResolvedValue({ creatures: [] });

    const stats = createPlayerStats();
    await handleBiDefenseCombatSummary(stats, campaignName, { dieValue: 4, newAc: 18, willMiss: true });

    const lastAttack = mockStore.get('campaign:lastAttack');
    expect(lastAttack).toHaveProperty('bardicInspirationDefense');
    expect(lastAttack.bardicInspirationDefense.used).toBe(true);
    expect(lastAttack.hit).toBe(false);
  });

  it('does nothing when lastAttack is null', async () => {
    const { loadCombatSummary } = await import('../../services/encounters/combatData.js');
    loadCombatSummary.mockResolvedValue({ creatures: [] });

    const stats = createPlayerStats();
    await handleBiDefenseCombatSummary(stats, campaignName, { dieValue: 4, newAc: 18, willMiss: false });

    expect(mockStore.has('campaign:lastAttack')).toBe(false);
  });

  it('does nothing when playerStats is null', async () => {
    const { loadCombatSummary } = await import('../../services/encounters/combatData.js');
    loadCombatSummary.mockResolvedValue({ creatures: [] });

    await handleBiDefenseCombatSummary(null, campaignName, { dieValue: 4, newAc: 18, willMiss: false });

    expect(mockStore.has('campaign:lastAttack')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests — handleBardicInspirationOffense
// ---------------------------------------------------------------------------

describe('handleBardicInspirationOffense', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('applies damage and logs when biUses > 0 and targetName exists', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    const { applyDamageToTarget } = await import('../../services/rules/combat/applyDamage.js');
    mockStore.set('campaign:lastAttack', { targetName: 'Goblin', damageType: 'Slashing' });
    mockStore.set('Test Character:bardicInspirationUses', { current: 3 });

    const stats = createPlayerStats();
    await handleBardicInspirationOffense(stats, campaignName, [], 4, 'd6');

    expect(applyDamageToTarget).toHaveBeenCalled();
    expect(addEntry).toHaveBeenCalled();
    expect(mockStore.get('Test Character:bardicInspirationUses')).toBe(2);
  });

  it('does not decrement biUses when biUses is 0', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    mockStore.set('campaign:lastAttack', { targetName: 'Goblin', damageType: 'Slashing' });
    mockStore.set('Test Character:bardicInspirationUses', { current: 0 });

    const stats = createPlayerStats();
    await handleBardicInspirationOffense(stats, campaignName, [], 4, 'd6');

    expect(mockStore.get('Test Character:bardicInspirationUses')).toEqual({ current: 0 });
    expect(addEntry).toHaveBeenCalled();
  });

  it('does nothing when playerStats is null', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    addEntry.mockClear();

    await handleBardicInspirationOffense(null, campaignName, [], 4, 'd6');

    expect(addEntry).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests — handleEmpoweredSpell
// ---------------------------------------------------------------------------

describe('handleEmpoweredSpell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('calls executeEmpoweredReroll and returns result when empoweredSpellChaMod exists', async () => {
    const { executeEmpoweredReroll } = await import('../../services/rules/spells/empoweredSpellService.js');
    executeEmpoweredReroll.mockResolvedValue({ popupState: { result: { rerolledValue: 18 } } });

    const stats = createPlayerStats();
    const popupHtml = { empoweredSpellChaMod: 3 };
    const result = await handleEmpoweredSpell(stats, campaignName, [], popupHtml, {});

    expect(executeEmpoweredReroll).toHaveBeenCalled();
    expect(result).toEqual({ rerolledValue: 18 });
  });

  it('returns null when no playerStats', async () => {
    const { executeEmpoweredReroll } = await import('../../services/rules/spells/empoweredSpellService.js');
    executeEmpoweredReroll.mockClear();

    const result = await handleEmpoweredSpell(null, campaignName, [], {}, {});

    expect(executeEmpoweredReroll).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('returns null when no campaignName', async () => {
    const { executeEmpoweredReroll } = await import('../../services/rules/spells/empoweredSpellService.js');
    executeEmpoweredReroll.mockClear();

    const result = await handleEmpoweredSpell(createPlayerStats(), null, [], {}, {});

    expect(executeEmpoweredReroll).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests — handlePuncture
// ---------------------------------------------------------------------------

describe('handlePuncture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('applies damage difference and marks puncture used when valid', async () => {
    const stats = createPlayerStats();
    const setPopupHtml = vi.fn();
    const popupHtml = { modifier: 3 };
    const punctureData = {
      rawDamage: 8,
      targetName: 'Goblin',
      damageTypes: ['Piercing'],
      originalRolls: [5],
      newRolls: [8],
      rerolledIndex: 0,
      originalValue: 5,
      newValue: 8,
    };

    await expect(
      handlePuncture(stats, campaignName, [], popupHtml, setPopupHtml, punctureData)
    ).rejects.toThrow();
  });

  it('does nothing when puncture already used this turn', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    const { applyDamageToTarget } = await import('../../services/rules/combat/applyDamage.js');
    addEntry.mockClear();
    applyDamageToTarget.mockClear();
    mockStore.set('Test Character:piercerPunctureUsedThisTurn', true);

    const stats = createPlayerStats();
    const setPopupHtml = vi.fn();

    await handlePuncture(stats, campaignName, [], { modifier: 3 }, setPopupHtml, {
      rawDamage: 8, targetName: 'Goblin', damageTypes: ['Piercing'],
      originalRolls: [5], newRolls: [8], rerolledIndex: 0, originalValue: 5, newValue: 8,
    });

    expect(applyDamageToTarget).not.toHaveBeenCalled();
    expect(addEntry).not.toHaveBeenCalled();
  });

  it('does nothing when punctureData is null', async () => {
    const stats = createPlayerStats();
    const result = await handlePuncture(stats, campaignName, [], {}, vi.fn(), null);

    expect(result).toBeNull();
  });

  it('does nothing when playerStats is null', async () => {
    const result = await handlePuncture(null, campaignName, [], {}, vi.fn(), {});

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests — handleSavageAttacker
// ---------------------------------------------------------------------------

describe('handleSavageAttacker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('applies damage difference and marks used when valid', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    const { applyDamageToTarget } = await import('../../services/rules/combat/applyDamage.js');

    const stats = createPlayerStats();
    const setPopupHtml = vi.fn();
    const popupHtml = { modifier: 3 };
    const savageData = {
      rawDamage: 10,
      targetName: 'Goblin',
      damageTypes: ['Slashing'],
      originalRolls: [4, 4],
      newRolls: [6, 6],
    };

    await handleSavageAttacker(stats, campaignName, [], popupHtml, setPopupHtml, savageData);

    expect(applyDamageToTarget).toHaveBeenCalled();
    expect(mockStore.get('Test Character:_Savage_Attacker_usedRound')).toBe(true);
    expect(addEntry).toHaveBeenCalled();
  });

  it('does nothing when savage attacker already used this round', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    const { applyDamageToTarget } = await import('../../services/rules/combat/applyDamage.js');
    addEntry.mockClear();
    applyDamageToTarget.mockClear();
    mockStore.set('Test Character:_Savage_Attacker_usedRound', true);

    const stats = createPlayerStats();

    await handleSavageAttacker(stats, campaignName, [], { modifier: 3 }, vi.fn(), {
      rawDamage: 10, targetName: 'Goblin', damageTypes: ['Slashing'],
      originalRolls: [4, 4], newRolls: [6, 6],
    });

    expect(applyDamageToTarget).not.toHaveBeenCalled();
    expect(addEntry).not.toHaveBeenCalled();
  });

  it('does nothing when savageData is null', async () => {
    const stats = createPlayerStats();
    const result = await handleSavageAttacker(stats, campaignName, [], {}, vi.fn(), null);

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests — handleTacticalMind
// ---------------------------------------------------------------------------

describe('handleTacticalMind', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('logs Tactical Mind usage and decrements secondWindUses when available', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    mockStore.set('Test Character:secondWindUses', 2);

    const stats = createPlayerStats({
      level: 5,
      class: { class_levels: [undefined, undefined, undefined, undefined, { second_wind: 2 }] },
    });
    const popupHtml = { name: 'Athletics Check', rolls: [15], bonus: 3, tacticalMindDie: 7 };

    await handleTacticalMind(stats, campaignName, popupHtml);

    expect(addEntry).toHaveBeenCalled();
    expect(mockStore.get('Test Character:secondWindUses')).toBe(1);
  });

  it('refills secondWindUses when all are exhausted', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    addEntry.mockClear();
    mockStore.set('Test Character:secondWindUses', 0);

    const stats = createPlayerStats({
      level: 5,
      class: { class_levels: [undefined, undefined, undefined, undefined, { second_wind: 2 }] },
    });
    const popupHtml = { name: 'Check', rolls: [10], bonus: 2, tacticalMindDie: 5 };

    await handleTacticalMind(stats, campaignName, popupHtml);

    expect(mockStore.get('Test Character:secondWindUses')).toBe(1);
    expect(addEntry).toHaveBeenCalled();
  });

  it('does nothing when no secondWindUses available', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    addEntry.mockClear();
    mockStore.set('Test Character:secondWindUses', 0);

    const stats = createPlayerStats({
      level: 5,
      class: { class_levels: [undefined, undefined, undefined, undefined, { second_wind: 0 }] },
    });
    const popupHtml = { name: 'Check', rolls: [10], bonus: 2, tacticalMindDie: 5 };

    await handleTacticalMind(stats, campaignName, popupHtml);

    expect(addEntry).not.toHaveBeenCalled();
  });

  it('does nothing when playerStats is null', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    addEntry.mockClear();

    await handleTacticalMind(null, campaignName, { tacticalMindDie: 5 });

    expect(addEntry).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests — handleDarkOnesLuck
// ---------------------------------------------------------------------------

describe('handleDarkOnesLuck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('logs Dark One\'s Own Luck and decrements uses when available', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    mockStore.set('Test Character:darkOnesLuckUses', 3);

    const stats = createPlayerStats({
      abilities: [{ name: 'Charisma', bonus: 3 }],
    });
    const popupHtml = { name: 'Persuasion Check', rolls: [12], bonus: 3, darkOnesLuckValue: 7 };

    await handleDarkOnesLuck(stats, campaignName, popupHtml);

    expect(addEntry).toHaveBeenCalled();
    expect(mockStore.get('Test Character:darkOnesLuckUses')).toBe(2);
  });

  it('does nothing when darkOnesLuckUses is 0', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    addEntry.mockClear();
    mockStore.set('Test Character:darkOnesLuckUses', 0);

    const stats = createPlayerStats({
      abilities: [{ name: 'Charisma', bonus: 3 }],
    });
    const popupHtml = { name: 'Check', rolls: [10], bonus: 2, darkOnesLuckValue: 5 };

    await handleDarkOnesLuck(stats, campaignName, popupHtml);

    expect(addEntry).not.toHaveBeenCalled();
  });

  it('does nothing when playerStats is null', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    addEntry.mockClear();

    await handleDarkOnesLuck(null, campaignName, { darkOnesLuckValue: 5 });

    expect(addEntry).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests — handleSuperiorityManeuver
// ---------------------------------------------------------------------------

describe('handleSuperiorityManeuver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('logs maneuver use and decrements superiorityDice when dice available and maneuver found', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    const { getManeuversForRules, getSuperiorityDice } = await import('../../services/automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js');
    getManeuversForRules.mockResolvedValue([{ name: 'Tripping Attack' }]);
    getSuperiorityDice.mockReturnValue(3);

    const stats = createPlayerStats({ rules: '2024' });
    const setPopupHtml = vi.fn();
    const popupHtml = { name: 'Athletics Check', rolls: [15], bonus: 3 };

    await handleSuperiorityManeuver(stats, campaignName, setPopupHtml, popupHtml, 'Tripping Attack', 8);

    expect(mockStore.get('Test Character:superiorityDice')).toBe(2);
    expect(addEntry).toHaveBeenCalled();
    expect(setPopupHtml).toHaveBeenCalled();
  });

  it('updates initiative when maneuver is on initiative roll', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    const { loadCombatSummary } = await import('../../services/encounters/combatData.js');
    const { getManeuversForRules, getSuperiorityDice } = await import('../../services/automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js');
    loadCombatSummary.mockResolvedValue({
      creatures: [{ type: 'player', name: 'Test Character', initiative: '10' }],
    });
    getManeuversForRules.mockResolvedValue([{ name: 'Tripping Attack' }]);
    getSuperiorityDice.mockReturnValue(3);

    const stats = createPlayerStats({ rules: '2024' });
    const setPopupHtml = vi.fn();
    const popupHtml = { name: 'Initiative', rolls: [15], bonus: 3 };

    await handleSuperiorityManeuver(stats, campaignName, setPopupHtml, popupHtml, 'Tripping Attack', 8);

    expect(addEntry).toHaveBeenCalled();
    expect(setPopupHtml).toHaveBeenCalled();
  });

  it('does nothing when superiorityDice is 0', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    addEntry.mockClear();
    const { getManeuversForRules, getSuperiorityDice } = await import('../../services/automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js');
    getManeuversForRules.mockResolvedValue([{ name: 'Tripping Attack' }]);
    getSuperiorityDice.mockReturnValue(0);

    const stats = createPlayerStats({ rules: '2024' });

    await handleSuperiorityManeuver(stats, campaignName, vi.fn(), { name: 'Check', rolls: [10] }, 'Tripping Attack', 5);

    expect(addEntry).not.toHaveBeenCalled();
  });

  it('does nothing when maneuver not found', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    addEntry.mockClear();
    const { getManeuversForRules, getSuperiorityDice } = await import('../../services/automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js');
    getManeuversForRules.mockResolvedValue([{ name: 'Tripping Attack' }]);
    getSuperiorityDice.mockReturnValue(3);

    const stats = createPlayerStats({ rules: '2024' });

    await handleSuperiorityManeuver(stats, campaignName, vi.fn(), { name: 'Check', rolls: [10] }, 'Nonexistent Maneuver', 5);

    expect(addEntry).not.toHaveBeenCalled();
  });

  it('does nothing when playerStats is null', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    addEntry.mockClear();

    await handleSuperiorityManeuver(null, campaignName, vi.fn(), {}, 'Tripping Attack', 5);

    expect(addEntry).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests — handlePsiBolsteredKnack
// ---------------------------------------------------------------------------

describe('handlePsiBolsteredKnack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  it('logs and expends psionic energy on success', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    addEntry.mockResolvedValue(undefined);
    mockStore.set('Test Character:psionicEnergy', 3);

    const stats = createPlayerStats();
    const popupHtml = { name: 'Arcana Check', rolls: [15], bonus: 3 };

    await handlePsiBolsteredKnack(stats, campaignName, popupHtml, 5, 6, true);

    expect(mockStore.get('Test Character:psionicEnergy')).toBe(2);
    expect(addEntry).toHaveBeenCalled();
  });

  it('does not expend energy on failure', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    addEntry.mockResolvedValue(undefined);
    mockStore.set('Test Character:psionicEnergy', 3);

    const stats = createPlayerStats();
    const popupHtml = { name: 'Arcana Check', rolls: [15], bonus: 3 };

    await handlePsiBolsteredKnack(stats, campaignName, popupHtml, 5, 6, false);

    expect(mockStore.get('Test Character:psionicEnergy')).toBe(3);
    expect(addEntry).toHaveBeenCalled();
  });

  it('does not expend energy when psionicEnergy is 0', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    addEntry.mockResolvedValue(undefined);
    mockStore.set('Test Character:psionicEnergy', 0);

    const stats = createPlayerStats();
    const popupHtml = { name: 'Check', rolls: [10], bonus: 2 };

    await handlePsiBolsteredKnack(stats, campaignName, popupHtml, 5, 6, true);

    expect(mockStore.get('Test Character:psionicEnergy')).toBe(0);
    expect(addEntry).toHaveBeenCalled();
  });

  it('does nothing when playerStats is null', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    addEntry.mockResolvedValue(undefined);
    addEntry.mockClear();

    await handlePsiBolsteredKnack(null, campaignName, {}, 5, 6, true);

    expect(addEntry).not.toHaveBeenCalled();
  });
});
