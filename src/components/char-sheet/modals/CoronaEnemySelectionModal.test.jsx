import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CoronaEnemySelectionModal from './CoronaEnemySelectionModal.jsx';

const mockOnConfirm = vi.fn();
const mockOnSkip = vi.fn();

const mockTargets = [
  { name: 'Goblin A', type: 'enemy', currentHp: 5, maxHp: 10 },
  { name: 'Goblin B', type: 'enemy', currentHp: 3, maxHp: 10 },
  { name: 'Player Character', type: 'player', currentHp: 20, maxHp: 30 },
];

describe('CoronaEnemySelectionModal', () => {
  describe('hardcoded props passed to CreatureSelectionModal', () => {
    it('renders the hardcoded title "Corona of Light"', () => {
      render(
        <CoronaEnemySelectionModal
          creatureTargets={mockTargets}
          onConfirm={mockOnConfirm}
          onSkip={mockOnSkip}
        />
      );
      expect(screen.getByText('Corona of Light')).toBeInTheDocument();
    });

    it('renders the sun icon in the header', () => {
      render(
        <CoronaEnemySelectionModal
          creatureTargets={mockTargets}
          onConfirm={mockOnConfirm}
          onSkip={mockOnSkip}
        />
      );
      expect(document.querySelector('.sp-header .fa-solid.fa-sun')).toBeInTheDocument();
    });

    it('renders the hardcoded description about enemies in bright light', () => {
      render(
        <CoronaEnemySelectionModal
          creatureTargets={mockTargets}
          onConfirm={mockOnConfirm}
          onSkip={mockOnSkip}
        />
      );
      expect(
        screen.getByText(
          'Select which creatures are enemies of the caster. Enemies in the bright light have Disadvantage on saving throws against Fire and Radiant damage:'
        )
      ).toBeInTheDocument();
    });

    it('renders the hardcoded confirm label "Activate Corona"', () => {
      render(
        <CoronaEnemySelectionModal
          creatureTargets={mockTargets}
          onConfirm={mockOnConfirm}
          onSkip={mockOnSkip}
        />
      );
      expect(screen.getByRole('button', { name: /Activate Corona/ })).toBeInTheDocument();
    });

    it('renders the sun icon on the confirm button', () => {
      render(
        <CoronaEnemySelectionModal
          creatureTargets={mockTargets}
          onConfirm={mockOnConfirm}
          onSkip={mockOnSkip}
        />
      );
      const btn = screen.getByRole('button', { name: /Activate Corona/ });
      expect(btn.querySelector('.fa-solid.fa-sun')).toBeInTheDocument();
    });
  });

  describe('target passthrough', () => {
    it('renders all creature targets passed via creatureTargets prop', () => {
      render(
        <CoronaEnemySelectionModal
          creatureTargets={mockTargets}
          onConfirm={mockOnConfirm}
          onSkip={mockOnSkip}
        />
      );
      expect(screen.getByText('Goblin A')).toBeInTheDocument();
      expect(screen.getByText('Goblin B')).toBeInTheDocument();
      expect(screen.getByText('Player Character')).toBeInTheDocument();
    });

    it('renders targets when passed as strings', () => {
      render(
        <CoronaEnemySelectionModal
          creatureTargets={['Creature1', 'Creature2']}
          onConfirm={mockOnConfirm}
          onSkip={mockOnSkip}
        />
      );
      expect(screen.getByText('Creature1')).toBeInTheDocument();
      expect(screen.getByText('Creature2')).toBeInTheDocument();
    });

    it('renders nothing when creatureTargets is empty', () => {
      render(
        <CoronaEnemySelectionModal
          creatureTargets={[]}
          onConfirm={mockOnConfirm}
          onSkip={mockOnSkip}
        />
      );
      expect(screen.getByText('Corona of Light')).toBeInTheDocument();
      expect(screen.getByText('No targets available.')).toBeInTheDocument();
    });
  });

  describe('callback passthrough', () => {
    it('calls onSkip when the Skip button is clicked', () => {
      render(
        <CoronaEnemySelectionModal
          creatureTargets={mockTargets}
          onConfirm={mockOnConfirm}
          onSkip={mockOnSkip}
        />
      );
      expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
    });

    it('renders the overlay for skip-on-click behavior', () => {
      render(
        <CoronaEnemySelectionModal
          creatureTargets={mockTargets}
          onConfirm={mockOnConfirm}
          onSkip={mockOnSkip}
        />
      );
      expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
      expect(document.querySelector('.sp-modal')).toBeInTheDocument();
    });
  });

  describe('structural rendering', () => {
    it('renders the modal with sp-overlay and sp-modal classes', () => {
      render(
        <CoronaEnemySelectionModal
          creatureTargets={mockTargets}
          onConfirm={mockOnConfirm}
          onSkip={mockOnSkip}
        />
      );
      expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
      expect(document.querySelector('.sp-modal')).toBeInTheDocument();
    });

    it('renders the modal header with icon and title', () => {
      render(
        <CoronaEnemySelectionModal
          creatureTargets={mockTargets}
          onConfirm={mockOnConfirm}
          onSkip={mockOnSkip}
        />
      );
      const header = document.querySelector('.sp-header');
      expect(header).toBeInTheDocument();
      expect(header.textContent).toContain('Corona of Light');
    });

    it('renders the modal body with description', () => {
      render(
        <CoronaEnemySelectionModal
          creatureTargets={mockTargets}
          onConfirm={mockOnConfirm}
          onSkip={mockOnSkip}
        />
      );
      const body = document.querySelector('.sp-body');
      expect(body).toBeInTheDocument();
    });

    it('renders the actions area with confirm and skip buttons', () => {
      render(
        <CoronaEnemySelectionModal
          creatureTargets={mockTargets}
          onConfirm={mockOnConfirm}
          onSkip={mockOnSkip}
        />
      );
      const actions = document.querySelector('.sp-actions');
      expect(actions).toBeInTheDocument();
      expect(actions.querySelector('.sp-roll-btn')).toBeInTheDocument();
      expect(actions.querySelector('.sp-dismiss-btn')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('renders without crashing when onConfirm is undefined', () => {
      render(
        <CoronaEnemySelectionModal
          creatureTargets={mockTargets}
          onSkip={mockOnSkip}
        />
      );
      expect(screen.getByText('Corona of Light')).toBeInTheDocument();
    });

    it('renders without crashing when onSkip is undefined', () => {
      render(
        <CoronaEnemySelectionModal
          creatureTargets={mockTargets}
          onConfirm={mockOnConfirm}
        />
      );
      expect(screen.getByText('Corona of Light')).toBeInTheDocument();
    });


  });
});
