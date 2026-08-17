// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ArcaneVigorModal from './ArcaneVigorModal.jsx';

const getRuntimeValueMock = vi.fn(() => null);
const setRuntimeValueMock = vi.fn();

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getStore: vi.fn(() => new Map()),
  useSyncedState: vi.fn(() => [null, vi.fn()]),
  useRuntimeValue: vi.fn(() => null),
  listeners: new Map(),
  getRuntimeValue: vi.fn((...args) => getRuntimeValueMock(...args)),
  setRuntimeValue: vi.fn((...args) => setRuntimeValueMock(...args)),
}));

vi.mock('../../services/dice/diceRoller.js', () => ({
  rollDice: vi.fn((count, _die) => ({ total: count * 4, rolls: Array(count).fill(4) })),
}));

vi.mock('../../services/rules/combat/damageUtils.js', () => ({
  getCombatContext: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../services/rules/combat/applyHealing.js', () => ({
  applyHealingToTarget: vi.fn(() => null),
}));

vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve({})),
}));

import { addEntry } from '../../services/ui/logService.js';

const mockCampaignName = 'test-campaign';

function createProps(overrides = {}) {
  return {
    hitDieSize: 8,
    spellcastingAbility: 'INT',
    spellcastingAbilityModifier: 3,
    diceCount: 2,
    slotLevel: 2,
    playerName: 'Elyra',
    campaignName: mockCampaignName,
    onClose: vi.fn(),
    onComplete: vi.fn(),
    ...overrides,
  };
}

function renderModal(overrides = {}) {
  const props = createProps(overrides);
  const rendered = render(<ArcaneVigorModal {...props} />);
  return { ...rendered, onClose: props.onClose, onComplete: props.onComplete, props };
}

async function applyHealing() {
  fireEvent.click(screen.getByText(/Roll One/));
  await act(async () => {
    fireEvent.click(screen.getByText('Apply Healing'));
  });
}

describe('ArcaneVigorModal - logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValueMock.mockImplementation(() => null);
  });

  describe('spell log entry', () => {
    it('logs spell entry with all expected fields after applying healing', async () => {
      renderModal({ hitDieSize: 10, spellcastingAbilityModifier: 3, slotLevel: 4, playerName: 'TestChar' });
      await applyHealing();
      const spellEntry = addEntry.mock.calls[0][1];
      expect(spellEntry).toMatchObject({
        type: 'spell',
        characterName: 'TestChar',
        targetName: 'TestChar',
        spellName: 'Arcane Vigor',
        spellLevel: 4,
        castingTime: 'Bonus Action',
        diceRolled: 1,
        hitDieSize: 10,
        rollTotal: 4,
        abilityModifier: 3,
        healing: 0,
        hitDiceRemaining: 1,
      });
      expect(typeof spellEntry.timestamp).toBe('number');
    });

    it('logs spell entry with correct dice count when multiple dice are rolled', async () => {
      getRuntimeValueMock.mockImplementation((_name, key) => {
        if (key === 'shortRestHitDice') return 5;
        return null;
      });
      renderModal({ hitDieSize: 8 });
      fireEvent.click(screen.getByText(/Roll One/));
      fireEvent.click(screen.getByText(/Roll One/));
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      const spellEntry = addEntry.mock.calls[0][1];
      expect(spellEntry.diceRolled).toBe(3);
      expect(spellEntry.hitDiceRemaining).toBe(2);
    });
  });

  describe('hp_change log entry', () => {
    it('logs hp_change entry with all expected fields after applying healing', async () => {
      renderModal({ hitDieSize: 8, spellcastingAbilityModifier: 3, playerName: 'Caster' });
      await applyHealing();
      const hpEntry = addEntry.mock.calls[1][1];
      expect(hpEntry).toMatchObject({
        type: 'hp_change',
        targetName: 'Caster',
        delta: 0,
        isHealing: true,
        sourceName: 'Caster',
        note: 'Arcane Vigor',
        formula: '1d8 + 3',
      });
      expect(typeof hpEntry.timestamp).toBe('number');
    });

    it('logs hp_change entry with correct formula for multiple dice', async () => {
      renderModal({ hitDieSize: 10, spellcastingAbilityModifier: -1 });
      fireEvent.click(screen.getByText(/Roll One/));
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      const hpEntry = addEntry.mock.calls[1][1];
      expect(hpEntry.formula).toBe('2d10 + -1');
    });
  });

  describe('campaign name propagation', () => {
    it('passes campaign name to both log entries', async () => {
      renderModal({ campaignName: 'my-campaign' });
      await applyHealing();
      expect(addEntry.mock.calls[0][0]).toBe('my-campaign');
      expect(addEntry.mock.calls[1][0]).toBe('my-campaign');
    });
  });
});
