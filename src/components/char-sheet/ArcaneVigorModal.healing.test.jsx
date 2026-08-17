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

  describe('healing application flow', () => {
    it('shows healing applied message with correct HP after applying healing', async () => {
      const combatSummary = {
        creatures: [{ name: 'Elyra', hp: 10, maxHp: 20 }],
      };
      getCombatContextMock.mockResolvedValue(combatSummary);
      applyHealingToTargetMock.mockReturnValue({ actualHeal: 7, newHp: 17, oldHp: 10 });
      renderModal();
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      expect(screen.getByText(/7 HP healed/)).toBeInTheDocument();
    });

    it('shows 0 HP healed when no combat context is available', async () => {
      renderModal();
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      expect(screen.getByText(/0 HP healed/)).toBeInTheDocument();
    });

    it('shows 0 HP healed when applyHealingToTarget returns null with combat context', async () => {
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

    it('calls onComplete after applying healing', async () => {
      const onComplete = vi.fn();
      renderModal({ onComplete });
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      expect(onComplete).toHaveBeenCalled();
    });

    it('does not call onComplete when cancelling', () => {
      const onComplete = vi.fn();
      renderModal({ onComplete });
      fireEvent.click(screen.getByText('Cancel'));
      expect(onComplete).not.toHaveBeenCalled();
    });
  });
});
