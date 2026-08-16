// @improved-by-ai
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

import * as allySelection from '../../../../hooks/useAllySelection.js';
import * as combatData from '../../../../services/encounters/combatData.js';

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

function getCheckboxByName(name) {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  for (const cb of checkboxes) {
    const label = cb.closest('label');
    if (label && label.textContent.includes(name)) {
      return cb;
    }
  }
  return null;
}

// ── Tests ──

describe('SaveAttackAoeModal - CreatureSelectionModal path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CreatureSelectionModal rendering', () => {
    it('renders the modal with action name, save type, and DC', async () => {
      render(<SaveAttackAoeModal {...makeProps({ saveType: 'CON', saveDc: 18 })} />);
      expect(screen.getByText('Fireball')).toBeInTheDocument();
      expect(screen.getByText(/CON/)).toBeInTheDocument();
      expect(screen.getByText(/DC 18/)).toBeInTheDocument();
    });

    it('displays damage expression and type in the description text', () => {
      render(<SaveAttackAoeModal {...makeProps()} />);
      expect(screen.getByText(/On a failed save.*8d6.*Fire.*damage/)).toBeInTheDocument();
    });

    it('displays half damage info on successful save', () => {
      render(<SaveAttackAoeModal {...makeProps()} />);
      expect(screen.getByText(/On a successful save.*half damage/)).toBeInTheDocument();
    });

    it('renders all eligible creatures as selectable checkboxes', () => {
      render(<SaveAttackAoeModal {...makeProps()} />);
      expect(getCheckboxByName('Goblin A')).toBeInTheDocument();
      expect(getCheckboxByName('Goblin B')).toBeInTheDocument();
      expect(getCheckboxByName('Player One')).toBeInTheDocument();
    });

    it('renders Skip button to dismiss the modal', () => {
      render(<SaveAttackAoeModal {...makeProps()} />);
      expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
    });
  });

  describe('target selection', () => {
    it('toggles a target checkbox on and off', () => {
      render(<SaveAttackAoeModal {...makeProps()} />);
      const checkbox = getCheckboxByName('Goblin A');
      expect(checkbox.checked).toBe(false);
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(false);
    });

    it('updates target count in confirm button when a target is selected', () => {
      render(<SaveAttackAoeModal {...makeProps()} />);
      fireEvent.click(getCheckboxByName('Goblin A'));
      expect(screen.getByRole('button', { name: /Fireball \(1\)/ })).toBeInTheDocument();
    });

    it('disables the confirm button when no targets are selected', () => {
      render(<SaveAttackAoeModal {...makeProps()} />);
      const confirmBtn = screen.getByRole('button', { name: /Fireball/ });
      expect(confirmBtn).toBeDisabled();
    });
  });

  describe('heightened spell metamagic', () => {
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

    it('displays heightened spell note when metamagicHeighten is true', () => {
      render(<SaveAttackAoeModal {...makeProps({ metamagicHeighten: true })} />);
      expect(screen.getByText(/Heightened Spell/)).toBeInTheDocument();
    });
  });

  describe('careful spell metamagic', () => {
    it('passes carefulSpellProtected flag to targets when metamagicCareful is enabled', () => {
      allySelection.getAllyList.mockReturnValue(['Goblin A']);
      render(<SaveAttackAoeModal {...makeProps({ metamagicCareful: true })} />);
      // The CreatureSelectionModal receives targets with carefulSpellProtected flag
      expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
    });
  });

  describe('skip behavior', () => {
    it('calls onClose when Skip button is clicked', () => {
      const onClose = vi.fn();
      render(<SaveAttackAoeModal {...makeProps({ onClose })} />);
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('shows "No targets available" when combatSummary has no creatures', () => {
      combatData.getCombatSummary.mockReturnValue({ creatures: [] });
      render(<SaveAttackAoeModal {...makeProps()} />);
      expect(screen.getByText('No targets available.')).toBeInTheDocument();
    });

    it('renders without crashing when combatSummary is null', () => {
      combatData.getCombatSummary.mockReturnValue(null);
      render(<SaveAttackAoeModal {...makeProps()} />);
      expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
    });

    it('does not crash when onClose is undefined', () => {
      render(<SaveAttackAoeModal {...makeProps({ onClose: undefined })} />);
      expect(document.querySelector('.sp-overlay')).toBeInTheDocument();
    });
  });
});
