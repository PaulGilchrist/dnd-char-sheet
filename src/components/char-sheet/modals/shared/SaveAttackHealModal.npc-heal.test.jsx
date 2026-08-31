// CLA-208 regression: Land's Aid style save+heal area features must restore
// real HP to EB-joined monsters. Monster HP lives in combatSummary.currentHp
// (applyDamage NPC branch), NOT in the per-name runtime currentHitPoints —
// so the heal must go through applyHealingToTarget/modifyHitPoints, and the
// result must persist to combatSummary (cache + storage).
//
// This suite uses the REAL applyHealing.js + hpModifier.js, mocking only
// transport (runtime store, storage, SSE/log) and dice.
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SaveAttackHealModal from './SaveAttackHealModal.jsx';

// ── Mocked modules ──

vi.mock('../../../../services/rules/combat/rangeValidation.js', () => ({
  getDistanceFeet: vi.fn(() => 10),
}));

vi.mock('../../../../services/combat/conditions/savePromptService.js', () => ({
  sendSavePrompt: vi.fn(),
  sendSaveResult: vi.fn(),
}));

vi.mock('../../../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../../services/dice/diceRoller.js', () => ({
  rollExpression: vi.fn(),
}));

vi.mock('../../../../services/ui/utils.js', () => ({
  default: { guid: vi.fn(() => 'npc-heal-guid') },
}));

vi.mock('../../../../services/ui/storage.js', () => ({
  default: { set: vi.fn(), get: vi.fn(() => null) },
}));

vi.mock('../../../../services/encounters/combatData.js', () => ({
  setCombatSummaryCache: vi.fn(),
}));

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../../services/automation/common/healingRoll.js', () => ({
  logHealingToSSE: vi.fn(),
}));

vi.mock('../../../../services/rules/combat/applyDamage.js', () => ({
  applyDamageToTarget: vi.fn((cs, name, dmg) => {
    const creature = cs.creatures.find(c => c.name === name);
    const oldHp = creature.currentHp;
    creature.currentHp = Math.max(0, oldHp - dmg);
    return { finalDamage: dmg, oldHp, newHp: creature.currentHp };
  }),
  computeDamageAfterEvasion: vi.fn((raw, success) => (success ? Math.floor(raw / 2) : raw)),
  computeDamageAfterSave: vi.fn((raw, success) => (success ? Math.floor(raw / 2) : raw)),
  hasEvasionForSave: vi.fn(() => false),
  normalizeSaveType: vi.fn(t => String(t).toLowerCase()),
}));

// ── Re-import mocked modules (applyHealing.js is NOT mocked — real logic) ──

import * as logService from '../../../../services/ui/logService.js';
import * as diceRoller from '../../../../services/dice/diceRoller.js';
import * as healingRoll from '../../../../services/automation/common/healingRoll.js';
import storage from '../../../../services/ui/storage.js';
import { setCombatSummaryCache } from '../../../../services/encounters/combatData.js';

// ── Fixtures ──

function makeProps(overrides) {
  return {
    combatSummary: {
      creatures: [
        { name: 'Wild_Sage_Druid', type: 'player', maxHp: 122 },
        { name: 'Animated Rug of Smothering 1', type: 'npc', maxHp: 27, currentHp: 27, saveBonuses: { con: 0 } },
      ],
    },
    attackerName: 'Wild_Sage_Druid',
    attackerPos: null,
    saveDc: 17,
    campaignName: 'test-campaign',
    mapData: null,
    featureName: "Land's Aid",
    saveType: 'CON',
    rangeFeet: 60,
    damageExpression: '4d6',
    damageType: 'Necrotic',
    healExpression: '4d6',
    onClose: vi.fn(),
    ...(overrides || {}),
  };
}

function getCheckboxByName(name) {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  for (const cb of checkboxes) {
    const label = cb.closest('label');
    if (label && label.textContent.includes(name)) return cb;
  }
  throw new Error(`Checkbox for "${name}" not found`);
}

// ── Tests ──

describe('SaveAttackHealModal — NPC heal restores combatSummary HP (CLA-208)', () => {
  let props;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: vi.fn() });
    // Save fails (d20 4 vs DC 17), damage roll 7 (of 4d6)
    diceRoller.rollExpression.mockImplementation(expr => {
      if (expr === '1d20') return { total: 4, rolls: [4], modifier: 0 };
      return { total: 7, rolls: [1, 2, 1, 3], modifier: 0 };
    });
    props = makeProps();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('heals a damaged NPC monster by the rolled amount, clamped to maxHp, and persists combatSummary', async () => {
    const { getByRole } = render(<SaveAttackHealModal {...props} />);

    // Select the rug and resolve the save → fails, takes 7 necrotic → currentHp 20
    fireEvent.click(getCheckboxByName('Animated Rug of Smothering 1'));
    await act(async () => {
      fireEvent.click(getByRole('button', { name: /Land's Aid \(1 target\)/ }));
    });
    await waitFor(() => {
      expect(props.combatSummary.creatures.find(c => c.name === 'Animated Rug of Smothering 1').currentHp).toBe(20);
    });

    // Radio-select the rug for the heal half; heal roll = 10
    diceRoller.rollExpression.mockReturnValue({ total: 10, rolls: [4, 6], modifier: 0 });
    await act(async () => {
      fireEvent.click(document.querySelector('input[type="radio"][name="healTarget"]'));
    });
    await act(async () => {
      fireEvent.click(getByRole('button', { name: /Heal Selected/ }));
    });

    // DECISIVE: NPC HP actually restored — 20 → 27 (clamped to maxHp), actual heal 7, not 0
    const rug = props.combatSummary.creatures.find(c => c.name === 'Animated Rug of Smothering 1');
    expect(rug.currentHp).toBe(27);
    expect(healingRoll.logHealingToSSE).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
      targetName: 'Animated Rug of Smothering 1',
      actualHeal: 7,
      newHp: 27,
      maxHp: 27,
    }));

    // Persisted to storage + combat summary cache
    expect(storage.set).toHaveBeenCalledWith('combatSummary', props.combatSummary, 'test-campaign');
    expect(setCombatSummaryCache).toHaveBeenCalledWith(props.combatSummary, 'test-campaign');

    // Popup reports a nonzero actual heal
    await waitFor(() => {
      expect(document.querySelector('.sp-body').textContent).toContain('actual: 7');
    });

    // Healing roll logged with the scaled formula
    expect(logService.addEntry).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
      type: 'roll',
      rollType: 'healing',
      targetName: 'Animated Rug of Smothering 1',
      formula: '4d6',
      total: 10,
    }));
  });

  it('clamps the heal at maxHp so actual heal never exceeds the HP deficit', async () => {
    props.combatSummary.creatures.find(c => c.name === 'Animated Rug of Smothering 1').currentHp = 25;
    const { getByRole } = render(<SaveAttackHealModal {...props} />);

    fireEvent.click(getCheckboxByName('Animated Rug of Smothering 1'));
    await act(async () => {
      fireEvent.click(getByRole('button', { name: /Land's Aid \(1 target\)/ }));
    });
    // Damage mock takes 7 → currentHp 18; heal roll 10 → newHp 28 clamps to 27, actual 9
    diceRoller.rollExpression.mockReturnValue({ total: 10, rolls: [4, 6], modifier: 0 });
    await act(async () => {
      fireEvent.click(document.querySelector('input[type="radio"][name="healTarget"]'));
    });
    await act(async () => {
      fireEvent.click(getByRole('button', { name: /Heal Selected/ }));
    });

    const rug = props.combatSummary.creatures.find(c => c.name === 'Animated Rug of Smothering 1');
    expect(rug.currentHp).toBe(27);
    expect(healingRoll.logHealingToSSE).toHaveBeenCalledWith('test-campaign', expect.objectContaining({
      actualHeal: 9,
      newHp: 27,
      maxHp: 27,
    }));
  });
});
