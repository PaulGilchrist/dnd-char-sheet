// CLA-195 regression: createIndomitableHandler must consume a use
// (indomitableUses), submit the reroll with the +fighter level bonus, and log.
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createIndomitableHandler } from './savePromptHandlers.js';
import { rollD20 } from '../../services/dice/diceRoller.js';
import { computeAuraBonus } from '../../services/combat/auras/auraOfProtection.js';
import { getAbilitySaveBonus } from '../../services/combat/conditions/conditionUtils.js';
import { setRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../services/ui/logService.js';
import { getSaveDisadvantage } from './savePromptUtils.js';

vi.mock('../../services/dice/diceRoller.js', () => ({
  rollD20: vi.fn(() => 15),
}));

vi.mock('../../services/combat/auras/auraOfProtection.js', () => ({
  computeAuraBonus: vi.fn(async () => ({ bonus: 0, sourceName: null })),
}));

vi.mock('../../services/combat/conditions/conditionUtils.js', () => ({
  getAbilitySaveBonus: vi.fn(() => 5),
}));

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../services/encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(() => null),
}));

vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('./savePromptUtils.js', () => ({
  getSaveDisadvantage: vi.fn(() => false),
}));

const current = {
  promptId: 'p1',
  targetName: 'EvasiveFighter',
  saveType: 'WIS',
  saveDc: 13,
  dcSuccess: 'half',
  rawDamage: 10,
  damageFormula: '2d6',
  damageType: 'Lightning',
  sourceName: 'Gust of Wind',
};

describe('createIndomitableHandler (CLA-195)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rollD20.mockReturnValue(15);
    computeAuraBonus.mockResolvedValue({ bonus: 0, sourceName: null });
    getAbilitySaveBonus.mockReturnValue(5);
    getSaveDisadvantage.mockReturnValue(false);
  });

  it('consumes a use, submits success with +fighter level bonus, and logs', async () => {
    const submitSaveResult = vi.fn();
    const setRerollUsedForSave = vi.fn();
    const handler = createIndomitableHandler({
      campaignName: 'test-campaign',
      characters: [{ name: 'EvasiveFighter', level: 18, computedStats: { level: 18 } }],
      activeMapName: null,
      current,
      indomitableAvailable: true,
      currentUses: 0,
      maxUses: 3,
      rerollBonus: 18,
      setRerollUsedForSave,
      submitSaveResult,
    });

    await handler();

    expect(setRuntimeValue).toHaveBeenCalledWith('EvasiveFighter', 'indomitableUses', 1, 'test-campaign');
    expect(submitSaveResult).toHaveBeenCalledWith(expect.objectContaining({
      promptId: 'p1',
      targetName: 'EvasiveFighter',
      success: true,
      total: 38,
      saveBonus: 23,
      bonusDetail: '(+18 Indomitable)',
      note: 'indomitable_reroll',
    }));
    expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
      type: 'ability_use',
      abilityName: 'Indomitable',
    }));
  });

  it('does nothing when unavailable or at max uses', async () => {
    const submitSaveResult = vi.fn();
    const atMax = createIndomitableHandler({
      campaignName: 'test-campaign',
      characters: [],
      activeMapName: null,
      current,
      indomitableAvailable: false,
      currentUses: 3,
      maxUses: 3,
      rerollBonus: 18,
      setRerollUsedForSave: vi.fn(),
      submitSaveResult,
    });
    await atMax();
    expect(setRuntimeValue).not.toHaveBeenCalled();
    expect(submitSaveResult).not.toHaveBeenCalled();

    const overMax = createIndomitableHandler({
      campaignName: 'test-campaign',
      characters: [],
      activeMapName: null,
      current,
      indomitableAvailable: true,
      currentUses: 3,
      maxUses: 3,
      rerollBonus: 18,
      setRerollUsedForSave: vi.fn(),
      submitSaveResult,
    });
    await overMax();
    expect(setRuntimeValue).not.toHaveBeenCalled();
    expect(submitSaveResult).not.toHaveBeenCalled();
  });
});
