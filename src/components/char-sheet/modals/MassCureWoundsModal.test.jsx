// @improved-by-ai
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

  describe('renders CreatureSelectionModal with correct hardcoded props', () => {
    it('passes title, icons, and description', () => {
      render(<MassCureWoundsModal {...makeProps()} />);
      const props = CreatureSelectionModal.mock.calls[0][0];
      expect(props.title).toBe('Mass Cure Wounds');
      expect(props.icon).toBe('fa-heart');
      expect(props.description).toBe('Choose up to 6 allies within 30 feet to heal.');
      expect(props.confirmLabel).toBe('Cure');
      expect(props.confirmIcon).toBe('fa-heart');
    });

    it('passes creatureTargets as targets', () => {
      render(<MassCureWoundsModal {...makeProps()} />);
      const props = CreatureSelectionModal.mock.calls[0][0];
      expect(props.targets).toBe(makeProps().creatureTargets);
    });

    it('passes maxTargets when provided', () => {
      render(<MassCureWoundsModal {...makeProps({ maxTargets: 5 })} />);
      const props = CreatureSelectionModal.mock.calls[0][0];
      expect(props.maxTargets).toBe(5);
    });

    it('passes onConfirm and onSkip callbacks', () => {
      render(<MassCureWoundsModal {...makeProps()} />);
      const props = CreatureSelectionModal.mock.calls[0][0];
      expect(props.onConfirm).toBe(mockOnConfirm);
      expect(props.onSkip).toBe(mockOnSkip);
    });
  });

  describe('prop passthrough', () => {
    it('passes empty targets array', () => {
      render(<MassCureWoundsModal {...makeProps({ creatureTargets: [] })} />);
      const props = CreatureSelectionModal.mock.calls[0][0];
      expect(props.targets).toEqual([]);
    });

    it('passes string targets', () => {
      const stringTargets = ['AllyA', 'AllyB', 'AllyC'];
      render(<MassCureWoundsModal {...makeProps({ creatureTargets: stringTargets })} />);
      const props = CreatureSelectionModal.mock.calls[0][0];
      expect(props.targets).toBe(stringTargets);
    });

    it('does not pass maxTargets when omitted', () => {
      render(<MassCureWoundsModal {...makeProps({ maxTargets: undefined })} />);
      const props = CreatureSelectionModal.mock.calls[0][0];
      expect(props.maxTargets).toBeUndefined();
    });
  });

  describe('missing optional callbacks', () => {
    it('renders without onConfirm', () => {
      render(<MassCureWoundsModal {...makeProps({ onConfirm: undefined })} />);
      const props = CreatureSelectionModal.mock.calls[0][0];
      expect(props.onConfirm).toBeUndefined();
    });

    it('renders without onSkip', () => {
      render(<MassCureWoundsModal {...makeProps({ onSkip: undefined })} />);
      const props = CreatureSelectionModal.mock.calls[0][0];
      expect(props.onSkip).toBeUndefined();
    });
  });

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

  describe('visual output', () => {
    it('displays the title text', () => {
      render(<MassCureWoundsModal {...makeProps()} />);
      expect(screen.getByText('Mass Cure Wounds')).toBeInTheDocument();
    });

    it('displays the description text', () => {
      render(<MassCureWoundsModal {...makeProps()} />);
      expect(screen.getByText('Choose up to 6 allies within 30 feet to heal.')).toBeInTheDocument();
    });

    it('renders target names from creatureTargets', () => {
      render(<MassCureWoundsModal {...makeProps()} />);
      expect(screen.getByText('Ally1')).toBeInTheDocument();
      expect(screen.getByText('Ally2')).toBeInTheDocument();
      expect(screen.getByText('Ally3')).toBeInTheDocument();
      expect(screen.getByText('Enemy1')).toBeInTheDocument();
    });

    it('shows "No targets available." when targets is empty', () => {
      render(<MassCureWoundsModal {...makeProps({ creatureTargets: [] })} />);
      expect(screen.getByText('No targets available.')).toBeInTheDocument();
    });

    it('uses heart icon classes', () => {
      render(<MassCureWoundsModal {...makeProps()} />);
      expect(document.querySelectorAll('.fa-heart').length).toBeGreaterThan(0);
    });
  });
});
