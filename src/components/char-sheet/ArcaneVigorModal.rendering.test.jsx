import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

describe('ArcaneVigorModal - rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRuntimeValueMock.mockImplementation(() => null);
  });

  it('renders the modal title with wand icon', () => {
    renderModal();
    expect(screen.getByText('Arcane Vigor')).toBeInTheDocument();
  });

  it('renders the description text with ability modifier', () => {
    renderModal({ spellcastingAbility: 'WIS', spellcastingAbilityModifier: 2 });
    expect(screen.getByText(/regain HP equal to the roll total \+ 2 \(WIS modifier\)/)).toBeInTheDocument();
  });

  it('renders hit dice information with die size and counts', () => {
    renderModal();
    expect(screen.getByText(/d8 — .* remaining/)).toBeInTheDocument();
  });

  it('renders hit dice section heading', () => {
    renderModal();
    expect(screen.getByText('Hit Dice')).toBeInTheDocument();
  });

  it('renders roll button with die size', () => {
    renderModal();
    expect(screen.getByText(/Roll One \(d8\)/)).toBeInTheDocument();
  });

  it('renders cancel button', () => {
    renderModal();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('renders apply healing button', () => {
    renderModal();
    expect(screen.getByText('Apply Healing')).toBeInTheDocument();
  });

  it('shows correct dice count for upcast level 2', () => {
    renderModal({ slotLevel: 2, diceCount: 2 });
    expect(screen.getByText(/up to 2 dice/)).toBeInTheDocument();
  });

  it('shows correct dice count for upcast level 5', () => {
    renderModal({ slotLevel: 5, diceCount: 5 });
    expect(screen.getByText(/up to 5 dice/)).toBeInTheDocument();
  });

  it('shows correct dice count for upcast level 9', () => {
    renderModal({ slotLevel: 9, diceCount: 9 });
    expect(screen.getByText(/up to 9 dice/)).toBeInTheDocument();
  });

  it('has roll log table headers', () => {
    renderModal();
    fireEvent.click(screen.getByText(/Roll One/));
    expect(screen.getByText('Roll')).toBeInTheDocument();
    expect(screen.getByText('Result')).toBeInTheDocument();
  });

  it('does not show roll log initially', () => {
    renderModal();
    expect(screen.queryByText(/Roll Total:/)).not.toBeInTheDocument();
  });

  it('does not show healing applied message initially', () => {
    renderModal();
    expect(screen.queryByText(/HP healed/)).not.toBeInTheDocument();
  });

  it('renders with negative ability modifier', () => {
    renderModal({ spellcastingAbilityModifier: -2 });
    expect(screen.getByText(/roll total \+ -2 \(INT modifier\)/)).toBeInTheDocument();
  });
});
