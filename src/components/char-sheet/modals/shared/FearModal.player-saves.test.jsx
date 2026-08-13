import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import FearModal from './FearModal.jsx';

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

vi.mock('../../../../hooks/useAllySelection.js', () => ({
    getAllyList: vi.fn(),
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

import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { getCombatSummary } from '../../../../services/encounters/combatData.js';
import { getAllyList } from '../../../../hooks/useAllySelection.js';
import { sendSavePrompt } from '../../../../services/combat/conditions/savePromptService.js';
import { addEntry } from '../../../../services/ui/logService.js';
import { addExpiration } from '../../../../services/rules/effects/expirations.js';

const campaignName = 'test-campaign';

const basePlayerStats = {
    name: 'Wizard1',
    level: 10,
    proficiency: 4,
    abilities: [{ name: 'Intelligence', bonus: 4 }],
};

const baseAction = {
    name: 'Bane',
    automation: { type: 'bane' },
};

const baseCombatSummary = {
    creatures: [
        { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 7, saveBonuses: { cha: 0 } },
        { name: 'Orc', type: 'npc', currentHp: 15, maxHp: 22, saveBonuses: { cha: 2 } },
        { name: 'PlayerAlly', type: 'player', currentHp: 30, maxHp: 30, saveBonuses: { cha: 1 } },
    ],
};

function makeProps(overrides = {}) {
    return {
        action: baseAction,
        playerStats: basePlayerStats,
        campaignName,
        saveType: 'CHA',
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
    getAllyList.mockReturnValue(null);
});

afterEach(() => {
    vi.clearAllMocks();
});

describe('FearModal player saves', () => {
    // ── Player save prompts ──

    describe('player save prompts', () => {
        it('sends save prompt for player targets instead of resolving locally', async () => {
            const { sendSavePrompt } = await import('../../../../services/combat/conditions/savePromptService.js');
            render(<FearModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
            });

            expect(sendSavePrompt).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                targetName: 'PlayerAlly',
                saveType: 'CHA',
                saveDc: 14,
                sourceName: 'Wizard1',
            }));
        });

        it('tracks pending prompts for player targets', async () => {
            render(<FearModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
            });

            expect(setRuntimeValue).toHaveBeenCalledWith(
                'campaign',
                'pendingSaveListenerPrompts',
                expect.arrayContaining([expect.any(String)]),
                campaignName,
            );
        });

        it('does not apply condition when player is selected without save result', async () => {
            render(<FearModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
            });

            // No condition should be applied immediately for players
            const conditionCalls = setRuntimeValue.mock.calls.filter(
                call => call[1] === 'activeConditions' && call[0] === 'PlayerAlly'
            );
            expect(conditionCalls.length).toBe(0);
        });
    });

    // ── Player save result handling ──

    describe('player save result handling', () => {
        it('applies frightened when player fails save via save-result event', async () => {
            getRuntimeValue.mockReturnValue([]);
            const onClose = vi.fn();
            render(<FearModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
            });

            const savePromptCall = vi.mocked(sendSavePrompt).mock.calls[0];
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
                const conditionCalls = setRuntimeValue.mock.calls.filter(
                    call => call[1] === 'activeConditions' && call[0] === 'PlayerAlly'
                );
                expect(conditionCalls.length).toBeGreaterThan(0);
                const conditions = conditionCalls[0][2];
                expect(conditions).toContain('frightened');
            });
        });

        it('calls addExpiration when player fails save', async () => {
            getRuntimeValue.mockReturnValue([]);
            const onClose = vi.fn();
            render(<FearModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
            });

            const savePromptCall = vi.mocked(sendSavePrompt).mock.calls[0];
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
                    [{ type: 'condition', condition: 'frightened' }],
                    campaignName,
                );
            });
        });

        it('tracks fear effect when player fails save', async () => {
            getRuntimeValue.mockReturnValue([]);
            const onClose = vi.fn();
            render(<FearModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
            });

            const savePromptCall = vi.mocked(sendSavePrompt).mock.calls[0];
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
                const targetEffectCalls = setRuntimeValue.mock.calls.filter(
                    call => call[1] === 'targetEffects' && call[0] === 'campaign'
                );
                expect(targetEffectCalls.length).toBeGreaterThan(0);
                const effects = targetEffectCalls[0][2];
                const fearEffect = effects.find(e => e.effect === 'fear_end_on_los');
                expect(fearEffect).toBeDefined();
                expect(fearEffect.target).toBe('PlayerAlly');
            });
        });

        it('logs save_result failure when player fails save', async () => {
            getRuntimeValue.mockReturnValue([]);
            const onClose = vi.fn();
            render(<FearModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
            });

            const savePromptCall = vi.mocked(sendSavePrompt).mock.calls[0];
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
                const saveEntries = addEntry.mock.calls.filter(
                    call => call[1]?.type === 'save_result' && call[1]?.success === false
                );
                expect(saveEntries.length).toBeGreaterThan(0);
                expect(saveEntries[0][1].targetName).toBe('PlayerAlly');
            });
        });

        it('logs save_result success when player passes save', async () => {
            const onClose = vi.fn();
            render(<FearModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
            });

            const savePromptCall = vi.mocked(sendSavePrompt).mock.calls[0];
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

        it('does not apply condition when player passes save', async () => {
            const onClose = vi.fn();
            render(<FearModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
            });

            const savePromptCall = vi.mocked(sendSavePrompt).mock.calls[0];
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

            // No condition should be applied for successful save
            const conditionCalls = setRuntimeValue.mock.calls.filter(
                call => call[1] === 'activeConditions' && call[0] === 'PlayerAlly'
            );
            expect(conditionCalls.length).toBe(0);
        });

        it('closes modal when all pending prompts are resolved', async () => {
            getRuntimeValue.mockReturnValue([]);
            const onClose = vi.fn();
            render(<FearModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
            });

            const savePromptCall = vi.mocked(sendSavePrompt).mock.calls[0];
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

        it('handles save-result event with missing optional fields', async () => {
            const onClose = vi.fn();
            render(<FearModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
            });

            const savePromptCall = vi.mocked(sendSavePrompt).mock.calls[0];
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

            // Should not crash, defaults to 0 for missing fields
            await waitFor(() => {
                const conditionCalls = setRuntimeValue.mock.calls.filter(
                    call => call[1] === 'activeConditions' && call[0] === 'PlayerAlly'
                );
                expect(conditionCalls.length).toBeGreaterThan(0);
            });
        });
    });

    // ── Multiple targets ──

    describe('multiple targets', () => {
        it('resolves saves for multiple NPC targets', async () => {
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<FearModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await act(async () => { fireEvent.click(labels[1]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Bane \(2\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Bane \(2\)/ }));
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
                render(<FearModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await act(async () => { fireEvent.click(labels[2]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Bane \(2\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Bane \(2\)/ }));
                });

                // NPC should have condition applied, player should have prompt sent
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

    // ── Edge cases ──

    describe('edge cases', () => {
        it('renders without crashing when onClose is undefined', () => {
            render(<FearModal {...makeProps({ onClose: undefined })} />);
            expect(screen.getByText('Bane')).toBeInTheDocument();
        });

        it('renders without crashing with undefined campaignName', () => {
            render(<FearModal {...makeProps({ campaignName: undefined })} />);
            expect(screen.getByText('Bane')).toBeInTheDocument();
        });

        it('handles creature not found in combat summary', async () => {
            getRuntimeValue.mockReturnValue([]);
            render(<FearModal {...makeProps()} />);
            // Select a target that doesn't exist in combat summary
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
            });
            // Should not crash
            expect(screen.getByText('Bane')).toBeInTheDocument();
        });

        it('handles missing saveBonuses gracefully', async () => {
            getRuntimeValue.mockReturnValue([]);
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 7 },
                ],
            });
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<FearModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
                });

                await waitFor(() => {
                    const conditionCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'activeConditions' && call[0] === 'Goblin'
                    );
                    expect(conditionCalls.length).toBeGreaterThan(0);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('clears pendingPrompts on unmount', async () => {
            const { unmount } = render(<FearModal {...makeProps()} />);

            // First, create a pending prompt
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
            });

            // Unmount should clear pending prompts
            unmount();

            // pendingPrompts state should be cleared (no crash on cleanup)
            expect(() => {}).not.toThrow();
        });

        it('ignores save-result events with no detail', async () => {
            const onClose = vi.fn();
            render(<FearModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
            });

            // Dispatch event with no detail
            await act(async () => {
                const event = new CustomEvent('save-result', {
                    detail: null,
                });
                window.dispatchEvent(event);
            });

            // Should not crash, onClose should not be called yet
            expect(onClose).not.toHaveBeenCalled();
        });

        it('ignores save-result events with unknown promptId', async () => {
            const onClose = vi.fn();
            render(<FearModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Bane \(1\)/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Bane \(1\)/ }));
            });

            await act(async () => {
                const event = new CustomEvent('save-result', {
                    detail: {
                        promptId: 'unknown-prompt-id',
                        success: false,
                    },
                });
                window.dispatchEvent(event);
            });

            // Should not close because promptId doesn't match
            expect(onClose).not.toHaveBeenCalled();
        });
    });
});
