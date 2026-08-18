// @improved-by-ai
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CoronaEnemySelectionModal from './CoronaEnemySelectionModal.jsx';

// ── Mock CreatureSelectionModal ──

// Minimal mock that renders enough structure for interaction tests
// without coupling to the real component's internal DOM structure.
vi.mock('./shared/CreatureSelectionModal.jsx', () => ({
  default: vi.fn(({ title, icon, targets, description, confirmLabel, confirmIcon: _confirmIcon, onConfirm, onSkip }) => (
    <div data-testid="creature-selection-modal">
      <div className="sp-header">
        <i className={`fa-solid ${icon || 'fa-crosshairs'}`}></i> {title}
      </div>
      {description && <p>{description}</p>}
      <div className="secondary-target-list">
        {targets.map((target, i) => (
          <div key={i} data-testid={`target-${i}`}>
            {typeof target === 'string' ? target : target.name || target}
          </div>
        ))}
      </div>
      <div className="sp-actions">
        <button
          className="sp-roll-btn"
          onClick={onConfirm}
          type="button"
        >
          {confirmLabel || 'Confirm'}
        </button>
        <button className="sp-dismiss-btn" onClick={onSkip} type="button">
          Skip
        </button>
      </div>
    </div>
  )),
}));

import CreatureSelectionModal from './shared/CreatureSelectionModal.jsx';

// ── Test helpers ──

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

// ── Tests ──

describe('CoronaEnemySelectionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('prop passthrough', () => {
    it('passes correct hardcoded props to CreatureSelectionModal', () => {
      render(<CoronaEnemySelectionModal {...makeProps()} />);

      const passedProps = vi.mocked(CreatureSelectionModal).mock.calls[0][0];
      expect(passedProps.title).toBe('Corona of Light');
      expect(passedProps.icon).toBe('fa-sun');
      expect(passedProps.confirmIcon).toBe('fa-sun');
      expect(passedProps.confirmLabel).toBe('Activate Corona');
      expect(passedProps.description).toBe(
        'Select which creatures are enemies of the caster. Enemies in the bright light have Disadvantage on saving throws against Fire and Radiant damage:'
      );
    });

    it('passes creatureTargets as targets', () => {
      render(<CoronaEnemySelectionModal {...makeProps()} />);

      const passedProps = vi.mocked(CreatureSelectionModal).mock.calls[0][0];
      expect(passedProps.targets).toEqual(mockTargets);
    });

    it('passes onConfirm and onSkip callbacks', () => {
      render(<CoronaEnemySelectionModal {...makeProps()} />);

      const passedProps = vi.mocked(CreatureSelectionModal).mock.calls[0][0];
      expect(passedProps.onConfirm).toBe(mockOnConfirm);
      expect(passedProps.onSkip).toBe(mockOnSkip);
    });

    it('passes empty targets array', () => {
      render(<CoronaEnemySelectionModal {...makeProps({ creatureTargets: [] })} />);

      const passedProps = vi.mocked(CreatureSelectionModal).mock.calls[0][0];
      expect(passedProps.targets).toEqual([]);
    });

    it('passes string targets', () => {
      const stringTargets = ['Creature1', 'Creature2'];
      render(<CoronaEnemySelectionModal {...makeProps({ creatureTargets: stringTargets })} />);

      const passedProps = vi.mocked(CreatureSelectionModal).mock.calls[0][0];
      expect(passedProps.targets).toEqual(stringTargets);
    });

    it('passes undefined onConfirm', () => {
      render(<CoronaEnemySelectionModal {...makeProps({ onConfirm: undefined })} />);

      const passedProps = vi.mocked(CreatureSelectionModal).mock.calls[0][0];
      expect(passedProps.onConfirm).toBeUndefined();
    });

    it('passes undefined onSkip', () => {
      render(<CoronaEnemySelectionModal {...makeProps({ onSkip: undefined })} />);

      const passedProps = vi.mocked(CreatureSelectionModal).mock.calls[0][0];
      expect(passedProps.onSkip).toBeUndefined();
    });
  });

  describe('rendered output', () => {
    it('renders the modal container', () => {
      render(<CoronaEnemySelectionModal {...makeProps()} />);
      expect(screen.getByTestId('creature-selection-modal')).toBeInTheDocument();
    });

    it('renders the title from the component', () => {
      render(<CoronaEnemySelectionModal {...makeProps()} />);
      expect(screen.getByText('Corona of Light')).toBeInTheDocument();
    });

    it('renders the description from the component', () => {
      render(<CoronaEnemySelectionModal {...makeProps()} />);
      expect(screen.getByText(
        'Select which creatures are enemies of the caster. Enemies in the bright light have Disadvantage on saving throws against Fire and Radiant damage:'
      )).toBeInTheDocument();
    });

    it('renders targets from props', () => {
      render(<CoronaEnemySelectionModal {...makeProps({ creatureTargets: ['Alice', 'Bob'] })} />);
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('renders the confirm button with the correct label', () => {
      render(<CoronaEnemySelectionModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: /activate corona/i })).toBeInTheDocument();
    });

    it('renders the skip button', () => {
      render(<CoronaEnemySelectionModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument();
    });

    it('renders the skip button even when onSkip is undefined', () => {
      render(<CoronaEnemySelectionModal {...makeProps({ onSkip: undefined })} />);
      expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('calls onConfirm when the confirm button is clicked', () => {
      render(<CoronaEnemySelectionModal {...makeProps()} />);
      screen.getByRole('button', { name: /activate corona/i }).click();
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onSkip when the skip button is clicked', () => {
      render(<CoronaEnemySelectionModal {...makeProps()} />);
      screen.getByRole('button', { name: /skip/i }).click();
      expect(mockOnSkip).toHaveBeenCalledTimes(1);
    });
  });
});
