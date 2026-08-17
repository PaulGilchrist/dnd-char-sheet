// @cleaned-by-ai
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CoronaEnemySelectionModal from './CoronaEnemySelectionModal.jsx';

// ── Mock CreatureSelectionModal ──

vi.mock('./shared/CreatureSelectionModal.jsx', () => ({
  default: vi.fn((props) => (
    <div data-testid="creature-selection-modal">
      <div className="sp-header">
        <i className={`fa-solid ${props.icon}`}></i> {props.title}
      </div>
      {props.description && <p>{props.description}</p>}
      <div className="secondary-target-list">
        {props.targets.map((target, i) => (
          <div key={i} data-testid={`target-${i}`}>
            {target.name || target}
          </div>
        ))}
      </div>
      <div className="sp-actions">
        <button className="sp-roll-btn" onClick={props.onConfirm} type="button">
          {props.confirmLabel || 'Confirm'}
        </button>
        <button className="sp-dismiss-btn" onClick={props.onSkip} type="button">
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

  describe('passes correct hardcoded props to CreatureSelectionModal', () => {
    it('passes title, icons, description, and confirmLabel', () => {
      render(<CoronaEnemySelectionModal {...makeProps()} />);
      const props = CreatureSelectionModal.mock.calls[0][0];
      expect(props.title).toBe('Corona of Light');
      expect(props.icon).toBe('fa-sun');
      expect(props.confirmIcon).toBe('fa-sun');
      expect(props.confirmLabel).toBe('Activate Corona');
      expect(props.description).toBe(
        'Select which creatures are enemies of the caster. Enemies in the bright light have Disadvantage on saving throws against Fire and Radiant damage:'
      );
    });

    it('passes creatureTargets as targets', () => {
      render(<CoronaEnemySelectionModal {...makeProps()} />);
      const props = CreatureSelectionModal.mock.calls[0][0];
      expect(props.targets).toBe(mockTargets);
    });

    it('passes onConfirm and onSkip callbacks', () => {
      render(<CoronaEnemySelectionModal {...makeProps()} />);
      const props = CreatureSelectionModal.mock.calls[0][0];
      expect(props.onConfirm).toBe(mockOnConfirm);
      expect(props.onSkip).toBe(mockOnSkip);
    });
  });

  describe('prop passthrough', () => {
    it('passes empty targets array', () => {
      render(<CoronaEnemySelectionModal {...makeProps({ creatureTargets: [] })} />);
      const props = CreatureSelectionModal.mock.calls[0][0];
      expect(props.targets).toEqual([]);
    });

    it('passes string targets', () => {
      const stringTargets = ['Creature1', 'Creature2'];
      render(<CoronaEnemySelectionModal {...makeProps({ creatureTargets: stringTargets })} />);
      const props = CreatureSelectionModal.mock.calls[0][0];
      expect(props.targets).toBe(stringTargets);
    });

    it('passes undefined onConfirm', () => {
      render(<CoronaEnemySelectionModal {...makeProps({ onConfirm: undefined })} />);
      const props = CreatureSelectionModal.mock.calls[0][0];
      expect(props.onConfirm).toBeUndefined();
    });

    it('passes undefined onSkip', () => {
      render(<CoronaEnemySelectionModal {...makeProps({ onSkip: undefined })} />);
      const props = CreatureSelectionModal.mock.calls[0][0];
      expect(props.onSkip).toBeUndefined();
    });
  });
});
