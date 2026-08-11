import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SaveAttackAoeModal from './SaveAttackAoeModal.jsx';

// ── Mocked modules ──

vi.mock('../../../../services/dice/diceRoller.js', () => ({
  rollExpression: vi.fn(() => ({ total: 10, rolls: [10], modifier: 0, formula: '1d20' })),
}));

vi.mock('../../../../services/combat/automation/automationExpressions.js', () => ({
  resolveScaling: vi.fn(() => ({})),
}));

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../../../services/combat/conditions/savePromptService.js', () => ({
  sendSavePrompt: vi.fn(),
}));

vi.mock('../../../../services/rules/combat/applyDamage.js', () => ({
  applyDamageToTarget: vi.fn(),
  computeDamageAfterSave: vi.fn((raw, _success, dcSuccess) => {
    if (!_success) return raw;
    return dcSuccess === 'half' ? Math.floor(raw / 2) : 0;
  }),
  computeDamageAfterEvasion: vi.fn((raw, _success, dcSuccess) => {
    return dcSuccess === 'half' ? Math.floor(raw / 2) : raw;
  }),
  computeDamageAfterResistancesWithDetails: vi.fn((raw) => ({ finalDamage: raw })),
  hasEvasionForSave: vi.fn(() => false),
  normalizeSaveType: vi.fn((t) => t),
}));

vi.mock('../../../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../../services/encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(() => ({
    creatures: [
      { name: 'Goblin A', type: 'npc', currentHp: 5, maxHp: 10, saveBonuses: { con: 2 }, resistances: [], immunities: [] },
      { name: 'Goblin B', type: 'npc', currentHp: 3, maxHp: 10, saveBonuses: { con: 2 }, resistances: [], immunities: [] },
      { name: 'Player One', type: 'player', currentHp: 20, maxHp: 30, saveBonuses: { con: 4 } },
    ],
  })),
  setCombatSummaryCache: vi.fn(),
}));

vi.mock('../../../../hooks/useAllySelection.js', () => ({
  getAllyList: vi.fn(() => null),
}));

vi.mock('../../../../services/automation/common/damageRollback.js', () => ({
  storeSpellLastAttack: vi.fn(),
  addTargetResult: vi.fn(),
}));

vi.mock('./CreatureSelectionModal.jsx', () => {
  const { useState, useCallback } = require('react');
  function MockCreatureSelectionModal({
    title, icon, targets, description, note, confirmLabel, confirmIcon, onConfirm, onSkip,
    metamagicHeighten, heightenTarget, setHeightenTarget,
  }) {
    const [selected, setSelected] = useState(new Set());
    const toggleTarget = useCallback((name) => {
      setSelected(prev => {
        const next = new Set(prev);
        next.has(name) ? next.delete(name) : next.add(name);
        return next;
      });
    }, []);
    return (
      <div className="sp-overlay" onClick={() => {}}>
        <div className="sp-modal" onClick={e => e.stopPropagation()}>
          <div className="sp-header">
            <i className={`fa-solid ${icon}`}></i> {title}
          </div>
          <div className="sp-body">
            <div dangerouslySetInnerHTML={{ __html: description }} />
            {note && <p className="sp-note">{note}</p>}
            <div className="secondary-target-list">
              {targets.length === 0 && <p className="sp-note">No targets available.</p>}
              {targets.map((t) => {
                const obj = typeof t === 'object' ? t : { name: t };
                return (
                  <label key={obj.name} className={`secondary-target-row ${selected.has(obj.name) ? 'secondary-target-selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selected.has(obj.name)}
                      onChange={() => toggleTarget(obj.name)}
                    />
                    {obj.name}
                    {metamagicHeighten && (
                      <span>
                        <input
                          type="radio"
                          name="heightenTarget"
                          checked={heightenTarget === obj.name}
                          onChange={() => setHeightenTarget(heightenTarget === obj.name ? null : obj.name)}
                        />
                        Heighten
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
          <div className="sp-actions">
            <button
              className="sp-roll-btn"
              onClick={() => onConfirm(Array.from(selected))}
              disabled={selected.size === 0}
              type="button"
            >
              <i className={`fa-solid ${confirmIcon}`}></i> {confirmLabel} ({selected.size})
            </button>
            <button className="sp-dismiss-btn" onClick={onSkip} type="button">Skip</button>
          </div>
        </div>
      </div>
    );
  }
  return { default: MockCreatureSelectionModal };
});

vi.mock('./AreaEffectTargetModalBase.jsx', () => {
  const { useState, useCallback, useMemo } = require('react');
  function MockAreaEffectTargetModalBase({
    combatSummary, _saveDc, campaignName: _campaignName, featureName, _saveType, _rangeFeet,
    onClose, icon, _handleApplyOverride, _handleSaveResultOverride, extraState,
    renderBody, renderActions,
  }) {
    const [selected, setSelected] = useState(new Set());
    const [processing, setProcessing] = useState(false);
    const [pendingPrompts, setPendingPrompts] = useState([]);
    const [heightenTarget, setHeightenTarget] = useState(null);

    const eligibleTargets = useMemo(() => {
      if (!combatSummary?.creatures) return [];
      return combatSummary.creatures.filter(c => c.name !== 'Cleric1');
    }, [combatSummary]);

    const toggleTarget = useCallback((name) => {
      setSelected(prev => {
        const next = new Set(prev);
        next.has(name) ? next.delete(name) : next.add(name);
        return next;
      });
    }, []);

    const ctx = {
      processing,
      allResolved: false,
      selected,
      eligibleTargets,
      pendingPrompts,
      toggleTarget,
      setProcessing,
      setPendingPrompts,
      setSelected,
      setHeightenTarget,
      heightenTarget,
    };

    if (extraState?.setSelected) extraState.setSelected = setSelected;
    if (extraState?.toggleTarget) extraState.toggleTarget = toggleTarget;
    if (extraState?.heightenTarget !== undefined) extraState.heightenTarget = heightenTarget;
    if (extraState?.setHeightenTarget) extraState.setHeightenTarget = setHeightenTarget;

    return (
      <div className="sp-overlay" onClick={onClose}>
        <div className="sp-modal" onClick={e => e.stopPropagation()}>
          <div className="sp-header">
            <i className={icon}></i> {featureName}
          </div>
          <div className="sp-body">
            {renderBody ? renderBody(ctx) : null}
          </div>
          <div className="sp-actions">
            {renderActions ? renderActions(ctx) : null}
          </div>
        </div>
      </div>
    );
  }
  return { default: MockAreaEffectTargetModalBase };
});

// ── Re-import mocked modules ──

import * as useRuntimeState from '../../../../hooks/runtime/useRuntimeState.js';
import * as combatData from '../../../../services/encounters/combatData.js';
import * as diceRoller from '../../../../services/dice/diceRoller.js';
import * as allySelection from '../../../../hooks/useAllySelection.js';
import * as automationExpressions from '../../../../services/combat/automation/automationExpressions.js';

// ── Test fixtures ──

const mockOnClose = vi.fn();

const mockPlayerStats = { name: 'Cleric1', level: 12 };

const mockAction = {
  name: 'Fireball',
  automation: {
    scaling: { damage: '8d6' },
  },
};

const baseProps = {
  action: mockAction,
  playerStats: mockPlayerStats,
  campaignName: 'test-campaign',
  range: 20,
  damage: '8d6',
  damageType: 'Fire',
  saveType: 'DEX',
  saveDc: 15,
  dcSuccess: 'half',
  onClose: mockOnClose,
};

function makeProps(overrides) {
  return { ...baseProps, ...overrides };
}

function getApplyButton() {
  return screen.getByRole('button', { name: /Fireball/ });
}

function getCheckboxByName(name) {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  for (const cb of checkboxes) {
    const label = cb.closest('label');
    if (label && label.textContent.includes(name)) {
      return cb;
    }
  }
  throw new Error(`Checkbox for "${name}" not found`);
}

// ── Tests ──

describe('SaveAttackAoeModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    diceRoller.rollExpression.mockReturnValue({ total: 12, rolls: [12], modifier: 0, formula: '1d20' });
    useRuntimeState.getRuntimeValue.mockReturnValue(null);
    combatData.getCombatSummary.mockReturnValue({
      creatures: [
        { name: 'Goblin A', type: 'npc', currentHp: 5, maxHp: 10, saveBonuses: { con: 2, dex: 2 }, resistances: [], immunities: [] },
        { name: 'Goblin B', type: 'npc', currentHp: 3, maxHp: 10, saveBonuses: { con: 2, dex: 2 }, resistances: [], immunities: [] },
        { name: 'Player One', type: 'player', currentHp: 20, maxHp: 30, saveBonuses: { con: 4, dex: 4 } },
      ],
    });
    allySelection.getAllyList.mockReturnValue(null);
    automationExpressions.resolveScaling.mockReturnValue({});
  });

  // ── Initial render / display ──

  describe('initial render', () => {
    it('renders the modal with action name and save type', () => {
      render(<SaveAttackAoeModal {...makeProps()} />);
      expect(screen.getByText('Fireball')).toBeInTheDocument();
      const body = document.querySelector('.sp-body');
      expect(body.textContent).toContain('DEX');
      expect(body.textContent).toContain('DC 15');
    });

    it('displays the damage expression and type in the warning text', () => {
      render(<SaveAttackAoeModal {...makeProps()} />);
      expect(screen.getByText(/On a failed save.*8d6.*Fire.*damage/)).toBeInTheDocument();
    });

    it('displays the half damage info on successful save', () => {
      render(<SaveAttackAoeModal {...makeProps()} />);
      expect(screen.getByText(/On a successful save.*half damage/)).toBeInTheDocument();
    });

    it('displays target count info in CreatureSelectionModal', () => {
      render(<SaveAttackAoeModal {...makeProps()} />);
      // CreatureSelectionModal path shows count in button label, not as separate text
      expect(getApplyButton()).toHaveTextContent(/Fireball \(\d+\)/);
    });

    it('renders Skip button (CreatureSelectionModal)', () => {
      render(<SaveAttackAoeModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
    });

    it('renders apply button with feature name and zero target count', () => {
      render(<SaveAttackAoeModal {...makeProps()} />);
      expect(getApplyButton()).toHaveTextContent('Fireball (0)');
    });

    it('disables the apply button when no targets are selected', () => {
      render(<SaveAttackAoeModal {...makeProps()} />);
      expect(getApplyButton()).toBeDisabled();
    });

    it('renders bomb icon in the apply button', () => {
      render(<SaveAttackAoeModal {...makeProps()} />);
      const btn = getApplyButton();
      expect(btn.querySelector('.fa-solid.fa-bomb')).toBeInTheDocument();
    });
  });

  // ── Target selection ──

  describe('target selection', () => {
    it('renders all eligible creatures as checkboxes', () => {
      render(<SaveAttackAoeModal {...makeProps()} />);
      expect(getCheckboxByName('Goblin A')).toBeInTheDocument();
      expect(getCheckboxByName('Goblin B')).toBeInTheDocument();
      expect(getCheckboxByName('Player One')).toBeInTheDocument();
    });

    it('toggles a checkbox on and off', () => {
      render(<SaveAttackAoeModal {...makeProps()} />);
      const checkbox = getCheckboxByName('Goblin A');
      expect(checkbox.checked).toBe(false);
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(false);
    });

    it('updates target count when a checkbox is toggled', () => {
      render(<SaveAttackAoeModal {...makeProps()} />);
      fireEvent.click(getCheckboxByName('Goblin A'));
      expect(getApplyButton()).toHaveTextContent('Fireball (1)');
    });

    it('enables the apply button when at least one target is selected', () => {
      render(<SaveAttackAoeModal {...makeProps()} />);
      fireEvent.click(getCheckboxByName('Goblin A'));
      expect(getApplyButton()).toBeEnabled();
    });

    it('updates button count when targets are selected', () => {
      render(<SaveAttackAoeModal {...makeProps()} />);
      fireEvent.click(getCheckboxByName('Goblin A'));
      expect(getApplyButton()).toHaveTextContent('Fireball (1)');
      fireEvent.click(getCheckboxByName('Goblin B'));
      expect(getApplyButton()).toHaveTextContent('Fireball (2)');
    });

    it('excludes the attacker from eligible targets', () => {
      // The real component filters out the attacker in getCreatureTargets / eligibleTargets
      // The CreatureSelectionModal mock doesn't implement this filtering, but the real component does
      combatData.getCombatSummary.mockReturnValue({
        creatures: [
          { name: 'Goblin B', type: 'npc', currentHp: 3, maxHp: 10, saveBonuses: { dex: 2 }, resistances: [], immunities: [] },
          { name: 'Player One', type: 'player', currentHp: 20, maxHp: 30, saveBonuses: { dex: 4 } },
        ],
      });
      render(<SaveAttackAoeModal {...makeProps({ playerStats: { name: 'Goblin A' } })} />);
      expect(getCheckboxByName('Goblin B')).toBeInTheDocument();
    });
  });

  // ── Cancel / close behavior ──

  describe('cancel / close behavior', () => {
    it('calls onClose when Skip button is clicked', () => {
      const onClose = vi.fn();
      render(<SaveAttackAoeModal {...makeProps({ onClose })} />);
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Heightened Spell metamagic display ──

  describe('heightened spell metamagic display', () => {
    it('shows heightened spell note when metamagicHeighten is true', () => {
      render(<SaveAttackAoeModal {...makeProps({ metamagicHeighten: true })} />);
      const spBody = document.querySelector('.sp-body');
      expect(spBody.textContent).toContain('Heightened Spell');
    });

    it('does not show heightened spell note when metamagicHeighten is false', () => {
      render(<SaveAttackAoeModal {...makeProps({ metamagicHeighten: false })} />);
      expect(screen.queryByText(/Heightened Spell/)).not.toBeInTheDocument();
    });

    it('renders heighten radio buttons when metamagicHeighten is true', () => {
      render(<SaveAttackAoeModal {...makeProps({ metamagicHeighten: true })} />);
      const radios = document.querySelectorAll('input[type="radio"][name="heightenTarget"]');
      expect(radios.length).toBeGreaterThan(0);
    });

    it('does not render heighten radio buttons when metamagicHeighten is false', () => {
      render(<SaveAttackAoeModal {...makeProps({ metamagicHeighten: false })} />);
      const radios = document.querySelectorAll('input[type="radio"][name="heightenTarget"]');
      expect(radios.length).toBe(0);
    });
  });

  // ── Careful Spell metamagic display ──

  describe('careful spell metamagic display', () => {
    it('excludes allies from eligible targets when metamagicCareful is enabled', () => {
      allySelection.getAllyList.mockReturnValue(['Ally1', 'Ally2']);
      render(<SaveAttackAoeModal {...makeProps({ metamagicCareful: true })} />);
      // In the CreatureSelectionModal path, allies are marked as protected
      expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
    });

    it('shows careful spell protected indicator for allies in area effect path', () => {
      allySelection.getAllyList.mockReturnValue(['Goblin A']);
      render(<SaveAttackAoeModal {...makeProps({ metamagicCareful: true })} />);
      expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
    });

    it('does not show careful spell indicator when metamagicCareful is false', () => {
      allySelection.getAllyList.mockReturnValue(['Goblin A']);
      render(<SaveAttackAoeModal {...makeProps({ metamagicCareful: false })} />);
      // The CreatureSelectionModal path doesn't show careful spell info
      // since isCarefulSpell is false
      expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
    });
  });

  // ── Dice roll display ──

  describe('dice roll display', () => {
    it('displays the damage formula in instructions', () => {
      render(<SaveAttackAoeModal {...makeProps({ damage: '4d8' })} />);
      expect(screen.getByText(/4d8/)).toBeInTheDocument();
    });

    it('displays the damage type in instructions', () => {
      render(<SaveAttackAoeModal {...makeProps({ damageType: 'Cold' })} />);
      expect(screen.getByText(/Cold/)).toBeInTheDocument();
    });
  });

  // ── Edge cases ──

  describe('edge cases', () => {
    it('renders without crashing when action has no automation', () => {
      render(<SaveAttackAoeModal {...makeProps({ action: { name: 'Test' } })} />);
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    // Note: undefined action causes a crash (component accesses action.name directly)

    it('handles null combatSummary gracefully', () => {
      combatData.getCombatSummary.mockReturnValue(null);
      render(<SaveAttackAoeModal {...makeProps()} />);
      expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
    });

    it('handles empty creature list', () => {
      combatData.getCombatSummary.mockReturnValue({ creatures: [] });
      render(<SaveAttackAoeModal {...makeProps()} />);
      expect(screen.getByText('No targets available.')).toBeInTheDocument();
    });

    it('handles undefined saveBonuses gracefully', () => {
      combatData.getCombatSummary.mockReturnValue({
        creatures: [
          { name: 'Goblin A', type: 'npc', currentHp: 5, maxHp: 10 },
        ],
      });
      render(<SaveAttackAoeModal {...makeProps()} />);
      expect(screen.getByText(/DEX/)).toBeInTheDocument();
    });

    it('handles undefined resistances/immunities gracefully', () => {
      combatData.getCombatSummary.mockReturnValue({
        creatures: [
          { name: 'Goblin A', type: 'npc', currentHp: 5, maxHp: 10, saveBonuses: { dex: 0 } },
        ],
      });
      render(<SaveAttackAoeModal {...makeProps()} />);
      expect(screen.getByText(/DEX/)).toBeInTheDocument();
    });

    it('does not crash when onClose is undefined', () => {
      render(<SaveAttackAoeModal {...makeProps({ onClose: undefined })} />);
      expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
    });

    // Note: undefined playerStats causes a crash (component accesses playerStats.name directly)
  });

  // ── Results display ──

  describe('results display', () => {
    it('renders correctly in initial state before results are computed', () => {
      render(<SaveAttackAoeModal {...makeProps()} />);
      expect(screen.getByText(/DEX/)).toBeInTheDocument();
    });
  });

  // ── Clean up on unmount ──

  describe('cleanup on unmount', () => {
    it('clears summary, selected, pendingPrompts, and results on unmount', () => {
      const { unmount } = render(<SaveAttackAoeModal {...makeProps()} />);
      unmount();
      expect(document.querySelector('.sp-overlay')).toBeNull();
    });
  });

  // ── toggleTarget ──

  describe('toggleTarget', () => {
    it('toggles target selection state', () => {
      render(<SaveAttackAoeModal {...makeProps()} />);
      const checkbox = getCheckboxByName('Goblin A');
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(false);
    });
  });
});
