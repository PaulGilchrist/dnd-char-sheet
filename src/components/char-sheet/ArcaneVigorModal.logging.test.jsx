// @improved-by-ai
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

function getSpellEntry() {
  expect(addEntry.mock.calls.length).toBeGreaterThanOrEqual(1);
  return addEntry.mock.calls[0][1];
}

function getHpEntry() {
  expect(addEntry.mock.calls.length).toBeGreaterThanOrEqual(2);
  return addEntry.mock.calls[1][1];
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
    it('calls addEntry for spell log after applying healing', async () => {
      renderModal();
      await applyHealing();
      expect(addEntry).toHaveBeenCalled();
    });

    it('logs spell entry with correct character name', async () => {
      renderModal({ playerName: 'TestCharacter' });
      await applyHealing();
      expect(getSpellEntry().characterName).toBe('TestCharacter');
    });

    it('logs spell entry with correct spell name', async () => {
      renderModal();
      await applyHealing();
      expect(getSpellEntry().spellName).toBe('Arcane Vigor');
    });

    it('logs spell entry with correct type', async () => {
      renderModal();
      await applyHealing();
      expect(getSpellEntry().type).toBe('spell');
    });

    it('logs spell entry with correct target name', async () => {
      renderModal({ playerName: 'Healer' });
      await applyHealing();
      expect(getSpellEntry().targetName).toBe('Healer');
    });

    it('logs spell entry with correct slot level', async () => {
      renderModal({ slotLevel: 4 });
      await applyHealing();
      expect(getSpellEntry().spellLevel).toBe(4);
    });

    it('logs spell entry with correct dice count', async () => {
      getRuntimeValueMock.mockImplementation((_name, key) => {
        if (key === 'shortRestHitDice') return 5;
        return null;
      });
      renderModal();
      fireEvent.click(screen.getByText(/Roll One/));
      fireEvent.click(screen.getByText(/Roll One/));
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      expect(getSpellEntry().diceRolled).toBe(3);
    });

    it('logs spell entry with correct hit die size', async () => {
      renderModal({ hitDieSize: 10 });
      await applyHealing();
      expect(getSpellEntry().hitDieSize).toBe(10);
    });

    it('logs spell entry with correct roll total', async () => {
      renderModal();
      await applyHealing();
      expect(getSpellEntry().rollTotal).toBe(4);
    });

    it('logs spell entry with correct ability modifier', async () => {
      renderModal({ spellcastingAbilityModifier: 5 });
      await applyHealing();
      expect(getSpellEntry().abilityModifier).toBe(5);
    });

    it('logs spell entry with correct healing amount when no combat context', async () => {
      renderModal();
      await applyHealing();
      expect(getSpellEntry().healing).toBe(0);
    });

    it('logs spell entry with correct hit dice remaining', async () => {
      getRuntimeValueMock.mockImplementation((_name, key) => {
        if (key === 'shortRestHitDice') return 5;
        return null;
      });
      renderModal();
      await applyHealing();
      expect(getSpellEntry().hitDiceRemaining).toBe(4);
    });

    it('logs spell entry with casting time', async () => {
      renderModal();
      await applyHealing();
      expect(getSpellEntry().castingTime).toBe('Bonus Action');
    });
  });

  describe('hp_change log entry', () => {
    it('logs hp_change entry with correct delta when no combat context', async () => {
      renderModal();
      await applyHealing();
      expect(getHpEntry().type).toBe('hp_change');
      expect(getHpEntry().delta).toBe(0);
    });

    it('logs hp_change entry with correct source name', async () => {
      renderModal({ playerName: 'Caster' });
      await applyHealing();
      expect(getHpEntry().sourceName).toBe('Caster');
    });

    it('logs hp_change entry with note', async () => {
      renderModal();
      await applyHealing();
      expect(getHpEntry().note).toBe('Arcane Vigor');
    });

    it('logs hp_change entry with isHealing true', async () => {
      renderModal();
      await applyHealing();
      expect(getHpEntry().isHealing).toBe(true);
    });

    it('logs hp_change entry with correct formula for single die', async () => {
      renderModal({ hitDieSize: 8, spellcastingAbilityModifier: 3 });
      await applyHealing();
      expect(getHpEntry().formula).toBe('1d8 + 3');
    });

    it('logs hp_change entry with correct formula for multiple dice', async () => {
      renderModal({ hitDieSize: 10, spellcastingAbilityModifier: -1 });
      fireEvent.click(screen.getByText(/Roll One/));
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      expect(getHpEntry().formula).toBe('2d10 + -1');
    });
  });

  describe('timestamp ordering', () => {
    it('logs with current timestamps', async () => {
      renderModal();
      await applyHealing();
      const spellEntry = getSpellEntry();
      const hpEntry = getHpEntry();
      expect(typeof spellEntry.timestamp).toBe('number');
      expect(typeof hpEntry.timestamp).toBe('number');
      expect(hpEntry.timestamp).toBeGreaterThanOrEqual(spellEntry.timestamp);
    });
  });

  describe('cancellation', () => {
    it('does not log when cancel is clicked without rolling', () => {
      renderModal();
      fireEvent.click(screen.getByText('Cancel'));
      expect(addEntry).not.toHaveBeenCalled();
    });

    it('does not log when cancel is clicked after rolling', () => {
      renderModal();
      fireEvent.click(screen.getByText(/Roll One/));
      fireEvent.click(screen.getByText('Cancel'));
      expect(addEntry).not.toHaveBeenCalled();
    });
  });

  describe('campaign name propagation', () => {
    it('logs with correct campaign name for both entries', async () => {
      renderModal({ campaignName: 'test-campaign' });
      await applyHealing();
      expect(addEntry.mock.calls[0][0]).toBe('test-campaign');
      expect(addEntry.mock.calls[1][0]).toBe('test-campaign');
    });
  });
});
