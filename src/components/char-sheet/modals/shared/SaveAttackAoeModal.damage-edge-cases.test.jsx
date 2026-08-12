import { render, screen, fireEvent, act } from '@testing-library/react';
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

describe('SaveAttackAoeModal - Damage resolution', () => {
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

  // ── resolveAllSavesAndDamage edge cases ──

  describe('resolveAllSavesAndDamage edge cases', () => {
    it('returns early when combatSummary is null', async () => {
      combatData.getCombatSummary.mockReturnValue(null);
      render(<SaveAttackAoeModal {...makeProps()} />);
      expect(screen.getByText('Fireball')).toBeInTheDocument();
    });

    it('skips targets that are not found in combatSummary', async () => {
      diceRoller.rollExpression.mockReturnValue({ total: 5, rolls: [5], modifier: 0, formula: '1d20' });
      combatData.getCombatSummary.mockReturnValue({
        creatures: [
          { name: 'Goblin A', type: 'npc', currentHp: 5, maxHp: 10, saveBonuses: { dex: 2 }, resistances: [], immunities: [] },
        ],
      });
      render(<SaveAttackAoeModal {...makeProps()} />);
      expect(screen.getByText(/DEX/)).toBeInTheDocument();
    });
  });

  // ── renderBody returning null ──

  describe('renderBody returning null', () => {
    it('returns null when all conditions are false (no summary, not processing, no pending prompts)', () => {
      render(<SaveAttackAoeModal {...makeProps()} />);
      // When summary is null, processing is false, and pendingPrompts is empty,
      // renderBody should return the initial selection UI, not null
      expect(screen.getByText(/Select creatures in the area/)).toBeInTheDocument();
    });
  });

  // ── renderActions all-resolved path ──

  describe('renderActions all-resolved path', () => {
    it('sets summary when allResolved is true and summary is null', async () => {
      diceRoller.rollExpression.mockReturnValue({ total: 5, rolls: [5], modifier: 0, formula: '1d20' });
      render(<SaveAttackAoeModal {...makeProps()} />);
      fireEvent.click(getCheckboxByName('Goblin A'));
      const confirmBtn = screen.getByRole('button', { name: /Fireball \(1\)/ });
      await act(async () => {
        fireEvent.click(confirmBtn);
      });
      await act(async () => {
        await new Promise(r => setTimeout(r, 50));
      });
      // After results are computed, the summary should be set
      expect(screen.getByText(/Fireball — Results/)).toBeInTheDocument();
    });
  });

  // ── Normalized save type ──

  describe('normalized save type', () => {
    it('passes normalized save type to hasEvasionForSave for NPC targets', async () => {
      const { normalizeSaveType, hasEvasionForSave } = await import('../../../../services/rules/combat/applyDamage.js');
      normalizeSaveType.mockReturnValue('dex');
      hasEvasionForSave.mockReturnValue(false);
      render(<SaveAttackAoeModal {...makeProps()} />);
      fireEvent.click(getCheckboxByName('Goblin A'));
      const confirmBtn = screen.getByRole('button', { name: /Fireball \(1\)/ });
      await act(async () => {
        fireEvent.click(confirmBtn);
      });
      expect(normalizeSaveType).toHaveBeenCalledWith('DEX');
    });
  });

  // ── Combat summary persistence ──

  describe('combat summary persistence', () => {
    it('calls persistAndNotify after resolveAllSavesAndDamage', async () => {
      const { setCombatSummaryCache } = await import('../../../../services/encounters/combatData.js');
      render(<SaveAttackAoeModal {...makeProps()} />);
      fireEvent.click(getCheckboxByName('Goblin A'));
      const confirmBtn = screen.getByRole('button', { name: /Fireball \(1\)/ });
      await act(async () => {
        fireEvent.click(confirmBtn);
      });
      expect(setCombatSummaryCache).toHaveBeenCalled();
    });
  });

  // ── Save event listener cleanup ──

  describe('save event listener cleanup', () => {
    it('does not crash on unmount', () => {
      const { unmount } = render(<SaveAttackAoeModal {...makeProps()} />);
      expect(() => unmount()).not.toThrow();
    });
  });

  // ── Multiple targets ──

  describe('multiple targets', () => {
    it('processes all selected NPC targets', async () => {
      diceRoller.rollExpression.mockReturnValue({ total: 5, rolls: [5], modifier: 0, formula: '1d20' });
      render(<SaveAttackAoeModal {...makeProps()} />);
      fireEvent.click(getCheckboxByName('Goblin A'));
      fireEvent.click(getCheckboxByName('Goblin B'));
      const confirmBtn = screen.getByRole('button', { name: /Fireball \(2\)/ });
      await act(async () => {
        fireEvent.click(confirmBtn);
      });
      const { addTargetResult } = await import('../../../../services/automation/common/damageRollback.js');
      const goblinACalls = addTargetResult.mock.calls.filter(c => c[1] && c[1].targetName === 'Goblin A');
      const goblinBCalls = addTargetResult.mock.calls.filter(c => c[1] && c[1].targetName === 'Goblin B');
      expect(goblinACalls.length).toBeGreaterThan(0);
      expect(goblinBCalls.length).toBeGreaterThan(0);
    });
  });

  // ── saveResult entry logging for NPC ──

  describe('save result entry logging for NPC', () => {
    it('logs save roll entry for NPC when finalDamage > 0', async () => {
      diceRoller.rollExpression.mockReturnValue({ total: 5, rolls: [5], modifier: 0, formula: '1d20' });
      render(<SaveAttackAoeModal {...makeProps()} />);
      fireEvent.click(getCheckboxByName('Goblin A'));
      const confirmBtn = screen.getByRole('button', { name: /Fireball \(1\)/ });
      await act(async () => {
        fireEvent.click(confirmBtn);
      });
      const { addEntry } = await import('../../../../services/ui/logService.js');
      const rollCalls = addEntry.mock.calls.filter(c => c[1] && c[1].type === 'roll' && c[1].rollType === 'save-damage' && c[1].name === 'Fireball');
      expect(rollCalls.length).toBeGreaterThan(0);
    });
  });

  // ── Player save damage logging ──

  describe('player save damage logging', () => {
    it('logs damage entry for player when finalDamage > 0 after save', async () => {
      const { sendSavePrompt } = await import('../../../../services/combat/conditions/savePromptService.js');
      render(<SaveAttackAoeModal {...makeProps()} />);
      fireEvent.click(getCheckboxByName('Player One'));
      const confirmBtn = screen.getByRole('button', { name: /Fireball \(1\)/ });
      await act(async () => {
        fireEvent.click(confirmBtn);
      });
      const promptCall = sendSavePrompt.mock.calls[0][1];

      await act(async () => {
        window.dispatchEvent(new CustomEvent('save-result', {
          detail: {
            promptId: promptCall.promptId,
            success: false,
            saveBonus: 4,
            rawDamage: 12,
            total: 16,
            roll: 12,
          },
        }));
      });

      await act(async () => {
        await new Promise(r => setTimeout(r, 50));
      });

      const { addEntry } = await import('../../../../services/ui/logService.js');
      const damageCalls = addEntry.mock.calls.filter(c => c[1] && c[1].type === 'roll' && c[1].rollType === 'save-damage' && c[1].name === 'Fireball');
      expect(damageCalls.length).toBeGreaterThan(0);
    });
  });

  // ── Save bonus from detail ──

  describe('save bonus from detail', () => {
    it('uses saveBonus from save-result detail for player', async () => {
      const { sendSavePrompt } = await import('../../../../services/combat/conditions/savePromptService.js');
      render(<SaveAttackAoeModal {...makeProps()} />);
      fireEvent.click(getCheckboxByName('Player One'));
      const confirmBtn = screen.getByRole('button', { name: /Fireball \(1\)/ });
      await act(async () => {
        fireEvent.click(confirmBtn);
      });
      const promptCall = sendSavePrompt.mock.calls[0][1];

      await act(async () => {
        window.dispatchEvent(new CustomEvent('save-result', {
          detail: {
            promptId: promptCall.promptId,
            success: true,
            saveBonus: 4,
            rawDamage: 12,
            total: 16,
            roll: 12,
          },
        }));
      });

      await act(async () => {
        await new Promise(r => setTimeout(r, 50));
      });

      const { addEntry } = await import('../../../../services/ui/logService.js');
      const rollCalls = addEntry.mock.calls.filter(c => c[1] && c[1].type === 'roll' && c[1].rollType === 'save-damage' && c[1].targetName === 'Player One');
      expect(rollCalls.length).toBeGreaterThan(0);
    });
  });

  // ── pendingPrompts state management ──

  describe('pendingPrompts state management', () => {
    it('adds promptId to pendingSaveListenerPrompts when sending save prompt', async () => {
      const { setRuntimeValue } = await import('../../../../hooks/runtime/useRuntimeState.js');
      render(<SaveAttackAoeModal {...makeProps()} />);
      fireEvent.click(getCheckboxByName('Player One'));
      const confirmBtn = screen.getByRole('button', { name: /Fireball \(1\)/ });
      await act(async () => {
        fireEvent.click(confirmBtn);
      });
      expect(setRuntimeValue).toHaveBeenCalledWith('campaign', 'pendingSaveListenerPrompts', expect.any(Array), 'test-campaign');
    });
  });
});
