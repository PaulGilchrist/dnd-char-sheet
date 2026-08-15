// @improved-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(),
  setRuntimeValue: vi.fn().mockResolvedValue(undefined),
}));

import { isActive } from './avengingAngelHandler.js';
import { getRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';

const campaignName = 'test-campaign';
const playerName = 'TestPaladin';

describe('avengingAngelHandler.isActive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockIsActive(value) {
    getRuntimeValue.mockReturnValue(value);
  }

  describe('returns true', () => {
    it('should return true when runtime value is strictly true', () => {
      mockIsActive(true);
      expect(isActive(playerName, campaignName)).toBe(true);
    });
  });

  describe('returns false', () => {
    it('should return false when runtime value is strictly false', () => {
      mockIsActive(false);
      expect(isActive(playerName, campaignName)).toBe(false);
    });

    it.each([
      [null, 'null'],
      [undefined, 'undefined'],
      [0, 'zero'],
      [1, 'non-zero number'],
      ['', 'empty string'],
      ['true', 'string "true"'],
      ['false', 'string "false"'],
      [[], 'empty array'],
      [[{}], 'non-empty array'],
      [{}, 'empty object'],
      [{ name: 'Avenging Angel' }, 'object'],
      [NaN, 'NaN'],
    ])('should return false when runtime value is %s', (_, description) => {
      // @ts-expect-error - intentionally testing non-boolean values
      mockIsActive(description);
      expect(isActive(playerName, campaignName)).toBe(false);
    });
  });

  it('should pass playerName and campaignName to getRuntimeValue with the correct key', () => {
    mockIsActive(true);
    isActive(playerName, campaignName);

    expect(getRuntimeValue).toHaveBeenCalledWith(
      playerName,
      'avengingAngelActive',
      campaignName,
    );
  });

  it('should use different player names correctly', () => {
    mockIsActive(true);
    expect(isActive('OtherPlayer', campaignName)).toBe(true);

    expect(getRuntimeValue).toHaveBeenCalledWith(
      'OtherPlayer',
      'avengingAngelActive',
      campaignName,
    );
  });
});
