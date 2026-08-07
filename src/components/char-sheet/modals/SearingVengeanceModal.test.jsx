import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SearingVengeanceModal from './SearingVengeanceModal';

const mockOnConfirm = vi.fn();
const mockOnSkip = vi.fn();

function makeProps(overrides) {
  return {
    creatureTargets: [
      { name: 'Enemy1', type: 'npc', currentHp: 20, maxHp: 30 },
      { name: 'Enemy2', type: 'npc', currentHp: 10, maxHp: 25 },
      'Enemy3',
    ],
    onConfirm: mockOnConfirm,
    onSkip: mockOnSkip,
    ...(overrides || {}),
  };
}

describe('SearingVengeanceModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with the correct title', () => {
      render(<SearingVengeanceModal {...makeProps()} />);
      expect(screen.getByText('Searing Vengeance')).toBeInTheDocument();
    });

    it('renders the fire icon in the header', () => {
      render(<SearingVengeanceModal {...makeProps()} />);
      const header = document.querySelector('.sp-header');
      expect(header.querySelector('i.fa-solid.fa-fire')).toBeInTheDocument();
    });

    it('renders the description text', () => {
      render(<SearingVengeanceModal {...makeProps()} />);
      expect(screen.getByText(/Select creatures within 30 feet/)).toBeInTheDocument();
    });

    it('renders the note with damage info', () => {
      render(<SearingVengeanceModal {...makeProps()} />);
      expect(screen.getByText(/Each selected creature takes 2d8 \+ Charisma modifier Radiant damage/)).toBeInTheDocument();
      expect(screen.getByText(/Blinded until end of your turn/)).toBeInTheDocument();
    });

    it('renders the confirm button with custom label', () => {
      render(<SearingVengeanceModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: 'Unleash Vengeance (0)' })).toBeInTheDocument();
    });

    it('renders the skip button', () => {
      render(<SearingVengeanceModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
    });

    it('renders targets from creatureTargets prop as objects', () => {
      render(<SearingVengeanceModal {...makeProps()} />);
      expect(screen.getByText('Enemy1')).toBeInTheDocument();
      expect(screen.getByText('Enemy2')).toBeInTheDocument();
      expect(screen.getByText('Enemy3')).toBeInTheDocument();
    });

    it('renders targets when they are strings', () => {
      render(<SearingVengeanceModal {...makeProps({ creatureTargets: ['Goblin', 'Orc'] })} />);
      expect(screen.getByText('Goblin')).toBeInTheDocument();
      expect(screen.getByText('Orc')).toBeInTheDocument();
    });

    it('shows "No targets available." when creatureTargets is empty', () => {
      render(<SearingVengeanceModal {...makeProps({ creatureTargets: [] })} />);
      expect(screen.getByText('No targets available.')).toBeInTheDocument();
    });

    it('disables confirm button when no targets are selected', () => {
      render(<SearingVengeanceModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: 'Unleash Vengeance (0)' })).toBeDisabled();
    });

    it('renders HP percentage for non-player targets', () => {
      render(<SearingVengeanceModal {...makeProps()} />);
      expect(screen.getByText('(67% HP)')).toBeInTheDocument();
    });

    it('does not render HP for player-type targets', () => {
      render(<SearingVengeanceModal {...makeProps({ creatureTargets: [{ name: 'Ally', type: 'player' }] })} />);
      expect(screen.queryByText(/% HP/)).not.toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('calls onSkip when skip button is clicked', () => {
      render(<SearingVengeanceModal {...makeProps()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
      expect(mockOnSkip).toHaveBeenCalledTimes(1);
    });

    it('calls onSkip when clicking the overlay background', () => {
      render(<SearingVengeanceModal {...makeProps()} />);
      fireEvent.click(document.querySelector('.sp-overlay'));
      expect(mockOnSkip).toHaveBeenCalledTimes(1);
    });

    it('selects a target by clicking the target row', async () => {
      render(<SearingVengeanceModal {...makeProps()} />);
      const labels = document.querySelectorAll('.secondary-target-row');
      await act(async () => fireEvent.click(labels[0]));
      expect(labels[0]).toHaveClass('secondary-target-selected');
    });

    it('toggles a target selection on and off', async () => {
      render(<SearingVengeanceModal {...makeProps()} />);
      const labels = document.querySelectorAll('.secondary-target-row');
      await act(async () => fireEvent.click(labels[0]));
      expect(labels[0]).toHaveClass('secondary-target-selected');
      await act(async () => fireEvent.click(labels[0]));
      expect(labels[0]).not.toHaveClass('secondary-target-selected');
    });

    it('selects multiple targets', async () => {
      render(<SearingVengeanceModal {...makeProps()} />);
      const labels = document.querySelectorAll('.secondary-target-row');
      await act(async () => fireEvent.click(labels[0]));
      await act(async () => fireEvent.click(labels[1]));
      expect(labels[0]).toHaveClass('secondary-target-selected');
      expect(labels[1]).toHaveClass('secondary-target-selected');
    });

    it('updates the confirm button label with selected count', async () => {
      render(<SearingVengeanceModal {...makeProps()} />);
      const labels = document.querySelectorAll('.secondary-target-row');
      await act(async () => fireEvent.click(labels[0]));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Unleash Vengeance (1)' })).toBeInTheDocument();
      });
      await act(async () => fireEvent.click(labels[1]));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Unleash Vengeance (2)' })).toBeInTheDocument();
      });
    });

    it('calls onConfirm with selected target names when targets are selected', async () => {
      render(<SearingVengeanceModal {...makeProps()} />);
      const labels = document.querySelectorAll('.secondary-target-row');
      await act(async () => fireEvent.click(labels[0]));
      await act(async () => fireEvent.click(labels[2]));
      fireEvent.click(screen.getByRole('button', { name: 'Unleash Vengeance (2)' }));
      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith(['Enemy1', 'Enemy3']);
      });
    });

    it('does not call onConfirm when no targets are selected', () => {
      render(<SearingVengeanceModal {...makeProps()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Unleash Vengeance (0)' }));
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('enables confirm button when at least one target is selected', async () => {
      render(<SearingVengeanceModal {...makeProps()} />);
      const labels = document.querySelectorAll('.secondary-target-row');
      await act(async () => fireEvent.click(labels[0]));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Unleash Vengeance (1)' })).not.toBeDisabled();
      });
    });

    it('disables target rows when no maxTargets limit is set (all selectable)', async () => {
      render(<SearingVengeanceModal {...makeProps()} />);
      const labels = document.querySelectorAll('.secondary-target-row');
      labels.forEach(label => {
        expect(label).not.toHaveClass('secondary-target-disabled');
      });
    });
  });
});
