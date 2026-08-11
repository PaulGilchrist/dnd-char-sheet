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

// ── Helper to select a target row ──

function selectTargetRow(index) {
    const labels = document.querySelectorAll('.secondary-target-row');
    fireEvent.click(labels[index]);
}

// ── Helpers ──

function getApplyButton() {
    return screen.getByRole('button', { name: /Blinding Darkness/ });
}


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

    // ── Initial render ──

    describe('initial render', () => {
        it('renders the modal with action name as title', () => {
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.getByText('Blinding Darkness')).toBeInTheDocument();
        });

        it('renders all eligible creatures in the target list', () => {
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.getByText('Goblin')).toBeInTheDocument();
            expect(screen.getByText('Orc')).toBeInTheDocument();
            expect(screen.getByText('PlayerAlly')).toBeInTheDocument();
        });

        it('renders the description with save type and DC', () => {
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.getByText(/Select creatures in the area of effect/)).toBeInTheDocument();
            expect(screen.getByText(/CON/)).toBeInTheDocument();
            expect(screen.getByText(/DC 12/)).toBeInTheDocument();
        });

        it('renders the note about failed save condition', () => {
            render(<AOEConditionModal {...makeProps()} />);
            const noteEl = document.querySelector('.sp-note');
            expect(noteEl).toHaveTextContent(/On a failed save/);
            expect(noteEl).toHaveTextContent('Blinded');
        });

        it('disables the apply button when no target is selected', () => {
            render(<AOEConditionModal {...makeProps()} />);
            expect(getApplyButton()).toBeDisabled();
        });

        it('renders the skip button', () => {
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
        });

        it('renders target count in apply button', () => {
            render(<AOEConditionModal {...makeProps()} />);
            expect(getApplyButton()).toHaveTextContent('Blinding Darkness (0)');
        });
    });

    // ── Target selection ──

    describe('target selection', () => {
        it('selects a target when its row is clicked', async () => {
            render(<AOEConditionModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                expect(checkboxes[0].checked).toBe(true);
            });
        });

        it('enables the apply button when a target is selected', async () => {
            render(<AOEConditionModal {...makeProps()} />);
            await act(async () => selectTargetRow(0));
            await waitFor(() => {
                expect(getApplyButton()).toBeEnabled();
            });
        });

        it('updates target count in apply button when targets are selected', async () => {
            render(<AOEConditionModal {...makeProps()} />);
            await act(async () => selectTargetRow(0));
            await waitFor(() => {
                expect(getApplyButton()).toHaveTextContent('Blinding Darkness (1)');
            });
            await act(async () => selectTargetRow(1));
            await waitFor(() => {
                expect(getApplyButton()).toHaveTextContent('Blinding Darkness (2)');
            });
        });

        it('toggles target selection off when row is clicked again', async () => {
            render(<AOEConditionModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                expect(getApplyButton()).toHaveTextContent('Blinding Darkness (1)');
            });
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                expect(getApplyButton()).toHaveTextContent('Blinding Darkness (0)');
            });
        });

        it('highlights selected targets with the selected class', async () => {
            render(<AOEConditionModal {...makeProps()} />);
            const rows = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(rows[0]); });
            await waitFor(() => {
                expect(rows[0]).toHaveClass('secondary-target-selected');
                expect(rows[1]).not.toHaveClass('secondary-target-selected');
            });
        });
    });

    // ── Metamagic Heighten ──

    describe('metamagic heighten', () => {
        it('does not show heighten note when metamagicHeighten is false', () => {
            render(<AOEConditionModal {...makeProps({ metamagicHeighten: false })} />);
            const noteEl = document.querySelector('.sp-note');
            expect(noteEl.textContent).not.toContain('Heightened Spell');
        });

        it('shows heighten note when metamagicHeighten is true', () => {
            render(<AOEConditionModal {...makeProps({ metamagicHeighten: true })} />);
            const notes = document.querySelectorAll('.sp-note');
            const heightenNote = [...notes].find(n => n.textContent.includes('Heightened Spell'));
            expect(heightenNote).toBeTruthy();
        });

        it('renders heighten radio buttons when metamagicHeighten is true', () => {
            render(<AOEConditionModal {...makeProps({ metamagicHeighten: true })} />);
            const radios = document.querySelectorAll('input[name="heightenTarget"]');
            expect(radios.length).toBeGreaterThan(0);
        });

        it('does not render heighten radio buttons when metamagicHeighten is false', () => {
            render(<AOEConditionModal {...makeProps({ metamagicHeighten: false })} />);
            const radios = document.querySelectorAll('input[name="heightenTarget"]');
            expect(radios).toHaveLength(0);
        });

        it('toggles heighten target selection', async () => {
            render(<AOEConditionModal {...makeProps({ metamagicHeighten: true })} />);
            const radios = document.querySelectorAll('input[name="heightenTarget"]');
            expect(radios.length).toBeGreaterThan(0);
            await act(async () => { fireEvent.click(radios[0]); });
            await waitFor(() => {
                expect(radios[0].checked).toBe(true);
            });
        });
    });

    // ── Metamagic Careful ──

    describe('metamagic careful', () => {
        it('does not show careful spell protection when metamagicCareful is false', () => {
            getRuntimeValue.mockReturnValue([]);
            render(<AOEConditionModal {...makeProps({ metamagicCareful: false })} />);
            const rows = document.querySelectorAll('.secondary-target-row');
            rows.forEach(row => {
                expect(row.textContent).not.toContain('Careful Spell');
            });
        });

        it('shows careful spell protection for allies when metamagicCareful is true', () => {
            getAllyList.mockReturnValue(['PlayerAlly']);
            getRuntimeValue.mockReturnValue([]);
            render(<AOEConditionModal {...makeProps({ metamagicCareful: true })} />);
            const rows = document.querySelectorAll('.secondary-target-row');
            const playerRow = [...rows].find(row => row.textContent.includes('PlayerAlly'));
            expect(playerRow.textContent).toContain('Careful Spell protected');
        });

        it('does not show careful spell for non-ally', () => {
            getAllyList.mockReturnValue(['OtherAlly']);
            getRuntimeValue.mockReturnValue([]);
            render(<AOEConditionModal {...makeProps({ metamagicCareful: true })} />);
            const rows = document.querySelectorAll('.secondary-target-row');
            const playerRow = [...rows].find(row => row.textContent.includes('PlayerAlly'));
            expect(playerRow.textContent).not.toContain('Careful Spell Protected');
        });
    });
    // ── Close / cancel behavior ──

    describe('close / cancel behavior', () => {
        it('closes when Skip button is clicked', () => {
            const onClose = vi.fn();
            render(<AOEConditionModal {...makeProps({ onClose })} />);
            fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('does not apply any effects when skipped without selection', () => {
            const onClose = vi.fn();
            render(<AOEConditionModal {...makeProps({ onClose })} />);
            fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
            expect(onClose).toHaveBeenCalledTimes(1);
            expect(setRuntimeValue).not.toHaveBeenCalledWith(
                expect.any(String),
                'activeConditions',
                expect.any(Array),
                expect.any(String)
            );
        });
    });
    // ── Empty targets ──

    describe('empty targets', () => {
        it('renders empty target list when no creatures in combat', () => {
            getCombatSummary.mockReturnValue({ creatures: [] });
            render(<AOEConditionModal {...makeProps()} />);
            // With no creatures, the target list is empty but the modal still renders
            expect(getApplyButton()).toBeInTheDocument();
            expect(getApplyButton()).toBeDisabled();
        });

        it('renders the caster as a target when caster is the only creature', () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'Wizard1', type: 'player', currentHp: 30, maxHp: 30, saveBonuses: { con: 4 } },
                ],
            });
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.getByText('Wizard1')).toBeInTheDocument();
        });
    });
    // ── Edge cases ──

    describe('edge cases', () => {
        it('renders without crashing when onClose is undefined', () => {
            render(<AOEConditionModal {...makeProps({ onClose: undefined })} />);
            expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
        });

        it('handles null combatSummary gracefully', () => {
            getCombatSummary.mockReturnValue(null);
            render(<AOEConditionModal {...makeProps()} />);
            expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
        });

        it('handles undefined saveBonuses gracefully', () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'Goblin', type: 'npc', currentHp: 5, maxHp: 10 },
                ],
            });
            render(<AOEConditionModal {...makeProps()} />);
            expect(screen.getByText(/CON/)).toBeInTheDocument();
        });

        it('renders with multiple effects in effects prop', () => {
            render(<AOEConditionModal {...makeProps({
                effects: [
                    { type: 'blinded', condition: 'blinded' },
                    { type: 'deafened', condition: 'deafened' },
                ],
                conditionLabel: 'Blinded, Deafened',
            })} />);
            expect(screen.getByText(/Blinded, Deafened/)).toBeInTheDocument();
        });
    });
    // ── Cleanup behavior ──

    describe('cleanup', () => {
        it('clears results state on unmount', async () => {
            const { unmount } = render(<AOEConditionModal {...makeProps()} />);
            await act(async () => selectTargetRow(0));
            unmount();
            // After unmount, resultsState should be cleared (no visible effect but no crash)
        });
    });
});
