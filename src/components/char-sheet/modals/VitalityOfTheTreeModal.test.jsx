import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VitalityOfTheTreeModal from './VitalityOfTheTreeModal.jsx';

// ── Mock CreatureSelectionModal ──

vi.mock('./shared/CreatureSelectionModal.jsx', () => ({
  default: vi.fn((props) => {
    const {
      title,
      icon,
      targets,
      description,
      note,
      confirmLabel,
      confirmIcon,
      onConfirm,
      onSkip,
    } = props;

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
            return (
              <label key={i} data-testid={`target-${i}`}>
                <span className="secondary-target-name">
                  <strong>{name}</strong>
                </span>
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
            onClick={() => onConfirm([])}
            disabled={true}
            type="button"
          >
            <i className={`fa-solid ${confirmIcon || 'fa-crosshairs'}`}></i> {confirmLabel || 'Confirm'} (0)
          </button>
          <button className="sp-dismiss-btn" onClick={onSkip} type="button">
            Skip
          </button>
        </div>
      </div>
    );
  }),
}));

// ── Re-import mocked modules ──

import CreatureSelectionModal from './shared/CreatureSelectionModal.jsx';

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
  });

  // ── Rendering ──

  describe('rendering', () => {
    it('renders with title "Vitality of the Tree"', () => {
      render(<VitalityOfTheTreeModal {...makeProps()} />);
      expect(screen.getByText('Vitality of the Tree')).toBeInTheDocument();
    });

    it('renders with fa-tree icon in header', () => {
      render(<VitalityOfTheTreeModal {...makeProps()} />);
      expect(document.querySelector('.fa-solid.fa-tree')).toBeInTheDocument();
    });

    it('renders the description with max targets', () => {
      render(<VitalityOfTheTreeModal {...makeProps({ maxTargets: 3 })} />);
      expect(
        screen.getByText('Choose up to 3 creatures to grant temporary hit points')
      ).toBeInTheDocument();
    });

    it('renders the note with temp HP amount', () => {
      render(<VitalityOfTheTreeModal {...makeProps({ tempHp: 7 })} />);
      expect(
        screen.getByText("Each target gains 7 temp HP from the World Tree's life force.")
      ).toBeInTheDocument();
    });

    it('renders confirm button with label "Grant Vitality"', () => {
      render(<VitalityOfTheTreeModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: /Grant Vitality/ })).toBeInTheDocument();
    });

    it('renders confirm button with fa-tree icon', () => {
      render(<VitalityOfTheTreeModal {...makeProps()} />);
      const confirmBtn = screen.getByRole('button', { name: /Grant Vitality/ });
      expect(confirmBtn.querySelector('.fa-solid.fa-tree')).toBeInTheDocument();
    });

    it('renders Skip button', () => {
      render(<VitalityOfTheTreeModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
    });

    it('renders CreatureSelectionModal with correct props', () => {
      render(<VitalityOfTheTreeModal {...makeProps()} />);
      const props = vi.mocked(CreatureSelectionModal).mock.calls[0][0];
      expect(props.title).toBe('Vitality of the Tree');
      expect(props.icon).toBe('fa-tree');
      expect(props.description).toBe('Choose up to 2 creatures to grant temporary hit points');
      expect(props.note).toBe('Each target gains 5 temp HP from the World Tree\'s life force.');
      expect(props.confirmLabel).toBe('Grant Vitality');
      expect(props.confirmIcon).toBe('fa-tree');
    });

    it('passes creatureTargets to CreatureSelectionModal', () => {
      render(<VitalityOfTheTreeModal {...makeProps()} />);
      expect(vi.mocked(CreatureSelectionModal).mock.calls[0][0].targets).toEqual(
        defaultTargets
      );
    });

    it('passes maxTargets to CreatureSelectionModal', () => {
      render(<VitalityOfTheTreeModal {...makeProps({ maxTargets: 5 })} />);
      expect(vi.mocked(CreatureSelectionModal).mock.calls[0][0].maxTargets).toBe(5);
    });

    it('passes onConfirm to CreatureSelectionModal', () => {
      render(<VitalityOfTheTreeModal {...makeProps()} />);
      expect(vi.mocked(CreatureSelectionModal).mock.calls[0][0].onConfirm).toBe(
        mockOnConfirm
      );
    });

    it('passes onSkip to CreatureSelectionModal', () => {
      render(<VitalityOfTheTreeModal {...makeProps()} />);
      expect(vi.mocked(CreatureSelectionModal).mock.calls[0][0].onSkip).toBe(
        mockOnSkip
      );
    });

    it('renders target list items from creatureTargets', () => {
      render(<VitalityOfTheTreeModal {...makeProps()} />);
      expect(screen.getByText('Ally1')).toBeInTheDocument();
      expect(screen.getByText('Ally2')).toBeInTheDocument();
      expect(screen.getByText('Enemy1')).toBeInTheDocument();
    });

    it('renders "No targets available." when no creatureTargets', () => {
      render(<VitalityOfTheTreeModal {...makeProps({ creatureTargets: [] })} />);
      expect(screen.getByText('No targets available.')).toBeInTheDocument();
    });
  });

  // ── User interactions ──

  describe('user interactions', () => {
    it('calls onSkip when Skip button is clicked', () => {
      render(<VitalityOfTheTreeModal {...makeProps()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
      expect(mockOnSkip).toHaveBeenCalledTimes(1);
    });

    it('does not call onConfirm when confirm button is clicked with no selection', () => {
      render(<VitalityOfTheTreeModal {...makeProps()} />);
      const confirmBtn = screen.getByRole('button', { name: /Grant Vitality/ });
      expect(confirmBtn).toBeDisabled();
      fireEvent.click(confirmBtn);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  // ── Prop passthrough ──

  describe('prop passthrough', () => {
    it('passes different maxTargets values to CreatureSelectionModal', () => {
      render(<VitalityOfTheTreeModal {...makeProps({ maxTargets: 1 })} />);
      expect(vi.mocked(CreatureSelectionModal).mock.calls[0][0].maxTargets).toBe(1);

      vi.clearAllMocks();
      render(<VitalityOfTheTreeModal {...makeProps({ maxTargets: 6 })} />);
      expect(vi.mocked(CreatureSelectionModal).mock.calls[0][0].maxTargets).toBe(6);
    });

    it('passes different tempHp values to CreatureSelectionModal via description/note', () => {
      render(<VitalityOfTheTreeModal {...makeProps({ tempHp: 10 })} />);
      const props = vi.mocked(CreatureSelectionModal).mock.calls[0][0];
      expect(props.note).toBe("Each target gains 10 temp HP from the World Tree's life force.");
    });

    it('passes empty creatureTargets array to CreatureSelectionModal', () => {
      render(<VitalityOfTheTreeModal {...makeProps({ creatureTargets: [] })} />);
      expect(vi.mocked(CreatureSelectionModal).mock.calls[0][0].targets).toEqual([]);
    });

    it('passes string targets to CreatureSelectionModal', () => {
      const stringTargets = ['AllyA', 'AllyB', 'AllyC'];
      render(<VitalityOfTheTreeModal {...makeProps({ creatureTargets: stringTargets })} />);
      expect(vi.mocked(CreatureSelectionModal).mock.calls[0][0].targets).toEqual(
        stringTargets
      );
    });
  });

  // ── Default values ──

  describe('default values', () => {
    it('renders without maxTargets prop', () => {
      const props = makeProps();
      delete props.maxTargets;
      render(<VitalityOfTheTreeModal {...props} />);
      expect(screen.getByText('Vitality of the Tree')).toBeInTheDocument();
    });

    it('renders without onConfirm prop', () => {
      const props = makeProps();
      delete props.onConfirm;
      render(<VitalityOfTheTreeModal {...props} />);
      expect(screen.getByText('Vitality of the Tree')).toBeInTheDocument();
    });

    it('renders without onSkip prop', () => {
      const props = makeProps();
      delete props.onSkip;
      render(<VitalityOfTheTreeModal {...props} />);
      expect(screen.getByText('Vitality of the Tree')).toBeInTheDocument();
    });

    it('renders without tempHp prop', () => {
      const props = makeProps();
      delete props.tempHp;
      render(<VitalityOfTheTreeModal {...props} />);
      expect(screen.getByText('Vitality of the Tree')).toBeInTheDocument();
    });
  });

  // ── Fixed label/icon behavior ──

  describe('fixed label and icon behavior', () => {
    it('always uses "Vitality of the Tree" title', () => {
      render(<VitalityOfTheTreeModal {...makeProps()} />);
      expect(screen.getByText('Vitality of the Tree')).toBeInTheDocument();
    });

    it('always uses fa-tree icon', () => {
      render(<VitalityOfTheTreeModal {...makeProps()} />);
      expect(document.querySelectorAll('.fa-tree').length).toBeGreaterThan(0);
    });

    it('always uses "Grant Vitality" confirm label', () => {
      render(<VitalityOfTheTreeModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: /Grant Vitality/ })).toBeInTheDocument();
    });

    it('always shows "Choose up to N creatures to grant temporary hit points" description pattern', () => {
      render(<VitalityOfTheTreeModal {...makeProps({ maxTargets: 4 })} />);
      expect(
        screen.getByText('Choose up to 4 creatures to grant temporary hit points')
      ).toBeInTheDocument();
    });
  });

  // ── Description and note formatting ──

  describe('description and note formatting', () => {
    it('renders description with maxTargets=1', () => {
      render(<VitalityOfTheTreeModal {...makeProps({ maxTargets: 1 })} />);
      expect(
        screen.getByText('Choose up to 1 creatures to grant temporary hit points')
      ).toBeInTheDocument();
    });

    it('renders description with maxTargets=10', () => {
      render(<VitalityOfTheTreeModal {...makeProps({ maxTargets: 10 })} />);
      expect(
        screen.getByText('Choose up to 10 creatures to grant temporary hit points')
      ).toBeInTheDocument();
    });

    it('renders note with tempHp=0', () => {
      render(<VitalityOfTheTreeModal {...makeProps({ tempHp: 0 })} />);
      expect(
        screen.getByText("Each target gains 0 temp HP from the World Tree's life force.")
      ).toBeInTheDocument();
    });

    it('renders note with tempHp=1', () => {
      render(<VitalityOfTheTreeModal {...makeProps({ tempHp: 1 })} />);
      expect(
        screen.getByText("Each target gains 1 temp HP from the World Tree's life force.")
      ).toBeInTheDocument();
    });

    it('renders note with tempHp=100', () => {
      render(<VitalityOfTheTreeModal {...makeProps({ tempHp: 100 })} />);
      expect(
        screen.getByText("Each target gains 100 temp HP from the World Tree's life force.")
      ).toBeInTheDocument();
    });
  });

  // ── Integration with CreatureSelectionModal mock ──

  describe('integration with CreatureSelectionModal', () => {
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

    it('disables confirm button when no targets selected', () => {
      render(<VitalityOfTheTreeModal {...makeProps()} />);
      const confirmBtn = screen.getByRole('button', { name: /Grant Vitality/ });
      expect(confirmBtn).toBeDisabled();
    });

    it('shows selection count in confirm button', () => {
      render(<VitalityOfTheTreeModal {...makeProps()} />);
      expect(
        screen.getByRole('button', { name: /Grant Vitality \(0\)/ })
      ).toBeInTheDocument();
    });
  });
});
