import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storeConditionEvent } from './conditionEventStore.js';

// ── Mocks BEFORE imports ───────────────────────────────────────

vi.mock('../../../hooks/runtime/useRuntimeState.js', () => ({
    setRuntimeValue: vi.fn().mockResolvedValue(undefined),
}));

// ── Imports ────────────────────────────────────────────────────

import { setRuntimeValue } from '../../../hooks/runtime/useRuntimeState.js';

// ── Helpers ────────────────────────────────────────────────────

const campaignName = 'test-campaign';

function resetMocks() {
    vi.clearAllMocks();
}

// ── Tests ──────────────────────────────────────────────────────

beforeEach(() => {
    resetMocks();
});

describe('storeConditionEvent', () => {
    it('calls setRuntimeValue with the correct campaign-level structure', async () => {
        const targetName = 'Orc';
        const conditionKey = 'blinded';

        await storeConditionEvent(campaignName, targetName, conditionKey);

        expect(setRuntimeValue).toHaveBeenCalledTimes(1);
        expect(setRuntimeValue).toHaveBeenCalledWith(
            'campaign',
            'lastAttack',
            {
                attackerName: null,
                targetName,
                rollType: 'condition',
                conditionKey,
                timestamp: expect.any(Number),
            },
            campaignName
        );
    });

    it('uses the provided targetName in the payload', async () => {
        await storeConditionEvent(campaignName, 'Dragon', 'poisoned');

        expect(setRuntimeValue).toHaveBeenCalledWith(
            'campaign',
            'lastAttack',
            expect.objectContaining({
                targetName: 'Dragon',
            }),
            campaignName
        );
    });

    it('uses the provided conditionKey in the payload', async () => {
        await storeConditionEvent(campaignName, 'Goblin', 'paralyzed');

        expect(setRuntimeValue).toHaveBeenCalledWith(
            'campaign',
            'lastAttack',
            expect.objectContaining({
                conditionKey: 'paralyzed',
            }),
            campaignName
        );
    });

    it('always sets rollType to "condition"', async () => {
        await storeConditionEvent(campaignName, 'Target', 'restrained');

        expect(setRuntimeValue).toHaveBeenCalledWith(
            'campaign',
            'lastAttack',
            expect.objectContaining({
                rollType: 'condition',
            }),
            campaignName
        );
    });

    it('always sets attackerName to null', async () => {
        await storeConditionEvent(campaignName, 'Target', 'frightened');

        expect(setRuntimeValue).toHaveBeenCalledWith(
            'campaign',
            'lastAttack',
            expect.objectContaining({
                attackerName: null,
            }),
            campaignName
        );
    });

    it('sets timestamp to the current time in milliseconds', async () => {
        const before = Date.now();
        await storeConditionEvent(campaignName, 'Target', 'grappled');
        const after = Date.now();

        const callArgs = setRuntimeValue.mock.calls[0];
        const timestamp = callArgs[2].timestamp;

        expect(typeof timestamp).toBe('number');
        expect(timestamp).toBeGreaterThanOrEqual(before);
        expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('passes "campaign" as characterKey', async () => {
        await storeConditionEvent(campaignName, 'Target', 'stunned');

        expect(setRuntimeValue).toHaveBeenCalledWith(
            'campaign',
            'lastAttack',
            expect.any(Object),
            campaignName
        );
    });

    it('passes campaignName as the last argument', async () => {
        await storeConditionEvent(campaignName, 'Target', 'incapacitated');

        expect(setRuntimeValue).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(String),
            expect.any(Object),
            campaignName
        );
    });
});
