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

describe('ArcaneVigorModal - logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValueMock.mockImplementation(() => null);
  });

  it('calls addEntry for spell log after applying healing', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    renderModal();
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    expect(addEntry).toHaveBeenCalled();
  });

  it('logs spell entry with correct character name', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    renderModal({ playerName: 'TestCharacter' });
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    const spellEntry = addEntry.mock.calls[0][1];
    expect(spellEntry.characterName).toBe('TestCharacter');
  });

  it('logs spell entry with correct spell name', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    renderModal();
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    const spellEntry = addEntry.mock.calls[0][1];
    expect(spellEntry.spellName).toBe('Arcane Vigor');
  });

  it('logs spell entry with correct type', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    renderModal();
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    const spellEntry = addEntry.mock.calls[0][1];
    expect(spellEntry.type).toBe('spell');
  });

  it('logs spell entry with correct target name', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    renderModal({ playerName: 'Healer' });
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    const spellEntry = addEntry.mock.calls[0][1];
    expect(spellEntry.targetName).toBe('Healer');
  });

  it('logs spell entry with correct slot level', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    renderModal({ slotLevel: 4 });
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    const spellEntry = addEntry.mock.calls[0][1];
    expect(spellEntry.spellLevel).toBe(4);
  });

  it('logs spell entry with correct dice count', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    renderModal({ diceCount: 5 });
    await act(async () => {
      fireEvent.click(screen.getByText(/Roll One/));
    });
    await act(async () => {
      fireEvent.click(screen.getByText(/Roll One/));
    });
    await act(async () => {
      fireEvent.click(screen.getByText(/Roll One/));
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    const spellEntry = addEntry.mock.calls[0]?.[1];
    expect(spellEntry).toBeDefined();
    expect(spellEntry.diceRolled).toBe(3);
  });

  it('logs spell entry with correct hit die size', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    renderModal({ hitDieSize: 10 });
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    const spellEntry = addEntry.mock.calls[0][1];
    expect(spellEntry.hitDieSize).toBe(10);
  });

  it('logs spell entry with correct roll total', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    renderModal();
    // rollDice returns total = count * 4, so 1d8 => total=4
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    const spellEntry = addEntry.mock.calls[0][1];
    expect(spellEntry.rollTotal).toBe(4);
  });

  it('logs spell entry with correct ability modifier', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    renderModal({ spellcastingAbilityModifier: 5 });
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    const spellEntry = addEntry.mock.calls[0][1];
    expect(spellEntry.abilityModifier).toBe(5);
  });

  it('logs spell entry with correct healing amount', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    renderModal();
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    const spellEntry = addEntry.mock.calls[0][1];
    expect(spellEntry.healing).toBe(0);
  });

  it('logs spell entry with correct hit dice remaining', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    getRuntimeValueMock.mockImplementation((_name, key) => {
      if (key === 'shortRestHitDice') return 5;
      return null;
    });
    renderModal();
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    const spellEntry = addEntry.mock.calls[0][1];
    expect(spellEntry.hitDiceRemaining).toBe(4);
  });

  it('logs spell entry with casting time', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    renderModal();
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    const spellEntry = addEntry.mock.calls[0][1];
    expect(spellEntry.castingTime).toBe('Bonus Action');
  });

  it('logs hp_change entry with correct delta', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    renderModal();
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    expect(addEntry.mock.calls.length).toBe(2);
    const hpEntry = addEntry.mock.calls[1][1];
    expect(hpEntry.type).toBe('hp_change');
    expect(hpEntry.delta).toBe(0);
  });

  it('logs hp_change entry with correct source name', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    renderModal({ playerName: 'Caster' });
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    const hpEntry = addEntry.mock.calls[1][1];
    expect(hpEntry.sourceName).toBe('Caster');
  });

  it('logs hp_change entry with note', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    renderModal();
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    const hpEntry = addEntry.mock.calls[1][1];
    expect(hpEntry.note).toBe('Arcane Vigor');
  });

  it('logs hp_change entry with isHealing true', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    renderModal();
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    const hpEntry = addEntry.mock.calls[1][1];
    expect(hpEntry.isHealing).toBe(true);
  });

  it('logs hp_change entry with correct formula', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    renderModal({ hitDieSize: 8, spellcastingAbilityModifier: 3 });
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    const hpEntry = addEntry.mock.calls[1][1];
    expect(hpEntry.formula).toBe('1d8 + 3');
  });

  it('logs hp_change entry with correct formula for multiple dice', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    renderModal({ hitDieSize: 10, spellcastingAbilityModifier: -1 });
    fireEvent.click(screen.getByText(/Roll One/));
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    const hpEntry = addEntry.mock.calls[1][1];
    expect(hpEntry.formula).toBe('2d10 + -1');
  });

  it('logs with current timestamp', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    renderModal();
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    const spellEntry = addEntry.mock.calls[0][1];
    const hpEntry = addEntry.mock.calls[1][1];
    expect(typeof spellEntry.timestamp).toBe('number');
    expect(typeof hpEntry.timestamp).toBe('number');
    expect(hpEntry.timestamp).toBeGreaterThanOrEqual(spellEntry.timestamp);
  });

  it('does not log when cancel is clicked without applying', () => {
    renderModal();
    fireEvent.click(screen.getByText('Cancel'));
    expect(setRuntimeValueMock).not.toHaveBeenCalled();
  });

  it('logs with correct campaign name', async () => {
    const { addEntry } = await import('../../services/ui/logService.js');
    renderModal({ campaignName: 'test-campaign' });
    fireEvent.click(screen.getByText(/Roll One/));
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Healing'));
    });
    expect(addEntry.mock.calls[0][0]).toBe('test-campaign');
    expect(addEntry.mock.calls[1][0]).toBe('test-campaign');
  });
});
