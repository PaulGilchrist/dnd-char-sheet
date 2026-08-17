// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
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

describe('ArcaneVigorModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValueMock.mockImplementation(() => null);
    getCombatContextMock.mockResolvedValue(null);
    applyHealingToTargetMock.mockReturnValue(null);
  });

  describe('rendering', () => {
    it('renders the modal overlay and title', () => {
      renderModal();
      expect(document.querySelector('.arcane-vigor-overlay')).toBeTruthy();
      expect(document.querySelector('.arcane-vigor-modal')).toBeTruthy();
      expect(screen.getByText('Arcane Vigor')).toBeInTheDocument();
    });

    it('renders description with positive ability modifier', () => {
      renderModal({ spellcastingAbilityModifier: 3, spellcastingAbility: 'INT' });
      expect(screen.getByText(/roll total \+ 3 \(INT modifier\)/)).toBeInTheDocument();
    });

    it('renders description with negative ability modifier', () => {
      renderModal({ spellcastingAbilityModifier: -2 });
      expect(screen.getByText(/roll total \+ -2 \(INT modifier\)/)).toBeInTheDocument();
    });

    it('renders description with zero ability modifier', () => {
      renderModal({ spellcastingAbilityModifier: 0 });
      expect(screen.getByText(/roll total \+ 0 \(INT modifier\)/)).toBeInTheDocument();
    });

    it('renders all action buttons', () => {
      renderModal();
      expect(screen.getByText(/Roll One/)).toBeInTheDocument();
      expect(screen.getByText('Apply Healing')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('renders hit dice information with stored value', () => {
      getRuntimeValueMock.mockImplementation((_name, key) => {
        if (key === 'shortRestHitDice') return 5;
        return null;
      });
      renderModal({ diceCount: 6 });
      expect(screen.getByText(/5 of 5 remaining/)).toBeInTheDocument();
    });

    it('uses diceCount as fallback display when shortRestHitDice is null', () => {
      renderModal({ diceCount: 4 });
      expect(screen.getByText(/up to 4 dice/)).toBeInTheDocument();
    });

    it('does not show roll log table initially', () => {
      renderModal();
      expect(screen.queryByText(/Roll Total:/)).not.toBeInTheDocument();
    });

    it('does not show healing applied message initially', () => {
      renderModal();
      expect(screen.queryByText(/HP healed/)).not.toBeInTheDocument();
    });
  });

  describe('rolling behavior', () => {
    it('disables apply healing until dice are rolled', () => {
      renderModal();
      expect(screen.getByText('Apply Healing')).toBeDisabled();
    });

    it('shows roll results and projected healing after rolling', () => {
      renderModal({ spellcastingAbilityModifier: 3 });
      fireEvent.click(screen.getByText(/Roll One/));
      expect(screen.getByText('d8 = 4')).toBeInTheDocument();
      expect(screen.getByText(/Roll Total: 4 \+ 3 = 7 HP/)).toBeInTheDocument();
    });

    it('disables roll button when no hit dice remain', () => {
      getRuntimeValueMock.mockImplementation((_name, key) => {
        if (key === 'shortRestHitDice') return 0;
        return null;
      });
      renderModal();
      expect(screen.getByText(/Roll One/)).toBeDisabled();
    });

    it('disables roll button after rolling all available hit dice', () => {
      getRuntimeValueMock.mockImplementation((_name, key) => {
        if (key === 'shortRestHitDice') return 1;
        return null;
      });
      renderModal();
      fireEvent.click(screen.getByText(/Roll One/));
      expect(screen.getByText(/Roll One/)).toBeDisabled();
    });

    it('renders correct die size for different hit die types', () => {
      renderModal({ hitDieSize: 10 });
      fireEvent.click(screen.getByText(/Roll One/));
      expect(screen.getByText('d10 = 4')).toBeInTheDocument();
    });

    it('calculates projected healing with negative modifier', () => {
      renderModal({ spellcastingAbilityModifier: -1 });
      fireEvent.click(screen.getByText(/Roll One/));
      expect(screen.getByText(/Roll Total: 4 \+ -1 = 3 HP/)).toBeInTheDocument();
    });

    it('handles large negative modifier resulting in zero projected healing', () => {
      renderModal({ spellcastingAbilityModifier: -4 });
      fireEvent.click(screen.getByText(/Roll One/));
      expect(screen.getByText(/Roll Total: 4 \+ -4 = 0 HP/)).toBeInTheDocument();
    });

    it('updates projected healing when rolling additional dice', () => {
      renderModal({ spellcastingAbilityModifier: 3 });
      fireEvent.click(screen.getByText(/Roll One/));
      expect(screen.getByText(/Roll Total: 4 \+ 3 = 7 HP/)).toBeInTheDocument();
      fireEvent.click(screen.getByText(/Roll One/));
      expect(screen.getByText(/Roll Total: 8 \+ 3 = 11 HP/)).toBeInTheDocument();
    });

    it('updates available hit dice count after rolling', () => {
      getRuntimeValueMock.mockImplementation((_name, key) => {
        if (key === 'shortRestHitDice') return 3;
        return null;
      });
      renderModal();
      expect(screen.getByText(/3 of 3 remaining/)).toBeInTheDocument();
      fireEvent.click(screen.getByText(/Roll One/));
      expect(screen.getByText(/2 of 3 remaining/)).toBeInTheDocument();
    });

    it('shows remaining count decreasing with each roll', () => {
      getRuntimeValueMock.mockImplementation((_name, key) => {
        if (key === 'shortRestHitDice') return 4;
        return null;
      });
      renderModal();
      expect(screen.getByText(/4 of 4 remaining/)).toBeInTheDocument();
      fireEvent.click(screen.getByText(/Roll One/));
      expect(screen.getByText(/3 of 4 remaining/)).toBeInTheDocument();
      fireEvent.click(screen.getByText(/Roll One/));
      expect(screen.getByText(/2 of 4 remaining/)).toBeInTheDocument();
    });

    it('renders multiple roll entries in separate rows', () => {
      renderModal({ diceCount: 5 });
      fireEvent.click(screen.getByText(/Roll One/));
      fireEvent.click(screen.getByText(/Roll One/));
      fireEvent.click(screen.getByText(/Roll One/));
      const rows = document.querySelectorAll('.arcane-vigor-roll-log tbody tr');
      expect(rows.length).toBe(3);
    });
  });

  describe('healing flow', () => {
    it('applies healing and calls onComplete', async () => {
      const onComplete = vi.fn();
      renderModal({ onComplete });
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      expect(onComplete).toHaveBeenCalled();
      expect(screen.getByText(/HP healed/)).toBeInTheDocument();
    });

    it('shows healing applied message with correct HP after applying with combat context', async () => {
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

    it('logs to campaign after applying healing', async () => {
      renderModal();
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      expect(addEntry).toHaveBeenCalled();
    });

    it('disables all buttons after healing is applied', async () => {
      renderModal();
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      expect(screen.getByText(/Roll One/)).toBeDisabled();
      expect(screen.getByText('Apply Healing')).toBeDisabled();
      expect(screen.getByText('Cancel')).toBeDisabled();
    });

    it('renders applied message with consumed dice count and remaining after healing', async () => {
      getRuntimeValueMock.mockImplementation((_name, key) => {
        if (key === 'shortRestHitDice') return 5;
        return null;
      });
      renderModal();
      fireEvent.click(screen.getByText(/Roll One/));
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      await waitFor(() => {
        const appliedDiv = document.querySelector('.arcane-vigor-applied');
        expect(appliedDiv.textContent).toContain('2 hit dice consumed');
      });
    });
  });

  describe('hit dice consumption', () => {
    it('decrements shortRestHitDice by dice rolled count', async () => {
      getRuntimeValueMock.mockImplementation((_name, key) => {
        if (key === 'shortRestHitDice') return 5;
        return null;
      });
      renderModal();
      fireEvent.click(screen.getByText(/Roll One/));
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      expect(setRuntimeValueMock).toHaveBeenCalledWith('Elyra', 'shortRestHitDice', 3, mockCampaignName);
    });

    it('uses diceCount as fallback when storedHitDice is null', async () => {
      getRuntimeValueMock.mockImplementation(() => null);
      renderModal({ diceCount: 3 });
      fireEvent.click(screen.getByText(/Roll One/));
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      expect(setRuntimeValueMock).toHaveBeenCalledWith('Elyra', 'shortRestHitDice', 1, mockCampaignName);
    });

    it('handles partial consumption when storedHitDice is greater than diceCount', async () => {
      getRuntimeValueMock.mockImplementation((_name, key) => {
        if (key === 'shortRestHitDice') return 10;
        return null;
      });
      renderModal({ diceCount: 3 });
      fireEvent.click(screen.getByText(/Roll One/));
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      expect(setRuntimeValueMock).toHaveBeenCalledWith('Elyra', 'shortRestHitDice', 8, mockCampaignName);
    });
  });

  describe('cancellation', () => {
    it('calls onClose and not onComplete when cancelled', () => {
      const onClose = vi.fn();
      const onComplete = vi.fn();
      renderModal({ onClose, onComplete });
      fireEvent.click(screen.getByText('Cancel'));
      expect(onClose).toHaveBeenCalled();
      expect(onComplete).not.toHaveBeenCalled();
    });

    it('does not log when cancelled', async () => {
      renderModal();
      fireEvent.click(screen.getByText('Cancel'));
      expect(addEntry).not.toHaveBeenCalled();
    });

    it('does not call setRuntimeValue when cancel is clicked after rolling', () => {
      getRuntimeValueMock.mockImplementation((_name, key) => {
        if (key === 'shortRestHitDice') return 5;
        return null;
      });
      renderModal();
      fireEvent.click(screen.getByText(/Roll One/));
      fireEvent.click(screen.getByText(/Roll One/));
      fireEvent.click(screen.getByText('Cancel'));
      expect(setRuntimeValueMock).not.toHaveBeenCalled();
    });
  });

  describe('negative paths', () => {
    it('does not apply healing when no dice have been rolled', async () => {
      renderModal();
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      expect(screen.queryByText(/HP healed/)).not.toBeInTheDocument();
      expect(setRuntimeValueMock).not.toHaveBeenCalled();
    });
  });

  describe('overlay interaction', () => {
    it('calls onClose when overlay background is clicked', () => {
      const onClose = vi.fn();
      renderModal({ onClose });
      const overlay = document.querySelector('.arcane-vigor-overlay');
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('logging detail', () => {
    it('logs spell entry with all expected fields after applying healing', async () => {
      renderModal({ hitDieSize: 10, spellcastingAbilityModifier: 3, slotLevel: 4, playerName: 'TestChar' });
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
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

    it('logs hp_change entry with all expected fields after applying healing', async () => {
      renderModal({ hitDieSize: 8, spellcastingAbilityModifier: 3, playerName: 'Caster' });
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
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

    it('passes campaign name to both log entries', async () => {
      renderModal({ campaignName: 'my-campaign' });
      fireEvent.click(screen.getByText(/Roll One/));
      await act(async () => {
        fireEvent.click(screen.getByText('Apply Healing'));
      });
      expect(addEntry.mock.calls[0][0]).toBe('my-campaign');
      expect(addEntry.mock.calls[1][0]).toBe('my-campaign');
    });
  });
});
