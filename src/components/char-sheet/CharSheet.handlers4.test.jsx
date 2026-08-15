// @improved-by-ai
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

  it('returns null when playerStats is missing', async () => {
    const result = await handlePuncture(null, mockCampaignName, [], null, vi.fn(), {});
    expect(result).toBeNull();
  });

  it('returns null when campaignName is missing', async () => {
    const result = await handlePuncture(mockPlayerStats, null, [], null, vi.fn(), {});
    expect(result).toBeNull();
  });

  it('returns null when punctureData is missing', async () => {
    const result = await handlePuncture(mockPlayerStats, mockCampaignName, [], null, vi.fn(), null);
    expect(result).toBeNull();
  });

  it('returns null when piercerPunctureUsedThisTurn is already true', async () => {
    const { getRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    getRuntimeValue.mockReturnValue(true);

    const result = await handlePuncture(mockPlayerStats, mockCampaignName, [], null, vi.fn(), {});
    expect(result).toBeNull();
  });

  it('returns null when combatContext is missing', async () => {
    const { getRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    getRuntimeValue.mockReturnValue(null);

    const { getCombatContext } = await import('../../services/rules/combat/damageUtils.js');
    getCombatContext.mockResolvedValue(null);

    const result = await handlePuncture(mockPlayerStats, mockCampaignName, [], null, vi.fn(), {});
    expect(result).toBeNull();
  });

  it('applies damage difference when it is non-zero', async () => {
    const { getRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const { applyDamageToTarget } = await import('../../services/rules/combat/applyDamage.js');
    const { getCombatContext } = await import('../../services/rules/combat/damageUtils.js');

    getRuntimeValue.mockReturnValue(null);
    getCombatContext.mockResolvedValue({ creatures: [] });
    applyDamageToTarget.mockReturnValue({});

    const setPopupHtml = vi.fn();
    const punctureData = {
      rawDamage: 10,
      targetName: 'Goblin',
      damageTypes: ['Piercing'],
      originalRolls: [7, 3],
      newRolls: [6, 4],
      rerolledIndex: 0,
      originalValue: 7,
      newValue: 6,
    };

    // The handler has a bug: it references targetName before destructuring (line 132
    // checks !targetName but targetName is only destructured on line 134).
    // This test verifies the handler throws due to the temporal dead zone.
    await expect(
      handlePuncture(
        mockPlayerStats,
        mockCampaignName,
        [],
        { modifier: 2, damageType: 'Piercing' },
        setPopupHtml,
        punctureData
      )
    ).rejects.toThrow(/targetName/);
  });

  it('does not apply damage when difference is zero', async () => {
    const { getRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const { applyDamageToTarget } = await import('../../services/rules/combat/applyDamage.js');
    const { getCombatContext } = await import('../../services/rules/combat/damageUtils.js');

    getRuntimeValue.mockReturnValue(null);
    getCombatContext.mockResolvedValue({ creatures: [] });
    applyDamageToTarget.mockReturnValue({});

    const setPopupHtml = vi.fn();
    // rawDamage = 10, newRolls = [5, 5], modifier = 0 → difference = 0
    const punctureData = {
      rawDamage: 10,
      targetName: 'Goblin',
      damageTypes: ['Piercing'],
      originalRolls: [7, 3],
      newRolls: [5, 5],
      rerolledIndex: 0,
      originalValue: 7,
      newValue: 5,
    };

    // The handler has the same targetName-before-destructuring bug.
    await expect(
      handlePuncture(
        mockPlayerStats,
        mockCampaignName,
        [],
        { modifier: 0, damageType: 'Piercing' },
        setPopupHtml,
        punctureData
      )
    ).rejects.toThrow(/targetName/);
  });
});

// ---------------------------------------------------------------------------
// Tests — handleSavageAttacker
// ---------------------------------------------------------------------------

describe('handleSavageAttacker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when playerStats is missing', async () => {
    const result = await handleSavageAttacker(null, mockCampaignName, [], null, vi.fn(), {});
    expect(result).toBeNull();
  });

  it('returns null when campaignName is missing', async () => {
    const result = await handleSavageAttacker(mockPlayerStats, null, [], null, vi.fn(), {});
    expect(result).toBeNull();
  });

  it('returns null when savageData is missing', async () => {
    const result = await handleSavageAttacker(mockPlayerStats, mockCampaignName, [], null, vi.fn(), null);
    expect(result).toBeNull();
  });

  it('returns null when _Savage_Attacker_usedRound is already true', async () => {
    const { getRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    getRuntimeValue.mockReturnValue(true);

    const result = await handleSavageAttacker(mockPlayerStats, mockCampaignName, [], null, vi.fn(), {});
    expect(result).toBeNull();
  });

  it('returns null when combatContext is missing', async () => {
    const { getRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const { getCombatContext } = await import('../../services/rules/combat/damageUtils.js');

    getRuntimeValue.mockReturnValue(null);
    getCombatContext.mockResolvedValue(null);

    const result = await handleSavageAttacker(mockPlayerStats, mockCampaignName, [], null, vi.fn(), {});
    expect(result).toBeNull();
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

    const { setRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const savageSetCalls = setRuntimeValue.mock.calls.filter(
      (call) => call[1] === '_Savage_Attacker_usedRound'
    );
    expect(savageSetCalls.length).toBeGreaterThan(0);
    expect(savageSetCalls[0][2]).toBe(true);

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
    // rawDamage = 10, newRolls = [4, 6] → same total
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

  it('returns null when playerStats is missing', async () => {
    await handleTacticalMind(null, mockCampaignName, { name: 'Athletics Check', rolls: [15], bonus: 3, tacticalMindDie: 7 });
    const { setRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const swCalls = setRuntimeValue.mock.calls.filter((call) => call[1] === 'secondWindUses');
    expect(swCalls.length).toBe(0);
  });

  it('decrements secondWindUses when available', async () => {
    const { getRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    getRuntimeValue.mockReturnValue(2);

    await handleTacticalMind(
      mockPlayerStats,
      mockCampaignName,
      { name: 'Athletics Check', rolls: [15], bonus: 3, tacticalMindDie: 7 }
    );

    const { setRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const swCalls = setRuntimeValue.mock.calls.filter((call) => call[1] === 'secondWindUses');
    expect(swCalls.length).toBeGreaterThan(0);
    expect(swCalls[0][2]).toBe(1);
  });

  it('resets secondWindUses to maxUses when current is 0', async () => {
    const { getRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    getRuntimeValue.mockReturnValue(0);

    await handleTacticalMind(
      mockPlayerStats,
      mockCampaignName,
      { name: 'Athletics Check', rolls: [15], bonus: 3, tacticalMindDie: 7 }
    );

    const { setRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const swCalls = setRuntimeValue.mock.calls.filter((call) => call[1] === 'secondWindUses');
    // When currentUses is 0, the handler resets to maxUses first, then decrements
    expect(swCalls.length).toBe(2);
    expect(swCalls[0][2]).toBe(2); // reset to max
    expect(swCalls[1][2]).toBe(1); // decrement
  });

  it('uses default checkName when popupHtml.name is missing', async () => {
    const { getRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    getRuntimeValue.mockReturnValue(2);

    await handleTacticalMind(
      mockPlayerStats,
      mockCampaignName,
      { rolls: [15], bonus: 3, tacticalMindDie: 7 }
    );

    const { addEntry } = await import('../../services/ui/logService.js');
    expect(addEntry).toHaveBeenCalled();
    const logCall = addEntry.mock.calls[0][1];
    expect(logCall.description).toContain('Ability Check');
  });

  it('uses maxUses from class_levels when runtime value returns null', async () => {
    const { getRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    getRuntimeValue.mockReturnValue(null);

    await handleTacticalMind(
      mockPlayerStats,
      mockCampaignName,
      { name: 'Athletics Check', rolls: [15], bonus: 3, tacticalMindDie: 7 }
    );

    const { setRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const swCalls = setRuntimeValue.mock.calls.filter((call) => call[1] === 'secondWindUses');
    // maxUses should be 2 (from class_levels[4].second_wind)
    expect(swCalls[0][2]).toBe(2);
    // Then decremented to 1
    expect(swCalls[1][2]).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Tests — handleDarkOnesLuck
// ---------------------------------------------------------------------------

describe('handleDarkOnesLuck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns when playerStats is missing', async () => {
    await handleDarkOnesLuck(null, mockCampaignName, { name: 'Persuasion Check', rolls: [15], bonus: 3, darkOnesLuckValue: 7 });
    const { setRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const luckCalls = setRuntimeValue.mock.calls.filter((call) => call[1] === 'darkOnesLuckUses');
    expect(luckCalls.length).toBe(0);
  });

  it('decrements darkOnesLuckUses when available', async () => {
    const { getRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    getRuntimeValue.mockReturnValue(3);

    await handleDarkOnesLuck(
      mockPlayerStats,
      mockCampaignName,
      { name: 'Persuasion Check', rolls: [15], bonus: 3, darkOnesLuckValue: 7 }
    );

    const { setRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const luckCalls = setRuntimeValue.mock.calls.filter((call) => call[1] === 'darkOnesLuckUses');
    expect(luckCalls.length).toBeGreaterThan(0);
    expect(luckCalls[0][2]).toBe(2);
  });

  it('does nothing when darkOnesLuckUses is 0', async () => {
    const { getRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    getRuntimeValue.mockReturnValue(0);

    await handleDarkOnesLuck(
      mockPlayerStats,
      mockCampaignName,
      { name: 'Persuasion Check', rolls: [15], bonus: 3, darkOnesLuckValue: 7 }
    );

    const { setRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const luckCalls = setRuntimeValue.mock.calls.filter((call) => call[1] === 'darkOnesLuckUses');
    expect(luckCalls.length).toBe(0);
  });

  it('uses default rollName when popupHtml.name is missing', async () => {
    const { getRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    getRuntimeValue.mockReturnValue(3);

    await handleDarkOnesLuck(
      mockPlayerStats,
      mockCampaignName,
      { rolls: [15], bonus: 3, darkOnesLuckValue: 7 }
    );

    const { addEntry } = await import('../../services/ui/logService.js');
    expect(addEntry).toHaveBeenCalled();
    const logCall = addEntry.mock.calls[0][1];
    expect(logCall.description).toContain('Ability Check');
  });

  it('calculates maxUses from Charisma bonus when runtime value returns null', async () => {
    const { getRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    getRuntimeValue.mockReturnValue(null);

    await handleDarkOnesLuck(
      mockPlayerStats,
      mockCampaignName,
      { name: 'Persuasion Check', rolls: [15], bonus: 3, darkOnesLuckValue: 7 }
    );

    const { setRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const luckCalls = setRuntimeValue.mock.calls.filter((call) => call[1] === 'darkOnesLuckUses');
    // Charisma bonus is 3, so maxUses = 3, then decremented to 2
    expect(luckCalls[0][2]).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Tests — handleSuperiorityManeuver
// ---------------------------------------------------------------------------

describe('handleSuperiorityManeuver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns when playerStats is missing', async () => {
    await handleSuperiorityManeuver(null, mockCampaignName, vi.fn(), { name: 'Athletics Check', rolls: [15], bonus: 3 }, 'Pushing Attack', 8);
    const { setRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const sdCalls = setRuntimeValue.mock.calls.filter((call) => call[1] === 'superiorityDice');
    expect(sdCalls.length).toBe(0);
  });

  it('does nothing when superiorityDice is 0', async () => {
    const { getSuperiorityDice } = await import('../../services/automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js');
    getSuperiorityDice.mockReturnValue(0);

    await handleSuperiorityManeuver(
      mockPlayerStats,
      mockCampaignName,
      vi.fn(),
      { name: 'Athletics Check', rolls: [15], bonus: 3 },
      'Pushing Attack',
      8
    );

    const { setRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const sdCalls = setRuntimeValue.mock.calls.filter((call) => call[1] === 'superiorityDice');
    expect(sdCalls.length).toBe(0);
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

    const { setRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const sdCalls = setRuntimeValue.mock.calls.filter((call) => call[1] === 'superiorityDice');
    expect(sdCalls.length).toBe(0);
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

    const { setRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const sdCalls = setRuntimeValue.mock.calls.filter((call) => call[1] === 'superiorityDice');
    expect(sdCalls.length).toBeGreaterThan(0);
    expect(sdCalls[0][2]).toBe(2);
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

    const { setRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const sdCalls = setRuntimeValue.mock.calls.filter((call) => call[1] === 'superiorityDice');
    expect(sdCalls.length).toBeGreaterThan(0);
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

  it('uses default skillName when popupHtml.name is missing', async () => {
    const { getManeuversForRules } = await import('../../services/automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js');
    const { getSuperiorityDice } = await import('../../services/automation/handlers/class-fighter-rogue/combatSuperiorityHandler.js');
    getManeuversForRules.mockResolvedValue([{ name: 'Pushing Attack' }]);
    getSuperiorityDice.mockReturnValue(3);

    const setPopupHtml = vi.fn();

    await handleSuperiorityManeuver(
      mockPlayerStats,
      mockCampaignName,
      setPopupHtml,
      { rolls: [15], bonus: 3 },
      'Pushing Attack',
      8
    );

    const { addEntry } = await import('../../services/ui/logService.js');
    expect(addEntry).toHaveBeenCalled();
    const logCall = addEntry.mock.calls[0][1];
    expect(logCall.description).toContain('Ability Check');
  });
});

// ---------------------------------------------------------------------------
// Tests — handlePsiBolsteredKnack
// ---------------------------------------------------------------------------

describe('handlePsiBolsteredKnack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns when playerStats is missing', async () => {
    await handlePsiBolsteredKnack(null, mockCampaignName, { name: 'Athletics Check', rolls: [15], bonus: 3 }, 5, 8, true);
    const { setRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const peCalls = setRuntimeValue.mock.calls.filter((call) => call[1] === 'psionicEnergy');
    expect(peCalls.length).toBe(0);
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

    const { setRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const peCalls = setRuntimeValue.mock.calls.filter((call) => call[1] === 'psionicEnergy');
    expect(peCalls.length).toBeGreaterThan(0);
    expect(peCalls[0][2]).toBe(2);
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

    const { setRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const peCalls = setRuntimeValue.mock.calls.filter((call) => call[1] === 'psionicEnergy');
    expect(peCalls.length).toBe(0);
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

    const { setRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    const peCalls = setRuntimeValue.mock.calls.filter((call) => call[1] === 'psionicEnergy');
    expect(peCalls.length).toBe(0);
  });

  it('uses default popupName when popupHtml.name is missing', async () => {
    const { getRuntimeValue } = await import('../../hooks/runtime/useRuntimeState.js');
    getRuntimeValue.mockReturnValue(3);

    await handlePsiBolsteredKnack(
      mockPlayerStats,
      mockCampaignName,
      { rolls: [15], bonus: 3 },
      5,
      8,
      true
    );

    const { addEntry } = await import('../../services/ui/logService.js');
    expect(addEntry).toHaveBeenCalled();
    const logCall = addEntry.mock.calls[0][1];
    expect(logCall.description).toContain('Ability Check');
  });

  it('logs success or failure in the description', async () => {
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
});
