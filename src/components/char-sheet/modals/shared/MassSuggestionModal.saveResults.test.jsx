import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import MassSuggestionModal from './MassSuggestionModal.jsx';

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

// Need to import after mocking
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { sendSavePrompt } from '../../../../services/combat/conditions/savePromptService.js';
import { addEntry } from '../../../../services/ui/logService.js';
import { getCombatSummary } from '../../../../services/encounters/combatData.js';
import { addTargetResult } from '../../../../services/automation/common/damageRollback.js';
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
    name: 'Mass Suggestion',
    automation: { type: 'mass_suggestion' },
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
});

afterEach(() => {
    vi.clearAllMocks();
});

describe('MassSuggestionModal - Save Results', () => {
    describe('player save result handling', () => {
        it('applies charmed when player fails save via save-result event', async () => {
            getRuntimeValue.mockReturnValue([]);
            const onClose = vi.fn();
            render(<MassSuggestionModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ }));
            });

            // Get the promptId from sendSavePrompt call
            const savePromptCall = sendSavePrompt.mock.calls[0];
            const actualPromptId = savePromptCall[1].promptId;

            // Dispatch save-result event with failure
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
                    [{ type: 'charmed', condition: 'charmed' }],
                    campaignName,
                );
            });
        });

        it('logs save_result success when player passes save', async () => {
            const onClose = vi.fn();
            render(<MassSuggestionModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ }));
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
            render(<MassSuggestionModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ }));
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

    describe('save result event edge cases', () => {
        it('ignores save-result event with missing promptId', async () => {
            const onClose = vi.fn();
            render(<MassSuggestionModal {...makeProps({ onClose })} />);

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
            render(<MassSuggestionModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ }));
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
            render(<MassSuggestionModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ }));
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

    describe('NPC save success path', () => {
        it('does not apply charmed when NPC succeeds on save', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.99);
            try {
                render(<MassSuggestionModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ }));
                });

                await waitFor(() => {
                    expect(addExpiration).not.toHaveBeenCalled();
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('logs save_result success for NPC', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.99);
            try {
                render(<MassSuggestionModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ }));
                });

                await waitFor(() => {
                    const saveEntries = addEntry.mock.calls.filter(
                        call => call[1]?.type === 'save_result' && call[1]?.success === true
                    );
                    expect(saveEntries.length).toBeGreaterThan(0);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('records addTargetResult with success for NPC save', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.99);
            try {
                render(<MassSuggestionModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ }));
                });

                await waitFor(() => {
                    const targetResultCalls = addTargetResult.mock.calls.filter(
                        call => call[0] === campaignName && call[1]?.targetName === 'Goblin'
                    );
                    expect(targetResultCalls.length).toBeGreaterThan(0);
                    expect(targetResultCalls[0][1].saveResult).toBe('success');
                    expect(targetResultCalls[0][1].conditions).toEqual([]);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });
    });

    describe('multiple NPC targets', () => {
        it('resolves saves for multiple NPC targets', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<MassSuggestionModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await act(async () => { fireEvent.click(labels[1]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Mass Suggestion \(2\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Mass Suggestion \(2\)/ }));
                });

                await waitFor(() => {
                    const conditionCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'activeConditions'
                    );
                    expect(conditionCalls.length).toBeGreaterThan(0);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('resolves saves for mixed NPC and player targets', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<MassSuggestionModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await act(async () => { fireEvent.click(labels[2]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Mass Suggestion \(2\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Mass Suggestion \(2\)/ }));
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
    });

    describe('targetResult recording', () => {
        it('records addTargetResult for failed NPC save', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<MassSuggestionModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ }));
                });

                await waitFor(() => {
                    const targetResultCalls = addTargetResult.mock.calls.filter(
                        call => call[0] === campaignName && call[1]?.targetName === 'Goblin'
                    );
                    expect(targetResultCalls.length).toBeGreaterThan(0);
                    expect(targetResultCalls[0][1].saveResult).toBe('failure');
                    expect(targetResultCalls[0][1].conditions).toContain('charmed');
                });
            } finally {
                vi.restoreAllMocks();
            }
        });
    });

    describe('save result logging detail', () => {
        it('logs save_result with roll details when player fails', async () => {
            const onClose = vi.fn();
            render(<MassSuggestionModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ }));
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
            render(<MassSuggestionModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ }));
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
                expect(saveEntries[0][1].description).toContain('PlayerAlly');
                expect(saveEntries[0][1].description).toContain('succeeded');
            });
        });
    });

    describe('condition entry logging', () => {
        it('logs condition entry with reason "Mass Suggestion spell" on failed NPC save', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<MassSuggestionModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ }));
                });

                await waitFor(() => {
                    const conditionEntries = addEntry.mock.calls.filter(
                        call => call[1]?.type === 'condition' && call[1]?.action === 'applied' && call[1]?.reason === 'Mass Suggestion spell'
                    );
                    expect(conditionEntries.length).toBeGreaterThan(0);
                    expect(conditionEntries[0][1]).toEqual(expect.objectContaining({
                        type: 'condition',
                        action: 'applied',
                        characterName: 'Goblin',
                        condition: 'Charmed',
                        reason: 'Mass Suggestion spell',
                    }));
                    expect(conditionEntries[0][1].note).toContain('deal damage');
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('logs condition entry with reason "Mass Suggestion spell" on failed player save', async () => {
            const onClose = vi.fn();
            render(<MassSuggestionModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            fireEvent.click(labels[2]);
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ }));
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
                const conditionEntries = addEntry.mock.calls.filter(
                    call => call[1]?.type === 'condition' && call[1]?.action === 'applied' && call[1]?.reason === 'Mass Suggestion spell'
                );
                expect(conditionEntries.length).toBeGreaterThan(0);
                expect(conditionEntries[0][1].characterName).toBe('PlayerAlly');
                expect(conditionEntries[0][1].condition).toBe('Charmed');
            });
        });
    });

    describe('save bonus handling', () => {
        it('uses the target save bonus for NPC saves', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.99);
            try {
                render(<MassSuggestionModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[1]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Mass Suggestion \(1\)/ }));
                });

                await waitFor(() => {
                    const saveEntries = addEntry.mock.calls.filter(
                        call => call[1]?.type === 'save_result' && call[1]?.targetName === 'Orc'
                    );
                    expect(saveEntries.length).toBeGreaterThan(0);
                    expect(saveEntries[0][1].saveBonus).toBe(2);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });
    });
});
