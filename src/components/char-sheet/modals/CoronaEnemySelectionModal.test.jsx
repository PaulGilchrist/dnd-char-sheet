// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CoronaEnemySelectionModal from './CoronaEnemySelectionModal.jsx';

const mockOnConfirm = vi.fn();
const mockOnSkip = vi.fn();

const mockTargets = [
  { name: 'Goblin A', type: 'enemy', currentHp: 5, maxHp: 10 },
  { name: 'Goblin B', type: 'enemy', currentHp: 3, maxHp: 10 },
  { name: 'Player Character', type: 'player', currentHp: 20, maxHp: 30 },
];

function makeProps(overrides) {
  return {
    creatureTargets: mockTargets,
    onConfirm: mockOnConfirm,
    onSkip: mockOnSkip,
    ...(overrides || {}),
  };
}

describe('CoronaEnemySelectionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the modal title "Corona of Light"', () => {
      render(<CoronaEnemySelectionModal {...makeProps()} />);
      expect(screen.getByText('Corona of Light')).toBeInTheDocument();
    });

    it('renders the description about enemies in bright light', () => {
      render(<CoronaEnemySelectionModal {...makeProps()} />);
      expect(
        screen.getByText(
          'Select which creatures are enemies of the caster. Enemies in the bright light have Disadvantage on saving throws against Fire and Radiant damage:'
        )
      ).toBeInTheDocument();
    });

    it('renders the confirm button with label "Activate Corona"', () => {
      render(<CoronaEnemySelectionModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: /Activate Corona/ })).toBeInTheDocument();
    });

    it('renders the skip button', () => {
      render(<CoronaEnemySelectionModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
    });

    it('renders all creature targets passed via creatureTargets prop', () => {
      render(<CoronaEnemySelectionModal {...makeProps()} />);
      expect(screen.getByText('Goblin A')).toBeInTheDocument();
      expect(screen.getByText('Goblin B')).toBeInTheDocument();
      expect(screen.getByText('Player Character')).toBeInTheDocument();
    });

    it('renders targets when passed as strings', () => {
      render(<CoronaEnemySelectionModal {...makeProps({ creatureTargets: ['Creature1', 'Creature2'] })} />);
      expect(screen.getByText('Creature1')).toBeInTheDocument();
      expect(screen.getByText('Creature2')).toBeInTheDocument();
    });

    it('shows "No targets available." when creatureTargets is empty', () => {
      render(<CoronaEnemySelectionModal {...makeProps({ creatureTargets: [] })} />);
      expect(screen.getByText('No targets available.')).toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    it('calls onSkip when the Skip button is clicked', () => {
      render(<CoronaEnemySelectionModal {...makeProps()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
      expect(mockOnSkip).toHaveBeenCalledTimes(1);
    });

    it('calls onSkip when clicking the overlay background', () => {
      render(<CoronaEnemySelectionModal {...makeProps()} />);
      fireEvent.click(document.querySelector('.sp-overlay'));
      expect(mockOnSkip).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('renders without crashing when onConfirm is undefined', () => {
      render(<CoronaEnemySelectionModal {...makeProps({ onConfirm: undefined })} />);
      expect(screen.getByText('Corona of Light')).toBeInTheDocument();
    });

    it('renders without crashing when onSkip is undefined', () => {
      render(<CoronaEnemySelectionModal {...makeProps({ onSkip: undefined })} />);
      expect(screen.getByText('Corona of Light')).toBeInTheDocument();
    });


  });
});
