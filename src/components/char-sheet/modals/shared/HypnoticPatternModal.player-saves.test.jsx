import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import HypnoticPatternModal from './HypnoticPatternModal.jsx';

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
    getRuntimeValue: vi.fn(),
    setRuntimeValue: vi.fn(),
}));

vi.mock('../../../../services/combat/conditions/savePromptService.js', () => ({
    sendSavePrompt: vi.fn(),
}));

vi.mock('../../../../services/ui/logService.js', () => ({
    addEntry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../../services/encounters/combatData.js', () => ({
    getCombatSummary: vi.fn(),
}));

vi.mock('../../../../services/automation/common/damageRollback.js', () => ({
    storeSpellLastAttack: vi.fn(),
    addTargetResult: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../../services/rules/effects/expirations.js', () => ({
    addExpiration: vi.fn(),
}));

vi.mock('./AreaEffectTargetModalBase.utils.jsx', () => ({
    persistAndNotify: vi.fn(),
}));

vi.mock('../../../../hooks/useAllySelection.js', () => ({
    getAllyList: vi.fn(),
}));

import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { sendSavePrompt } from '../../../../services/combat/conditions/savePromptService.js';
import { getCombatSummary } from '../../../../services/encounters/combatData.js';
import { getAllyList } from '../../../../hooks/useAllySelection.js';
import { addEntry } from '../../../../services/ui/logService.js';
import { addExpiration } from '../../../../services/rules/effects/expirations.js';
import { persistAndNotify } from './AreaEffectTargetModalBase.utils.jsx';

const campaignName = 'test-campaign';

const basePlayerStats = {
    name: 'Wizard1',
    level: 10,
    proficiency: 4,
    abilities: [{ name: 'Intelligence', bonus: 4 }],
};

const baseAction = {
    name: 'Hypnotic Pattern',
    automation: { type: 'hypnotic_pattern' },
};

const baseCombatSummary = {
    creatures: [
        { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 7, saveBonuses: { wis: 0 } },
        { name: 'Orc', type: 'npc', currentHp: 15, maxHp: 22, saveBonuses: { wis: 2 } },
        { name: 'PlayerAlly', type: 'player', currentHp: 30, maxHp: 30, saveBonuses: { wis: 1 } },
    ],
};

function makeProps(overrides = {}) {
    return {
        action: baseAction,
        playerStats: basePlayerStats,
        campaignName,
        saveType: 'WIS',
        saveDc: 14,
        onClose: vi.fn(),
        ...overrides,
    };
}

beforeEach(() => {
    vi.resetAllMocks();
    getCombatSummary.mockReturnValue(baseCombatSummary);
    getRuntimeValue.mockReturnValue([]);
    setRuntimeValue.mockReturnValue(undefined);
    addEntry.mockResolvedValue(undefined);
    persistAndNotify.mockReturnValue(undefined);
    getAllyList.mockReturnValue(null);
});

afterEach(() => {
    vi.clearAllMocks();
});

describe('HypnoticPatternModal - Player Saves', () => {
    describe('player save prompts', () => {
        it('sends save prompt for player targets instead of resolving locally', async () => {
            render(<HypnoticPatternModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
            });

            expect(sendSavePrompt).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                targetName: 'PlayerAlly',
                saveType: 'WIS',
                saveDc: 14,
                sourceName: 'Wizard1',
            }));
        });

        it('tracks pending prompts for player targets', async () => {
            render(<HypnoticPatternModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
            });

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'pendingSaveListenerPrompts',
                expect.arrayContaining([expect.any(String)]),
                campaignName,
            );
        });
    });

    describe('player save result handling', () => {
        it('applies charmed, incapacitated, and speed_zero when player fails save via save-result event', async () => {
            getRuntimeValue.mockReturnValue([]);
            const onClose = vi.fn();
            render(<HypnoticPatternModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
            });

            const savePromptCall = sendSavePrompt.mock.calls[0];
            const actualPromptId = savePromptCall[1].promptId;

            await act(async () => {
                const event = new CustomEvent('save-result', {
                    detail: {
                        promptId: actualPromptId,
                        success: false,
                        roll: 5,
                        total: 6,
                        saveBonus: 1,
                    },
                });
                window.dispatchEvent(event);
            });

            await waitFor(() => {
                expect(addExpiration).toHaveBeenCalledWith(
                    'Wizard1',
                    'PlayerAlly',
                    [
                        { type: 'charmed', condition: 'charmed' },
                        { type: 'incapacitated', condition: 'incapacitated' },
                        { type: 'speed_zero', condition: 'speed_zero' },
                    ],
                    campaignName,
                );
            });
        });

        it('logs save_result success when player passes save', async () => {
            const onClose = vi.fn();
            render(<HypnoticPatternModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
            });

            const savePromptCall = sendSavePrompt.mock.calls[0];
            const actualPromptId = savePromptCall[1].promptId;

            await act(async () => {
                const event = new CustomEvent('save-result', {
                    detail: {
                        promptId: actualPromptId,
                        success: true,
                        roll: 18,
                        total: 19,
                        saveBonus: 1,
                    },
                });
                window.dispatchEvent(event);
            });

            await waitFor(() => {
                const saveEntries = addEntry.mock.calls.filter(
                    call => call[1]?.type === 'save_result' && call[1]?.success === true
                );
                expect(saveEntries.length).toBeGreaterThan(0);
            });
        });

        it('closes modal when all pending prompts are resolved', async () => {
            const onClose = vi.fn();
            render(<HypnoticPatternModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
            });

            const savePromptCall = sendSavePrompt.mock.calls[0];
            const actualPromptId = savePromptCall[1].promptId;

            await act(async () => {
                const event = new CustomEvent('save-result', {
                    detail: {
                        promptId: actualPromptId,
                        success: false,
                        roll: 5,
                        total: 6,
                        saveBonus: 1,
                    },
                });
                window.dispatchEvent(event);
            });

            await waitFor(() => {
                expect(onClose).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('player save result logging detail', () => {
        it('logs save_result with roll details when player fails', async () => {
            const onClose = vi.fn();
            render(<HypnoticPatternModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
            });

            const savePromptCall = sendSavePrompt.mock.calls[0];
            const actualPromptId = savePromptCall[1].promptId;

            await act(async () => {
                const event = new CustomEvent('save-result', {
                    detail: {
                        promptId: actualPromptId,
                        success: false,
                        roll: 7,
                        total: 8,
                        saveBonus: 1,
                    },
                });
                window.dispatchEvent(event);
            });

            await waitFor(() => {
                const saveEntries = addEntry.mock.calls.filter(
                    call => call[1]?.type === 'save_result' && call[1]?.success === false
                );
                expect(saveEntries.length).toBeGreaterThan(0);
                expect(saveEntries[0][1].roll).toBe(7);
                expect(saveEntries[0][1].total).toBe(8);
                expect(saveEntries[0][1].saveBonus).toBe(1);
                expect(saveEntries[0][1].targetName).toBe('PlayerAlly');
            });
        });

        it('logs save_result success description for player passing', async () => {
            const onClose = vi.fn();
            render(<HypnoticPatternModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
            });

            const savePromptCall = sendSavePrompt.mock.calls[0];
            const actualPromptId = savePromptCall[1].promptId;

            await act(async () => {
                const event = new CustomEvent('save-result', {
                    detail: {
                        promptId: actualPromptId,
                        success: true,
                        roll: 15,
                        total: 16,
                        saveBonus: 1,
                    },
                });
                window.dispatchEvent(event);
            });

            await waitFor(() => {
                const saveEntries = addEntry.mock.calls.filter(
                    call => call[1]?.type === 'save_result' && call[1]?.success === true
                );
                expect(saveEntries.length).toBeGreaterThan(0);
                expect(saveEntries[0][1].description).toContain('PlayerAlly succeeded');
                expect(saveEntries[0][1].description).toContain('rolled 15 + 1 = 16');
            });
        });
    });

    describe('persistAndNotify calls', () => {
        it('calls persistAndNotify after player save result event', async () => {
            const onClose = vi.fn();
            render(<HypnoticPatternModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
            });

            const savePromptCall = sendSavePrompt.mock.calls[0];
            const actualPromptId = savePromptCall[1].promptId;

            await act(async () => {
                const event = new CustomEvent('save-result', {
                    detail: {
                        promptId: actualPromptId,
                        success: false,
                        roll: 5,
                        total: 6,
                        saveBonus: 1,
                    },
                });
                window.dispatchEvent(event);
            });

            await waitFor(() => {
                expect(persistAndNotify).toHaveBeenCalled();
            });
        });
    });

    describe('multiple targets', () => {
        it('resolves saves for mixed NPC and player targets', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<HypnoticPatternModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await act(async () => { fireEvent.click(labels[2]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Hypnotic Pattern \(2\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(2\)/ }));
                });

                await waitFor(() => {
                    const npcConditionCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'activeConditions' && call[0] === 'Goblin'
                    );
                    expect(npcConditionCalls.length).toBeGreaterThan(0);
                });

                expect(sendSavePrompt).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                    targetName: 'PlayerAlly',
                }));
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('sends save prompts for multiple player targets', async () => {
            render(<HypnoticPatternModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
            });

            expect(sendSavePrompt).toHaveBeenCalled();
            const promptCall = sendSavePrompt.mock.calls[0];
            expect(promptCall[1].targetName).toBe('PlayerAlly');
        });
    });

    describe('save result event edge cases', () => {
        it('ignores save-result event with missing promptId', async () => {
            const onClose = vi.fn();
            render(<HypnoticPatternModal {...makeProps({ onClose })} />);

            await act(async () => {
                const event = new CustomEvent('save-result', {
                    detail: { success: false },
                });
                window.dispatchEvent(event);
            });

            expect(onClose).not.toHaveBeenCalled();
        });

        it('ignores save-result event for unknown promptId', async () => {
            const onClose = vi.fn();
            render(<HypnoticPatternModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
            });

            await act(async () => {
                const event = new CustomEvent('save-result', {
                    detail: {
                        promptId: 'non-existent-prompt-id',
                        success: false,
                        roll: 5,
                        total: 6,
                        saveBonus: 1,
                    },
                });
                window.dispatchEvent(event);
            });

            expect(onClose).not.toHaveBeenCalled();
        });

        it('handles save-result event with missing optional fields', async () => {
            const onClose = vi.fn();
            render(<HypnoticPatternModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Hypnotic Pattern \(1\)/ }));
            });

            const savePromptCall = sendSavePrompt.mock.calls[0];
            const actualPromptId = savePromptCall[1].promptId;

            await act(async () => {
                const event = new CustomEvent('save-result', {
                    detail: {
                        promptId: actualPromptId,
                        success: false,
                    },
                });
                window.dispatchEvent(event);
            });

            await waitFor(() => {
                const conditionCalls = setRuntimeValue.mock.calls.filter(
                    call => call[1] === 'activeConditions' && call[0] === 'PlayerAlly'
                );
                expect(conditionCalls.length).toBeGreaterThan(0);
            });
        });
    });
});
