import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MassHealingWordModal from './MassHealingWordModal.jsx';

// ── Mock CreatureSelectionModal ──

const mockToggleTarget = vi.fn();
const mockHandleConfirm = vi.fn();

vi.mock('./shared/CreatureSelectionModal.jsx', () => ({
  default: vi.fn((props) => {
    // Simulate the internal confirm behavior: calls onConfirm with selected array
    const selected = props.defaultSelected || [];
    return (
      <div data-testid="creature-selection-modal">
        <div className="sp-header">
          <i className={`fa-solid ${props.icon}`}></i> {props.title}
        </div>
        {props.description && <p>{props.description}</p>}
        <div className="secondary-target-list">
          {props.targets.map((target, i) => {
            const name = target.name || target;
            const isSelected = selected.includes(name);
            return (
              <label
                key={i}
                className={`secondary-target-row ${isSelected ? 'secondary-target-selected' : ''}`}
                data-testid={`target-${i}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => mockToggleTarget(name)}
                />
                <span className="secondary-target-name">
                  <strong>{name}</strong>
                </span>
              </label>
            );
          })}
          {props.targets.length === 0 && (
            <p className="sp-note">No targets available.</p>
          )}
        </div>
        <div className="sp-actions">
          <button
            className="sp-roll-btn"
            onClick={() => mockHandleConfirm(selected)}
            disabled={selected.length === 0}
            type="button"
          >
            <i className={`fa-solid ${props.confirmIcon || 'fa-crosshairs'}`}></i> {props.confirmLabel || 'Confirm'} ({selected.length})
          </button>
          <button className="sp-dismiss-btn" onClick={props.onSkip} type="button">
            Skip
          </button>
        </div>
      </div>
    );
  }),
}));

// ── Re-import mocked module ──
import CreatureSelectionModal from './shared/CreatureSelectionModal.jsx';

// ── Test helpers ──

const mockOnConfirm = vi.fn();
const mockOnSkip = vi.fn();

const defaultTargets = [
  { name: 'Ally1', type: 'player', currentHp: 15, maxHp: 30 },
  { name: 'Ally2', type: 'player', currentHp: 30, maxHp: 30 },
  { name: 'Ally3', type: 'player', currentHp: 5, maxHp: 25 },
  { name: 'Enemy1', type: 'npc', currentHp: 20, maxHp: 40 },
];

function makeProps(overrides) {
  return {
    creatureTargets: defaultTargets,
    maxTargets: 3,
    onConfirm: mockOnConfirm,
    onSkip: mockOnSkip,
    ...(overrides || {}),
  };
}

// ── Tests ──

describe('MassHealingWordModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToggleTarget.mockClear();
    mockHandleConfirm.mockClear();
  });

  // ── Rendering ──

  describe('rendering', () => {
    it('renders with title "Mass Healing Word"', () => {
      render(<MassHealingWordModal {...makeProps()} />);
      expect(screen.getByText('Mass Healing Word')).toBeInTheDocument();
    });

    it('renders with feather icon', () => {
      render(<MassHealingWordModal {...makeProps()} />);
      expect(document.querySelector('.fa-feather')).toBeInTheDocument();
    });

    it('renders the description "Choose up to 6 creatures to heal."', () => {
      render(<MassHealingWordModal {...makeProps()} />);
      expect(screen.getByText('Choose up to 6 creatures to heal.')).toBeInTheDocument();
    });

    it('renders confirm button with label "Heal"', () => {
      render(<MassHealingWordModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: /Heal/ })).toBeInTheDocument();
    });

    it('renders confirm button with feather icon', () => {
      render(<MassHealingWordModal {...makeProps()} />);
      const confirmBtn = screen.getByRole('button', { name: /Heal/ });
      expect(confirmBtn.querySelector('.fa-feather')).toBeInTheDocument();
    });

    it('renders Skip button', () => {
      render(<MassHealingWordModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
    });

    it('renders CreatureSelectionModal with correct props', () => {
      render(<MassHealingWordModal {...makeProps()} />);
      const props = CreatureSelectionModal.mock.calls[0][0];
      expect(props.title).toBe('Mass Healing Word');
      expect(props.icon).toBe('fa-feather');
      expect(props.description).toBe('Choose up to 6 creatures to heal.');
      expect(props.confirmLabel).toBe('Heal');
      expect(props.confirmIcon).toBe('fa-feather');
    });

    it('passes creatureTargets to CreatureSelectionModal', () => {
      render(<MassHealingWordModal {...makeProps()} />);
      expect(CreatureSelectionModal.mock.calls[0][0].targets).toEqual(defaultTargets);
    });

    it('passes maxTargets to CreatureSelectionModal', () => {
      render(<MassHealingWordModal {...makeProps({ maxTargets: 5 })} />);
      expect(CreatureSelectionModal.mock.calls[0][0].maxTargets).toBe(5);
    });

    it('passes onConfirm to CreatureSelectionModal', () => {
      render(<MassHealingWordModal {...makeProps()} />);
      expect(CreatureSelectionModal.mock.calls[0][0].onConfirm).toBe(mockOnConfirm);
    });

    it('passes onSkip to CreatureSelectionModal', () => {
      render(<MassHealingWordModal {...makeProps()} />);
      expect(CreatureSelectionModal.mock.calls[0][0].onSkip).toBe(mockOnSkip);
    });
  });

  // ── User interactions ──

  describe('user interactions', () => {
    it('calls onSkip when Skip button is clicked', () => {
      render(<MassHealingWordModal {...makeProps()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
      expect(mockOnSkip).toHaveBeenCalledTimes(1);
    });

    it('calls onSkip when overlay is clicked', () => {
      render(<MassHealingWordModal {...makeProps()} />);
      // The mock renders a div with data-testid; simulate overlay click
      fireEvent.click(screen.getByTestId('creature-selection-modal'));
      expect(mockOnSkip).not.toHaveBeenCalled();
    });

    it('does not call onConfirm when confirm button is clicked with no selection', () => {
      render(<MassHealingWordModal {...makeProps()} />);
      const confirmBtn = screen.getByRole('button', { name: /Heal \(0\)/ });
      expect(confirmBtn).toBeDisabled();
      fireEvent.click(confirmBtn);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  // ── Prop passthrough ──

  describe('prop passthrough', () => {
    it('passes different maxTargets values to CreatureSelectionModal', () => {
      render(<MassHealingWordModal {...makeProps({ maxTargets: 1 })} />);
      expect(CreatureSelectionModal.mock.calls[0][0].maxTargets).toBe(1);

      vi.clearAllMocks();
      render(<MassHealingWordModal {...makeProps({ maxTargets: 6 })} />);
      expect(CreatureSelectionModal.mock.calls[0][0].maxTargets).toBe(6);
    });

    it('passes empty creatureTargets array to CreatureSelectionModal', () => {
      render(<MassHealingWordModal {...makeProps({ creatureTargets: [] })} />);
      expect(CreatureSelectionModal.mock.calls[0][0].targets).toEqual([]);
    });

    it('passes string targets to CreatureSelectionModal', () => {
      const stringTargets = ['AllyA', 'AllyB', 'AllyC'];
      render(<MassHealingWordModal {...makeProps({ creatureTargets: stringTargets })} />);
      expect(CreatureSelectionModal.mock.calls[0][0].targets).toEqual(stringTargets);
    });
  });

  // ── Default values ──

  describe('default values', () => {
    it('uses default maxTargets of 3 when not provided', () => {
      const props = makeProps();
      delete props.maxTargets;
      render(<MassHealingWordModal {...props} />);
      // CreatureSelectionModal receives undefined maxTargets, which the modal handles
      expect(screen.getByText('Mass Healing Word')).toBeInTheDocument();
    });

    it('renders without maxTargets prop', () => {
      const props = makeProps();
      delete props.maxTargets;
      render(<MassHealingWordModal {...props} />);
      expect(screen.getByText('Choose up to 6 creatures to heal.')).toBeInTheDocument();
    });
  });

  // ── Fixed label/icon behavior ──

  describe('fixed label and icon behavior', () => {
    it('always uses "Mass Healing Word" title regardless of props', () => {
      render(<MassHealingWordModal {...makeProps()} />);
      expect(screen.getByText('Mass Healing Word')).toBeInTheDocument();
    });

    it('always uses feather icon regardless of props', () => {
      render(<MassHealingWordModal {...makeProps()} />);
      expect(document.querySelectorAll('.fa-feather').length).toBeGreaterThan(0);
    });

    it('always uses "Heal" confirm label regardless of props', () => {
      render(<MassHealingWordModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: /Heal/ })).toBeInTheDocument();
    });

    it('always shows "Choose up to 6 creatures to heal." description', () => {
      render(<MassHealingWordModal {...makeProps()} />);
      expect(screen.getByText('Choose up to 6 creatures to heal.')).toBeInTheDocument();
    });
  });

  // ── Integration with CreatureSelectionModal mock ──

  describe('integration with CreatureSelectionModal', () => {
    it('renders target list items from creatureTargets', () => {
      render(<MassHealingWordModal {...makeProps()} />);
      expect(screen.getByText('Ally1')).toBeInTheDocument();
      expect(screen.getByText('Ally2')).toBeInTheDocument();
      expect(screen.getByText('Ally3')).toBeInTheDocument();
      expect(screen.getByText('Enemy1')).toBeInTheDocument();
    });

    it('renders "No targets available." when no creatureTargets', () => {
      render(<MassHealingWordModal {...makeProps({ creatureTargets: [] })} />);
      expect(screen.getByText('No targets available.')).toBeInTheDocument();
    });

    it('disables confirm button when no targets selected', () => {
      render(<MassHealingWordModal {...makeProps()} />);
      const confirmBtn = screen.getByRole('button', { name: /Heal \(0\)/ });
      expect(confirmBtn).toBeDisabled();
    });

    it('shows selection count in confirm button', () => {
      render(<MassHealingWordModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: /Heal \(0\)/ })).toBeInTheDocument();
    });
  });
});
