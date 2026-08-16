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

const getCombatContextMock = vi.fn(() => Promise.resolve(null));
vi.mock('../../services/rules/combat/damageUtils.js', () => ({
  getCombatContext: (...args) => getCombatContextMock(...args),
}));

const applyHealingToTargetMock = vi.fn(() => null);
vi.mock('../../services/rules/combat/applyHealing.js', () => ({
  applyHealingToTarget: (...args) => applyHealingToTargetMock(...args),
}));

vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve({})),
}));

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

describe('ArcaneVigorModal - healing application', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValueMock.mockImplementation(() => null);
    getCombatContextMock.mockResolvedValue(null);
    applyHealingToTargetMock.mockReturnValue(null);
  });

  describe('setRuntimeValue behavior', () => {
    it('calls setRuntimeValue with correct arguments when healing is applied', async () => {
      getRuntimeValueMock.mockImplementation((_name, key) => {
        if (key === 'shortRestHitDice') return 5;
        return null;
      });
      renderModal();
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      expect(setRuntimeValueMock).toHaveBeenCalledWith('Elyra', 'shortRestHitDice', 4, mockCampaignName);
    });

    it('does not call setRuntimeValue when no dice are rolled before healing', async () => {
      renderModal();
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      expect(setRuntimeValueMock).not.toHaveBeenCalled();
    });

    it('does not call setRuntimeValue when cancel is clicked', () => {
      renderModal();
      fireEvent.click(screen.getByText('Cancel'));
      expect(setRuntimeValueMock).not.toHaveBeenCalled();
    });
  });

  describe('applyHealingToTarget behavior', () => {
    it('calls applyHealingToTarget with correct parameters', async () => {
      const combatSummary = {
        creatures: [{ name: 'Elyra', hp: 10, maxHp: 20 }],
      };
      getCombatContextMock.mockResolvedValue(combatSummary);
      applyHealingToTargetMock.mockReturnValue({ actualHeal: 5, newHp: 15, oldHp: 10 });
      renderModal({ playerName: 'Elyra' });
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      expect(applyHealingToTargetMock).toHaveBeenCalledWith(
        combatSummary,
        'Elyra',
        7,
        mockCampaignName
      );
    });

    it('displays 0 HP healed when applyHealingToTarget returns null with combat context', async () => {
      const combatSummary = {
        creatures: [{ name: 'OtherPlayer', hp: 10, maxHp: 20 }],
      };
      getCombatContextMock.mockResolvedValue(combatSummary);
      applyHealingToTargetMock.mockReturnValue(null);
      renderModal();
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      expect(screen.getByText(/0 HP healed/)).toBeInTheDocument();
    });
  });

  describe('log entry healing data', () => {
    it('logs spell entry with correct healing amount from combat context', async () => {
      const { addEntry } = await import('../../services/ui/logService.js');
      const combatSummary = {
        creatures: [{ name: 'Elyra', hp: 10, maxHp: 20 }],
      };
      getCombatContextMock.mockResolvedValue(combatSummary);
      applyHealingToTargetMock.mockReturnValue({ actualHeal: 8, newHp: 18, oldHp: 10 });
      renderModal();
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      const spellEntry = addEntry.mock.calls[0][1];
      expect(spellEntry.healing).toBe(8);
    });

    it('logs hp_change entry with correct delta from actual healing', async () => {
      const { addEntry } = await import('../../services/ui/logService.js');
      const combatSummary = {
        creatures: [{ name: 'Elyra', hp: 10, maxHp: 20 }],
      };
      getCombatContextMock.mockResolvedValue(combatSummary);
      applyHealingToTargetMock.mockReturnValue({ actualHeal: 6, newHp: 16, oldHp: 10 });
      renderModal();
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      const hpEntry = addEntry.mock.calls[1][1];
      expect(hpEntry.delta).toBe(6);
    });
  });

  describe('onComplete with missing callback', () => {
    it('does not throw when onComplete is undefined', async () => {
      renderModal({ onComplete: undefined });
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      expect(screen.getByText(/HP healed/)).toBeInTheDocument();
    });
  });
});
