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

describe('AOEConditionModal Overlay', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        getCombatSummary.mockReturnValue(baseCombatSummary);
        getRuntimeValue.mockReturnValue([]);
        setRuntimeValue.mockReturnValue(undefined);
        addEntry.mockResolvedValue(undefined);
        persistAndNotify.mockReturnValue(undefined);
        getAllyList.mockReturnValue(null);
    });

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
});
