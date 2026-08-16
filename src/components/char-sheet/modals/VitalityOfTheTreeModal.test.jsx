// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { useReducer } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VitalityOfTheTreeModal from './VitalityOfTheTreeModal.jsx';

// ── Mock state capture for prop passthrough tests ──

let lastMockProps = null;

// ── Mock CreatureSelectionModal ──

function selectionReducer(state, action) {
  switch (action.type) {
    case 'toggle': {
      const name = action.name;
      const maxTargets = action.maxTargets;
      return state.includes(name)
        ? state.filter(n => n !== name)
        : !maxTargets || state.length < maxTargets
          ? [...state, name]
          : state;
    }
    default:
      return state;
  }
}

vi.mock('./shared/CreatureSelectionModal.jsx', () => ({
  default: vi.fn(function MockCreatureSelectionModal({
    title,
    icon,
    targets,
    description,
    note,
    maxTargets,
    confirmLabel,
    confirmIcon,
    onConfirm,
    onSkip,
  }) {
    const [selected, dispatch] = useReducer(selectionReducer, []);
    lastMockProps = { title, icon, targets, description, note, maxTargets, confirmLabel, confirmIcon, onConfirm, onSkip };

    const toggleTarget = (name) => {
      dispatch({ type: 'toggle', name, maxTargets });
    };

    const handleConfirm = () => {
      if (selected.length === 0) return;
      onConfirm(selected);
    };

    const iconClass = confirmIcon || 'fa-crosshairs';
    const label = confirmLabel || 'Confirm';

    return (
      <div data-testid="creature-selection-modal">
        <div className="sp-header">
          <i className={`fa-solid ${icon}`}></i> {title}
        </div>
        {description && <p data-testid="modal-description">{description}</p>}
        {note && <p className="sp-note" data-testid="modal-note">{note}</p>}
        <div className="secondary-target-list">
          {targets.map((target, i) => {
            const name = target.name || target;
            const isSelected = selected.includes(name);
            const atMax = maxTargets && typeof maxTargets === 'number' && selected.length >= maxTargets && !isSelected;
            return (
              <label
                key={i}
                className={`secondary-target-row ${isSelected ? 'secondary-target-selected' : ''} ${atMax ? 'secondary-target-disabled' : ''}`}
                data-testid={`target-${i}`}
                onClick={() => !atMax && toggleTarget(name)}
              >
                <span className="secondary-target-name">
                  <strong>{name}</strong>
                </span>
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={atMax}
                  onChange={() => toggleTarget(name)}
                />
              </label>
            );
          })}
          {targets.length === 0 && (
            <p className="sp-note" data-testid="no-targets">No targets available.</p>
          )}
        </div>
        <div className="sp-actions">
          <button
            className="sp-roll-btn"
            onClick={handleConfirm}
            disabled={selected.length === 0}
            type="button"
          >
            <i className={`fa-solid ${iconClass}`}></i> {label} ({selected.length})
          </button>
          <button className="sp-dismiss-btn" onClick={onSkip} type="button">
            Skip
          </button>
        </div>
      </div>
    );
  }),
}));

// ── Test helpers ──

const mockOnConfirm = vi.fn();
const mockOnSkip = vi.fn();

const defaultTargets = [
  { name: 'Ally1', type: 'player', currentHp: 15, maxHp: 30 },
  { name: 'Ally2', type: 'player', currentHp: 30, maxHp: 30 },
  { name: 'Enemy1', type: 'npc', currentHp: 20, maxHp: 40 },
];

function makeProps(overrides) {
  return {
    creatureTargets: defaultTargets,
    tempHp: 5,
    maxTargets: 2,
    onConfirm: mockOnConfirm,
    onSkip: mockOnSkip,
    ...(overrides || {}),
  };
}

// ── Tests ──

describe('VitalityOfTheTreeModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastMockProps = null;
  });

  describe('rendering', () => {
    it('renders modal with hardcoded title and tree icon', () => {
      render(<VitalityOfTheTreeModal {...makeProps()} />);
      expect(screen.getByText('Vitality of the Tree')).toBeInTheDocument();
      expect(document.querySelector('.fa-solid.fa-tree')).toBeInTheDocument();
    });

    it('renders description with max targets count', () => {
      render(<VitalityOfTheTreeModal {...makeProps({ maxTargets: 3 })} />);
      expect(
        screen.getByText('Choose up to 3 creatures to grant temporary hit points')
      ).toBeInTheDocument();
    });

    it('renders note with temp HP amount', () => {
      render(<VitalityOfTheTreeModal {...makeProps({ tempHp: 7 })} />);
      expect(
        screen.getByText("Each target gains 7 temp HP from the World Tree's life force.")
      ).toBeInTheDocument();
    });

    it('renders confirm button with label and selection count', () => {
      render(<VitalityOfTheTreeModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: /Grant Vitality \(0\)/ })).toBeInTheDocument();
    });

    it('renders Skip button', () => {
      render(<VitalityOfTheTreeModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
    });

    it('renders target list items from creatureTargets', () => {
      render(<VitalityOfTheTreeModal {...makeProps()} />);
      expect(screen.getByText('Ally1')).toBeInTheDocument();
      expect(screen.getByText('Ally2')).toBeInTheDocument();
      expect(screen.getByText('Enemy1')).toBeInTheDocument();
    });

    it('renders "No targets available." when creatureTargets is empty', () => {
      render(<VitalityOfTheTreeModal {...makeProps({ creatureTargets: [] })} />);
      expect(screen.getByText('No targets available.')).toBeInTheDocument();
    });
  });

  describe('behavior', () => {
    it('calls onSkip when Skip button is clicked', () => {
      render(<VitalityOfTheTreeModal {...makeProps()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
      expect(mockOnSkip).toHaveBeenCalledTimes(1);
    });

    it('does not call onConfirm when confirm button is disabled (no selection)', () => {
      render(<VitalityOfTheTreeModal {...makeProps()} />);
      const confirmBtn = screen.getByRole('button', { name: /Grant Vitality \(0\)/ });
      expect(confirmBtn).toBeDisabled();
      fireEvent.click(confirmBtn);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('calls onConfirm with selected target names when targets are selected', () => {
      render(<VitalityOfTheTreeModal {...makeProps()} />);
      const target0 = screen.getByTestId('target-0');
      fireEvent.click(target0);
      const confirmBtn = screen.getByRole('button', { name: /Grant Vitality \(1\)/ });
      expect(confirmBtn).not.toBeDisabled();
      fireEvent.click(confirmBtn);
      expect(mockOnConfirm).toHaveBeenCalledWith(['Ally1']);
    });

    it('calls onConfirm with multiple selected targets', () => {
      render(<VitalityOfTheTreeModal {...makeProps()} />);
      const target0 = screen.getByTestId('target-0');
      const target1 = screen.getByTestId('target-1');
      fireEvent.click(target0);
      fireEvent.click(target1);
      const confirmBtn = screen.getByRole('button', { name: /Grant Vitality \(2\)/ });
      expect(confirmBtn).not.toBeDisabled();
      fireEvent.click(confirmBtn);
      expect(mockOnConfirm).toHaveBeenCalledWith(['Ally1', 'Ally2']);
    });
  });

  describe('prop passthrough', () => {
    it('passes creatureTargets as targets to CreatureSelectionModal', () => {
      render(<VitalityOfTheTreeModal {...makeProps()} />);
      expect(lastMockProps.targets).toEqual(defaultTargets);
    });

    it('passes maxTargets to CreatureSelectionModal', () => {
      render(<VitalityOfTheTreeModal {...makeProps({ maxTargets: 5 })} />);
      expect(lastMockProps.maxTargets).toBe(5);
    });

    it('passes onConfirm and onSkip callbacks to CreatureSelectionModal', () => {
      render(<VitalityOfTheTreeModal {...makeProps()} />);
      expect(lastMockProps.onConfirm).toBe(mockOnConfirm);
      expect(lastMockProps.onSkip).toBe(mockOnSkip);
    });

    it('passes empty creatureTargets array to CreatureSelectionModal', () => {
      render(<VitalityOfTheTreeModal {...makeProps({ creatureTargets: [] })} />);
      expect(lastMockProps.targets).toEqual([]);
    });

    it('passes string targets to CreatureSelectionModal', () => {
      const stringTargets = ['AllyA', 'AllyB', 'AllyC'];
      render(<VitalityOfTheTreeModal {...makeProps({ creatureTargets: stringTargets })} />);
      expect(lastMockProps.targets).toEqual(stringTargets);
    });
  });

  describe('edge cases', () => {
    it('renders with string targets and selects them by name', () => {
      const stringTargets = ['AllyA', 'AllyB'];
      render(<VitalityOfTheTreeModal {...makeProps({ creatureTargets: stringTargets })} />);
      const target0 = screen.getByTestId('target-0');
      fireEvent.click(target0);
      const confirmBtn = screen.getByRole('button', { name: /Grant Vitality \(1\)/ });
      fireEvent.click(confirmBtn);
      expect(mockOnConfirm).toHaveBeenCalledWith(['AllyA']);
    });

    it('renders with mixed object and string targets', () => {
      const mixedTargets = [
        { name: 'Ally1', type: 'player' },
        'Ally2',
        { name: 'Ally3' },
      ];
      render(<VitalityOfTheTreeModal {...makeProps({ creatureTargets: mixedTargets })} />);
      expect(screen.getByText('Ally1')).toBeInTheDocument();
      expect(screen.getByText('Ally2')).toBeInTheDocument();
      expect(screen.getByText('Ally3')).toBeInTheDocument();
    });

    it('renders with tempHp of 0', () => {
      render(<VitalityOfTheTreeModal {...makeProps({ tempHp: 0 })} />);
      expect(
        screen.getByText("Each target gains 0 temp HP from the World Tree's life force.")
      ).toBeInTheDocument();
    });
  });
});
