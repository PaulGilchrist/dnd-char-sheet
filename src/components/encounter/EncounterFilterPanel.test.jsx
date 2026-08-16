// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EncounterFilterPanel from './EncounterFilterPanel.jsx';

describe('EncounterFilterPanel', () => {
  let props;

  const defaultFilter = {
    difficulty: 2,
    playerLevels: [5, 5],
    totalThreshold: 600,
    difficultyIndex: 2,
    difficultyLabels: ['Easy', 'Medium', 'Hard', 'Deadly'],
    difficultyColors: ['var(--color-success)', 'var(--color-warning)', '#fd7e14', 'var(--color-error)'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    props = {
      filter: defaultFilter,
      onDifficultyChange: vi.fn(),
      onEnvironmentChange: vi.fn(),
      onAddPlayer: vi.fn(),
      onRemovePlayer: vi.fn(),
      onPlayerLevelChange: vi.fn(),
    };
  });

  describe('rendering', () => {
    it('renders the root container', () => {
      render(<EncounterFilterPanel {...props} />);
      expect(screen.getByRole('combobox', { name: /difficulty/i })).toBeInTheDocument();
    });

    it('renders the difficulty label', () => {
      render(<EncounterFilterPanel {...props} />);
      expect(screen.getByText('Difficulty')).toBeInTheDocument();
    });

    it('renders the party label', () => {
      render(<EncounterFilterPanel {...props} />);
      expect(screen.getByText('Party')).toBeInTheDocument();
    });

    it('renders the Add Player button with Font Awesome icon', () => {
      render(<EncounterFilterPanel {...props} />);
      const addBtn = screen.getByRole('button', { name: /add player/i });
      expect(addBtn).toBeInTheDocument();
      expect(addBtn.querySelector('.fa-solid.fa-plus')).toBeInTheDocument();
    });

    it('renders a row for each player level with correct labels', () => {
      render(<EncounterFilterPanel {...props} />);
      expect(screen.getByText('PC 1')).toBeInTheDocument();
      expect(screen.getByText('PC 2')).toBeInTheDocument();
    });

    it('renders player level number inputs', () => {
      render(<EncounterFilterPanel {...props} />);
      expect(screen.getByLabelText('PC 1')).toHaveValue(5);
      expect(screen.getByLabelText('PC 2')).toHaveValue(5);
    });

    it('renders remove buttons with correct aria-labels', () => {
      render(<EncounterFilterPanel {...props} />);
      expect(screen.getByLabelText('Remove player 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Remove player 2')).toBeInTheDocument();
    });

    it('renders all four difficulty options', () => {
      render(<EncounterFilterPanel {...props} />);
      const options = screen.getAllByRole('option');
      const optionValues = options.map((o) => o.value);
      expect(optionValues).toEqual(['0', '1', '2', '3']);
      expect(options[0]).toHaveTextContent('Easy');
      expect(options[1]).toHaveTextContent('Medium');
      expect(options[2]).toHaveTextContent('Hard');
      expect(options[3]).toHaveTextContent('Deadly');
    });
  });

  describe('difficulty dropdown', () => {
    it('renders the difficulty select with the correct value', () => {
      render(<EncounterFilterPanel {...props} />);
      const select = screen.getByRole('combobox', { name: /difficulty/i });
      expect(select).toHaveValue('2');
    });

    it('renders with Easy selected when difficulty is 0', () => {
      render(<EncounterFilterPanel {...props} filter={{ ...props.filter, difficulty: 0 }} />);
      expect(screen.getByRole('combobox', { name: /difficulty/i })).toHaveValue('0');
    });

    it('renders with Medium selected when difficulty is 1', () => {
      render(<EncounterFilterPanel {...props} filter={{ ...props.filter, difficulty: 1 }} />);
      expect(screen.getByRole('combobox', { name: /difficulty/i })).toHaveValue('1');
    });

    it('renders with Deadly selected when difficulty is 3', () => {
      render(<EncounterFilterPanel {...props} filter={{ ...props.filter, difficulty: 3 }} />);
      expect(screen.getByRole('combobox', { name: /difficulty/i })).toHaveValue('3');
    });

    it('calls onDifficultyChange when selection changes', () => {
      render(<EncounterFilterPanel {...props} />);
      const select = screen.getByRole('combobox', { name: /difficulty/i });
      fireEvent.change(select, { target: { value: '3' } });
      expect(props.onDifficultyChange).toHaveBeenCalled();
    });
  });

  describe('player levels', () => {
    it('renders the Add Player button', () => {
      render(<EncounterFilterPanel {...props} />);
      expect(screen.getByRole('button', { name: /add player/i })).toBeInTheDocument();
    });

    it('calls onAddPlayer when Add Player is clicked', () => {
      render(<EncounterFilterPanel {...props} />);
      fireEvent.click(screen.getByRole('button', { name: /add player/i }));
      expect(props.onAddPlayer).toHaveBeenCalled();
    });

    it('calls onRemovePlayer with the correct index when remove button is clicked', () => {
      render(<EncounterFilterPanel {...props} />);
      fireEvent.click(screen.getByLabelText('Remove player 1'));
      expect(props.onRemovePlayer).toHaveBeenCalledWith(0);
    });

    it('calls onRemovePlayer with the correct index for the second player', () => {
      render(<EncounterFilterPanel {...props} />);
      fireEvent.click(screen.getByLabelText('Remove player 2'));
      expect(props.onRemovePlayer).toHaveBeenCalledWith(1);
    });

    it('disables the remove button when only one player remains', () => {
      render(<EncounterFilterPanel {...props} filter={{ ...props.filter, playerLevels: [5] }} />);
      expect(screen.getByLabelText('Remove player 1')).toBeDisabled();
    });

    it('does not disable remove buttons when multiple players exist', () => {
      render(<EncounterFilterPanel {...props} />);
      expect(screen.getByLabelText('Remove player 1')).not.toBeDisabled();
      expect(screen.getByLabelText('Remove player 2')).not.toBeDisabled();
    });

    it('calls onPlayerLevelChange with numeric index and converted number value', () => {
      render(<EncounterFilterPanel {...props} />);
      const input = screen.getByLabelText('PC 1');
      fireEvent.change(input, { target: { value: '10' } });
      expect(props.onPlayerLevelChange).toHaveBeenCalledWith(0, 10);
    });

    it('updates player level input for each player', () => {
      const { rerender } = render(<EncounterFilterPanel {...props} />);
      const input1 = screen.getByLabelText('PC 1');
      const input2 = screen.getByLabelText('PC 2');
      expect(input1).toHaveValue(5);
      expect(input2).toHaveValue(5);

      rerender(<EncounterFilterPanel {...props} filter={{ ...props.filter, playerLevels: [8, 12] }} />);
      expect(input1).toHaveValue(8);
      expect(input2).toHaveValue(12);
    });

    it('renders no player rows when playerLevels is empty', () => {
      render(<EncounterFilterPanel {...props} filter={{ ...props.filter, playerLevels: [] }} />);
      expect(screen.queryByText(/^PC \d+$/)).not.toBeInTheDocument();
    });
  });

  describe('threshold display', () => {
    it('shows the threshold value formatted with toLocaleString', () => {
      render(<EncounterFilterPanel {...props} />);
      expect(screen.getByText(/600 XP/)).toBeInTheDocument();
    });

    it('shows the difficulty label from difficultyLabels', () => {
      const { container } = render(<EncounterFilterPanel {...props} />);
      const thresholdDisplay = container.querySelector('.threshold-display');
      expect(thresholdDisplay.textContent).toContain('Hard');
    });

    it('shows Unknown when difficultyLabels is null', () => {
      const { container } = render(<EncounterFilterPanel {...props} filter={{ ...props.filter, difficultyLabels: null }} />);
      const thresholdDisplay = container.querySelector('.threshold-display');
      expect(thresholdDisplay.textContent).toContain('Unknown');
    });

    it('shows Unknown when difficultyIndex is out of bounds', () => {
      const { container } = render(<EncounterFilterPanel {...props} filter={{ ...props.filter, difficultyIndex: 10 }} />);
      const thresholdDisplay = container.querySelector('.threshold-display');
      expect(thresholdDisplay.textContent).toContain('Unknown');
    });

    it('shows 0 XP when totalThreshold is 0', () => {
      const { container } = render(<EncounterFilterPanel {...props} filter={{ ...props.filter, totalThreshold: 0 }} />);
      const thresholdDisplay = container.querySelector('.threshold-display');
      expect(thresholdDisplay.textContent).toContain('0 XP');
    });

    it('shows negative threshold when totalThreshold is negative', () => {
      const { container } = render(<EncounterFilterPanel {...props} filter={{ ...props.filter, totalThreshold: -100 }} />);
      const thresholdDisplay = container.querySelector('.threshold-display');
      expect(thresholdDisplay.textContent).toContain('-100 XP');
    });

    it('formats large thresholds with commas', () => {
      const { container } = render(<EncounterFilterPanel {...props} filter={{ ...props.filter, totalThreshold: 15000 }} />);
      const thresholdDisplay = container.querySelector('.threshold-display');
      expect(thresholdDisplay.textContent).toContain('15,000 XP');
    });

    it('shows the difficulty label from difficultyLabels at index 0', () => {
      const { container } = render(<EncounterFilterPanel {...props} filter={{ ...props.filter, difficultyIndex: 0 }} />);
      const thresholdDisplay = container.querySelector('.threshold-display');
      expect(thresholdDisplay.textContent).toContain('Easy');
    });

    it('shows the difficulty label from difficultyLabels at index 3', () => {
      const { container } = render(<EncounterFilterPanel {...props} filter={{ ...props.filter, difficultyIndex: 3 }} />);
      const thresholdDisplay = container.querySelector('.threshold-display');
      expect(thresholdDisplay.textContent).toContain('Deadly');
    });
  });

  describe('threshold display styling', () => {
    it('applies the difficulty color as border-left color', () => {
      const { container } = render(<EncounterFilterPanel {...props} />);
      const thresholdDisplay = container.querySelector('.threshold-display');
      expect(thresholdDisplay).toHaveStyle({ borderLeftColor: '#fd7e14' });
    });

    it('falls back to default text color when difficultyColors is null', () => {
      const { container } = render(<EncounterFilterPanel {...props} filter={{ ...props.filter, difficultyColors: null }} />);
      const thresholdDisplay = container.querySelector('.threshold-display');
      expect(thresholdDisplay).toHaveStyle({ borderLeftColor: 'var(--color-text)' });
    });

    it('falls back to default text color when difficultyColors is undefined', () => {
      const filter = { ...props.filter };
      delete filter.difficultyColors;
      const { container } = render(<EncounterFilterPanel {...props} filter={filter} />);
      const thresholdDisplay = container.querySelector('.threshold-display');
      expect(thresholdDisplay).toHaveStyle({ borderLeftColor: 'var(--color-text)' });
    });
  });

  describe('input constraints', () => {
    it('sets min and max attributes on player level inputs', () => {
      render(<EncounterFilterPanel {...props} />);
      const input = screen.getByLabelText('PC 1');
      expect(input).toHaveAttribute('min', '1');
      expect(input).toHaveAttribute('max', '20');
    });
  });
});
