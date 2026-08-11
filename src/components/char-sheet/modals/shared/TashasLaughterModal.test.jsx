import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import TashasLaughterModal from './TashasLaughterModal.jsx';

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

import { getRuntimeValue, setRuntimeValue } from '../../../../hooks/runtime/useRuntimeState.js';
import { getCombatSummary } from '../../../../services/encounters/combatData.js';

const campaignName = 'test-campaign';

const basePlayerStats = {
    name: 'Wizard1',
    level: 10,
    proficiency: 4,
    abilities: [{ name: 'Intelligence', bonus: 4 }],
};

const baseAction = {
    name: "Tasha's Hideous Laughter",
    automation: { type: 'tashas_hideous_laughter' },
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
});

afterEach(() => {
    vi.clearAllMocks();
});

describe('TashasLaughterModal - UI Tests', () => {
    describe('initial render', () => {
        it('renders the modal with title and target list', () => {
            render(<TashasLaughterModal {...makeProps()} />);
            expect(screen.getByText("Tasha's Hideous Laughter")).toBeInTheDocument();
            expect(screen.getByText('Goblin')).toBeInTheDocument();
            expect(screen.getByText('Orc')).toBeInTheDocument();
            expect(screen.getByText('PlayerAlly')).toBeInTheDocument();
        });

        it('renders the description with save type and DC', () => {
            render(<TashasLaughterModal {...makeProps()} />);
            expect(screen.getByText(/Select up to/)).toBeInTheDocument();
            expect(screen.getByText(/WIS/)).toBeInTheDocument();
            expect(screen.getByText(/DC 14/)).toBeInTheDocument();
        });

        it('renders the note about prone and incapacitated conditions', () => {
            const { container } = render(<TashasLaughterModal {...makeProps()} />);
            const noteEl = container.querySelector('.sp-note');
            expect(noteEl).toHaveTextContent(/Prone/);
            expect(noteEl).toHaveTextContent(/Incapacitated/);
            expect(noteEl).toHaveTextContent(/can't end the Prone condition/);
            expect(noteEl).toHaveTextContent(/Concentration/);
        });

        it('disables the confirm button when no target is selected', () => {
            render(<TashasLaughterModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(0\)/ })).toBeDisabled();
        });

        it('renders skip button', () => {
            render(<TashasLaughterModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
        });

        it('renders with music icon', () => {
            render(<TashasLaughterModal {...makeProps()} />);
            expect(document.querySelector('.sp-header .fa-solid.fa-music')).toBeInTheDocument();
        });
    });

    describe('maxTargets based on spell slot level', () => {
        it('uses spell slot level 1 as maxTargets by default', () => {
            render(<TashasLaughterModal {...makeProps({ spellSlotLevel: 1 })} />);
            expect(screen.getByText(/Select up to 1 creature/)).toBeInTheDocument();
        });

        it('uses spell slot level 3 as maxTargets when spellSlotLevel is 3', () => {
            render(<TashasLaughterModal {...makeProps({ spellSlotLevel: 3 })} />);
            expect(screen.getByText(/Select up to 3 creature/)).toBeInTheDocument();
        });

        it('uses spell slot level 5 as maxTargets when spellSlotLevel is 5', () => {
            render(<TashasLaughterModal {...makeProps({ spellSlotLevel: 5 })} />);
            expect(screen.getByText(/Select up to 5 creature/)).toBeInTheDocument();
        });

        it('enforces maxTargets limit when selecting', async () => {
            render(<TashasLaughterModal {...makeProps({ spellSlotLevel: 2 })} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await act(async () => { fireEvent.click(labels[1]); });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(2\)/ })).toBeEnabled();
            });
            // Third target should be disabled
            const checkboxes = document.querySelectorAll('input[type="checkbox"]');
            await waitFor(() => {
                expect(checkboxes[2]).toBeDisabled();
            });
        });
    });

    describe('target selection', () => {
        it('selects a target when its checkbox is clicked and enables confirm', async () => {
            render(<TashasLaughterModal {...makeProps()} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await waitFor(() => {
                const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                expect(checkboxes[0].checked).toBe(true);
            });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(1\)/ })).toBeEnabled();
            });
        });

        it('allows selecting multiple targets when spellSlotLevel > 1', async () => {
            render(<TashasLaughterModal {...makeProps({ spellSlotLevel: 3 })} />);
            const labels = document.querySelectorAll('.secondary-target-row');
            await act(async () => { fireEvent.click(labels[0]); });
            await act(async () => { fireEvent.click(labels[1]); });
            await waitFor(() => {
                const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                expect(checkboxes[0].checked).toBe(true);
                expect(checkboxes[1].checked).toBe(true);
            });
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(2\)/ })).toBeEnabled();
            });
        });
    });

    describe('close behavior', () => {
        it('closes when Skip is clicked', () => {
            const onClose = vi.fn();
            render(<TashasLaughterModal {...makeProps({ onClose })} />);
            fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('empty targets', () => {
        it('renders empty target list when no creatures in combat', () => {
            getCombatSummary.mockReturnValue({ creatures: [] });
            render(<TashasLaughterModal {...makeProps()} />);
            expect(screen.getByText('No targets available.')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(0\)/ })).toBeDisabled();
        });

        it('renders the caster as a target when caster is the only creature', () => {
            getCombatSummary.mockReturnValue({
                creatures: [
                    { name: 'Wizard1', type: 'player', currentHp: 30, maxHp: 30, saveBonuses: { wis: 4 } },
                ],
            });
            render(<TashasLaughterModal {...makeProps()} />);
            expect(screen.getByText('Wizard1')).toBeInTheDocument();
        });
    });

    describe('skip behavior', () => {
        it('closes modal without applying any effects when skipped', async () => {
            const onClose = vi.fn();
            render(<TashasLaughterModal {...makeProps({ onClose })} />);
            fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('null combat summary', () => {
        it('handles null combat summary gracefully - no targets shown', async () => {
            getCombatSummary.mockReturnValue(null);
            render(<TashasLaughterModal {...makeProps()} />);

            expect(screen.getByText('No targets available.')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Tasha's Hideous Laughter \(0\)/ })).toBeDisabled();
        });
    });
});
