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

// Re-import mocked modules
import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { getAllyList } from '../../../../hooks/useAllySelection.js';
import { getCombatSummary } from '../../../../services/encounters/combatData.js';
import { persistAndNotify } from './AreaEffectTargetModalBase.utils.jsx';
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

function getApplyButton() {
    return screen.getByRole('button', { name: /Blinding Darkness/ });
}

// ── Tests ──

describe('AOEConditionModal - Results & Behavior', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getCombatSummary.mockReturnValue(baseCombatSummary);
        getRuntimeValue.mockReturnValue([]);
        setRuntimeValue.mockReturnValue(undefined);
        persistAndNotify.mockReturnValue(undefined);
        getAllyList.mockReturnValue(null);
    });

    // ── Results summary modal ──

    describe('results summary modal', () => {
        it('shows fail message when player fails save', async () => {
            const onClose = vi.fn();
            render(<AOEConditionModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await act(async () => { fireEvent.click(getApplyButton()); });

            await waitFor(() => {
                expect(sendSavePrompt).toHaveBeenCalled();
            });

            const promptId = vi.mocked(sendSavePrompt).mock.calls[0][1].promptId;

            await act(async () => {
                window.dispatchEvent(new CustomEvent('save-result', {
                    detail: { promptId, success: false, roll: 5, total: 6, saveBonus: 1 },
                }));
            });

            await waitFor(() => {
                expect(screen.getByText(/Blinded!/)).toBeInTheDocument();
            });
        });

        it('shows success message when player passes save', async () => {
            const onClose = vi.fn();
            render(<AOEConditionModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await act(async () => { fireEvent.click(getApplyButton()); });

            await waitFor(() => {
                expect(sendSavePrompt).toHaveBeenCalled();
            });

            const promptId = vi.mocked(sendSavePrompt).mock.calls[0][1].promptId;

            await act(async () => {
                window.dispatchEvent(new CustomEvent('save-result', {
                    detail: { promptId, success: true, roll: 18, total: 19, saveBonus: 1 },
                }));
            });

            await waitFor(() => {
                expect(screen.getByText(/unaffected/)).toBeInTheDocument();
            });
        });

        it('closes when Close button is clicked in results summary', async () => {
            const onClose = vi.fn();
            render(<AOEConditionModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await act(async () => { fireEvent.click(getApplyButton()); });

            const promptId = vi.mocked(sendSavePrompt).mock.calls[0][1].promptId;

            await act(async () => {
                window.dispatchEvent(new CustomEvent('save-result', {
                    detail: { promptId, success: false, roll: 5, total: 6, saveBonus: 1 },
                }));
            });

            await waitFor(() => {
                expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: 'Close' }));
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('closes when overlay background is clicked in results summary', async () => {
            const onClose = vi.fn();
            render(<AOEConditionModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await act(async () => { fireEvent.click(getApplyButton()); });

            const promptId = vi.mocked(sendSavePrompt).mock.calls[0][1].promptId;

            await act(async () => {
                window.dispatchEvent(new CustomEvent('save-result', {
                    detail: { promptId, success: false, roll: 5, total: 6, saveBonus: 1 },
                }));
            });

            await waitFor(() => {
                expect(screen.getByText('Save Results')).toBeInTheDocument();
            });

            fireEvent.click(document.querySelector('.sp-overlay'));
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('does not close when clicking inside the modal content', async () => {
            const onClose = vi.fn();
            render(<AOEConditionModal {...makeProps({ onClose })} />);

            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await act(async () => { fireEvent.click(getApplyButton()); });

            const promptId = vi.mocked(sendSavePrompt).mock.calls[0][1].promptId;

            await act(async () => {
                window.dispatchEvent(new CustomEvent('save-result', {
                    detail: { promptId, success: false, roll: 5, total: 6, saveBonus: 1 },
                }));
            });

            await waitFor(() => {
                expect(screen.getByText('Save Results')).toBeInTheDocument();
            });

            fireEvent.click(document.querySelector('.sp-modal'));
            expect(onClose).not.toHaveBeenCalled();
        });
    });

    // ── Condition deduplication ──

    describe('condition deduplication', () => {
        it('does not add duplicate blinded condition when creature already has it', async () => {
            getRuntimeValue.mockReturnValue(['blinded']);
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<AOEConditionModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await act(async () => { fireEvent.click(getApplyButton()); });

                await waitFor(() => {
                    const conditionCalls = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'activeConditions' && call[0] === 'Goblin'
                    );
                    expect(conditionCalls.length).toBeGreaterThan(0);
                    const conditions = conditionCalls[0][2];
                    const blindedCount = conditions.filter(c => String(c).toLowerCase() === 'blinded').length;
                    expect(blindedCount).toBe(1);
                });
            } finally {
                vi.restoreAllMocks();
            }
        });
    });

    // ── Blocking effects ──

    describe('blocking effects (forcecage, maze, banishment, imprisonment)', () => {
        it('excludes creatures blocked by forcecage from eligible targets', () => {
            getRuntimeValue.mockReturnValue([
                { effect: 'forcecage', target: 'Goblin', source: 'CasterA' },
            ]);
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.queryByText('Goblin')).not.toBeInTheDocument();
        });

        it('allows both attacker and target when same blocking effect source', () => {
            getRuntimeValue.mockReturnValue([
                { effect: 'forcecage', target: 'Goblin', source: 'Wizard1' },
                { effect: 'forcecage', target: 'Wizard1', source: 'Wizard1' },
            ]);
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.getByText('Goblin')).toBeInTheDocument();
        });

        it('excludes creatures blocked by maze from eligible targets', () => {
            getRuntimeValue.mockReturnValue([
                { effect: 'maze', target: 'Goblin', source: 'CasterA' },
            ]);
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.queryByText('Goblin')).not.toBeInTheDocument();
        });

        it('excludes creatures blocked by banishment from eligible targets', () => {
            getRuntimeValue.mockReturnValue([
                { effect: 'banishment', target: 'Goblin', source: 'CasterA' },
            ]);
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.queryByText('Goblin')).not.toBeInTheDocument();
        });

        it('excludes creatures blocked by imprisonment from eligible targets', () => {
            getRuntimeValue.mockReturnValue([
                { effect: 'imprisonment', target: 'Goblin', source: 'CasterA' },
            ]);
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.queryByText('Goblin')).not.toBeInTheDocument();
        });
    });

    // ── Effects prop fallback ──

    describe('effects prop fallback', () => {
        it('uses default blinded effect when effects prop is null', async () => {
            render(<AOEConditionModal {...makeProps({ effects: null })} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await act(async () => { fireEvent.click(getApplyButton()); });

            const promptId = vi.mocked(sendSavePrompt).mock.calls[0][1].promptId;

            await act(async () => {
                window.dispatchEvent(new CustomEvent('save-result', {
                    detail: { promptId, success: false, roll: 5, total: 6, saveBonus: 1 },
                }));
            });

            await waitFor(() => {
                const conditionCalls = setRuntimeValue.mock.calls.filter(
                    call => call[1] === 'activeConditions' && call[0] === 'PlayerAlly'
                );
                expect(conditionCalls.length).toBeGreaterThan(0);
                const conditions = conditionCalls[0][2];
                expect(conditions).toContain('blinded');
            });
        });

        it('uses default blinded effect when effects prop is undefined', async () => {
            render(<AOEConditionModal {...makeProps({ effects: undefined })} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[2]); });
            await act(async () => { fireEvent.click(getApplyButton()); });

            const promptId = vi.mocked(sendSavePrompt).mock.calls[0][1].promptId;

            await act(async () => {
                window.dispatchEvent(new CustomEvent('save-result', {
                    detail: { promptId, success: false, roll: 5, total: 6, saveBonus: 1 },
                }));
            });

            await waitFor(() => {
                const conditionCalls = setRuntimeValue.mock.calls.filter(
                    call => call[1] === 'activeConditions' && call[0] === 'PlayerAlly'
                );
                expect(conditionCalls.length).toBeGreaterThan(0);
                const conditions = conditionCalls[0][2];
                expect(conditions).toContain('blinded');
            });
        });
    });

    // ── HP display ──

    describe('HP percentage display', () => {
        it('shows HP percentage for non-player creatures', () => {
            render(<AOEConditionModal {...makeProps()} />);
            const goblinRow = [...document.querySelectorAll('.secondary-target-row')]
                .find(row => row.textContent.includes('Goblin'));
            expect(goblinRow.textContent).toMatch(/\d+% HP/);
        });

        it('does not show HP percentage for player-type targets', () => {
            render(<AOEConditionModal {...makeProps()} />);
            const playerRow = [...document.querySelectorAll('.secondary-target-row')]
                .find(row => row.textContent.includes('PlayerAlly'));
            expect(playerRow.textContent).not.toMatch(/\d+% HP/);
        });
    });
});
