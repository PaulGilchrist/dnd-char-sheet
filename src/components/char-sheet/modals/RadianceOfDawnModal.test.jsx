import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RadianceOfDawnModal from './RadianceOfDawnModal.jsx';

const mockOnConfirm = vi.fn();
const mockOnSkip = vi.fn();

function makeProps(overrides) {
  return {
    creatureTargets: [
      { name: 'Enemy1', type: 'npc', currentHp: 20, maxHp: 30 },
      { name: 'Enemy2', type: 'npc', currentHp: 10, maxHp: 25 },
      { name: 'Enemy3' },
    ],
    saveType: 'Constitution',
    saveDc: 15,
    damageExpression: '8d10',
    damageType: 'Radiant',
    rangeFeet: 15,
    onConfirm: mockOnConfirm,
    onSkip: mockOnSkip,
    ...(overrides || {}),
  };
}

describe('RadianceOfDawnModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with the correct title, icon, and confirm label', () => {
      render(<RadianceOfDawnModal {...makeProps()} />);
      expect(screen.getByText('Radiance of the Dawn')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Channel Divinity/ })).toBeInTheDocument();
    });

    it('renders the description with range, save type, and DC', () => {
      render(<RadianceOfDawnModal {...makeProps()} />);
      expect(screen.getByText(/Select creatures within 15 feet/)).toBeInTheDocument();
      expect(screen.getByText(/Constitution/)).toBeInTheDocument();
      expect(screen.getByText(/DC 15/)).toBeInTheDocument();
    });

    it('renders the note with damage expression and type', () => {
      render(<RadianceOfDawnModal {...makeProps()} />);
      expect(screen.getByText(/On a failed save, target takes 8d10 Radiant damage/)).toBeInTheDocument();
      expect(screen.getByText(/On a successful save, target takes half damage/)).toBeInTheDocument();
    });

    it('renders targets from creatureTargets prop', () => {
      render(<RadianceOfDawnModal {...makeProps()} />);
      expect(screen.getByText('Enemy1')).toBeInTheDocument();
      expect(screen.getByText('Enemy2')).toBeInTheDocument();
      expect(screen.getByText('Enemy3')).toBeInTheDocument();
    });

    it('renders targets when they are strings', () => {
      render(<RadianceOfDawnModal {...makeProps({ creatureTargets: ['Enemy1', 'Enemy2'] })} />);
      expect(screen.getByText('Enemy1')).toBeInTheDocument();
      expect(screen.getByText('Enemy2')).toBeInTheDocument();
    });

    it('shows "No targets available." when creatureTargets is empty', () => {
      render(<RadianceOfDawnModal {...makeProps({ creatureTargets: [] })} />);
      expect(screen.getByText('No targets available.')).toBeInTheDocument();
    });

    it('disables confirm button when no targets are selected', () => {
      render(<RadianceOfDawnModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: /Channel Divinity/ })).toBeDisabled();
    });
  });

  describe('props passthrough', () => {
    it('passes creatureTargets to render targets', () => {
      render(<RadianceOfDawnModal {...makeProps({ creatureTargets: [{ name: 'CustomEnemy' }] })} />);
      expect(screen.getByText('CustomEnemy')).toBeInTheDocument();
    });

    it('calls onConfirm with selected target names', async () => {
      render(<RadianceOfDawnModal {...makeProps()} />);
      const labels = document.querySelectorAll('.secondary-target-row');
      await act(async () => fireEvent.click(labels[0]));
      fireEvent.click(screen.getByRole('button', { name: /Channel Divinity/ }));
      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith(['Enemy1']);
      });
    });

    it('calls onConfirm with multiple selected targets', async () => {
      render(<RadianceOfDawnModal {...makeProps()} />);
      const labels = document.querySelectorAll('.secondary-target-row');
      await act(async () => fireEvent.click(labels[0]));
      await act(async () => fireEvent.click(labels[2]));
      fireEvent.click(screen.getByRole('button', { name: /Channel Divinity/ }));
      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith(['Enemy1', 'Enemy3']);
      });
    });

    it('does not call onConfirm when no targets are selected', () => {
      render(<RadianceOfDawnModal {...makeProps()} />);
      fireEvent.click(screen.getByRole('button', { name: /Channel Divinity/ }));
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('calls onSkip when the Skip button is clicked', () => {
      render(<RadianceOfDawnModal {...makeProps()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
      expect(mockOnSkip).toHaveBeenCalledTimes(1);
    });

    it('calls onSkip when clicking the overlay background', () => {
      render(<RadianceOfDawnModal {...makeProps()} />);
      fireEvent.click(document.querySelector('.sp-overlay'));
      expect(mockOnSkip).toHaveBeenCalledTimes(1);
    });

    it('renders with different save type and DC', () => {
      render(<RadianceOfDawnModal {...makeProps({ saveType: 'Wisdom', saveDc: 18 })} />);
      expect(screen.getByText(/Wisdom/)).toBeInTheDocument();
      expect(screen.getByText(/DC 18/)).toBeInTheDocument();
    });

    it('renders with different damage expression and type', () => {
      render(<RadianceOfDawnModal {...makeProps({ damageExpression: '5d6', damageType: 'Fire' })} />);
      expect(screen.getByText(/On a failed save, target takes 5d6 Fire damage/)).toBeInTheDocument();
    });

    it('renders with different range', () => {
      render(<RadianceOfDawnModal {...makeProps({ rangeFeet: 30 })} />);
      expect(screen.getByText(/Select creatures within 30 feet/)).toBeInTheDocument();
    });

    it('shows selected count in the button label', async () => {
      render(<RadianceOfDawnModal {...makeProps()} />);
      const labels = document.querySelectorAll('.secondary-target-row');
      await act(async () => fireEvent.click(labels[0]));
      await act(async () => fireEvent.click(labels[1]));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Channel Divinity \(2\)/ })).toBeInTheDocument();
      });
    });

    it('updates the button label when selection changes', async () => {
      render(<RadianceOfDawnModal {...makeProps()} />);
      const labels = document.querySelectorAll('.secondary-target-row');
      await act(async () => fireEvent.click(labels[0]));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Channel Divinity \(1\)/ })).toBeInTheDocument();
      });
      await act(async () => fireEvent.click(labels[1]));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Channel Divinity \(2\)/ })).toBeInTheDocument();
      });
      await act(async () => fireEvent.click(labels[0]));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Channel Divinity \(1\)/ })).toBeInTheDocument();
      });
    });
  });

  describe('structural rendering', () => {
    it('renders the modal with sp-overlay and sp-modal classes', () => {
      render(<RadianceOfDawnModal {...makeProps()} />);
      expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
      expect(document.querySelector('.sp-modal')).toBeInTheDocument();
    });

    it('renders the modal header with sun icon and title', () => {
      render(<RadianceOfDawnModal {...makeProps()} />);
      const header = document.querySelector('.sp-header');
      expect(header).toBeInTheDocument();
      expect(header.querySelector('.fa-solid.fa-sun')).toBeInTheDocument();
      expect(header.textContent).toContain('Radiance of the Dawn');
    });

    it('renders the modal body with description and note', () => {
      render(<RadianceOfDawnModal {...makeProps()} />);
      expect(document.querySelector('.sp-body')).toBeInTheDocument();
      expect(document.querySelector('.sp-note')).toBeInTheDocument();
    });

    it('renders the actions area with confirm and skip buttons', () => {
      render(<RadianceOfDawnModal {...makeProps()} />);
      const actions = document.querySelector('.sp-actions');
      expect(actions).toBeInTheDocument();
      expect(actions.querySelector('.sp-roll-btn')).toBeInTheDocument();
      expect(actions.querySelector('.sp-dismiss-btn')).toBeInTheDocument();
    });

    it('renders the sun icon on the confirm button', () => {
      render(<RadianceOfDawnModal {...makeProps()} />);
      const btn = screen.getByRole('button', { name: /Channel Divinity/ });
      expect(btn.querySelector('.fa-solid.fa-sun')).toBeInTheDocument();
    });

    it('renders with hp percentage for non-player creatures', () => {
      render(<RadianceOfDawnModal {...makeProps()} />);
      expect(screen.getByText('(67% HP)')).toBeInTheDocument();
      expect(screen.getByText('(40% HP)')).toBeInTheDocument();
    });

    it('does not show HP for player-type creatures', () => {
      render(<RadianceOfDawnModal {...makeProps({ creatureTargets: [{ name: 'Ally', type: 'player', currentHp: 20, maxHp: 30 }] })} />);
      expect(screen.getByText('Ally')).toBeInTheDocument();
      expect(screen.queryByText('(67% HP)')).not.toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('renders without crashing when creatureTargets is an empty array', () => {
      render(<RadianceOfDawnModal {...makeProps({ creatureTargets: [] })} />);
      expect(screen.getByText('Radiance of the Dawn')).toBeInTheDocument();
      expect(screen.getByText('No targets available.')).toBeInTheDocument();
    });
  });
});
