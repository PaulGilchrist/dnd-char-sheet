import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AOEConditionModal from './AOEConditionModal.jsx';
import { addEntry } from '../../../../services/ui/logService.js';

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

// Re-import mocked modules
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { getAllyList } from '../../../../hooks/useAllySelection.js';
import { getCombatSummary } from '../../../../services/encounters/combatData.js';
import { persistAndNotify } from './AreaEffectTargetModalBase.utils.jsx';

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

    describe('blocking effects - both attacker and target trapped', () => {
        it('allows both attacker and target when both trapped by same forcecage source', () => {
            getRuntimeValue.mockReturnValue([
                { effect: 'forcecage', target: 'Goblin', source: 'Wizard1' },
                { effect: 'forcecage', target: 'Wizard1', source: 'Wizard1' },
            ]);
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.getByText('Goblin')).toBeInTheDocument();
        });

        it('allows both attacker and target when both trapped by same maze source', () => {
            getRuntimeValue.mockReturnValue([
                { effect: 'maze', target: 'Goblin', source: 'Wizard1' },
                { effect: 'maze', target: 'Wizard1', source: 'Wizard1' },
            ]);
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.getByText('Goblin')).toBeInTheDocument();
        });

        it('allows both attacker and target when both trapped by same banishment source', () => {
            getRuntimeValue.mockReturnValue([
                { effect: 'banishment', target: 'Goblin', source: 'Wizard1' },
                { effect: 'banishment', target: 'Wizard1', source: 'Wizard1' },
            ]);
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.getByText('Goblin')).toBeInTheDocument();
        });

        it('allows both attacker and target when both trapped by same imprisonment source', () => {
            getRuntimeValue.mockReturnValue([
                { effect: 'imprisonment', target: 'Goblin', source: 'Wizard1' },
                { effect: 'imprisonment', target: 'Wizard1', source: 'Wizard1' },
            ]);
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.getByText('Goblin')).toBeInTheDocument();
        });

        it('excludes target when only target is forcecaged and attacker is not', () => {
            getRuntimeValue.mockReturnValue([
                { effect: 'forcecage', target: 'Goblin', source: 'CasterA' },
            ]);
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.queryByText('Goblin')).not.toBeInTheDocument();
        });

        it('excludes target when only target is maze trapped and attacker is not', () => {
            getRuntimeValue.mockReturnValue([
                { effect: 'maze', target: 'Goblin', source: 'CasterA' },
            ]);
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.queryByText('Goblin')).not.toBeInTheDocument();
        });

        it('excludes target when only target is banished and attacker is not', () => {
            getRuntimeValue.mockReturnValue([
                { effect: 'banishment', target: 'Goblin', source: 'CasterA' },
            ]);
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.queryByText('Goblin')).not.toBeInTheDocument();
        });

        it('excludes target when only target is imprisoned and attacker is not', () => {
            getRuntimeValue.mockReturnValue([
                { effect: 'imprisonment', target: 'Goblin', source: 'CasterA' },
            ]);
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.queryByText('Goblin')).not.toBeInTheDocument();
        });

        it('excludes attacker when only attacker is forcecaged and target is not', () => {
            getRuntimeValue.mockReturnValue([
                { effect: 'forcecage', target: 'Wizard1', source: 'CasterA' },
            ]);
            render(<AOEConditionModal {...makeProps()} />);
            // With no eligible targets, the target list should be empty
            expect(screen.queryByText('Goblin')).not.toBeInTheDocument();
        });

        it('excludes attacker when only attacker is maze trapped and target is not', () => {
            getRuntimeValue.mockReturnValue([
                { effect: 'maze', target: 'Wizard1', source: 'CasterA' },
            ]);
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.queryByText('Goblin')).not.toBeInTheDocument();
        });

        it('excludes attacker when only attacker is banished and target is not', () => {
            getRuntimeValue.mockReturnValue([
                { effect: 'banishment', target: 'Wizard1', source: 'CasterA' },
            ]);
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.queryByText('Goblin')).not.toBeInTheDocument();
        });

        it('excludes attacker when only attacker is imprisoned and target is not', () => {
            getRuntimeValue.mockReturnValue([
                { effect: 'imprisonment', target: 'Wizard1', source: 'CasterA' },
            ]);
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.queryByText('Goblin')).not.toBeInTheDocument();
        });

        it('excludes target when attacker and target have different forcecage sources', () => {
            getRuntimeValue.mockReturnValue([
                { effect: 'forcecage', target: 'Goblin', source: 'CasterA' },
                { effect: 'forcecage', target: 'Wizard1', source: 'CasterB' },
            ]);
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.queryByText('Goblin')).not.toBeInTheDocument();
        });

        it('allows target when attacker and target share one forcecage source but target has additional different source', () => {
            getRuntimeValue.mockReturnValue([
                { effect: 'forcecage', target: 'Goblin', source: 'Wizard1' },
                { effect: 'forcecage', target: 'Wizard1', source: 'Wizard1' },
                { effect: 'forcecage', target: 'Goblin', source: 'CasterA' },
            ]);
            render(<AOEConditionModal {...makeProps()} />);
            // Wizard1 is forcecaged by Wizard1, Goblin is forcecaged by both Wizard1 and CasterA
            // Since they share Wizard1 source, Goblin should be visible
            expect(screen.getByText('Goblin')).toBeInTheDocument();
        });
    });

    // ── NPC save result logging in resolveAllSaves ──

    describe('NPC save result logging', () => {
        it('logs save_result entry when NPC fails save', async () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<AOEConditionModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Blinding Darkness/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Blinding Darkness/ }));
                });

                await waitFor(() => {
                    const saveEntries = addEntry.mock.calls.filter(
                        call => call[1]?.type === 'save_result' && call[1]?.targetName === 'Goblin'
                    );
                    expect(saveEntries.length).toBeGreaterThan(0);
                    expect(saveEntries[0][1].success).toBe(false);
                    expect(saveEntries[0][1].description).toContain('failed');
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('logs save_result entry when NPC succeeds save', async () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.99);
            try {
                render(<AOEConditionModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Blinding Darkness/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Blinding Darkness/ }));
                });

                await waitFor(() => {
                    const saveEntries = addEntry.mock.calls.filter(
                        call => call[1]?.type === 'save_result' && call[1]?.targetName === 'Goblin'
                    );
                    expect(saveEntries.length).toBeGreaterThan(0);
                    expect(saveEntries[0][1].success).toBe(true);
                    expect(saveEntries[0][1].description).toContain('succeeded');
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('logs condition entry when NPC fails save with conditionLabel', async () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<AOEConditionModal {...makeProps({ conditionLabel: 'Paralyzed' })} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Blinding Darkness/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Blinding Darkness/ }));
                });

                await waitFor(() => {
                    const conditionEntries = addEntry.mock.calls.filter(
                        call => call[1]?.type === 'condition' && call[1]?.condition === 'Paralyzed'
                    );
                    expect(conditionEntries.length).toBeGreaterThan(0);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('logs condition entry when NPC fails save without conditionLabel (uses effects array)', async () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<AOEConditionModal {...makeProps({ conditionLabel: null, effects: [{ type: 'paralyzed', condition: 'paralyzed' }] })} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Blinding Darkness/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Blinding Darkness/ }));
                });

                await waitFor(() => {
                    const conditionEntries = addEntry.mock.calls.filter(
                        call => call[1]?.type === 'condition'
                    );
                    expect(conditionEntries.length).toBeGreaterThan(0);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });
    });

    // ── NPC careful spell auto-success in resolveAllSaves ──

    describe('NPC careful spell auto-success in resolveAllSaves', () => {
        it('does not apply condition for careful spell protected NPC', async () => {
            getAllyList.mockReturnValue(['Goblin']);
            getRuntimeValue.mockReturnValue([]);
            render(<AOEConditionModal {...makeProps({ metamagicCareful: true })} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Blinding Darkness/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Blinding Darkness/ }));
            });

            // The NPC should not have conditions applied
            await waitFor(() => {
                const conditionCalls = setRuntimeValue.mock.calls.filter(
                    call => call[1] === 'activeConditions' && call[0] === 'Goblin'
                );
                expect(conditionCalls.length).toBe(0);
            });

            // Should have a save_result entry with Careful Spell description
            const saveEntries = addEntry.mock.calls.filter(
                call => call[1]?.type === 'save_result' && call[1]?.targetName === 'Goblin'
            );
            expect(saveEntries.length).toBeGreaterThan(0);
            expect(saveEntries[0][1].description).toContain('Careful Spell protected');
        });

        it('applies condition when NPC is not careful spell protected and fails save', async () => {
            getAllyList.mockReturnValue(['PlayerAlly']);
            getRuntimeValue.mockReturnValue([]);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<AOEConditionModal {...makeProps({ metamagicCareful: true })} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Blinding Darkness/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Blinding Darkness/ }));
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
    });

    // ── handleSaveResult early returns ──

    describe('handleSaveResult early returns', () => {
        it('does not process save-result event with null detail', async () => {
            render(<AOEConditionModal {...makeProps()} />);

            await act(async () => {
                const event = new CustomEvent('save-result', {
                    detail: null,
                });
                window.dispatchEvent(event);
            });

            const conditionCalls = setRuntimeValue.mock.calls.filter(
                call => call[1] === 'activeConditions'
            );
            expect(conditionCalls.length).toBe(0);
        });

        it('does not process save-result event with detail missing promptId', async () => {
            render(<AOEConditionModal {...makeProps()} />);

            await act(async () => {
                const event = new CustomEvent('save-result', {
                    detail: { success: false },
                });
                window.dispatchEvent(event);
            });

            const conditionCalls = setRuntimeValue.mock.calls.filter(
                call => call[1] === 'activeConditions'
            );
            expect(conditionCalls.length).toBe(0);
        });

        it('does not process save-result event for non-pending promptId', async () => {
            render(<AOEConditionModal {...makeProps()} />);

            await act(async () => {
                const event = new CustomEvent('save-result', {
                    detail: {
                        promptId: 'non-pending-id',
                        success: false,
                    },
                });
                window.dispatchEvent(event);
            });

            const conditionCalls = setRuntimeValue.mock.calls.filter(
                call => call[1] === 'activeConditions'
            );
            expect(conditionCalls.length).toBe(0);
        });
    });
});
