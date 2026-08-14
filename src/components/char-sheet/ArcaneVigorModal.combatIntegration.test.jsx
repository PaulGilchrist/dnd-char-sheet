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

describe('ArcaneVigorModal - combat context integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValueMock.mockImplementation(() => null);
    getCombatContextMock.mockResolvedValue(null);
    applyHealingToTargetMock.mockReturnValue(null);
  });

  it('calls getCombatContext with campaign name when applying healing', async () => {
    renderModal();
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    expect(getCombatContextMock).toHaveBeenCalledWith(mockCampaignName);
  });

  it('calls applyHealingToTarget with combat summary, player name, healing amount, and campaign name', async () => {
    const combatSummary = {
      creatures: [{ name: 'Elyra', hp: 10, maxHp: 20 }],
    };
    getCombatContextMock.mockResolvedValue(combatSummary);
    applyHealingToTargetMock.mockReturnValue({ actualHeal: 7, newHp: 17, oldHp: 10 });
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

  it('displays actual healing from applyHealingToTarget result', async () => {
    const combatSummary = {
      creatures: [{ name: 'Elyra', hp: 10, maxHp: 20 }],
    };
    getCombatContextMock.mockResolvedValue(combatSummary);
    applyHealingToTargetMock.mockReturnValue({ actualHeal: 5, newHp: 15, oldHp: 10 });
    renderModal();
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    expect(screen.getByText(/5 HP healed/)).toBeInTheDocument();
  });

  it('uses zero healing when applyHealingToTarget returns null with combat context', async () => {
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

  it('uses zero healing when getCombatContext returns null', async () => {
    getCombatContextMock.mockResolvedValue(null);
    renderModal();
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    expect(screen.getByText(/0 HP healed/)).toBeInTheDocument();
  });

  it('logs spell entry with actual healing from combat applyHealingToTarget', async () => {
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

  it('logs hp_change with newHp and maxHp from combat result', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    const combatSummary = {
      creatures: [{ name: 'Elyra', hp: 10, maxHp: 20 }],
    };
    getCombatContextMock.mockResolvedValue(combatSummary);
    applyHealingToTargetMock.mockReturnValue({ actualHeal: 5, newHp: 15, oldHp: 10 });
    renderModal();
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    const hpEntry = addEntry.mock.calls[1][1];
    expect(hpEntry.currentHp).toBe(15);
    expect(hpEntry.maxHp).toBe(20);
  });

  it('logs hp_change with delta from actual healing in combat', async () => {
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

  it('logs hp_change formula with correct dice count when multiple dice rolled', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    const combatSummary = {
      creatures: [{ name: 'Elyra', hp: 10, maxHp: 20 }],
    };
    getCombatContextMock.mockResolvedValue(combatSummary);
    applyHealingToTargetMock.mockReturnValue({ actualHeal: 10, newHp: 20, oldHp: 10 });
    renderModal();
    fireEvent.click(screen.getByText(/Roll One/));
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    const hpEntry = addEntry.mock.calls[1][1];
    expect(hpEntry.formula).toBe('2d8 + 3');
  });

  it('logs hp_change with zero newHp and maxHp when no combat context', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    getCombatContextMock.mockResolvedValue(null);
    renderModal();
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    const hpEntry = addEntry.mock.calls[1][1];
    expect(hpEntry.currentHp).toBe(0);
    expect(hpEntry.maxHp).toBe(0);
  });

  it('logs spell entry with zero healing when no combat context', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    getCombatContextMock.mockResolvedValue(null);
    renderModal();
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    const spellEntry = addEntry.mock.calls[0][1];
    expect(spellEntry.healing).toBe(0);
  });

  it('logs hp_change with zero delta when no combat context', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    getCombatContextMock.mockResolvedValue(null);
    renderModal();
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    const hpEntry = addEntry.mock.calls[1][1];
    expect(hpEntry.delta).toBe(0);
  });

  it('logs spell entry with actual healing when applyHealingToTarget returns null but combat context exists', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
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
    const spellEntry = addEntry.mock.calls[0][1];
    expect(spellEntry.healing).toBe(0);
  });

  it('logs hp_change with creature maxHp when creature has no maxHp property', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    const combatSummary = {
      creatures: [{ name: 'Elyra', hp: 10 }],
    };
    getCombatContextMock.mockResolvedValue(combatSummary);
    applyHealingToTargetMock.mockReturnValue({ actualHeal: 4, newHp: 14, oldHp: 10 });
    renderModal();
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    const hpEntry = addEntry.mock.calls[1][1];
    expect(hpEntry.maxHp).toBe(0);
  });

  it('calls onComplete after applying healing with combat context', async () => {
    const onComplete = vi.fn();
    const combatSummary = {
      creatures: [{ name: 'Elyra', hp: 10, maxHp: 20 }],
    };
    getCombatContextMock.mockResolvedValue(combatSummary);
    applyHealingToTargetMock.mockReturnValue({ actualHeal: 5, newHp: 15, oldHp: 10 });
    renderModal({ onComplete });
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    expect(onComplete).toHaveBeenCalled();
  });
});
