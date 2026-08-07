import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MassCureWoundsModal from './MassCureWoundsModal.jsx';

// ── Mock CreatureSelectionModal ──

const mockToggleTarget = vi.fn();
const mockHandleConfirm = vi.fn();

vi.mock('./shared/CreatureSelectionModal.jsx', () => ({
  default: vi.fn((props) => {
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

describe('MassCureWoundsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToggleTarget.mockClear();
    mockHandleConfirm.mockClear();
  });

  // ── Rendering ──

  describe('rendering', () => {
    it('renders with title "Mass Cure Wounds"', () => {
      render(<MassCureWoundsModal {...makeProps()} />);
      expect(screen.getByText('Mass Cure Wounds')).toBeInTheDocument();
    });

    it('renders with heart icon', () => {
      render(<MassCureWoundsModal {...makeProps()} />);
      expect(document.querySelector('.fa-heart')).toBeInTheDocument();
    });

    it('renders the description "Choose up to 6 allies within 30 feet to heal."', () => {
      render(<MassCureWoundsModal {...makeProps()} />);
      expect(screen.getByText('Choose up to 6 allies within 30 feet to heal.')).toBeInTheDocument();
    });

    it('renders confirm button with label "Cure"', () => {
      render(<MassCureWoundsModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: /Cure/ })).toBeInTheDocument();
    });

    it('renders confirm button with heart icon', () => {
      render(<MassCureWoundsModal {...makeProps()} />);
      const confirmBtn = screen.getByRole('button', { name: /Cure/ });
      expect(confirmBtn.querySelector('.fa-heart')).toBeInTheDocument();
    });

    it('renders Skip button', () => {
      render(<MassCureWoundsModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
    });

    it('renders CreatureSelectionModal with correct props', () => {
      render(<MassCureWoundsModal {...makeProps()} />);
      const props = vi.mocked(CreatureSelectionModal).mock.calls[0][0];
      expect(props.title).toBe('Mass Cure Wounds');
      expect(props.icon).toBe('fa-heart');
      expect(props.description).toBe('Choose up to 6 allies within 30 feet to heal.');
      expect(props.confirmLabel).toBe('Cure');
      expect(props.confirmIcon).toBe('fa-heart');
    });

    it('passes creatureTargets to CreatureSelectionModal', () => {
      render(<MassCureWoundsModal {...makeProps()} />);
      expect(vi.mocked(CreatureSelectionModal).mock.calls[0][0].targets).toEqual(defaultTargets);
    });

    it('passes maxTargets to CreatureSelectionModal', () => {
      render(<MassCureWoundsModal {...makeProps({ maxTargets: 5 })} />);
      expect(vi.mocked(CreatureSelectionModal).mock.calls[0][0].maxTargets).toBe(5);
    });

    it('passes onConfirm to CreatureSelectionModal', () => {
      render(<MassCureWoundsModal {...makeProps()} />);
      expect(vi.mocked(CreatureSelectionModal).mock.calls[0][0].onConfirm).toBe(mockOnConfirm);
    });

    it('passes onSkip to CreatureSelectionModal', () => {
      render(<MassCureWoundsModal {...makeProps()} />);
      expect(vi.mocked(CreatureSelectionModal).mock.calls[0][0].onSkip).toBe(mockOnSkip);
    });
  });

  // ── User interactions ──

  describe('user interactions', () => {
    it('calls onSkip when Skip button is clicked', () => {
      render(<MassCureWoundsModal {...makeProps()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
      expect(mockOnSkip).toHaveBeenCalledTimes(1);
    });

    it('does not call onConfirm when confirm button is clicked with no selection', () => {
      render(<MassCureWoundsModal {...makeProps()} />);
      const confirmBtn = screen.getByRole('button', { name: /Cure \(0\)/ });
      expect(confirmBtn).toBeDisabled();
      fireEvent.click(confirmBtn);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  // ── Prop passthrough ──

  describe('prop passthrough', () => {
    it('passes different maxTargets values to CreatureSelectionModal', () => {
      render(<MassCureWoundsModal {...makeProps({ maxTargets: 1 })} />);
      expect(vi.mocked(CreatureSelectionModal).mock.calls[0][0].maxTargets).toBe(1);

      vi.clearAllMocks();
      render(<MassCureWoundsModal {...makeProps({ maxTargets: 6 })} />);
      expect(vi.mocked(CreatureSelectionModal).mock.calls[0][0].maxTargets).toBe(6);
    });

    it('passes empty creatureTargets array to CreatureSelectionModal', () => {
      render(<MassCureWoundsModal {...makeProps({ creatureTargets: [] })} />);
      expect(vi.mocked(CreatureSelectionModal).mock.calls[0][0].targets).toEqual([]);
    });

    it('passes string targets to CreatureSelectionModal', () => {
      const stringTargets = ['AllyA', 'AllyB', 'AllyC'];
      render(<MassCureWoundsModal {...makeProps({ creatureTargets: stringTargets })} />);
      expect(vi.mocked(CreatureSelectionModal).mock.calls[0][0].targets).toEqual(stringTargets);
    });
  });

  // ── Default values ──

  describe('default values', () => {
    it('renders without maxTargets prop', () => {
      const props = makeProps();
      delete props.maxTargets;
      render(<MassCureWoundsModal {...props} />);
      expect(screen.getByText('Mass Cure Wounds')).toBeInTheDocument();
    });

    it('renders without onConfirm prop', () => {
      const props = makeProps();
      delete props.onConfirm;
      render(<MassCureWoundsModal {...props} />);
      expect(screen.getByText('Mass Cure Wounds')).toBeInTheDocument();
    });

    it('renders without onSkip prop', () => {
      const props = makeProps();
      delete props.onSkip;
      render(<MassCureWoundsModal {...props} />);
      expect(screen.getByText('Mass Cure Wounds')).toBeInTheDocument();
    });
  });

  // ── Fixed label/icon behavior ──

  describe('fixed label and icon behavior', () => {
    it('always uses "Mass Cure Wounds" title', () => {
      render(<MassCureWoundsModal {...makeProps()} />);
      expect(screen.getByText('Mass Cure Wounds')).toBeInTheDocument();
    });

    it('always uses heart icon', () => {
      render(<MassCureWoundsModal {...makeProps()} />);
      expect(document.querySelectorAll('.fa-heart').length).toBeGreaterThan(0);
    });

    it('always uses "Cure" confirm label', () => {
      render(<MassCureWoundsModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: /Cure/ })).toBeInTheDocument();
    });

    it('always shows "Choose up to 6 allies within 30 feet to heal." description', () => {
      render(<MassCureWoundsModal {...makeProps()} />);
      expect(screen.getByText('Choose up to 6 allies within 30 feet to heal.')).toBeInTheDocument();
    });
  });

  // ── Integration with CreatureSelectionModal mock ──

  describe('integration with CreatureSelectionModal', () => {
    it('renders target list items from creatureTargets', () => {
      render(<MassCureWoundsModal {...makeProps()} />);
      expect(screen.getByText('Ally1')).toBeInTheDocument();
      expect(screen.getByText('Ally2')).toBeInTheDocument();
      expect(screen.getByText('Ally3')).toBeInTheDocument();
      expect(screen.getByText('Enemy1')).toBeInTheDocument();
    });

    it('renders "No targets available." when no creatureTargets', () => {
      render(<MassCureWoundsModal {...makeProps({ creatureTargets: [] })} />);
      expect(screen.getByText('No targets available.')).toBeInTheDocument();
    });

    it('disables confirm button when no targets selected', () => {
      render(<MassCureWoundsModal {...makeProps()} />);
      const confirmBtn = screen.getByRole('button', { name: /Cure \(0\)/ });
      expect(confirmBtn).toBeDisabled();
    });

    it('shows selection count in confirm button', () => {
      render(<MassCureWoundsModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: /Cure \(0\)/ })).toBeInTheDocument();
    });
  });
});
