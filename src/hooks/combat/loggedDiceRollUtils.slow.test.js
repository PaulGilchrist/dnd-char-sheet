// SP-109: getSlowAcPenalty — -2 while the target's activeConditions include 'slow'.
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getSlowAcPenalty } from './loggedDiceRollUtils.js';
import { getRuntimeValue } from '../runtime/useRuntimeState.js';

vi.mock('../runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(() => null),
    setRuntimeValue: vi.fn(),
}));

beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValue.mockReturnValue(null);
});

describe('getSlowAcPenalty', () => {
    it('returns 2 while the target is slowed', () => {
        getRuntimeValue.mockImplementation((name, key) => (key === 'activeConditions' ? ['slow'] : null));
        expect(getSlowAcPenalty('AberrantSorcerer', 'test-campaign')).toBe(2);
    });

    it('is case-insensitive on the condition key', () => {
        getRuntimeValue.mockImplementation((name, key) => (key === 'activeConditions' ? ['Slow'] : null));
        expect(getSlowAcPenalty('AberrantSorcerer', 'test-campaign')).toBe(2);
    });

    it('returns 0 when the slow condition is gone', () => {
        getRuntimeValue.mockImplementation((name, key) => (key === 'activeConditions' ? ['poisoned'] : null));
        expect(getSlowAcPenalty('AberrantSorcerer', 'test-campaign')).toBe(0);
    });

    it('returns 0 without a target name', () => {
        expect(getSlowAcPenalty(undefined, 'test-campaign')).toBe(0);
        expect(getRuntimeValue).not.toHaveBeenCalled();
    });
});
