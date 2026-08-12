import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../rules/effects/expirations.js', () => ({
  addExpiration: vi.fn(),
}));

vi.mock('../../../rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(),
}));

vi.mock('../../../dice/diceRoller.js', () => ({
  rollD20: vi.fn(),
}));

vi.mock('../../../shared/abilityLookup.js', () => ({
  getAbilityModifier: vi.fn(),
}));

vi.mock('../../../combat/conditions/savePromptService.js', () => ({
  sendSaveResult: vi.fn(),
}));

vi.mock('../../../ui/utils.js', () => ({
  default: {
    guid: vi.fn(),
    getName: vi.fn((n) => n),
  },
}));

vi.mock('../../../ui/storage.js', () => ({
  default: {
    set: vi.fn(),
  },
}));

vi.mock('../../../rules/combat/rangeCheck.js', () => ({
  isWithinRange: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../../hooks/useAllySelection.js', () => ({
  getAllyList: vi.fn().mockReturnValue([]),
}));

vi.mock('../../../automation/common/savePrompt.js', () => ({
  createSaveListener: vi.fn().mockReturnValue({
    promptId: 'test-prompt-id',
    promise: Promise.resolve({ success: false, roll: 12, total: 15 }),
  }),
  buildSaveDc: vi.fn().mockReturnValue(14),
}));

import { isAuraTarget } from './avengingAngelHandler.js';
import { getRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';

const campaignName = 'test-campaign';

describe('avengingAngelHandler.isAuraTarget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true when target is in aura targets, false otherwise', () => {
    getRuntimeValue.mockReturnValue(['Goblin1', 'Goblin2']);
    expect(isAuraTarget('TestPaladin', 'Goblin1', campaignName)).toBe(true);
    expect(isAuraTarget('TestPaladin', 'Goblin3', campaignName)).toBe(false);

    getRuntimeValue.mockReturnValue([]);
    expect(isAuraTarget('TestPaladin', 'Goblin1', campaignName)).toBe(false);
  });
});
