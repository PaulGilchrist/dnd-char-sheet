import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../services/ui/logService.js', () => ({
    addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../services/combat/conditions/savePromptService.js', () => ({
    sendSavePrompt: vi.fn(),
}));

vi.mock('../../../services/ui/utils.js', () => ({
    default: {
        guid: vi.fn(() => 'test-guid-1234'),
    },
}));

import { getRuntimeValue, setRuntimeValue } from '../../runtime/useRuntimeState.js';
import { sendSavePrompt } from '../../../services/combat/conditions/savePromptService.js';
import { addEntry } from '../../../services/ui/logService.js';
import { handleSanctuarySave } from './handleSanctuarySave.js';

describe('handleSanctuarySave', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getRuntimeValue.mockReset();
        setRuntimeValue.mockClear();
        sendSavePrompt.mockClear();
        addEntry.mockClear();
        // Remove any leftover save-result listeners
        window.removeEventListener('save-result', () => {});
    });

    describe('early return - no context', () => {
        it('returns { blocked: false } when context is undefined', async () => {
            const result = await handleSanctuarySave('Goblin', 'test-campaign', undefined, null);
            expect(result).toEqual({ blocked: false });
            expect(sendSavePrompt).not.toHaveBeenCalled();
            expect(setRuntimeValue).not.toHaveBeenCalled();
        });

        it('returns { blocked: false } when context is null', async () => {
            const result = await handleSanctuarySave('Goblin', 'test-campaign', null, null);
            expect(result).toEqual({ blocked: false });
        });

        it('returns { blocked: false } when context has no targetName', async () => {
            const result = await handleSanctuarySave('Goblin', 'test-campaign', { saveDc: 12, saveType: 'wis' }, null);
            expect(result).toEqual({ blocked: false });
        });

        it('returns { blocked: false } when context has no saveDc', async () => {
            const result = await handleSanctuarySave('Goblin', 'test-campaign', { targetName: 'Ally', saveType: 'wis' }, null);
            expect(result).toEqual({ blocked: false });
        });

        it('returns { blocked: false } when context has no saveType', async () => {
            const result = await handleSanctuarySave('Goblin', 'test-campaign', { targetName: 'Ally', saveDc: 12 }, null);
            expect(result).toEqual({ blocked: false });
        });
    });

    describe('no sanctuary effect found', () => {
        it('returns { blocked: false } when no sanctuary targetEffect exists', async () => {
            getRuntimeValue.mockReturnValue([]);
            const result = await handleSanctuarySave('Goblin', 'test-campaign', {
                targetName: 'Ally',
                saveDc: 12,
                saveType: 'dex',
            }, null);
            expect(result).toEqual({ blocked: false });
            expect(sendSavePrompt).not.toHaveBeenCalled();
        });

        it('returns { blocked: false } when sanctuary targetEffect has matching source (same character)', async () => {
            getRuntimeValue.mockReturnValue([
                { effect: 'sanctuary', target: 'Ally', source: 'Goblin' },
            ]);
            const result = await handleSanctuarySave('Goblin', 'test-campaign', {
                targetName: 'Ally',
                saveDc: 12,
                saveType: 'dex',
            }, null);
            expect(result).toEqual({ blocked: false });
            expect(sendSavePrompt).not.toHaveBeenCalled();
        });

        it('returns { blocked: false } when sanctuary targetEffect targets a different creature', async () => {
            getRuntimeValue.mockReturnValue([
                { effect: 'sanctuary', target: 'OtherAlly', source: 'Cleric' },
            ]);
            const result = await handleSanctuarySave('Goblin', 'test-campaign', {
                targetName: 'Ally',
                saveDc: 12,
                saveType: 'dex',
            }, null);
            expect(result).toEqual({ blocked: false });
            expect(sendSavePrompt).not.toHaveBeenCalled();
        });

        it('returns { blocked: false } when no targetEffects in runtime store', async () => {
            getRuntimeValue.mockReturnValue(null);
            const result = await handleSanctuarySave('Goblin', 'test-campaign', {
                targetName: 'Ally',
                saveDc: 12,
                saveType: 'dex',
            }, null);
            expect(result).toEqual({ blocked: false });
        });
    });

    describe('sanctuary found - save prompt flow', () => {
        it('creates pending save prompt and sends save prompt when sanctuary effect exists', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === 'targetEffects') return [
                    { effect: 'sanctuary', target: 'Ally', source: 'Cleric', saveDc: 13 },
                ];
                if (key === 'campaign' && prop === 'pendingSavePrompts') return {};
                return null;
            });

            const context = {
                targetName: 'Ally',
                saveDc: 12,
                saveType: 'dex',
            };

            const invokePromise = handleSanctuarySave('Goblin', 'test-campaign', context, null);

            // Wait for the prompt to be set up, then dispatch the save result
            await new Promise((r) => setTimeout(r, 10));

            window.dispatchEvent(new CustomEvent('save-result', {
                detail: {
                    promptId: 'test-guid-1234',
                    success: false,
                },
            }));

            const result = await invokePromise;

            expect(result).toEqual({
                blocked: true,
                description: expect.stringContaining('failed WIS save against Sanctuary'),
            });

            expect(sendSavePrompt).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                promptId: 'test-guid-1234',
                targetName: 'Goblin',
                attackerName: 'Cleric',
                saveType: 'WIS',
                saveDc: 13,
                condition: 'sanctuary',
            }));

            expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                type: 'save_result',
                characterName: 'Cleric',
                targetName: 'Goblin',
                saveDc: 13,
                saveType: 'WIS',
                success: false,
            }));
        });

        it('removes pending save prompt after save result is received', async () => {
            let pendingPrompts = { 'other-prompt': { promptId: 'other-prompt' } };
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === 'targetEffects') return [
                    { effect: 'sanctuary', target: 'Ally', source: 'Cleric', saveDc: 13 },
                ];
                if (key === 'campaign' && prop === 'pendingSavePrompts') return pendingPrompts;
                return null;
            });

            const context = {
                targetName: 'Ally',
                saveDc: 12,
                saveType: 'dex',
            };

            const invokePromise = handleSanctuarySave('Goblin', 'test-campaign', context, null);
            await new Promise((r) => setTimeout(r, 10));

            window.dispatchEvent(new CustomEvent('save-result', {
                detail: {
                    promptId: 'test-guid-1234',
                    success: false,
                },
            }));

            await invokePromise;

            // After the save result, the pending prompt should be deleted
            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'pendingSavePrompts',
                expect.any(Object),
                'test-campaign'
            );
        });

        it('dispatches save-result with matching promptId only', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === 'targetEffects') return [
                    { effect: 'sanctuary', target: 'Ally', source: 'Cleric', saveDc: 13 },
                ];
                if (key === 'campaign' && prop === 'pendingSavePrompts') return {};
                return null;
            });

            const context = {
                targetName: 'Ally',
                saveDc: 12,
                saveType: 'dex',
            };

            const invokePromise = handleSanctuarySave('Goblin', 'test-campaign', context, null);
            await new Promise((r) => setTimeout(r, 10));

            // Dispatch a save-result with a different promptId - should be ignored
            window.dispatchEvent(new CustomEvent('save-result', {
                detail: {
                    promptId: 'different-prompt-id',
                    success: false,
                },
            }));

            // Give it a moment to ensure the handler was called and ignored it
            await new Promise((r) => setTimeout(r, 10));

            // The promise should still be pending (no result yet since wrong promptId was dispatched)
            // Verify that sendSavePrompt was called (meaning the handler set up the event listener)
            expect(sendSavePrompt).toHaveBeenCalled();

            // Now dispatch the correct one
            window.dispatchEvent(new CustomEvent('save-result', {
                detail: {
                    promptId: 'test-guid-1234',
                    success: true,
                },
            }));

            const result = await invokePromise;
            expect(result).toEqual({ blocked: false });
        });
    });

    describe('sanctuary found - save succeeds', () => {
        it('returns { blocked: false } when save succeeds', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === 'targetEffects') return [
                    { effect: 'sanctuary', target: 'Ally', source: 'Cleric', saveDc: 13 },
                ];
                if (key === 'campaign' && prop === 'pendingSavePrompts') return {};
                return null;
            });

            const context = {
                targetName: 'Ally',
                saveDc: 12,
                saveType: 'dex',
            };

            const invokePromise = handleSanctuarySave('Goblin', 'test-campaign', context, null);
            await new Promise((r) => setTimeout(r, 10));

            window.dispatchEvent(new CustomEvent('save-result', {
                detail: {
                    promptId: 'test-guid-1234',
                    success: true,
                },
            }));

            const result = await invokePromise;

            expect(result).toEqual({ blocked: false });

            expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                type: 'save_result',
                characterName: 'Cleric',
                targetName: 'Goblin',
                saveDc: 13,
                saveType: 'WIS',
                success: true,
            }));

            expect(sendSavePrompt).toHaveBeenCalled();
        });
    });

    describe('sanctuary found - save fails', () => {
        it('returns { blocked: true } with description when save fails', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === 'targetEffects') return [
                    { effect: 'sanctuary', target: 'Ally', source: 'Cleric', saveDc: 13 },
                ];
                if (key === 'campaign' && prop === 'pendingSavePrompts') return {};
                return null;
            });

            const context = {
                targetName: 'Ally',
                saveDc: 12,
                saveType: 'dex',
            };

            const invokePromise = handleSanctuarySave('Goblin', 'test-campaign', context, null);
            await new Promise((r) => setTimeout(r, 10));

            window.dispatchEvent(new CustomEvent('save-result', {
                detail: {
                    promptId: 'test-guid-1234',
                    success: false,
                },
            }));

            const result = await invokePromise;

            expect(result.blocked).toBe(true);
            expect(result.description).toContain('failed WIS save against Sanctuary');
            expect(result.description).toContain('Goblin');
            expect(result.description).toContain('Ally');
            expect(result.description).toContain('The spell is lost');

            expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                type: 'save_result',
                success: false,
            }));
        });
    });

    describe('saveDc fallback', () => {
        it('defaults saveDc to 8 when targetEffect has no saveDc', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === 'targetEffects') return [
                    { effect: 'sanctuary', target: 'Ally', source: 'Cleric' },
                ];
                if (key === 'campaign' && prop === 'pendingSavePrompts') return {};
                return null;
            });

            const context = {
                targetName: 'Ally',
                saveDc: 12,
                saveType: 'dex',
            };

            const invokePromise = handleSanctuarySave('Goblin', 'test-campaign', context, null);
            await new Promise((r) => setTimeout(r, 10));

            window.dispatchEvent(new CustomEvent('save-result', {
                detail: {
                    promptId: 'test-guid-1234',
                    success: false,
                },
            }));

            await invokePromise;

            expect(consoleSpy).toHaveBeenCalledWith(
                '[sanctuary] Missing saveDc on targetEffect for target',
                'Ally',
                '— defaulting to 8'
            );

            expect(sendSavePrompt).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
                saveDc: 8,
            }));

            consoleSpy.mockRestore();
        });
    });

    describe('log entry error handling', () => {
        it('handles addEntry rejection for failed save gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            addEntry.mockRejectedValue(new Error('DB error'));

            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === 'targetEffects') return [
                    { effect: 'sanctuary', target: 'Ally', source: 'Cleric', saveDc: 13 },
                ];
                if (key === 'campaign' && prop === 'pendingSavePrompts') return {};
                return null;
            });

            const context = {
                targetName: 'Ally',
                saveDc: 12,
                saveType: 'dex',
            };

            const invokePromise = handleSanctuarySave('Goblin', 'test-campaign', context, null);
            await new Promise((r) => setTimeout(r, 10));

            window.dispatchEvent(new CustomEvent('save-result', {
                detail: {
                    promptId: 'test-guid-1234',
                    success: false,
                },
            }));

            const result = await invokePromise;

            expect(result.blocked).toBe(true);
            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });

        it('handles addEntry rejection for successful save gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            addEntry.mockRejectedValue(new Error('DB error'));

            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === 'targetEffects') return [
                    { effect: 'sanctuary', target: 'Ally', source: 'Cleric', saveDc: 13 },
                ];
                if (key === 'campaign' && prop === 'pendingSavePrompts') return {};
                return null;
            });

            const context = {
                targetName: 'Ally',
                saveDc: 12,
                saveType: 'dex',
            };

            const invokePromise = handleSanctuarySave('Goblin', 'test-campaign', context, null);
            await new Promise((r) => setTimeout(r, 10));

            window.dispatchEvent(new CustomEvent('save-result', {
                detail: {
                    promptId: 'test-guid-1234',
                    success: true,
                },
            }));

            const result = await invokePromise;

            expect(result).toEqual({ blocked: false });
            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });
    });

    describe('campaign name usage', () => {
        it('uses the provided campaignName in all runtime operations', async () => {
            getRuntimeValue.mockImplementation((key, prop) => {
                if (key === 'campaign' && prop === 'targetEffects') return [
                    { effect: 'sanctuary', target: 'Ally', source: 'Cleric', saveDc: 13 },
                ];
                if (key === 'campaign' && prop === 'pendingSavePrompts') return {};
                return null;
            });

            const context = {
                targetName: 'Ally',
                saveDc: 12,
                saveType: 'dex',
            };

            const invokePromise = handleSanctuarySave('Goblin', 'test-campaign', context, null);
            await new Promise((r) => setTimeout(r, 10));

            window.dispatchEvent(new CustomEvent('save-result', {
                detail: {
                    promptId: 'test-guid-1234',
                    success: false,
                },
            }));

            await invokePromise;

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'pendingSavePrompts',
                expect.any(Object),
                'test-campaign'
            );

            expect(addEntry).toHaveBeenCalledWith('test-campaign', expect.any(Object));
        });
    });
});
