// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
    onConfirm: mockOnConfirm,
    onSkip: mockOnSkip,
};

beforeEach(() => {
    vi.clearAllMocks();
});

// ── Wrapper behavior ──

describe('ZealousPresenceModal', () => {
    // ── Hardcoded props verification ──

    describe('hardcoded props', () => {
        it('renders with the correct title', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            expect(screen.getByText('Zealous Presence')).toBeInTheDocument();
        });

        it('renders the bullseye icon in the header', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            expect(document.querySelector('.sp-header .fa-solid.fa-bullseye')).toBeInTheDocument();
        });

        it('renders the correct description text', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            expect(screen.getByText(/Choose creatures to grant Advantage on attack rolls/)).toBeInTheDocument();
            expect(screen.getByText(/until the start of your next turn/)).toBeInTheDocument();
        });

        it('renders the "Grant Advantage" confirm button label', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            expect(screen.getByRole('button', { name: /Grant Advantage/ })).toBeInTheDocument();
        });

        it('renders the bullseye icon on the confirm button', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            const btn = screen.getByRole('button', { name: /Grant Advantage/ });
            expect(btn.querySelector('.fa-solid.fa-bullseye')).toBeInTheDocument();
        });
    });

    // ── Props passthrough ──

    describe('props passthrough', () => {
        it('passes through string targets', () => {
            render(<ZealousPresenceModal targets={['TargetA', 'TargetB']} onConfirm={mockOnConfirm} onSkip={mockOnSkip} />);
            expect(screen.getByText('TargetA')).toBeInTheDocument();
            expect(screen.getByText('TargetB')).toBeInTheDocument();
        });

        it('passes through maxTargets limit', () => {
            render(<ZealousPresenceModal {...defaultProps} maxTargets={1} />);
            const ally1Row = screen.getByText('Ally1').closest('.secondary-target-row');
            const ally2Row = screen.getByText('Ally2').closest('.secondary-target-row');

            fireEvent.click(ally1Row);
            expect(ally1Row).toHaveClass('secondary-target-selected');
            expect(ally2Row).toHaveClass('secondary-target-disabled');
        });

        it('allows unlimited selection when maxTargets is undefined', () => {
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
        });

        it('calls onConfirm with selected target names', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            const ally1Row = screen.getByText('Ally1').closest('.secondary-target-row');
            const npc1Row = screen.getByText('NPC1').closest('.secondary-target-row');

            fireEvent.click(ally1Row);
            fireEvent.click(npc1Row);

            const confirmBtn = screen.getByRole('button', { name: /Grant Advantage \(2\)/ });
            fireEvent.click(confirmBtn);

            expect(mockOnConfirm).toHaveBeenCalledWith(['Ally1', 'NPC1']);
        });

        it('does not call onConfirm when no targets are selected', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            const confirmBtn = screen.getByRole('button', { name: /Grant Advantage \(0\)/ });
            expect(confirmBtn).toBeDisabled();
            fireEvent.click(confirmBtn);
            expect(mockOnConfirm).not.toHaveBeenCalled();
        });

        it('calls onSkip when Skip is clicked', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
            expect(mockOnSkip).toHaveBeenCalledOnce();
        });

        it('calls onSkip when clicking the overlay background', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            fireEvent.click(document.querySelector('.sp-overlay'));
            expect(mockOnSkip).toHaveBeenCalledOnce();
        });

        it('does not call onSkip when clicking inside the modal', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            fireEvent.click(document.querySelector('.sp-modal'));
            expect(mockOnSkip).not.toHaveBeenCalled();
        });

        it('renders without crashing when onConfirm is undefined', () => {
            render(<ZealousPresenceModal {...defaultProps} onConfirm={undefined} />);
            expect(screen.getByText('Zealous Presence')).toBeInTheDocument();
        });

        it('renders without crashing when onSkip is undefined', () => {
            render(<ZealousPresenceModal {...defaultProps} onSkip={undefined} />);
            expect(screen.getByText('Zealous Presence')).toBeInTheDocument();
        });

        it('renders with empty targets and disables confirm', () => {
            render(<ZealousPresenceModal targets={[]} onConfirm={mockOnConfirm} onSkip={mockOnSkip} />);
            expect(screen.getByText('Zealous Presence')).toBeInTheDocument();
            expect(screen.getByText(/No targets available/)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Grant Advantage \(0\)/ })).toBeDisabled();
        });

        it('renders HP percentage for non-player targets', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            expect(screen.getByText('(50% HP)')).toBeInTheDocument();
        });

        it('does not show HP percentage for player-type targets', () => {
            render(<ZealousPresenceModal {...defaultProps} />);
            expect(screen.queryByText('(67% HP)')).not.toBeInTheDocument();
        });
    });
});
