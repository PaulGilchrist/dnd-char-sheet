// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EncounterSelectedMonsters from './EncounterSelectedMonsters.jsx';

describe('EncounterSelectedMonsters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseMonster = {
    index: 'goblin',
    name: 'Goblin',
    xp: 50,
    challenge_rating: 0.25,
  };

  describe('empty/null state', () => {
    it('returns null when selectedMonsters is empty array', () => {
      const { container } = render(
        <EncounterSelectedMonsters selectedMonsters={[]} onRemoveMonster={vi.fn()} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('returns null when selectedMonsters is null', () => {
      const { container } = render(
        <EncounterSelectedMonsters selectedMonsters={null} onRemoveMonster={vi.fn()} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('returns null when selectedMonsters is undefined', () => {
      const { container } = render(
        <EncounterSelectedMonsters onRemoveMonster={vi.fn()} />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('monster list rendering', () => {
    it('renders the section header with total monster count including qty multipliers', () => {
      render(
        <EncounterSelectedMonsters
          selectedMonsters={[
            { ...baseMonster, qty: 3 },
            { index: 'orc', name: 'Orc', xp: 100, challenge_rating: 0.5, qty: 2 },
          ]}
          onRemoveMonster={vi.fn()}
        />
      );
      expect(screen.getByText('Selected Monsters (5)')).toBeInTheDocument();
    });

    it('renders total count without qty multiplier when qty is absent', () => {
      render(
        <EncounterSelectedMonsters
          selectedMonsters={[
            baseMonster,
            { index: 'orc', name: 'Orc', xp: 100, challenge_rating: 0.5 },
          ]}
          onRemoveMonster={vi.fn()}
        />
      );
      expect(screen.getByText('Selected Monsters (2)')).toBeInTheDocument();
    });

    it('renders total count mixing monsters with and without qty', () => {
      render(
        <EncounterSelectedMonsters
          selectedMonsters={[
            { ...baseMonster, qty: 4 },
            { index: 'orc', name: 'Orc', xp: 100, challenge_rating: 0.5 },
            { index: 'troll', name: 'Troll', xp: 200, challenge_rating: 5, qty: 2 },
          ]}
          onRemoveMonster={vi.fn()}
        />
      );
      expect(screen.getByText('Selected Monsters (7)')).toBeInTheDocument();
    });

    it('renders monster names, CR, and XP', () => {
      render(
        <EncounterSelectedMonsters
          selectedMonsters={[
            { index: 'goblin', name: 'Goblin', xp: 50, challenge_rating: 0.25 },
            { index: 'orc', name: 'Orc', xp: 100, challenge_rating: 0.5 },
          ]}
          onRemoveMonster={vi.fn()}
        />
      );
      expect(screen.getByText('Goblin')).toBeInTheDocument();
      expect(screen.getByText('Orc')).toBeInTheDocument();
      expect(screen.getByText('CR 0.25')).toBeInTheDocument();
      expect(screen.getByText('CR 0.5')).toBeInTheDocument();
      expect(screen.getByText('50 XP')).toBeInTheDocument();
      expect(screen.getByText('100 XP')).toBeInTheDocument();
    });

    it('displays total XP when qty is greater than 1', () => {
      render(
        <EncounterSelectedMonsters
          selectedMonsters={[
            { ...baseMonster, qty: 3 },
          ]}
          onRemoveMonster={vi.fn()}
        />
      );
      expect(screen.getByText('150 XP')).toBeInTheDocument();
    });

    it('displays total XP with thousands separators for large numbers', () => {
      render(
        <EncounterSelectedMonsters
          selectedMonsters={[
            { index: 'ancient-red-dragon', name: 'Ancient Red Dragon', xp: 25000, challenge_rating: 24, qty: 2 },
          ]}
          onRemoveMonster={vi.fn()}
        />
      );
      expect(screen.getByText('50,000 XP')).toBeInTheDocument();
    });

    it('renders monster names with qty when qty > 1', () => {
      render(
        <EncounterSelectedMonsters
          selectedMonsters={[
            { ...baseMonster, index: 'goblin-qty5', name: 'Goblin', qty: 5 },
            { ...baseMonster, index: 'goblin-qty1', name: 'Goblin A', qty: 1 },
            { ...baseMonster, index: 'goblin-no-qty', name: 'Goblin B' },
          ]}
          onRemoveMonster={vi.fn()}
        />
      );
      expect(screen.getByText('Goblin (5)')).toBeInTheDocument();
      expect(screen.getByText('Goblin A')).toBeInTheDocument();
      expect(screen.queryByText('Goblin A (1)')).not.toBeInTheDocument();
      expect(screen.getByText('Goblin B')).toBeInTheDocument();
      expect(screen.queryByText('Goblin B (1)')).not.toBeInTheDocument();
    });

    it('renders with integer CR values', () => {
      render(
        <EncounterSelectedMonsters
          selectedMonsters={[
            { index: 'troll', name: 'Troll', xp: 200, challenge_rating: 5 },
          ]}
          onRemoveMonster={vi.fn()}
        />
      );
      expect(screen.getByText('CR 5')).toBeInTheDocument();
    });

    it('renders with CR 0', () => {
      render(
        <EncounterSelectedMonsters
          selectedMonsters={[
            { index: 'rat', name: 'Rat', xp: 5, challenge_rating: 0 },
          ]}
          onRemoveMonster={vi.fn()}
        />
      );
      expect(screen.getByText('CR 0')).toBeInTheDocument();
    });

    it('renders multiple monsters in the correct structure', () => {
      const { container } = render(
        <EncounterSelectedMonsters
          selectedMonsters={[
            baseMonster,
            { index: 'orc', name: 'Orc', xp: 100, challenge_rating: 0.5 },
          ]}
          onRemoveMonster={vi.fn()}
        />
      );
      const selectedDiv = container.querySelector('.encounter-selected');
      expect(selectedDiv).toBeInTheDocument();
      expect(selectedDiv.querySelector('.encounter-selected-title')).toBeInTheDocument();
      expect(selectedDiv.querySelector('.selected-list')).toBeInTheDocument();

      const items = selectedDiv.querySelectorAll('.selected-item');
      expect(items).toHaveLength(2);
    });
  });

  describe('remove button', () => {
    it('calls onRemoveMonster with monster index when clicked', () => {
      const onRemove = vi.fn();
      render(
        <EncounterSelectedMonsters
          selectedMonsters={[baseMonster]}
          onRemoveMonster={onRemove}
        />
      );
      fireEvent.click(screen.getByLabelText('Remove Goblin'));
      expect(onRemove).toHaveBeenCalledWith('goblin');
    });

    it('renders remove button for every monster', () => {
      const { container } = render(
        <EncounterSelectedMonsters
          selectedMonsters={[
            baseMonster,
            { index: 'orc', name: 'Orc', xp: 100, challenge_rating: 0.5 },
          ]}
          onRemoveMonster={vi.fn()}
        />
      );
      const removeButtons = container.querySelectorAll('.remove-btn');
      expect(removeButtons).toHaveLength(2);
    });

    it('calls onRemoveMonster with correct index for each monster', () => {
      const onRemove = vi.fn();
      render(
        <EncounterSelectedMonsters
          selectedMonsters={[
            { index: 'goblin', name: 'Goblin', xp: 50, challenge_rating: 0.25 },
            { index: 'orc', name: 'Orc', xp: 100, challenge_rating: 0.5 },
          ]}
          onRemoveMonster={onRemove}
        />
      );
      fireEvent.click(screen.getByLabelText('Remove Orc'));
      expect(onRemove).toHaveBeenCalledWith('orc');
      fireEvent.click(screen.getByLabelText('Remove Goblin'));
      expect(onRemove).toHaveBeenCalledWith('goblin');
    });
  });

  describe('details button', () => {
    it('does not render a details button when onViewDetails is not provided', () => {
      const { container } = render(
        <EncounterSelectedMonsters
          selectedMonsters={[baseMonster]}
          onRemoveMonster={vi.fn()}
        />
      );
      const detailsBtn = container.querySelector('.details-btn');
      expect(detailsBtn).toBeNull();
    });

    it('renders a details button when onViewDetails is provided', () => {
      render(
        <EncounterSelectedMonsters
          selectedMonsters={[baseMonster]}
          onRemoveMonster={vi.fn()}
          onViewDetails={vi.fn()}
        />
      );
      expect(screen.getByLabelText('View details for Goblin')).toBeInTheDocument();
    });

    it('calls onViewDetails with the monster object when details button clicked', () => {
      const onViewDetails = vi.fn();
      render(
        <EncounterSelectedMonsters
          selectedMonsters={[baseMonster]}
          onRemoveMonster={vi.fn()}
          onViewDetails={onViewDetails}
        />
      );
      fireEvent.click(screen.getByLabelText('View details for Goblin'));
      expect(onViewDetails).toHaveBeenCalledWith(baseMonster);
    });

    it('calls onViewDetails with the correct monster when multiple monsters exist', () => {
      const onViewDetails = vi.fn();
      render(
        <EncounterSelectedMonsters
          selectedMonsters={[
            { index: 'goblin', name: 'Goblin', xp: 50, challenge_rating: 0.25 },
            { index: 'orc', name: 'Orc', xp: 100, challenge_rating: 0.5 },
          ]}
          onRemoveMonster={vi.fn()}
          onViewDetails={onViewDetails}
        />
      );
      fireEvent.click(screen.getByLabelText('View details for Orc'));
      expect(onViewDetails).toHaveBeenCalledWith({
        index: 'orc',
        name: 'Orc',
        xp: 100,
        challenge_rating: 0.5,
      });
    });
  });
});
