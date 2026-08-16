// @improved-by-ai
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PrayerOfHealingModal from './PrayerOfHealingModal.jsx';

// ── Mock CreatureSelectionModal ──

let mockSelected = [];

vi.mock('./shared/CreatureSelectionModal.jsx', () => ({
  default: vi.fn((props) => {
    mockSelected = props.defaultSelected || [];

    const toggleTarget = (name) => {
      mockSelected = mockSelected.includes(name)
        ? mockSelected.filter(n => n !== name)
        : !props.maxTargets || mockSelected.length < props.maxTargets
          ? [...mockSelected, name]
          : mockSelected;
    };

    const handleConfirm = () => {
      if (mockSelected.length === 0) return;
      props.onConfirm(mockSelected);
    };

    const iconClass = props.confirmIcon || 'fa-crosshairs';
    const label = props.confirmLabel || 'Confirm';

    return (
      <div className="sp-overlay" onClick={props.onSkip}>
        <div className="sp-modal" onClick={e => e.stopPropagation()}>
          <div className="sp-header">
            <i className={`fa-solid ${props.icon}`}></i> {props.title}
          </div>
          <div className="sp-body">
            {props.description && <p dangerouslySetInnerHTML={{ __html: props.description }} />}
            <div className="secondary-target-list">
              {props.targets.map((target, i) => {
                const name = target.name || target;
                const isSelected = mockSelected.includes(name);
                const atMax = props.maxTargets && typeof props.maxTargets === 'number' && mockSelected.length >= props.maxTargets && !isSelected;
                return (
                  <label
                    key={i}
                    className={`secondary-target-row ${isSelected ? 'secondary-target-selected' : ''} ${atMax ? 'secondary-target-disabled' : ''}`}
                    onClick={() => !atMax && toggleTarget(name)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={atMax}
                      onChange={() => toggleTarget(name)}
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
          </div>
          <div className="sp-actions">
            <button
              className="sp-roll-btn"
              onClick={handleConfirm}
              disabled={mockSelected.length === 0}
              type="button"
            >
              <i className={`fa-solid ${iconClass}`}></i> {label} ({mockSelected.length})
            </button>
            <button className="sp-dismiss-btn" onClick={props.onSkip} type="button">
              Skip
            </button>
          </div>
        </div>
      </div>
    );
  }),
}));

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

describe('PrayerOfHealingModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelected = [];
  });

  describe('rendering', () => {
    it('renders with correct title, icon, description, and buttons', () => {
      render(<PrayerOfHealingModal {...makeProps()} />);
      expect(screen.getByText('Prayer of Healing')).toBeInTheDocument();
      expect(document.querySelector('.fa-hands-praying')).toBeInTheDocument();
      expect(screen.getByText('Choose up to 5 creatures to heal.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Heal/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
    });

    it('renders all creature targets from creatureTargets', () => {
      render(<PrayerOfHealingModal {...makeProps()} />);
      expect(screen.getByText('Ally1')).toBeInTheDocument();
      expect(screen.getByText('Ally2')).toBeInTheDocument();
      expect(screen.getByText('Ally3')).toBeInTheDocument();
      expect(screen.getByText('Enemy1')).toBeInTheDocument();
    });

    it('shows selection count in confirm button', () => {
      render(<PrayerOfHealingModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: /Heal \(0\)/ })).toBeInTheDocument();
    });

    it('disables confirm button when no targets are selected', () => {
      render(<PrayerOfHealingModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: /Heal \(0\)/ })).toBeDisabled();
    });

    it('shows "No targets available." when creatureTargets is empty', () => {
      render(<PrayerOfHealingModal {...makeProps({ creatureTargets: [] })} />);
      expect(screen.getByText('No targets available.')).toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('calls onSkip when Skip button is clicked', () => {
      render(<PrayerOfHealingModal {...makeProps()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
      expect(mockOnSkip).toHaveBeenCalledTimes(1);
    });

    it('does not call onConfirm when confirm button is clicked with no selection', () => {
      render(<PrayerOfHealingModal {...makeProps()} />);
      const confirmBtn = screen.getByRole('button', { name: /Heal \(0\)/ });
      expect(confirmBtn).toBeDisabled();
      fireEvent.click(confirmBtn);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  describe('prop passthrough', () => {
    it('passes creatureTargets to CreatureSelectionModal', () => {
      render(<PrayerOfHealingModal {...makeProps()} />);
      const props = vi.mocked(CreatureSelectionModal).mock.calls[0][0];
      expect(props.targets).toEqual(defaultTargets);
    });

    it('passes maxTargets to CreatureSelectionModal', () => {
      render(<PrayerOfHealingModal {...makeProps({ maxTargets: 5 })} />);
      const props = vi.mocked(CreatureSelectionModal).mock.calls[0][0];
      expect(props.maxTargets).toBe(5);
    });

    it('passes empty creatureTargets to CreatureSelectionModal', () => {
      render(<PrayerOfHealingModal {...makeProps({ creatureTargets: [] })} />);
      const props = vi.mocked(CreatureSelectionModal).mock.calls[0][0];
      expect(props.targets).toEqual([]);
    });

    it('passes string targets to CreatureSelectionModal', () => {
      const stringTargets = ['AllyA', 'AllyB', 'AllyC'];
      render(<PrayerOfHealingModal {...makeProps({ creatureTargets: stringTargets })} />);
      const props = vi.mocked(CreatureSelectionModal).mock.calls[0][0];
      expect(props.targets).toEqual(stringTargets);
    });
  });

  describe('edge cases', () => {
    it('renders without optional maxTargets prop', () => {
      const props = makeProps();
      delete props.maxTargets;
      render(<PrayerOfHealingModal {...props} />);
      expect(screen.getByText('Prayer of Healing')).toBeInTheDocument();
      expect(screen.getByText('Choose up to 5 creatures to heal.')).toBeInTheDocument();
    });

    it('renders without optional onConfirm prop', () => {
      const props = makeProps();
      delete props.onConfirm;
      render(<PrayerOfHealingModal {...props} />);
      expect(screen.getByText('Prayer of Healing')).toBeInTheDocument();
    });

    it('renders without optional onSkip prop', () => {
      const props = makeProps();
      delete props.onSkip;
      render(<PrayerOfHealingModal {...props} />);
      expect(screen.getByText('Prayer of Healing')).toBeInTheDocument();
    });
  });
});
