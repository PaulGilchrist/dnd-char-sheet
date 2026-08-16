// @improved-by-ai
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

        it('calls storeSpellLastAttack when handleApplyOverride is invoked via overlay', async () => {
            render(<AOEConditionModal {...makeProps({
                playerStats: { ...basePlayerStats, targetName: 'overlay-123' },
                activeOverlay: { name: 'TestOverlay' },
            })} />);

            const applyBtn = screen.getByTestId('apply-btn');
            await act(async () => {
                fireEvent.click(applyBtn);
            });

            await waitFor(() => {
                expect(damageRollback.storeSpellLastAttack).toHaveBeenCalled();
            });
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

            await waitFor(() => {
                const saveEntries = addEntry.mock.calls.filter(
                    call => call[1]?.type === 'save_result' && call[1]?.success === true
                );
                expect(saveEntries.length).toBeGreaterThan(0);
            });

            expect(damageRollback.addTargetResult).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                saveResult: 'success',
            }));

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

            await waitFor(() => {
                const conditionCalls = setRuntimeValue.mock.calls.filter(
                    call => call[1] === 'activeConditions' && call[0] === 'Goblin'
                );
                expect(conditionCalls.length).toBeGreaterThan(0);
            });

            const conditionEntries = addEntry.mock.calls.filter(
                call => call[1]?.type === 'condition'
            );
            expect(conditionEntries.length).toBeGreaterThan(0);

            expect(damageRollback.addTargetResult).toHaveBeenCalledWith(campaignName, expect.objectContaining({
                saveResult: 'failure',
            }));
        });

        it('handleSaveResultOverride does nothing with missing promptId', async () => {
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

            const conditionCalls = setRuntimeValue.mock.calls.filter(
                call => call[1] === 'activeConditions'
            );
            expect(conditionCalls.length).toBe(0);
        });

        it('handleSaveResultOverride does nothing with non-matching promptId', async () => {
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

            const conditionCalls = setRuntimeValue.mock.calls.filter(
                call => call[1] === 'activeConditions'
            );
            expect(conditionCalls.length).toBe(0);
        });
    });
});
