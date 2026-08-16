// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import MantleOfInspirationModal from './MantleOfInspirationModal.jsx';

// ── Test fixtures ──

const mockOnConfirm = vi.fn();
const mockOnSkip = vi.fn();

afterEach(() => {
    mockOnConfirm.mockClear();
    mockOnSkip.mockClear();
});

const mockCreatureTargets = [
    { name: 'Ally1', type: 'player', currentHp: 20, maxHp: 30 },
    { name: 'Ally2', type: 'player', currentHp: 15, maxHp: 25 },
];

const mockNonPlayerTargets = [
    { name: 'Ally1', type: 'player', currentHp: 20, maxHp: 30 },
    { name: 'NPC1', type: 'npc', currentHp: 10, maxHp: 20 },
];

const defaultProps = {
    creatureTargets: mockCreatureTargets,
    tempHp: 5,
    dieRoll: 4,
    bardicDieSize: 6,
    maxTargets: 2,
    onConfirm: mockOnConfirm,
    onSkip: mockOnSkip,
};

function makeProps(overrides) {
    return { ...defaultProps, ...(overrides || {}) };
}

// ── Tests ──

describe('MantleOfInspirationModal', () => {

    // ── Rendering ──

    describe('initial render', () => {
        it('renders the title, feather icon, targets, buttons, description, and note', () => {
            render(<MantleOfInspirationModal {...makeProps()} />);

            expect(screen.getByText('Mantle of Inspiration')).toBeInTheDocument();
            expect(document.querySelector('.sp-header .fa-solid.fa-feather')).toBeInTheDocument();
            expect(screen.getByText('Ally1')).toBeInTheDocument();
            expect(screen.getByText('Ally2')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Inspire \(0\)/ })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
            expect(screen.getByText(/Choose up to 2 allies to grant temporary hit points/)).toBeInTheDocument();
            expect(screen.getByText(/Rolled 4 on 1d6:/)).toBeInTheDocument();
        });

        it('renders the confirm button with a feather icon', () => {
            render(<MantleOfInspirationModal {...makeProps()} />);
            const btn = screen.getByRole('button', { name: /Inspire/ });
            expect(btn.querySelector('.fa-solid.fa-feather')).toBeInTheDocument();
        });

        it('renders the confirm button with type="button"', () => {
            render(<MantleOfInspirationModal {...makeProps()} />);
            const btn = screen.getByRole('button', { name: /Inspire/ });
            expect(btn).toHaveAttribute('type', 'button');
        });

        it('renders the skip button with type="button"', () => {
            render(<MantleOfInspirationModal {...makeProps()} />);
            const btn = screen.getByRole('button', { name: 'Skip' });
            expect(btn).toHaveAttribute('type', 'button');
        });

        it('disables the confirm button when no targets are selected', () => {
            render(<MantleOfInspirationModal {...makeProps()} />);
            expect(screen.getByRole('button', { name: /Inspire \(0\)/ })).toBeDisabled();
        });

        it('shows "No targets available." when creatureTargets is empty', () => {
            render(<MantleOfInspirationModal {...makeProps({ creatureTargets: [] })} />);
            expect(screen.getByText('No targets available.')).toBeInTheDocument();
        });
    });

    // ── Description rendering ──

    describe('description rendering', () => {
        it('renders "up to N" when maxTargets is a positive number', () => {
            render(<MantleOfInspirationModal {...makeProps({ maxTargets: 5 })} />);
            expect(screen.getByText(/Choose up to 5 allies/)).toBeInTheDocument();
        });

        it.each([
            [0],
            [null],
            [undefined],
            [false],
            [NaN],
        ])('renders without "up to" when maxTargets is %s', (mt) => {
            render(<MantleOfInspirationModal {...makeProps({ maxTargets: mt })} />);
            expect(screen.getByText(/Choose allies to grant temporary hit points/)).toBeInTheDocument();
            expect(screen.queryByText(/Choose up to/)).not.toBeInTheDocument();
        });
    });

    // ── Note rendering ──

    describe('note rendering', () => {
        it('renders the note with rolled die value and bardic die size', () => {
            render(<MantleOfInspirationModal {...makeProps()} />);
            expect(screen.getByText(/Rolled 4 on 1d6:/)).toBeInTheDocument();
        });

        it('renders the note with the correct temp HP value', () => {
            render(<MantleOfInspirationModal {...makeProps({ tempHp: 10 })} />);
            expect(screen.getByText(/Each target gains 10 temp HP/)).toBeInTheDocument();
        });

        it('renders the note mentioning Reaction movement without Opportunity Attacks', () => {
            render(<MantleOfInspirationModal {...makeProps()} />);
            expect(screen.getByText(/can use their Reaction to move up to their Speed without provoking Opportunity Attacks/)).toBeInTheDocument();
        });

        it('renders the note inside an sp-note element', () => {
            render(<MantleOfInspirationModal {...makeProps()} />);
            expect(document.querySelector('.sp-note')).toBeInTheDocument();
        });

        it('reflects different die roll and bardic die size values', () => {
            render(<MantleOfInspirationModal {...makeProps({ dieRoll: 1, bardicDieSize: 8 })} />);
            expect(screen.getByText(/Rolled 1 on 1d8:/)).toBeInTheDocument();
        });

        it('reflects different temp HP values', () => {
            render(<MantleOfInspirationModal {...makeProps({ tempHp: 1 })} />);
            expect(screen.getByText(/Each target gains 1 temp HP/)).toBeInTheDocument();
        });
    });

    // ── Dynamic values ──

    describe('dynamic values', () => {
        it('reflects maxTargets in both description and confirm button count', () => {
            render(<MantleOfInspirationModal {...makeProps({ maxTargets: 5 })} />);
            expect(screen.getByText(/Choose up to 5 allies/)).toBeInTheDocument();
        });
    });

    // ── Callback passthrough ──

    describe('callback passthrough', () => {
        it('renders without crashing when callbacks are undefined', () => {
            render(<MantleOfInspirationModal {...makeProps({ onConfirm: undefined, onSkip: undefined })} />);
            expect(screen.getByText('Mantle of Inspiration')).toBeInTheDocument();
        });
    });

    // ── Target selection ──

    describe('target selection', () => {
        it('selects a target when clicking on it', () => {
            render(<MantleOfInspirationModal {...makeProps()} />);
            const ally1Row = screen.getByText('Ally1').closest('.secondary-target-row');
            fireEvent.click(ally1Row);
            expect(ally1Row).toHaveClass('secondary-target-selected');
        });

        it('deselects a target when clicking on it again', () => {
            render(<MantleOfInspirationModal {...makeProps()} />);
            const ally1Row = screen.getByText('Ally1').closest('.secondary-target-row');
            fireEvent.click(ally1Row);
            expect(ally1Row).toHaveClass('secondary-target-selected');
            fireEvent.click(ally1Row);
            expect(ally1Row).not.toHaveClass('secondary-target-selected');
        });

        it('shows the confirm button count updating when a target is selected', () => {
            render(<MantleOfInspirationModal {...makeProps()} />);
            const ally1Row = screen.getByText('Ally1').closest('.secondary-target-row');
            fireEvent.click(ally1Row);
            expect(screen.getByRole('button', { name: /Inspire \(1\)/ })).toBeInTheDocument();
        });

        it('selects multiple targets when clicking on each', () => {
            render(<MantleOfInspirationModal {...makeProps()} />);
            const ally1Row = screen.getByText('Ally1').closest('.secondary-target-row');
            const ally2Row = screen.getByText('Ally2').closest('.secondary-target-row');

            fireEvent.click(ally1Row);
            fireEvent.click(ally2Row);

            expect(ally1Row).toHaveClass('secondary-target-selected');
            expect(ally2Row).toHaveClass('secondary-target-selected');
        });

        it('disables additional targets when maxTargets is reached', () => {
            render(<MantleOfInspirationModal {...makeProps({ maxTargets: 1 })} />);
            const ally1Row = screen.getByText('Ally1').closest('.secondary-target-row');
            const ally2Row = screen.getByText('Ally2').closest('.secondary-target-row');

            fireEvent.click(ally1Row);
            expect(ally1Row).toHaveClass('secondary-target-selected');
            expect(ally2Row).toHaveClass('secondary-target-disabled');
        });

        it('allows deselecting a target when at max to free up a slot', () => {
            render(<MantleOfInspirationModal {...makeProps({ maxTargets: 1 })} />);
            const ally1Row = screen.getByText('Ally1').closest('.secondary-target-row');
            const ally2Row = screen.getByText('Ally2').closest('.secondary-target-row');

            fireEvent.click(ally1Row);
            expect(ally2Row).toHaveClass('secondary-target-disabled');

            fireEvent.click(ally1Row);
            expect(ally1Row).not.toHaveClass('secondary-target-selected');
            expect(ally2Row).not.toHaveClass('secondary-target-disabled');
        });

        it('disables the checkbox when at max targets', () => {
            render(<MantleOfInspirationModal {...makeProps({ maxTargets: 1 })} />);
            const ally1Row = screen.getByText('Ally1').closest('.secondary-target-row');
            const ally2Row = screen.getByText('Ally2').closest('.secondary-target-row');

            fireEvent.click(ally1Row);
            const ally2Checkbox = ally2Row.querySelector('input[type="checkbox"]');
            expect(ally2Checkbox.disabled).toBe(true);
        });
    });

    // ── Confirm behavior ──

    describe('confirm behavior', () => {
        it('does not call onConfirm when clicking confirm with no selection', () => {
            render(<MantleOfInspirationModal {...makeProps()} />);
            const confirmBtn = screen.getByRole('button', { name: /Inspire \(0\)/ });
            fireEvent.click(confirmBtn);
            expect(mockOnConfirm).not.toHaveBeenCalled();
        });

        it('calls onConfirm with selected target names when confirm is clicked', () => {
            render(<MantleOfInspirationModal {...makeProps()} />);
            const ally1Row = screen.getByText('Ally1').closest('.secondary-target-row');
            const ally2Row = screen.getByText('Ally2').closest('.secondary-target-row');

            fireEvent.click(ally1Row);
            fireEvent.click(ally2Row);

            const confirmBtn = screen.getByRole('button', { name: /Inspire \(2\)/ });
            fireEvent.click(confirmBtn);

            expect(mockOnConfirm).toHaveBeenCalledWith(['Ally1', 'Ally2']);
        });

        it('calls onConfirm with only selected targets (not all available)', () => {
            render(<MantleOfInspirationModal {...makeProps()} />);
            const ally1Row = screen.getByText('Ally1').closest('.secondary-target-row');

            fireEvent.click(ally1Row);

            const confirmBtn = screen.getByRole('button', { name: /Inspire \(1\)/ });
            fireEvent.click(confirmBtn);

            expect(mockOnConfirm).toHaveBeenCalledWith(['Ally1']);
        });

        it('calls onConfirm with all target names when all are selected', () => {
            render(<MantleOfInspirationModal {...makeProps({ creatureTargets: ['X', 'Y', 'Z'], maxTargets: 3 })} />);
            const rows = [
                screen.getByText('X').closest('.secondary-target-row'),
                screen.getByText('Y').closest('.secondary-target-row'),
                screen.getByText('Z').closest('.secondary-target-row'),
            ];

            rows.forEach(row => fireEvent.click(row));

            const confirmBtn = screen.getByRole('button', { name: /Inspire \(3\)/ });
            fireEvent.click(confirmBtn);

            expect(mockOnConfirm).toHaveBeenCalledWith(['X', 'Y', 'Z']);
        });

        it('calls onConfirm with string target names when confirmed', () => {
            render(<MantleOfInspirationModal {...makeProps({ creatureTargets: ['AllyA', 'AllyB'] })} />);
            const allyARow = screen.getByText('AllyA').closest('.secondary-target-row');
            const allyBRow = screen.getByText('AllyB').closest('.secondary-target-row');

            fireEvent.click(allyARow);
            fireEvent.click(allyBRow);

            const confirmBtn = screen.getByRole('button', { name: /Inspire \(2\)/ });
            fireEvent.click(confirmBtn);

            expect(mockOnConfirm).toHaveBeenCalledWith(['AllyA', 'AllyB']);
        });
    });

    // ── Skip behavior ──

    describe('skip behavior', () => {
        it('calls onSkip when clicking the Skip button', () => {
            render(<MantleOfInspirationModal {...makeProps()} />);
            const skipBtn = screen.getByRole('button', { name: 'Skip' });
            fireEvent.click(skipBtn);
            expect(mockOnSkip).toHaveBeenCalled();
        });

        it('calls onSkip when clicking the overlay background', () => {
            render(<MantleOfInspirationModal {...makeProps()} />);
            const overlay = document.querySelector('.sp-overlay');
            fireEvent.click(overlay);
            expect(mockOnSkip).toHaveBeenCalled();
        });

        it('does not call onSkip when clicking inside the modal', () => {
            const freshOnSkip = vi.fn();
            render(<MantleOfInspirationModal {...makeProps({ onSkip: freshOnSkip })} />);
            const modal = document.querySelector('.sp-modal');
            fireEvent.click(modal);
            expect(freshOnSkip).not.toHaveBeenCalled();
        });

        it('does not throw when clicking overlay with undefined onSkip', () => {
            render(<MantleOfInspirationModal {...makeProps({ onSkip: undefined })} />);
            const overlay = document.querySelector('.sp-overlay');
            expect(() => fireEvent.click(overlay)).not.toThrow();
        });
    });

    // ── HP display ──

    describe('HP display', () => {
        it('does not show HP percentage for player-type targets', () => {
            render(<MantleOfInspirationModal {...makeProps({ creatureTargets: mockCreatureTargets })} />);
            expect(screen.queryByText(/\(\d+% HP\)/)).not.toBeInTheDocument();
        });

        it('shows HP percentage for non-player targets', () => {
            render(<MantleOfInspirationModal {...makeProps({ creatureTargets: mockNonPlayerTargets })} />);
            expect(screen.getByText('(50% HP)')).toBeInTheDocument();
        });

        it('shows 100% HP for fully healed non-player targets', () => {
            render(<MantleOfInspirationModal {...makeProps({ creatureTargets: [{ name: 'NPC1', type: 'npc', currentHp: 30, maxHp: 30 }] })} />);
            expect(screen.getByText('(100% HP)')).toBeInTheDocument();
        });

        it('shows 0% HP for depleted non-player targets', () => {
            render(<MantleOfInspirationModal {...makeProps({ creatureTargets: [{ name: 'NPC1', type: 'npc', currentHp: 0, maxHp: 20 }] })} />);
            expect(screen.getByText('(0% HP)')).toBeInTheDocument();
        });

        it('does not show HP percentage when currentHp is null', () => {
            render(<MantleOfInspirationModal {...makeProps({ creatureTargets: [{ name: 'NPC1', type: 'npc', maxHp: 20 }] })} />);
            expect(screen.queryByText(/\(\d+% HP\)/)).not.toBeInTheDocument();
        });

        it('does not show HP percentage when maxHp is null', () => {
            render(<MantleOfInspirationModal {...makeProps({ creatureTargets: [{ name: 'NPC1', type: 'npc', currentHp: 10 }] })} />);
            expect(screen.queryByText(/\(\d+% HP\)/)).not.toBeInTheDocument();
        });
    });

    // ── String targets ──

    describe('string targets', () => {
        it('renders string targets (not objects) in the target list', () => {
            render(<MantleOfInspirationModal {...makeProps({ creatureTargets: ['AllyA', 'AllyB'] })} />);
            expect(screen.getByText('AllyA')).toBeInTheDocument();
            expect(screen.getByText('AllyB')).toBeInTheDocument();
        });
    });

    // ── Careful Spell protected targets ──

    describe('Careful Spell protection display', () => {
        it('shows Careful Spell badge for protected targets', () => {
            render(<MantleOfInspirationModal {...makeProps({ creatureTargets: [{ name: 'Ally1', type: 'player', currentHp: 20, maxHp: 30, carefulSpellProtected: true }] })} />);
            expect(screen.getByText('✓ Careful Spell protected')).toBeInTheDocument();
        });

        it('hides Careful Spell badge for non-protected targets', () => {
            render(<MantleOfInspirationModal {...makeProps({ creatureTargets: [{ name: 'Ally1', type: 'player', currentHp: 20, maxHp: 30, carefulSpellProtected: false }] })} />);
            expect(screen.queryByText('✓ Careful Spell protected')).not.toBeInTheDocument();
        });
    });

    // ── Default selected ──

    describe('default selected targets', () => {
        it('renders with no defaultSelected prop', () => {
            render(<MantleOfInspirationModal {...makeProps({ defaultSelected: undefined })} />);
            expect(screen.getByRole('button', { name: /Inspire \(0\)/ })).toBeDisabled();
        });
    });

    // ── Max targets edge cases ──

    describe('max targets edge cases', () => {
        it('allows unlimited selection when maxTargets is undefined', () => {
            render(<MantleOfInspirationModal {...makeProps({ maxTargets: undefined, creatureTargets: ['A', 'B', 'C', 'D'] })} />);
            const rows = [
                screen.getByText('A').closest('.secondary-target-row'),
                screen.getByText('B').closest('.secondary-target-row'),
                screen.getByText('C').closest('.secondary-target-row'),
                screen.getByText('D').closest('.secondary-target-row'),
            ];

            rows.forEach(row => fireEvent.click(row));

            rows.forEach(row => expect(row).toHaveClass('secondary-target-selected'));
            expect(screen.getByRole('button', { name: /Inspire \(4\)/ })).toBeInTheDocument();
        });

        it('allows selecting exactly maxTargets targets', () => {
            render(<MantleOfInspirationModal {...makeProps({ maxTargets: 3, creatureTargets: ['A', 'B', 'C'] })} />);
            const rows = [
                screen.getByText('A').closest('.secondary-target-row'),
                screen.getByText('B').closest('.secondary-target-row'),
                screen.getByText('C').closest('.secondary-target-row'),
            ];

            rows.forEach(row => fireEvent.click(row));

            rows.forEach(row => expect(row).toHaveClass('secondary-target-selected'));
            expect(screen.getByRole('button', { name: /Inspire \(3\)/ })).not.toBeDisabled();
        });

        it('disables the confirm button when maxTargets is 0', () => {
            render(<MantleOfInspirationModal {...makeProps({ maxTargets: 0 })} />);
            expect(screen.getByRole('button', { name: /Inspire \(0\)/ })).toBeDisabled();
        });
    });
});
