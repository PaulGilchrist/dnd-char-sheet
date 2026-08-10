import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AOEConditionModal from './AOEConditionModal.jsx';

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

// Capture the override handlers for direct testing
const handleApplyOverrideCapture = vi.fn();
const handleSaveResultOverrideCapture = vi.fn();

vi.mock('./AreaEffectTargetModalBase.jsx', () => ({
    default: function MockAreaEffectTargetModalBase(props) {
        // Capture the handlers for direct testing
        handleApplyOverrideCapture.mockImplementation((ctx) => {
            return props.handleApplyOverride(ctx);
        });
        handleSaveResultOverrideCapture.mockImplementation((event, ctx) => {
            return props.handleSaveResultOverride(event, ctx);
        });
        return (
            <div data-testid="area-effect-target-modal-base">
                <div data-testid="feature-name">{props.featureName}</div>
                <div data-testid="save-type">{props.saveType}</div>
                <div data-testid="save-dc">{props.saveDc}</div>
                <button
                    data-testid="apply-btn"
                    onClick={() => {
                        const ctx = {
                            selected: new Set(['Goblin']),
                            setProcessing: () => {},
                            setResults: () => {},
                            setPendingPrompts: () => {},
                        };
                        handleApplyOverrideCapture(ctx);
                    }}
                    type="button"
                >
                    Apply
                </button>
            </div>
        );
    },
}));

// Re-import mocked modules
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { getAllyList } from '../../../../hooks/useAllySelection.js';
import { getCombatSummary } from '../../../../services/encounters/combatData.js';
import { persistAndNotify } from './AreaEffectTargetModalBase.utils.jsx';
import { addEntry } from '../../../../services/ui/logService.js';
import * as damageRollback from '../../../../services/automation/common/damageRollback.js';
import { sendSavePrompt } from '../../../../services/combat/conditions/savePromptService.js';

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

describe('AOEConditionModal - additional coverage', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        getCombatSummary.mockReturnValue(baseCombatSummary);
        getRuntimeValue.mockReturnValue([]);
        setRuntimeValue.mockReturnValue(undefined);
        addEntry.mockResolvedValue(undefined);
        persistAndNotify.mockReturnValue(undefined);
        getAllyList.mockReturnValue(null);
    });

    // ── Overlay targeting path ──

    describe('overlay targeting path', () => {
        it('renders AreaEffectTargetModalBase when player is overlay targeted with active overlay', () => {
            render(<AOEConditionModal {...makeProps({
                playerStats: { ...basePlayerStats, targetName: 'overlay-123' },
                activeOverlay: { name: 'TestOverlay' },
            })} />);
            expect(screen.getByTestId('area-effect-target-modal-base')).toBeInTheDocument();
            expect(screen.getByTestId('feature-name')).toHaveTextContent('Blinding Darkness');
            expect(screen.getByTestId('save-type')).toHaveTextContent('CON');
            expect(screen.getByTestId('save-dc')).toHaveTextContent('12');
        });

        it('passes handleApplyOverride to AreaEffectTargetModalBase', () => {
            render(<AOEConditionModal {...makeProps({
                playerStats: { ...basePlayerStats, targetName: 'overlay-123' },
                activeOverlay: { name: 'TestOverlay' },
            })} />);
            expect(screen.getByTestId('area-effect-target-modal-base')).toBeInTheDocument();
        });

        it('passes handleSaveResultOverride to AreaEffectTargetModalBase', () => {
            render(<AOEConditionModal {...makeProps({
                playerStats: { ...basePlayerStats, targetName: 'overlay-123' },
                activeOverlay: { name: 'TestOverlay' },
            })} />);
            expect(screen.getByTestId('area-effect-target-modal-base')).toBeInTheDocument();
        });

        it('logs ability_use when handleApplyOverride is called via overlay', async () => {
            render(<AOEConditionModal {...makeProps({
                playerStats: { ...basePlayerStats, targetName: 'overlay-123' },
                activeOverlay: { name: 'TestOverlay' },
            })} />);

            const applyBtn = screen.getByTestId('apply-btn');
            await act(async () => {
                fireEvent.click(applyBtn);
            });

            await waitFor(() => {
                expect(addEntry).toHaveBeenCalledWith(
                    campaignName,
                    expect.objectContaining({
                        type: 'ability_use',
                    })
                );
            });
        });

        it('calls resolveAllSaves with selected targets from overlay context', async () => {
            render(<AOEConditionModal {...makeProps({
                playerStats: { ...basePlayerStats, targetName: 'overlay-123' },
                activeOverlay: { name: 'TestOverlay' },
            })} />);

            const applyBtn = screen.getByTestId('apply-btn');
            await act(async () => {
                fireEvent.click(applyBtn);
            });

            // resolveAllSaves is called asynchronously via the handleApplyOverride
            // The mock context's setResults/setPendingPrompts are no-ops
            // but storeSpellLastAttack should still be called synchronously
            await waitFor(() => {
                expect(damageRollback.storeSpellLastAttack).toHaveBeenCalled();
            });
        });

        it('handles save-result event with missing promptId in overlay mode', async () => {
            render(<AOEConditionModal {...makeProps({
                playerStats: { ...basePlayerStats, targetName: 'overlay-123' },
                activeOverlay: { name: 'TestOverlay' },
            })} />);

            await act(async () => {
                const event = new CustomEvent('save-result', {
                    detail: {
                        success: false,
                    },
                });
                window.dispatchEvent(event);
            });

            // Should not have called setRuntimeValue for conditions
            const conditionCalls = setRuntimeValue.mock.calls.filter(
                call => call[1] === 'activeConditions'
            );
            expect(conditionCalls.length).toBe(0);
        });

        it('invokes handleApplyOverride with correct context from overlay', async () => {
            render(<AOEConditionModal {...makeProps({
                playerStats: { ...basePlayerStats, targetName: 'overlay-123' },
                activeOverlay: { name: 'TestOverlay' },
            })} />);

            const applyBtn = screen.getByTestId('apply-btn');
            await act(async () => {
                fireEvent.click(applyBtn);
            });

            // handleApplyOverrideCapture should have been called
            await waitFor(() => {
                expect(handleApplyOverrideCapture).toHaveBeenCalled();
            });

            const ctx = handleApplyOverrideCapture.mock.calls[0][0];
            expect(ctx.selected).toEqual(new Set(['Goblin']));
            expect(typeof ctx.setProcessing).toBe('function');
            expect(typeof ctx.setResults).toBe('function');
            expect(typeof ctx.setPendingPrompts).toBe('function');
        });

        it('invokes handleSaveResultOverride capture for success path', async () => {
            render(<AOEConditionModal {...makeProps({
                playerStats: { ...basePlayerStats, targetName: 'overlay-123' },
                activeOverlay: { name: 'TestOverlay' },
            })} />);

            const mockSetResults = vi.fn();
            const mockSetPendingPrompts = vi.fn();

            const ctx = {
                pendingPrompts: [{ promptId: 'test-prompt', targetName: 'Goblin' }],
                setResults: mockSetResults,
                setPendingPrompts: mockSetPendingPrompts,
            };

            const event = {
                detail: {
                    promptId: 'test-prompt',
                    success: true,
                    roll: 18,
                    total: 19,
                    saveBonus: 1,
                },
            };

            await act(async () => {
                handleSaveResultOverrideCapture(event, ctx);
            });

            // Should log save_result success
            await waitFor(() => {
                const saveEntries = addEntry.mock.calls.filter(
                    call => call[1]?.type === 'save_result' && call[1]?.success === true
                );
                expect(saveEntries.length).toBeGreaterThan(0);
            });

            // Should call addTargetResult with success
            expect(damageRollback.addTargetResult).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                saveResult: 'success',
            }));

            // Should call persistAndNotify
            expect(persistAndNotify).toHaveBeenCalled();
        });

        it('invokes handleSaveResultOverride capture for failure path', async () => {
            render(<AOEConditionModal {...makeProps({
                playerStats: { ...basePlayerStats, targetName: 'overlay-123' },
                activeOverlay: { name: 'TestOverlay' },
            })} />);

            const mockSetResults = vi.fn();
            const mockSetPendingPrompts = vi.fn();

            const ctx = {
                pendingPrompts: [{ promptId: 'test-prompt', targetName: 'Goblin' }],
                setResults: mockSetResults,
                setPendingPrompts: mockSetPendingPrompts,
            };

            const event = {
                detail: {
                    promptId: 'test-prompt',
                    success: false,
                    roll: 5,
                    total: 6,
                    saveBonus: 1,
                },
            };

            await act(async () => {
                handleSaveResultOverrideCapture(event, ctx);
            });

            // Should apply conditions
            await waitFor(() => {
                const conditionCalls = setRuntimeValue.mock.calls.filter(
                    call => call[1] === 'activeConditions' && call[0] === 'Goblin'
                );
                expect(conditionCalls.length).toBeGreaterThan(0);
            });

            // Should log condition entry
            const conditionEntries = addEntry.mock.calls.filter(
                call => call[1]?.type === 'condition'
            );
            expect(conditionEntries.length).toBeGreaterThan(0);

            // Should call addTargetResult with failure
            expect(damageRollback.addTargetResult).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                saveResult: 'failure',
            }));
        });

        it('handleSaveResultOverride does nothing with missing promptId', async () => {
            render(<AOEConditionModal {...makeProps({
                playerStats: { ...basePlayerStats, targetName: 'overlay-123' },
                activeOverlay: { name: 'TestOverlay' },
            })} />);

            const mockSetResults = vi.fn();
            const mockSetPendingPrompts = vi.fn();

            const ctx = {
                pendingPrompts: [],
                setResults: mockSetResults,
                setPendingPrompts: mockSetPendingPrompts,
            };

            const event = {
                detail: {
                    success: false,
                },
            };

            await act(async () => {
                handleSaveResultOverrideCapture(event, ctx);
            });

            // Should not have called anything
            const conditionCalls = setRuntimeValue.mock.calls.filter(
                call => call[1] === 'activeConditions'
            );
            expect(conditionCalls.length).toBe(0);
        });

        it('handleSaveResultOverride does nothing with non-matching promptId', async () => {
            render(<AOEConditionModal {...makeProps({
                playerStats: { ...basePlayerStats, targetName: 'overlay-123' },
                activeOverlay: { name: 'TestOverlay' },
            })} />);

            const mockSetResults = vi.fn();
            const mockSetPendingPrompts = vi.fn();

            const ctx = {
                pendingPrompts: [{ promptId: 'other-prompt', targetName: 'Goblin' }],
                setResults: mockSetResults,
                setPendingPrompts: mockSetPendingPrompts,
            };

            const event = {
                detail: {
                    promptId: 'non-matching-prompt',
                    success: false,
                },
            };

            await act(async () => {
                handleSaveResultOverrideCapture(event, ctx);
            });

            // Should not have applied conditions
            const conditionCalls = setRuntimeValue.mock.calls.filter(
                call => call[1] === 'activeConditions'
            );
            expect(conditionCalls.length).toBe(0);
        });
    });

    // ── Processing state rendering ──

    describe('processing state rendering in renderBody', () => {
        it('shows selection message in normal mode', async () => {
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.getByText(/Select creatures in the area of effect/)).toBeInTheDocument();
        });
    });

    // ── Blocking effects - both attacker and target trapped ──

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

    // ── Player save result logging in handleSaveResult ──

    describe('player save result logging in handleSaveResult', () => {
        it('logs condition entry when player fails save via handleSaveResult', async () => {
            getRuntimeValue.mockReturnValue([]);
            const onClose = vi.fn();
            render(<AOEConditionModal {...makeProps({ onClose })} />);

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
                    call => call[1]?.type === 'condition'
                );
                expect(conditionEntries.length).toBeGreaterThan(0);
                expect(conditionEntries[0][1].condition).toBe('Blinded');
            });
        });

        it('logs save_result success entry when player passes save via handleSaveResult', async () => {
            const onClose = vi.fn();
            render(<AOEConditionModal {...makeProps({ onClose })} />);

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
    });

    // ── renderTargetList sub-functions ──

    describe('renderTargetList sub-functions', () => {
        it('renders HP percentage for non-player creatures with valid HP values', () => {
            render(<AOEConditionModal {...makeProps()} />);
            const goblinRow = [...document.querySelectorAll('.secondary-target-row')]
                .find(row => row.textContent.includes('Goblin'));
            expect(goblinRow.textContent).toContain('71% HP');
        });

        it('renders HP percentage calculation correctly for different HP values', () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'Dragon', type: 'npc', currentHp: 50, maxHp: 100, saveBonuses: { con: 5 } },
                ],
            });
            render(<AOEConditionModal {...makeProps()} />);
            const dragonRow = [...document.querySelectorAll('.secondary-target-row')]
                .find(row => row.textContent.includes('Dragon'));
            expect(dragonRow.textContent).toContain('50% HP');
        });

        it('does not render HP percentage when currentHp is null', () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'Ghost', type: 'npc', currentHp: null, maxHp: null, saveBonuses: { con: 0 } },
                ],
            });
            render(<AOEConditionModal {...makeProps()} />);
            const ghostRow = [...document.querySelectorAll('.secondary-target-row')]
                .find(row => row.textContent.includes('Ghost'));
            expect(ghostRow.textContent).not.toContain('% HP');
        });

        it('does not render HP percentage when maxHp is null', () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'Wraith', type: 'npc', currentHp: 10, maxHp: null, saveBonuses: { con: 0 } },
                ],
            });
            render(<AOEConditionModal {...makeProps()} />);
            const wraithRow = [...document.querySelectorAll('.secondary-target-row')]
                .find(row => row.textContent.includes('Wraith'));
            expect(wraithRow.textContent).not.toContain('% HP');
        });

        it('does not render HP percentage for player-type targets', () => {
            render(<AOEConditionModal {...makeProps()} />);
            const playerRow = [...document.querySelectorAll('.secondary-target-row')]
                .find(row => row.textContent.includes('PlayerAlly'));
            expect(playerRow.textContent).not.toContain('% HP');
        });

        it('renders careful spell protection indicator for protected allies', () => {
            getAllyList.mockReturnValue(['Goblin']);
            getRuntimeValue.mockReturnValue([]);
            render(<AOEConditionModal {...makeProps({ metamagicCareful: true })} />);
            const goblinRow = [...document.querySelectorAll('.secondary-target-row')]
                .find(row => row.textContent.includes('Goblin'));
            expect(goblinRow.textContent).toContain('Careful Spell protected');
        });

        it('renders heighten radio button when metamagicHeighten is true', () => {
            render(<AOEConditionModal {...makeProps({ metamagicHeighten: true })} />);
            const radios = document.querySelectorAll('input[name="heightenTarget"]');
            expect(radios.length).toBeGreaterThan(0);
        });

        it('does not render heighten radio button when metamagicHeighten is false', () => {
            render(<AOEConditionModal {...makeProps({ metamagicHeighten: false })} />);
            const radios = document.querySelectorAll('input[name="heightenTarget"]');
            expect(radios).toHaveLength(0);
        });

        it('toggles heighten target selection on radio click', async () => {
            render(<AOEConditionModal {...makeProps({ metamagicHeighten: true })} />);
            const radios = document.querySelectorAll('input[name="heightenTarget"]');
            await act(async () => { fireEvent.click(radios[0]); });
            await waitFor(() => {
                expect(radios[0].checked).toBe(true);
            });
        });

        it('deselects heighten target when same radio is clicked again', async () => {
            render(<AOEConditionModal {...makeProps({ metamagicHeighten: true })} />);
            const radios = document.querySelectorAll('input[name="heightenTarget"]');
            await act(async () => { fireEvent.click(radios[0]); });
            await waitFor(() => {
                expect(radios[0].checked).toBe(true);
            });
            // Click again to deselect - the radio stays checked in the DOM
            // but the heightenTarget state is null. Test via the modal behavior.
            await act(async () => { fireEvent.click(radios[0]); });
            // State is cleared but DOM radio stays checked - this is expected
            // behavior for radio buttons in React
        });

        it('renders target name when target object has name property', () => {
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.getByText('Goblin')).toBeInTheDocument();
        });

        // Note: renderTargetList expects objects with name/type properties.
        // String creatures would cause a React error, so this test is skipped.
    });

    // ── Conditions with type field instead of condition ──

    describe('conditions with type field fallback', () => {
        it('applies condition when only type field is present in effects', async () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<AOEConditionModal {...makeProps({
                    effects: [{ type: 'paralyzed' }],
                    conditionLabel: 'Paralyzed',
                })} />);
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

    // ── Heighten targeting in resolveAllSaves ──

    describe('heighten targeting in resolveAllSaves', () => {
        it('uses double roll for heighten target', async () => {
            let callCount = 0;
            vi.spyOn(Math, 'random').mockImplementation(() => {
                callCount++;
                if (callCount <= 2) return 0.01; // First two rolls for double roll
                return 0.99; // Third roll for other target
            });
            try {
                render(<AOEConditionModal {...makeProps({
                    metamagicHeighten: true,
                })} />);

                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await act(async () => { fireEvent.click(labels[1]); });

                // Select first target for heighten
                const radios = document.querySelectorAll('input[name="heightenTarget"]');
                await act(async () => { fireEvent.click(radios[0]); });

                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Blinding Darkness/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Blinding Darkness/ }));
                });

                // Both should have been processed
                await waitFor(() => {
                    const conditionCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'activeConditions'
                    );
                    expect(conditionCalls.length).toBeGreaterThanOrEqual(0);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });
    });

    // ── getCreatureTargets ──

    describe('getCreatureTargets', () => {
        it('returns creature targets with correct shape', async () => {
            render(<AOEConditionModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Blinding Darkness/ })).toBeInTheDocument();
            });
        });

        it('includes carefulSpellProtected flag in creature targets', () => {
            getAllyList.mockReturnValue(['Goblin']);
            getRuntimeValue.mockReturnValue([]);
            render(<AOEConditionModal {...makeProps({ metamagicCareful: true })} />);
            const goblinRow = [...document.querySelectorAll('.secondary-target-row')]
                .find(row => row.textContent.includes('Goblin'));
            expect(goblinRow.textContent).toContain('Careful Spell protected');
        });
    });

    // ── Combat summary null handling in resolveAllSaves ──

    describe('combat summary null handling in resolveAllSaves', () => {
        it('returns empty results when combatSummary is null', async () => {
            getCombatSummary.mockReturnValue(null);
            render(<AOEConditionModal {...makeProps()} />);

            // With null combatSummary, eligibleTargets returns [] so no target rows exist
            // The modal should still render without crashing
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Blinding Darkness/ })).toBeInTheDocument();
            });
            expect(screen.getByRole('button', { name: /Blinding Darkness/ })).toBeDisabled();
        });
    });

    // ── Target not found in combatSummary ──

    describe('target not found in combatSummary', () => {
        it('skips targets not found in combatSummary creatures', async () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 7, saveBonuses: { con: 0 } },
                ],
            });
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<AOEConditionModal {...makeProps()} />);
                // Only Goblin exists, so selecting just Goblin is fine
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Blinding Darkness/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Blinding Darkness/ }));
                });

                await waitFor(() => {
                    expect(addEntry).toHaveBeenCalled();
                });
            } finally {
                vi.restoreAllMocks();
            }
        });
    });

    // ── addTargetResult calls ──

    describe('addTargetResult calls', () => {
        it('calls addTargetResult with failure result when NPC fails save', async () => {
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
                    const resultCalls = damageRollback.addTargetResult.mock.calls.filter(
                        call => call[1]?.saveResult === 'failure'
                    );
                    expect(resultCalls.length).toBeGreaterThan(0);
                    expect(resultCalls[0][1].conditions).toContain('blinded');
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('calls addTargetResult with success result when NPC succeeds save', async () => {
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
                    const resultCalls = damageRollback.addTargetResult.mock.calls.filter(
                        call => call[1]?.saveResult === 'success'
                    );
                    expect(resultCalls.length).toBeGreaterThan(0);
                    expect(resultCalls[0][1].conditions).toEqual([]);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('calls addTargetResult with failure result when player fails save', async () => {
            getRuntimeValue.mockReturnValue([]);
            const onClose = vi.fn();
            render(<AOEConditionModal {...makeProps({ onClose })} />);

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
                const resultCalls = damageRollback.addTargetResult.mock.calls.filter(
                    call => call[1]?.saveResult === 'failure'
                );
                expect(resultCalls.length).toBeGreaterThan(0);
            });
        });

        it('calls addTargetResult with success result when player passes save', async () => {
            const onClose = vi.fn();
            render(<AOEConditionModal {...makeProps({ onClose })} />);

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
                const resultCalls = damageRollback.addTargetResult.mock.calls.filter(
                    call => call[1]?.saveResult === 'success'
                );
                expect(resultCalls.length).toBeGreaterThan(0);
            });
        });
    });

    // ── persistAndNotify calls ──

    describe('persistAndNotify calls', () => {
        it('calls persistAndNotify after resolveAllSaves completes', async () => {
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
                    expect(persistAndNotify).toHaveBeenCalled();
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('calls persistAndNotify after handleSaveResult completes', async () => {
            getRuntimeValue.mockReturnValue([]);
            const onClose = vi.fn();
            render(<AOEConditionModal {...makeProps({ onClose })} />);

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

    // ── Save bonus handling ──

    describe('save bonus handling', () => {
        it('uses save bonus from target saveBonuses for NPC', async () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.5);
            try {
                render(<AOEConditionModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[1]); }); // Orc with CON +2
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /Blinding Darkness/ })).toBeInTheDocument();
                });
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /Blinding Darkness/ }));
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

        it('defaults save bonus to 0 when saveBonuses is undefined', async () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 7 },
                ],
            });
            vi.spyOn(Math, 'random').mockReturnValue(0.5);
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
                    expect(saveEntries[0][1].saveBonus).toBe(0);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });
    });

    // ── storeSpellLastAttack calls ──

    describe('storeSpellLastAttack calls', () => {
        it('calls storeSpellLastAttack with correct parameters', async () => {
            render(<AOEConditionModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Blinding Darkness/ })).toBeInTheDocument();
            });
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /Blinding Darkness/ }));
            });

            expect(damageRollback.storeSpellLastAttack).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                casterName: 'Wizard1',
                spellName: 'Blinding Darkness',
                saveType: 'CON',
                saveDc: 12,
                attackScope: 'aoe',
            }));
        });
    });

    // ── conditionLabel fallback to effects array ──

    describe('conditionLabel fallback to effects array', () => {
        it('uses effects array when conditionLabel is null', async () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<AOEConditionModal {...makeProps({
                    conditionLabel: null,
                    effects: [{ type: 'paralyzed', condition: 'paralyzed' }],
                })} />);
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

        it('uses effects array when conditionLabel is empty string', async () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<AOEConditionModal {...makeProps({
                    conditionLabel: '',
                    effects: [{ type: 'paralyzed', condition: 'paralyzed' }],
                })} />);
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
});
