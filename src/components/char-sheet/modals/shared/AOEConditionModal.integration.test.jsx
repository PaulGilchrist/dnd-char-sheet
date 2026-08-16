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

function getApplyButton() {
    return screen.getByRole('button', { name: /Blinding Darkness/ });
}

// ── Tests ──

describe('AOEConditionModal - Integration', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        getCombatSummary.mockReturnValue(baseCombatSummary);
        getRuntimeValue.mockReturnValue([]);
        setRuntimeValue.mockReturnValue(undefined);
        addEntry.mockResolvedValue(undefined);
        persistAndNotify.mockReturnValue(undefined);
        getAllyList.mockReturnValue(null);
    });

    // ── Skip button ──

    describe('skip button', () => {
        it('closes the modal when the Skip button is clicked', () => {
            const onClose = vi.fn();
            render(<AOEConditionModal {...makeProps({ onClose })} />);
            fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('does not apply any effects when Skip is clicked', () => {
            const onClose = vi.fn();
            render(<AOEConditionModal {...makeProps({ onClose })} />);
            fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
            expect(onClose).toHaveBeenCalledTimes(1);
            const activeConditionCalls = setRuntimeValue.mock.calls.filter(
                call => call[1] === 'activeConditions'
            );
            expect(activeConditionCalls.length).toBe(0);
        });
    });

    // ── Apply button count display ──

    describe('apply button count display', () => {
        it('shows "(0)" when no targets are selected', () => {
            render(<AOEConditionModal {...makeProps()} />);
            expect(getApplyButton()).toHaveTextContent('Blinding Darkness (0)');
        });

        it('shows "(1)" when one target is selected', async () => {
            render(<AOEConditionModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                expect(getApplyButton()).toHaveTextContent('Blinding Darkness (1)');
            });
        });

        it('shows "(2)" when two targets are selected', async () => {
            render(<AOEConditionModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await act(async () => { fireEvent.click(labels[1]); });
            await waitFor(() => {
                expect(getApplyButton()).toHaveTextContent('Blinding Darkness (2)');
            });
        });

        it('shows "(3)" when all targets are selected', async () => {
            render(<AOEConditionModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await act(async () => { fireEvent.click(labels[1]); });
            await act(async () => { fireEvent.click(labels[2]); });
            await waitFor(() => {
                expect(getApplyButton()).toHaveTextContent('Blinding Darkness (3)');
            });
        });

        it('updates count when targets are deselected', async () => {
            render(<AOEConditionModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await act(async () => { fireEvent.click(labels[1]); });
            await waitFor(() => {
                expect(getApplyButton()).toHaveTextContent('Blinding Darkness (2)');
            });
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                expect(getApplyButton()).toHaveTextContent('Blinding Darkness (1)');
            });
        });
    });

    // ── Results summary after NPC resolution ──

    describe('results summary after NPC resolution', () => {
        it('shows results summary with "targets saved" after NPC saves resolve', async () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<AOEConditionModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await act(async () => {
                    fireEvent.click(getApplyButton());
                });
                await waitFor(() => {
                    expect(screen.getByText(/targets saved/)).toBeInTheDocument();
                });
            } finally {
                vi.restoreAllMocks();
            }
        });
    });

    // ── All creatures blocked by effects ──

    describe('all creatures blocked by effects', () => {
        it('renders empty target list when all creatures are blocked by forcecage', () => {
            getRuntimeValue.mockReturnValue([
                { effect: 'forcecage', target: 'Goblin', source: 'CasterA' },
                { effect: 'forcecage', target: 'Orc', source: 'CasterA' },
                { effect: 'forcecage', target: 'PlayerAlly', source: 'CasterA' },
            ]);
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.queryByText('Goblin')).not.toBeInTheDocument();
            expect(screen.queryByText('Orc')).not.toBeInTheDocument();
            expect(screen.queryByText('PlayerAlly')).not.toBeInTheDocument();
            expect(getApplyButton()).toBeDisabled();
        });

        it('renders empty target list when all creatures are blocked by maze', () => {
            getRuntimeValue.mockReturnValue([
                { effect: 'maze', target: 'Goblin', source: 'CasterA' },
                { effect: 'maze', target: 'Orc', source: 'CasterA' },
                { effect: 'maze', target: 'PlayerAlly', source: 'CasterA' },
            ]);
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.queryByText('Goblin')).not.toBeInTheDocument();
            expect(getApplyButton()).toBeDisabled();
        });
    });

    // ── Single target scenario ──

    describe('single target scenario', () => {
        it('renders and allows selection when only one creature exists', () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 10, saveBonuses: { con: 0 } },
                ],
            });
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.getByText('Goblin')).toBeInTheDocument();
        });

        it('shows "(1)" count for single target creature', async () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 10, saveBonuses: { con: 0 } },
                ],
            });
            render(<AOEConditionModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                expect(getApplyButton()).toHaveTextContent('Blinding Darkness (1)');
            });
        });
    });

    // ── Heighten radio button behavior ──

    describe('heighten radio button behavior', () => {
        it('renders one heighten radio button per eligible target when heighten is enabled', () => {
            render(<AOEConditionModal {...makeProps({ metamagicHeighten: true })} />);
            const radios = document.querySelectorAll('input[name="heightenTarget"]');
            expect(radios).toHaveLength(3);
        });

        it('does not render heighten radio buttons when heighten is disabled', () => {
            render(<AOEConditionModal {...makeProps({ metamagicHeighten: false })} />);
            const radios = document.querySelectorAll('input[name="heightenTarget"]');
            expect(radios).toHaveLength(0);
        });

        it('selects a heighten target when its radio is clicked', async () => {
            render(<AOEConditionModal {...makeProps({ metamagicHeighten: true })} />);
            const radios = document.querySelectorAll('input[name="heightenTarget"]');
            await act(async () => { fireEvent.click(radios[0]); });
            await waitFor(() => {
                expect(radios[0]).toBeChecked();
            });
        });
    });

    // ── Full apply flow with logging verification ──

    describe('full apply flow with logging verification', () => {
        it('logs ability_use, calls storeSpellLastAttack, and persists when applying to NPC targets', async () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<AOEConditionModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await act(async () => {
                    fireEvent.click(getApplyButton());
                });

                await waitFor(() => {
                    expect(addEntry).toHaveBeenCalledWith(
                        campaignName,
                        expect.objectContaining({ type: 'ability_use' })
                    );
                    expect(damageRollback.storeSpellLastAttack).toHaveBeenCalledWith(
                        campaignName,
                        expect.objectContaining({ attackScope: 'aoe' })
                    );
                });
            } finally {
                vi.restoreAllMocks();
            }
        });

        it('calls persistAndNotify after NPC save resolution completes', async () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                render(<AOEConditionModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await act(async () => {
                    fireEvent.click(getApplyButton());
                });

                await waitFor(() => {
                    expect(persistAndNotify).toHaveBeenCalled();
                });
            } finally {
                vi.restoreAllMocks();
            }
        });
    });

    // ── Multiple creature types with mixed save outcomes ──

    describe('multiple creature types with mixed save outcomes', () => {
        it('applies conditions to NPCs that fail and sends prompts for player targets in a single apply', async () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.01);
            try {
                getRuntimeValue.mockReturnValue([]);
                render(<AOEConditionModal {...makeProps()} />);
                const labels = document.querySelectorAll('.secondary-target-row');
                await act(async () => { fireEvent.click(labels[0]); });
                await act(async () => { fireEvent.click(labels[2]); });
                await act(async () => {
                    fireEvent.click(getApplyButton());
                });

                // NPC should have condition applied
                await waitFor(() => {
                    const goblinConditions = setRuntimeValue.mock.calls.filter(
                        call => call[1] === 'activeConditions' && call[0] === 'Goblin'
                    );
                    expect(goblinConditions.length).toBeGreaterThan(0);
                });

                // Player should have prompt sent (not condition applied yet)
                expect(sendSavePrompt).toHaveBeenCalledWith(
                    campaignName,
                    expect.objectContaining({ targetName: 'PlayerAlly' })
                );
            } finally {
                vi.restoreAllMocks();
            }
        });
    });
});
