import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handle } from './mageHandControlHandler.js';

vi.mock('../../../ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

const { addEntry } = await import('../../../ui/logService.js');

beforeEach(() => {
    vi.clearAllMocks();
});

function makePlayerStats(overrides = {}) {
    return {
        name: 'TestWizard',
        ...overrides,
    };
}

function makeAction(overrides = {}) {
    return {
        name: 'Mage Hand Control',
        automation: {
            type: 'mage_hand_control',
            range: '30',
            ...overrides.automation,
        },
        ...overrides,
    };
}

describe('mageHandControlHandler', () => {
    it('returns a popup with automation_info payload and logs the ability use', async () => {
        const result = await handle(
            makeAction(),
            makePlayerStats(),
            'test-campaign',
            null
        );

        expect(result).toEqual({
            type: 'popup',
            payload: expect.objectContaining({
                type: 'automation_info',
                name: 'Mage Hand Control',
                automationType: 'mage_hand_control',
            }),
        });
        expect(addEntry).toHaveBeenCalledTimes(1);
        expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
            type: 'ability_use',
            characterName: 'TestWizard',
            abilityName: 'Mage Hand Control',
        }));
    });

    it('gracefully handles log failure without throwing', async () => {
        vi.mocked(addEntry).mockRejectedValueOnce(new Error('network error'));

        const result = await handle(
            makeAction(),
            makePlayerStats(),
            'test-campaign',
            null
        );

        expect(result.type).toBe('popup');
        expect(result.payload.type).toBe('automation_info');
    });

    it('uses default range of 30 when automation.range is missing', async () => {
        const result = await handle(
            makeAction({ automation: { type: 'mage_hand_control' } }),
            makePlayerStats(),
            'test-campaign',
            null
        );

        expect(result.payload.description).toContain('30');
        expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
            description: expect.stringContaining('up to 30 feet'),
        }));
    });

    it('uses custom range when automation.range is provided', async () => {
        const result = await handle(
            makeAction({ automation: { type: 'mage_hand_control', range: '60' } }),
            makePlayerStats(),
            'test-campaign',
            null
        );

        expect(result.payload.description).toContain('60');
        expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
            description: expect.stringContaining('up to 60 feet'),
        }));
    });

    it('handles missing automation object by using empty default', async () => {
        const result = await handle(
            { name: 'Mage Hand Control' },
            makePlayerStats(),
            'test-campaign',
            null
        );

        expect(result.type).toBe('popup');
        expect(result.payload.type).toBe('automation_info');
        expect(result.payload.automationType).toBeUndefined();
        expect(result.payload.description).toContain('30');
    });

    it('logs with correct description format', async () => {
        await handle(
            makeAction({ automation: { type: 'mage_hand_control', range: '45' } }),
            makePlayerStats(),
            'test-campaign',
            null
        );

        expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
            description: 'TestWizard used Mage Hand Control to move the spectral hand up to 45 feet.',
        }));
    });

    it('includes automation object in popup payload', async () => {
        const automation = { type: 'mage_hand_control', range: '30', customField: 'value' };
        const result = await handle(
            makeAction({ automation }),
            makePlayerStats(),
            'test-campaign',
            null
        );

        expect(result.payload.automation).toEqual(automation);
    });
});
