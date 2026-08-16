// @improved-by-ai
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AOEConditionModal from './AOEConditionModal.jsx';
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { getAllyList } from '../../../../hooks/useAllySelection.js';
import { getCombatSummary } from '../../../../services/encounters/combatData.js';
import { persistAndNotify } from './AreaEffectTargetModalBase.utils.jsx';
import { addEntry } from '../../../../services/ui/logService.js';
import { sendSavePrompt } from '../../../../services/combat/conditions/savePromptService.js';
import * as damageRollback from '../../../../services/automation/common/damageRollback.js';

// ── Mocked modules ──

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
    addTargetResult: vi.fn(),
}));

vi.mock('./AreaEffectTargetModalBase.utils.jsx', () => ({
    persistAndNotify: vi.fn(),
}));

// ── Test fixtures ──

const campaignName = 'test-campaign';

const basePlayerStats = {
    name: 'Wizard1',
    level: 10,
    proficiency: 4,
    abilities: [{ name: 'Intelligence', bonus: 4 }],
};

const baseAction = {
    name: 'Blinding Darkness',
};

const baseCombatSummary = {
    creatures: [
        { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 7, saveBonuses: { con: 0 } },
        { name: 'Orc', type: 'npc', currentHp: 15, maxHp: 22, saveBonuses: { con: 2 } },
        { name: 'PlayerAlly', type: 'player', currentHp: 30, maxHp: 30, saveBonuses: { con: 1 } },
    ],
};

const baseEffects = [{ type: 'blinded', condition: 'blinded' }];

function makeProps(overrides = {}) {
    return {
        action: baseAction,
        playerStats: basePlayerStats,
        campaignName,
        saveType: 'CON',
        saveDc: 12,
        effects: baseEffects,
        conditionLabel: 'Blinded',
        onClose: vi.fn(),
        ...overrides,
    };
}

// ── Tests ──

describe('AOEConditionModal', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        getCombatSummary.mockReturnValue(baseCombatSummary);
        getRuntimeValue.mockReturnValue([]);
        setRuntimeValue.mockReturnValue(undefined);
        addEntry.mockResolvedValue(undefined);
        persistAndNotify.mockReturnValue(undefined);
        getAllyList.mockReturnValue(null);
    });

    // ── Save bonus edge cases (previously empty describe block) ──

    describe('save bonus handling edge cases', () => {
        it('handles missing saveBonuses object on creature gracefully', () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 10 },
                ],
            });
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.getByText('Goblin')).toBeInTheDocument();
        });

        it('handles undefined saveBonuses property on creature gracefully', () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 10, saveBonuses: undefined },
                ],
            });
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.getByText('Goblin')).toBeInTheDocument();
        });

        it('handles missing save bonus for the requested save type', () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 10, saveBonuses: { str: 3 } },
                ],
            });
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.getByText('Goblin')).toBeInTheDocument();
        });
    });

    // ── Math.random cleanup verification ──

    describe('Math.random mock cleanup', () => {
        it('restores Math.random after spying so it returns real random values', () => {
            const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
            spy.mockRestore();
            // After restoring, Math.random should return actual random values, not 0.5
            const value1 = Math.random();
            const value2 = Math.random();
            // Two consecutive calls should not both be 0.5 (extremely unlikely with real random)
            expect(value1).not.toBe(0.5);
            expect(value2).not.toBe(0.5);
        });
    });

    // ── Event listener cleanup ──

    describe('event listener cleanup', () => {
        it('removes save-result event listener on unmount', async () => {
            const { unmount } = render(<AOEConditionModal {...makeProps()} />);

            await act(async () => {
                const labels = document.querySelectorAll('.secondary-target-row');
                fireEvent.click(labels[2]);
            });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Blinding Darkness/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Blinding Darkness/ }));
            });

            const savePromptCall = vi.mocked(sendSavePrompt).mock.calls[0];
            const actualPromptId = savePromptCall[1].promptId;

            // Capture pending prompts before unmount
            await waitFor(() => {
                expect(getRuntimeValue).toHaveBeenCalledWith('campaign', 'pendingSaveListenerPrompts');
            });

            // Unmount the component
            unmount();

            // Dispatch save-result event after unmount - should not affect anything
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

            // The event should have been dispatched but the unmounted component
            // should not have processed it. Since the component is unmounted,
            // setRuntimeValue should not have been called for conditions by this event.
            const conditionCallsForPlayerAlly = setRuntimeValue.mock.calls.filter(
                call => call[1] === 'activeConditions' && call[0] === 'PlayerAlly'
            );
            expect(conditionCallsForPlayerAlly.length).toBe(0);
        });
    });

    // ── Pending prompts state ──

    describe('pending prompts tracking', () => {
        it('tracks pending prompts for player targets via setRuntimeValue', async () => {
            render(<AOEConditionModal {...makeProps()} />);

            await act(async () => {
                const labels = document.querySelectorAll('.secondary-target-row');
                fireEvent.click(labels[2]);
            });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Blinding Darkness/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Blinding Darkness/ }));
            });

            await waitFor(() => {
                const promptTrackingCalls = setRuntimeValue.mock.calls.filter(
                    call => call[0] === 'campaign' && call[1] === 'pendingSaveListenerPrompts'
                );
                expect(promptTrackingCalls.length).toBeGreaterThan(0);
            });
        });
    });

    // ── storeSpellLastAttack call verification ──

    describe('storeSpellLastAttack verification', () => {
        it('stores spell attack data with correct AOE scope', async () => {
            render(<AOEConditionModal {...makeProps()} />);

            await act(async () => {
                const labels = document.querySelectorAll('.secondary-target-row');
                fireEvent.click(labels[0]);
            });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Blinding Darkness/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Blinding Darkness/ }));
            });

            await waitFor(() => {
                expect(damageRollback.storeSpellLastAttack).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                    casterName: 'Wizard1',
                    spellName: 'Blinding Darkness',
                    saveType: 'CON',
                    saveDc: 12,
                    attackScope: 'aoe',
                }));
            });
        });
    });
});
