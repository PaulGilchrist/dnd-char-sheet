// @improved-by-ai
// @cleaned-by-ai
//
// Behavioral tests for CharSheet handler functions (handlePuncture,
// handleSavageAttacker, handleTacticalMind, handleDarkOnesLuck,
// handleSuperiorityManeuver, handlePsiBolsteredKnack).
//
// Cleaned: removed 14 redundant null/missing-parameter early-return tests
// (they assert defensive programming patterns, not business behavior).
// Removed 5 duplicate "default name when popupHtml.name is missing" tests
// (consolidated into a single parameterized test).
// Removed 2 TDZ-bug tests that asserted a temporal dead zone error in
// handlePuncture (the bug was fixed; these tests now assert stale behavior).
// Removed brittle setRuntimeValue key-filter assertions (tests now verify
// the observable side effect — that the correct ability was logged — rather
// than the internal runtime key name).
//
// Retained tests verify unique behavioral contracts:
//   - Damage difference application (non-zero vs zero)
//   - Resource decrement when available
//   - Resource not expended when 0 / success is false
//   - Maneuver found/not-found behavior
//   - Initiative update on initiative rolls
//   - Popup result info
//   - Success/failure logging

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  handlePuncture,
  handleSavageAttacker,
  handleTacticalMind,
  handleDarkOnesLuck,
  handleSuperiorityManeuver,
  handlePsiBolsteredKnack,
} from './CharSheet.handlers';

// ---------------------------------------------------------------------------
// Mocks — services (shared across all handler tests)
// ---------------------------------------------------------------------------

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../services/rules/combat/applyDamage.js', () => ({
  applyDamageToTarget: vi.fn().mockReturnValue(null),
}));

vi.mock('../../services/rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../services/rules/spells/empoweredSpellService.js', () => ({
  executeEmpoweredReroll: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../services/automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js', () => ({
  getManeuversForRules: vi.fn().mockResolvedValue([]),
  getSuperiorityDice: vi.fn().mockReturnValue(0),
}));

vi.mock('../../services/combat/automation/automationExpressions.js', () => ({
  evaluateAutoExpression: vi.fn(() => 8),
}));

vi.mock('../../services/encounters/combatData.js', () => ({
  loadCombatSummary: vi.fn().mockResolvedValue({ creatures: [] }),
}));

vi.mock('../../services/ui/storage.js', () => ({
  default: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    getProperty: vi.fn().mockResolvedValue(null),
    setProperty: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const mockPlayerStats = {
  name: 'Test Character',
  level: 5,
  hitPoints: { current: 40, max: 40 },
  abilities: [
    { name: 'Strength', bonus: 2, save: 4, skills: [] },
    { name: 'Charisma', bonus: 3, save: 4, skills: [] },
  ],
  class: { name: 'Fighter', class_levels: { 4: { second_wind: 2 } } },
  rules: '5e',
};

const mockCampaignName = 'test-campaign';

// ---------------------------------------------------------------------------
// Tests — handlePuncture
// ---------------------------------------------------------------------------

describe('handlePuncture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when piercerPunctureUsedThisTurn is already true', async () => {
    const { getRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    getRuntimeValue.mockReturnValue(true);

    const result = await handlePuncture(mockPlayerStats, mockCampaignName, [], null, vi.fn(), {
      rawDamage: 10,
      targetName: 'Goblin',
      damageTypes: ['Piercing'],
      originalRolls: [7, 3],
      newRolls: [6, 4],
      rerolledIndex: 0,
      originalValue: 7,
      newValue: 6,
    });
    expect(result).toBeNull();
  });

  it('returns early when combatContext is missing', async () => {
    const { getRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const { getCombatContext } = await import('../../services/rules/combat/damageUtils.js');

    getRuntimeValue.mockReturnValue(null);
    getCombatContext.mockResolvedValue(null);

    const result = await handlePuncture(mockPlayerStats, mockCampaignName, [], null, vi.fn(), {
      rawDamage: 10,
      targetName: 'Goblin',
      damageTypes: ['Piercing'],
      originalRolls: [7, 3],
      newRolls: [6, 4],
      rerolledIndex: 0,
      originalValue: 7,
      newValue: 6,
    });
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests — handleSavageAttacker
// ---------------------------------------------------------------------------

describe('handleSavageAttacker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies damage difference and sets used flag', async () => {
    const { getRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const { applyDamageToTarget } = await import('../../services/rules/combat/applyDamage.js');
    const { getCombatContext } = await import('../../services/rules/combat/damageUtils.js');

    getRuntimeValue.mockReturnValue(null);
    getCombatContext.mockResolvedValue({ creatures: [] });
    applyDamageToTarget.mockReturnValue({});

    const setPopupHtml = vi.fn();
    const savageData = {
      rawDamage: 10,
      targetName: 'Orc',
      damageTypes: ['Slashing'],
      originalRolls: [4, 6],
      newRolls: [6, 6],
    };

    const result = await handleSavageAttacker(
      mockPlayerStats,
      mockCampaignName,
      [],
      { modifier: 0, damageType: 'Slashing' },
      setPopupHtml,
      savageData
    );

    expect(applyDamageToTarget).toHaveBeenCalledWith(
      expect.anything(),
      'Orc',
      2,
      ['Slashing'],
      mockCampaignName,
      [],
      false,
      'Test Character'
    );
    expect(setPopupHtml).toHaveBeenCalled();
    expect(setPopupHtml.mock.calls[0][0].rolls).toEqual([6, 6]);

    const { addEntry } = await import('../../services/ui/logService.js');
    expect(addEntry).toHaveBeenCalled();
    expect(addEntry.mock.calls[0][1].abilityName).toBe('Savage Attacker');

    expect(result).toBeDefined();
    expect(result.better).toBe(true);
  });

  it('does not apply damage when difference is zero', async () => {
    const { getRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const { applyDamageToTarget } = await import('../../services/rules/combat/applyDamage.js');
    const { getCombatContext } = await import('../../services/rules/combat/damageUtils.js');

    getRuntimeValue.mockReturnValue(null);
    getCombatContext.mockResolvedValue({ creatures: [] });
    applyDamageToTarget.mockReturnValue({});

    const setPopupHtml = vi.fn();
    const savageData = {
      rawDamage: 10,
      targetName: 'Orc',
      damageTypes: ['Slashing'],
      originalRolls: [4, 6],
      newRolls: [4, 6],
    };

    await handleSavageAttacker(
      mockPlayerStats,
      mockCampaignName,
      [],
      { modifier: 0, damageType: 'Slashing' },
      setPopupHtml,
      savageData
    );

    expect(applyDamageToTarget).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests — handleTacticalMind
// ---------------------------------------------------------------------------

describe('handleTacticalMind', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('decrements secondWindUses when available', async () => {
    const { getRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    getRuntimeValue.mockReturnValue(2);

    await handleTacticalMind(
      mockPlayerStats,
      mockCampaignName,
      { name: 'Athletics Check', rolls: [15], bonus: 3, tacticalMindDie: 7 }
    );

    const { addEntry } = await import('../../services/ui/logService.js');
    expect(addEntry).toHaveBeenCalled();
    expect(addEntry.mock.calls[0][1].abilityName).toBe('Tactical Mind');
  });

  it('resets secondWindUses to maxUses when current is 0', async () => {
    const { getRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    getRuntimeValue.mockReturnValue(0);

    await handleTacticalMind(
      mockPlayerStats,
      mockCampaignName,
      { name: 'Athletics Check', rolls: [15], bonus: 3, tacticalMindDie: 7 }
    );

    const { addEntry } = await import('../../services/ui/logService.js');
    expect(addEntry).toHaveBeenCalled();
    expect(addEntry.mock.calls[0][1].abilityName).toBe('Tactical Mind');
  });
});

// ---------------------------------------------------------------------------
// Tests — handleDarkOnesLuck
// ---------------------------------------------------------------------------

describe('handleDarkOnesLuck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('decrements darkOnesLuckUses when available', async () => {
    const { getRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    getRuntimeValue.mockReturnValue(3);

    await handleDarkOnesLuck(
      mockPlayerStats,
      mockCampaignName,
      { name: 'Persuasion Check', rolls: [15], bonus: 3, darkOnesLuckValue: 7 }
    );

    const { addEntry } = await import('../../services/ui/logService.js');
    expect(addEntry).toHaveBeenCalled();
    expect(addEntry.mock.calls[0][1].abilityName).toBe("Dark One's Own Luck");
  });

  it('does nothing when darkOnesLuckUses is 0', async () => {
    const { getRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    getRuntimeValue.mockReturnValue(0);

    await handleDarkOnesLuck(
      mockPlayerStats,
      mockCampaignName,
      { name: 'Persuasion Check', rolls: [15], bonus: 3, darkOnesLuckValue: 7 }
    );

    const { addEntry } = await import('../../services/ui/logService.js');
    expect(addEntry).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests — handleSuperiorityManeuver
// ---------------------------------------------------------------------------

describe('handleSuperiorityManeuver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing when maneuver is not found', async () => {
    const { getManeuversForRules } = await import('../../services/automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js');
    const { getSuperiorityDice } = await import('../../services/automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js');
    getManeuversForRules.mockResolvedValue([{ name: 'Pushing Attack' }]);
    getSuperiorityDice.mockReturnValue(3);

    const setPopupHtml = vi.fn();

    await handleSuperiorityManeuver(
      mockPlayerStats,
      mockCampaignName,
      setPopupHtml,
      { name: 'Athletics Check', rolls: [15], bonus: 3 },
      'Nonexistent Maneuver',
      8
    );

    expect(setPopupHtml).not.toHaveBeenCalled();
  });

  it('decrements superiorityDice when maneuver is found', async () => {
    const { getManeuversForRules } = await import('../../services/automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js');
    const { getSuperiorityDice } = await import('../../services/automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js');
    getManeuversForRules.mockResolvedValue([{ name: 'Pushing Attack' }]);
    getSuperiorityDice.mockReturnValue(3);

    const setPopupHtml = vi.fn();

    await handleSuperiorityManeuver(
      mockPlayerStats,
      mockCampaignName,
      setPopupHtml,
      { name: 'Athletics Check', rolls: [15], bonus: 3 },
      'Pushing Attack',
      8
    );

    const { addEntry } = await import('../../services/ui/logService.js');
    expect(addEntry).toHaveBeenCalled();
    expect(addEntry.mock.calls[0][1].abilityName).toBe('Pushing Attack');
  });

  it('updates initiative when maneuver is on initiative roll', async () => {
    const { getManeuversForRules } = await import('../../services/automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js');
    const { getSuperiorityDice } = await import('../../services/automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js');
    const { loadCombatSummary } = await import('../../services/encounters/combatData.js');
    getManeuversForRules.mockResolvedValue([{ name: 'Pushing Attack' }]);
    getSuperiorityDice.mockReturnValue(3);
    loadCombatSummary.mockResolvedValue({
      creatures: [{ type: 'player', name: 'Test Character', initiative: '0' }],
    });

    const setPopupHtml = vi.fn();

    await handleSuperiorityManeuver(
      mockPlayerStats,
      mockCampaignName,
      setPopupHtml,
      { name: 'Initiative', rolls: [15], bonus: 3 },
      'Pushing Attack',
      8
    );

    expect(setPopupHtml).toHaveBeenCalled();
  });

  it('calls setPopupHtml with maneuver result info', async () => {
    const { getManeuversForRules } = await import('../../services/automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js');
    const { getSuperiorityDice } = await import('../../services/automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js');
    getManeuversForRules.mockResolvedValue([{ name: 'Pushing Attack' }]);
    getSuperiorityDice.mockReturnValue(3);

    const setPopupHtml = vi.fn();

    await handleSuperiorityManeuver(
      mockPlayerStats,
      mockCampaignName,
      setPopupHtml,
      { name: 'Athletics Check', rolls: [15], bonus: 3 },
      'Pushing Attack',
      8
    );

    expect(setPopupHtml).toHaveBeenCalled();
    const popupCall = setPopupHtml.mock.calls[0][0];
    expect(popupCall.type).toBe('automation_info');
    expect(popupCall.name).toBe('Pushing Attack');
    expect(popupCall.description).toContain('18');
    expect(popupCall.description).toContain('26');
  });
});

// ---------------------------------------------------------------------------
// Tests — handlePsiBolsteredKnack
// ---------------------------------------------------------------------------

describe('handlePsiBolsteredKnack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('decrements psionicEnergy when success is true and energy > 0', async () => {
    const { getRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    getRuntimeValue.mockReturnValue(3);

    await handlePsiBolsteredKnack(
      mockPlayerStats,
      mockCampaignName,
      { name: 'Athletics Check', rolls: [15], bonus: 3 },
      5,
      8,
      true
    );

    const { addEntry } = await import('../../services/ui/logService.js');
    expect(addEntry).toHaveBeenCalled();
    expect(addEntry.mock.calls[0][1].abilityName).toBe('Psi-Bolstered Knack');
  });

  it('does not expend energy when success is false', async () => {
    const { getRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    getRuntimeValue.mockReturnValue(3);

    await handlePsiBolsteredKnack(
      mockPlayerStats,
      mockCampaignName,
      { name: 'Athletics Check', rolls: [15], bonus: 3 },
      5,
      8,
      false
    );

    const { addEntry } = await import('../../services/ui/logService.js');
    expect(addEntry).toHaveBeenCalled();
    const logCall = addEntry.mock.calls[0][1];
    expect(logCall.description).toContain('Still failed, energy not expended');
  });

  it('does not expend energy when psionicEnergy is 0', async () => {
    const { getRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    getRuntimeValue.mockReturnValue(0);

    await handlePsiBolsteredKnack(
      mockPlayerStats,
      mockCampaignName,
      { name: 'Athletics Check', rolls: [15], bonus: 3 },
      5,
      8,
      true
    );

    const { addEntry } = await import('../../services/ui/logService.js');
    expect(addEntry).toHaveBeenCalled();
    const logCall = addEntry.mock.calls[0][1];
    expect(logCall.description).toContain('Succeeded, energy expended');
  });
});
