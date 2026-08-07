import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ZealousPresenceModal from './ZealousPresenceModal.jsx';

const mockOnConfirm = vi.fn();
const mockOnSkip = vi.fn();

const mockTargets = [
    { name: 'Ally1', type: 'player', currentHp: 20, maxHp: 30 },
    { name: 'Ally2', type: 'player', currentHp: 15, maxHp: 25 },
    { name: 'NPC1', type: 'npc', currentHp: 10, maxHp: 20 },
];

const defaultProps = {
    targets: mockTargets,
    maxTargets: 2,
    onConfirm: mockOnConfirm,
    onSkip: mockOnSkip,
};

// ── Rendering ──

describe('ZealousPresenceModal', () => {
    // ── Initial render ──

    describe('initial render', () => {
        it('renders the Zealous Presence title', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            expect(screen.getByText('Zealous Presence')).toBeInTheDocument();
        });

        it('renders the bullseye icon in the header', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            expect(document.querySelector('.sp-header .fa-solid.fa-bullseye')).toBeInTheDocument();
        });

        it('renders all targets from the targets prop', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            expect(screen.getByText('Ally1')).toBeInTheDocument();
            expect(screen.getByText('Ally2')).toBeInTheDocument();
            expect(screen.getByText('NPC1')).toBeInTheDocument();
        });

        it('renders the confirm button with "Grant Advantage" label', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            expect(screen.getByRole('button', { name: /Grant Advantage \(0\)/ })).toBeInTheDocument();
        });

        it('renders the bullseye icon on the confirm button', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            const btn = screen.getByRole('button', { name: /Grant Advantage/ });
            expect(btn.querySelector('.fa-solid.fa-bullseye')).toBeInTheDocument();
        });

        it('renders the Skip button', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
        });
    });

    // ── Description rendering ──

    describe('description rendering', () => {
        it('renders the description text about advantage on attack rolls and saving throws', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            expect(screen.getByText(/Choose creatures to grant Advantage on attack rolls/)).toBeInTheDocument();
        });

        it('renders the description mentioning until the start of your next turn', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            expect(screen.getByText(/until the start of your next turn/)).toBeInTheDocument();
        });
    });

    // ── Empty targets ──

    describe('empty targets', () => {
        it('shows "No targets available." when targets is empty', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            const confirmBtn = screen.getByRole('button', { name: /Grant Advantage \(0\)/ });
            expect(confirmBtn).toBeDisabled();
        });

        it('renders the modal structure with empty targets', () => {
            render(<ZealousPresenceModal {...defaultProps} targets={[]} />);
            expect(screen.getByText('Zealous Presence')).toBeInTheDocument();
            expect(screen.getByText(/No targets available/)).toBeInTheDocument();
        });
    });

    // ── Target selection ──

    describe('target selection', () => {
        it('selects a target when clicking on it', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            const ally1Row = screen.getByText('Ally1').closest('.secondary-target-row');
            fireEvent.click(ally1Row);
            expect(ally1Row).toHaveClass('secondary-target-selected');
        });

        it('deselects a target when clicking on it again', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            const ally1Row = screen.getByText('Ally1').closest('.secondary-target-row');
            fireEvent.click(ally1Row);
            expect(ally1Row).toHaveClass('secondary-target-selected');
            fireEvent.click(ally1Row);
            expect(ally1Row).not.toHaveClass('secondary-target-selected');
        });

        it('shows the confirm button count updating when a target is selected', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            let confirmBtn = screen.getByRole('button', { name: /Grant Advantage \(0\)/ });
            expect(confirmBtn).toBeInTheDocument();

            const ally1Row = screen.getByText('Ally1').closest('.secondary-target-row');
            fireEvent.click(ally1Row);

            confirmBtn = screen.getByRole('button', { name: /Grant Advantage \(1\)/ });
            expect(confirmBtn).toBeInTheDocument();
        });

        it('selects multiple targets when clicking on each', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            const ally1Row = screen.getByText('Ally1').closest('.secondary-target-row');
            const ally2Row = screen.getByText('Ally2').closest('.secondary-target-row');

            fireEvent.click(ally1Row);
            fireEvent.click(ally2Row);

            expect(ally1Row).toHaveClass('secondary-target-selected');
            expect(ally2Row).toHaveClass('secondary-target-selected');
        });

        it('disables additional targets when maxTargets is reached', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            const ally1Row = screen.getByText('Ally1').closest('.secondary-target-row');
            const ally2Row = screen.getByText('Ally2').closest('.secondary-target-row');
            const npc1Row = screen.getByText('NPC1').closest('.secondary-target-row');

            fireEvent.click(ally1Row);
            fireEvent.click(ally2Row);

            expect(ally1Row).toHaveClass('secondary-target-selected');
            expect(ally2Row).toHaveClass('secondary-target-selected');
            expect(npc1Row).toHaveClass('secondary-target-disabled');
        });

        it('allows deselecting a target when at max to free up a slot', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            const ally1Row = screen.getByText('Ally1').closest('.secondary-target-row');
            const npc1Row = screen.getByText('NPC1').closest('.secondary-target-row');
            const ally2Row = screen.getByText('Ally2').closest('.secondary-target-row');

            // Select first two targets to reach max
            fireEvent.click(ally1Row);
            fireEvent.click(npc1Row);

            expect(ally1Row).toHaveClass('secondary-target-selected');
            expect(npc1Row).toHaveClass('secondary-target-selected');

            // Third target should be disabled since maxTargets is 2
            expect(ally2Row).toHaveClass('secondary-target-disabled');

            // Deselect ally1 to free up a slot
            fireEvent.click(ally1Row);
            expect(ally1Row).not.toHaveClass('secondary-target-selected');
            expect(ally1Row).not.toHaveClass('secondary-target-disabled');

            // Now ally2 should be selectable again
            expect(ally2Row).not.toHaveClass('secondary-target-disabled');
        });

        it('respects maxTargets of 1', () => {
            render(<ZealousPresenceModal {...defaultProps} maxTargets={1} />);
            const ally1Row = screen.getByText('Ally1').closest('.secondary-target-row');
            const ally2Row = screen.getByText('Ally2').closest('.secondary-target-row');

            fireEvent.click(ally1Row);
            expect(ally1Row).toHaveClass('secondary-target-selected');
            expect(ally2Row).toHaveClass('secondary-target-disabled');
        });

        it('allows selecting targets when maxTargets is undefined (no limit)', () => {
            render(<ZealousPresenceModal {...defaultProps} maxTargets={undefined} />);
            const ally1Row = screen.getByText('Ally1').closest('.secondary-target-row');
            const ally2Row = screen.getByText('Ally2').closest('.secondary-target-row');
            const npc1Row = screen.getByText('NPC1').closest('.secondary-target-row');

            fireEvent.click(ally1Row);
            fireEvent.click(ally2Row);
            fireEvent.click(npc1Row);

            expect(ally1Row).toHaveClass('secondary-target-selected');
            expect(ally2Row).toHaveClass('secondary-target-selected');
            expect(npc1Row).toHaveClass('secondary-target-selected');
            expect(ally1Row).not.toHaveClass('secondary-target-disabled');
            expect(ally2Row).not.toHaveClass('secondary-target-disabled');
            expect(npc1Row).not.toHaveClass('secondary-target-disabled');
        });
    });

    // ── HP display ──

    describe('HP display', () => {
        it('does not show HP percentage for player-type targets', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            expect(screen.queryByText('(67% HP)')).not.toBeInTheDocument();
        });

        it('shows HP percentage for non-player targets', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            expect(screen.getByText('(50% HP)')).toBeInTheDocument();
        });
    });

    // ── Confirm behavior ──

    describe('confirm behavior', () => {
        it('does not call onConfirm when clicking confirm with no selection', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            const confirmBtn = screen.getByRole('button', { name: /Grant Advantage \(0\)/ });
            expect(confirmBtn).toBeDisabled();
            fireEvent.click(confirmBtn);
            expect(mockOnConfirm).not.toHaveBeenCalled();
        });

        it('disables the confirm button when no targets are selected', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            const confirmBtn = screen.getByRole('button', { name: /Grant Advantage \(0\)/ });
            expect(confirmBtn).toBeDisabled();
        });

        it('calls onConfirm with selected target names when confirm is clicked', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            const ally1Row = screen.getByText('Ally1').closest('.secondary-target-row');
            const ally2Row = screen.getByText('Ally2').closest('.secondary-target-row');

            fireEvent.click(ally1Row);
            fireEvent.click(ally2Row);

            const confirmBtn = screen.getByRole('button', { name: /Grant Advantage \(2\)/ });
            fireEvent.click(confirmBtn);

            expect(mockOnConfirm).toHaveBeenCalledWith(['Ally1', 'Ally2']);
        });

        it('calls onConfirm with only selected targets (not all available)', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            const ally1Row = screen.getByText('Ally1').closest('.secondary-target-row');

            fireEvent.click(ally1Row);

            const confirmBtn = screen.getByRole('button', { name: /Grant Advantage \(1\)/ });
            fireEvent.click(confirmBtn);

            expect(mockOnConfirm).toHaveBeenCalledWith(['Ally1']);
        });

        it('calls onConfirm with single target when maxTargets is 1', () => {
            render(<ZealousPresenceModal {...defaultProps} maxTargets={1} />);
            const npc1Row = screen.getByText('NPC1').closest('.secondary-target-row');

            fireEvent.click(npc1Row);

            const confirmBtn = screen.getByRole('button', { name: /Grant Advantage \(1\)/ });
            fireEvent.click(confirmBtn);

            expect(mockOnConfirm).toHaveBeenCalledWith(['NPC1']);
        });

        it('calls onConfirm with targets selected in order of clicking', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            const npc1Row = screen.getByText('NPC1').closest('.secondary-target-row');
            const ally1Row = screen.getByText('Ally1').closest('.secondary-target-row');

            fireEvent.click(npc1Row);
            fireEvent.click(ally1Row);

            const confirmBtn = screen.getByRole('button', { name: /Grant Advantage \(2\)/ });
            fireEvent.click(confirmBtn);

            expect(mockOnConfirm).toHaveBeenCalledWith(['NPC1', 'Ally1']);
        });
    });

    // ── Skip behavior ──

    describe('skip behavior', () => {
        it('calls onSkip when clicking the Skip button', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            const skipBtn = screen.getByRole('button', { name: 'Skip' });
            fireEvent.click(skipBtn);
            expect(mockOnSkip).toHaveBeenCalled();
        });

        it('calls onSkip when clicking the overlay background', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            const overlay = document.querySelector('.sp-overlay');
            fireEvent.click(overlay);
            expect(mockOnSkip).toHaveBeenCalled();
        });

        it('does not call onSkip when clicking inside the modal', () => {
            const freshOnSkip = vi.fn();
            render(<ZealousPresenceModal {...defaultProps} onSkip={freshOnSkip} />);
            const modal = document.querySelector('.sp-modal');
            fireEvent.click(modal);
            expect(freshOnSkip).not.toHaveBeenCalled();
        });

        it('does not call onSkip when clicking inside the modal body', () => {
            const freshOnSkip = vi.fn();
            render(<ZealousPresenceModal {...defaultProps} onSkip={freshOnSkip} />);
            const body = document.querySelector('.sp-body');
            fireEvent.click(body);
            expect(freshOnSkip).not.toHaveBeenCalled();
        });
    });

    // ── Props passthrough ──

    describe('props passthrough', () => {
        it('renders with string targets', () => {
            render(<ZealousPresenceModal targets={['TargetA', 'TargetB']} maxTargets={2} onConfirm={mockOnConfirm} onSkip={mockOnSkip} />);
            expect(screen.getByText('TargetA')).toBeInTheDocument();
            expect(screen.getByText('TargetB')).toBeInTheDocument();
        });

        it('renders without maxTargets (undefined)', () => {
            render(<ZealousPresenceModal targets={mockTargets} onConfirm={mockOnConfirm} onSkip={mockOnSkip} />);
            expect(screen.getByText('Zealous Presence')).toBeInTheDocument();
        });

        it('renders without onConfirm', () => {
            render(<ZealousPresenceModal {...defaultProps} onConfirm={undefined} onSkip={mockOnSkip} />);
            expect(screen.getByText('Zealous Presence')).toBeInTheDocument();
        });

        it('renders without onSkip', () => {
            render(<ZealousPresenceModal {...defaultProps} onConfirm={mockOnConfirm} onSkip={undefined} />);
            expect(screen.getByText('Zealous Presence')).toBeInTheDocument();
        });
    });

    // ── Modal structure ──

    describe('modal structure', () => {
        it('renders the sp-overlay wrapper', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
        });

        it('renders the sp-modal container', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            expect(document.querySelector('.sp-modal')).toBeInTheDocument();
        });

        it('renders the sp-header with icon and title', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            const header = document.querySelector('.sp-header');
            expect(header).toHaveTextContent('Zealous Presence');
            expect(header.querySelector('.fa-bullseye')).toBeInTheDocument();
        });

        it('renders the sp-actions section', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            expect(document.querySelector('.sp-actions')).toBeInTheDocument();
        });

        it('renders the secondary-target-list', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            expect(document.querySelector('.secondary-target-list')).toBeInTheDocument();
        });

        it('has the correct number of secondary-target-row elements', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            const rows = document.querySelectorAll('.secondary-target-row');
            expect(rows).toHaveLength(3);
        });
    });
});
