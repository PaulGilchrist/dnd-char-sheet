import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getHolyAuraSaveAdvantage } from './savePromptUtils.js';
import { getRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(() => null),
}));

describe('getHolyAuraSaveAdvantage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(null);
  });

  it('returns true when a holy_aura targetEffect targets the roller', () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'targetEffects') return [{ target: 'testTarget', effect: 'holy_aura', source: 'Cleric' }];
      return null;
    });
    expect(getHolyAuraSaveAdvantage({ targetName: 'testTarget', saveType: 'WIS' }, 'test-campaign')).toBe(true);
  });

  it('returns false when the holy_aura targetEffect targets another creature', () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'targetEffects') return [{ target: 'OtherAlly', effect: 'holy_aura', source: 'Cleric' }];
      return null;
    });
    expect(getHolyAuraSaveAdvantage({ targetName: 'testTarget', saveType: 'WIS' }, 'test-campaign')).toBe(false);
  });

  it('returns false for any save ability when the target is warded (all saves covered)', () => {
    getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'targetEffects') return [{ target: 'testTarget', effect: 'holy_aura', source: 'Cleric' }];
      return null;
    });
    expect(getHolyAuraSaveAdvantage({ targetName: 'testTarget', saveType: 'DEX' }, 'test-campaign')).toBe(true);
    expect(getHolyAuraSaveAdvantage({ targetName: 'testTarget', saveType: 'CON' }, 'test-campaign')).toBe(true);
  });

  it('returns false when there are no targetEffects', () => {
    getRuntimeValue.mockImplementation((name, key) => (key === 'targetEffects' ? [] : null));
    expect(getHolyAuraSaveAdvantage({ targetName: 'testTarget', saveType: 'WIS' }, 'test-campaign')).toBe(false);
  });

  it('returns false without a current prompt', () => {
    expect(getHolyAuraSaveAdvantage(null, 'test-campaign')).toBe(false);
  });
});
