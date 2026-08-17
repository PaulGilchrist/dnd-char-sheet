// @improved-by-ai
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
    describe('popup payload', () => {
        it('returns popup with automation_info payload and logs the ability use', async () => {
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
                    description: 'Mage Hand Control: Move the spectral hand up to <strong>30</strong> feet.',
                    automation: { type: 'mage_hand_control', range: '30' },
                }),
            });
            expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                type: 'ability_use',
                characterName: 'TestWizard',
                abilityName: 'Mage Hand Control',
            }));
        });

        it('uses custom range in popup description when automation.range is provided', async () => {
            const result = await handle(
                makeAction({ automation: { type: 'mage_hand_control', range: '60' } }),
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(result.payload.description).toBe('Mage Hand Control: Move the spectral hand up to <strong>60</strong> feet.');
        });

        it('uses default range of 30 when automation.range is missing', async () => {
            const result = await handle(
                makeAction({ automation: { type: 'mage_hand_control' } }),
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(result.payload.description).toBe('Mage Hand Control: Move the spectral hand up to <strong>30</strong> feet.');
        });

        it('uses default range when automation.range is an empty string', async () => {
            const result = await handle(
                makeAction({ automation: { type: 'mage_hand_control', range: '' } }),
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(result.payload.description).toBe('Mage Hand Control: Move the spectral hand up to <strong>30</strong> feet.');
        });

        it('includes name from action in popup payload', async () => {
            const result = await handle(
                makeAction({ name: 'Custom Name' }),
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(result.payload.name).toBe('Custom Name');
        });

        it('passes automation object through to popup payload', async () => {
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

    describe('logging', () => {
        it('logs ability_use with correct description format', async () => {
            await handle(
                makeAction({ automation: { type: 'mage_hand_control', range: '45' } }),
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                type: 'ability_use',
                description: 'TestWizard used Mage Hand Control to move the spectral hand up to 45 feet.',
            }));
        });

        it('uses default range in log description when automation.range is missing', async () => {
            await handle(
                makeAction({ automation: { type: 'mage_hand_control' } }),
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                description: 'TestWizard used Mage Hand Control to move the spectral hand up to 30 feet.',
            }));
        });

        it('logs with custom action name', async () => {
            await handle(
                makeAction({ name: 'My Hand' }),
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                abilityName: 'My Hand',
                description: expect.stringContaining('My Hand'),
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
    });

    describe('missing automation', () => {
        it('returns popup with empty automationType and default range when action has no automation', async () => {
            const result = await handle(
                { name: 'Mage Hand Control' },
                makePlayerStats(),
                'test-campaign',
                null
            );

            expect(result.type).toBe('popup');
            expect(result.payload.type).toBe('automation_info');
            expect(result.payload.name).toBe('Mage Hand Control');
            expect(result.payload.automationType).toBeUndefined();
            expect(result.payload.description).toBe('Mage Hand Control: Move the spectral hand up to <strong>30</strong> feet.');
            expect(result.payload.automation).toEqual({});
        });
    });
});
