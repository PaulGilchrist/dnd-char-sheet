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

vi.mock('../../../automation/common/savePrompt.js', () => ({
  createSaveListener: vi.fn().mockReturnValue({
    promptId: 'test-prompt-id',
    promise: Promise.resolve({ success: false, roll: 12, total: 15 }),
  }),
  buildSaveDc: vi.fn().mockReturnValue(14),
}));

import { cleanupAuraTargetOnDamage } from './avengingAngelHandler.js';
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { addEntry } from '../../../ui/logService.js';

const campaignName = 'test-campaign';

describe('avengingAngelHandler.cleanupAuraTargetOnDamage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReset();
    setRuntimeValue.mockReset();
  });

  it('should clean up aura targets list when target is present', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'avengingAngelAuraTargets') return ['Goblin'];
      return null;
    });
    vi.spyOn(Date, 'now').mockReturnValue(1000);

    await cleanupAuraTargetOnDamage('TestPaladin', 'Goblin', campaignName);

    expect(setRuntimeValue).toHaveBeenCalledWith('TestPaladin', 'avengingAngelAuraTargets', [], campaignName);
    expect(addEntry).toHaveBeenCalledWith(campaignName, expect.objectContaining({
      type: 'condition',
      action: 'removed',
      characterName: 'Goblin',
      condition: 'Frightened',
      reason: 'took damage (Frightful Aura)',
      timestamp: 1000,
    }));
  });

  it('should remove target from aura targets list preserving others', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'avengingAngelAuraTargets') return ['Goblin1', 'Goblin2', 'Goblin3'];
      return null;
    });

    await cleanupAuraTargetOnDamage('TestPaladin', 'Goblin2', campaignName);

    expect(setRuntimeValue).toHaveBeenCalledWith('TestPaladin', 'avengingAngelAuraTargets', ['Goblin1', 'Goblin3'], campaignName);
  });

  it('should be a no-op when target is not in aura targets', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'avengingAngelAuraTargets') return ['Goblin1', 'Goblin3'];
      return null;
    });

    await cleanupAuraTargetOnDamage('TestPaladin', 'Goblin2', campaignName);

    expect(setRuntimeValue).not.toHaveBeenCalled();
    expect(addEntry).not.toHaveBeenCalled();
  });

  it('should handle addEntry rejection in cleanupAuraTargetOnDamage', async () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'avengingAngelAuraTargets') return ['Goblin'];
      return null;
    });
    addEntry.mockRejectedValue(new Error('cleanup entry error'));
    vi.spyOn(Date, 'now').mockReturnValue(1000);

    await cleanupAuraTargetOnDamage('TestPaladin', 'Goblin', campaignName);

    expect(setRuntimeValue).toHaveBeenCalledWith('TestPaladin', 'avengingAngelAuraTargets', [], campaignName);
    expect(addEntry).toHaveBeenCalled();
  });
});
