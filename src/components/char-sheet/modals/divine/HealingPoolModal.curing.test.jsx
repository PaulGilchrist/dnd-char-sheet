// @improved-by-ai
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HealingPoolModal from './HealingPoolModal.jsx';

// ── Mocked modules ──

vi.mock('../../../../hooks/runtime/useRuntimeState.js', () => ({
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(),
  addStorageChangeListener: vi.fn(() => () => {}),
}));

vi.mock('../../../../hooks/runtime/useTrackedResource.js', () => ({
  default: vi.fn(),
}));

vi.mock('../../../../services/ui/storage.js', () => ({
  default: { set: vi.fn() },
}));

vi.mock('../../../../services/rules/combat/damageUtils.js', () => ({
  getTargetFromAttacker: vi.fn(() => null),
  getCombatContext: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../../../services/rules/combat/applyHealing.js', () => ({
  applyHealingToTarget: vi.fn(),
}));

vi.mock('../../../../services/ui/utils.js', () => ({
  default: { getName: vi.fn((n) => n?.toLowerCase().trim()) },
}));

vi.mock('../../../../services/combat/conditions/conditionUtils.js', () => ({
  CONDITIONS: [
    { key: 'blinded', label: 'Blinded' },
    { key: 'charmed', label: 'Charmed' },
    { key: 'poisoned', label: 'Poisoned' },
    { key: 'frightened', label: 'Frightened' },
  ],
}));

// ── Re-import mocked modules ──

import * as useRuntimeState from '../../../../hooks/runtime/useRuntimeState.js';
import useTrackedResource from '../../../../hooks/runtime/useTrackedResource.js';
import storage from '../../../../services/ui/storage.js';
import * as damageUtils from '../../../../services/rules/combat/damageUtils.js';

// ── Test fixtures ──

const mockPlayerStats = {
  name: 'Paladin1',
  level: 3,
  hitPoints: 40,
  abilities: { CHA: 14 },
};
const mockCampaignName = 'test-campaign';

const mockCombatSummary = {
  creatures: [
    { name: 'Paladin1', type: 'player', targetName: 'Orc Warrior' },
    { name: 'Orc Warrior', type: 'npc', maxHp: 30, currentHp: 15, conditions: [{ key: 'blinded' }] },
  ],
};

let updateFn;

function setupPoolMock(current = 15, max = 20) {
  updateFn = vi.fn();
  useTrackedResource.mockReturnValue({ current, max, update: updateFn });
}

function makeProps(overrides) {
  return {
    playerStats: mockPlayerStats,
    campaignName: mockCampaignName,
    alsoCures: ['Blinded'],
    cureCost: 3,
    restoringTouchConditions: null,
    onClose: vi.fn(),
    ...(overrides ?? {}),
  };
}

async function renderModal(poolConfig, overrides) {
  setupPoolMock(poolConfig?.current, poolConfig?.max);
  const rendered = render(<HealingPoolModal {...makeProps(overrides)} />);
  await waitFor(() => {
    expect(screen.queryByText(/Loading/)).not.toBeInTheDocument();
  });
  return { ...rendered, updateFn };
}

function getLogTableRows() {
  const table = screen.getByRole('table');
  const rows = table.querySelectorAll('tr');
  return Array.from(rows).slice(1);
}

// ── Tests ──

describe('HealingPoolModal - Curing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: vi.fn() });
    damageUtils.getCombatContext.mockResolvedValue(mockCombatSummary);
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeConditions') return ['blinded'];
      return null;
    });
    setupPoolMock();
  });

  // ── Rendering individual cure buttons ──

  it('renders individual cure buttons when alsoCures provided without restoringTouch', async () => {
    await renderModal({ current: 15, max: 20 }, { restoringTouchConditions: null });
    expect(screen.getByText(/Cure Conditions/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Blinded/i })).toBeInTheDocument();
  });

  it('does not render individual cure buttons when alsoCures is empty or null', async () => {
    await renderModal({ current: 15, max: 20 }, { alsoCures: [] });
    expect(screen.queryByText(/Cure Conditions/)).not.toBeInTheDocument();
  });

  it('deduplicates alsoCures entries when duplicates are provided', async () => {
    await renderModal({ current: 15, max: 20 }, { alsoCures: ['Blinded', 'Blinded', 'Blinded'] });
    const buttons = screen.getAllByRole('button', { name: /Blinded/i });
    expect(buttons).toHaveLength(1);
  });

  // ── Individual cure behavior ──

  it('applies individual cure when cure button clicked', async () => {
    damageUtils.getCombatContext.mockResolvedValue(mockCombatSummary);
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeConditions') return ['blinded', 'charmed'];
      if (key === 'currentHitPoints') return 15;
      return null;
    });

    await renderModal({ current: 10, max: 20 });
    fireEvent.click(screen.getByRole('button', { name: /Blinded/i }));

    expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
      'Paladin1',
      'activeConditions',
      expect.arrayContaining(['charmed']),
      mockCampaignName,
    );
  });

  it('removes the cured condition from the activeConditions array', async () => {
    damageUtils.getCombatContext.mockResolvedValue(mockCombatSummary);
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeConditions') return ['blinded', 'charmed', 'poisoned'];
      if (key === 'currentHitPoints') return 15;
      return null;
    });

    await renderModal({ current: 10, max: 20 });
    fireEvent.click(screen.getByRole('button', { name: /Blinded/i }));

    const callArgs = useRuntimeState.setRuntimeValue.mock.calls.find(
      (call) => call[1] === 'activeConditions',
    );
    expect(callArgs).toBeDefined();
    expect(callArgs[2]).not.toContain('blinded');
    expect(callArgs[2]).toContain('charmed');
    expect(callArgs[2]).toContain('poisoned');
  });

  it('does not apply cure when pool insufficient for cost', async () => {
    await renderModal({ current: 1, max: 20 }, { cureCost: 3 });
    const btn = screen.getByRole('button', { name: /Blinded/i });
    expect(btn).toBeDisabled();
  });

  it('enables cure button when pool exactly equals cost', async () => {
    await renderModal({ current: 3, max: 20 }, { cureCost: 3 });
    const btn = screen.getByRole('button', { name: /Blinded/i });
    expect(btn).not.toBeDisabled();
  });

  it('individual cure adds log entry with cure action and cost', async () => {
    damageUtils.getCombatContext.mockResolvedValue(mockCombatSummary);
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeConditions') return ['blinded'];
      if (key === 'currentHitPoints') return 15;
      return null;
    });
    await renderModal({ current: 10, max: 20 });

    fireEvent.click(screen.getByRole('button', { name: /Blinded/i }));

    const rows = getLogTableRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent(/Cure/);
    expect(rows[0]).toHaveTextContent('Paladin1');
    expect(rows[0]).toHaveTextContent('3');
  });

  it('deducts pool amount on successful individual cure', async () => {
    damageUtils.getCombatContext.mockResolvedValue(mockCombatSummary);
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeConditions') return ['blinded'];
      if (key === 'currentHitPoints') return 15;
      return null;
    });

    await renderModal({ current: 10, max: 20 });
    fireEvent.click(screen.getByRole('button', { name: /Blinded/i }));

    expect(updateFn).toHaveBeenCalledWith(7);
  });

  it('does not call storage.set for player targets', async () => {
    damageUtils.getTargetFromAttacker.mockReturnValue({
      name: 'Paladin1',
      type: 'player',
      maxHp: 40,
      currentHp: 30,
    });

    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeConditions') return ['blinded'];
      return null;
    });

    await renderModal({ current: 10, max: 20 });
    fireEvent.click(screen.getByRole('button', { name: /Blinded/i }));

    expect(storage.set).not.toHaveBeenCalled();
  });

  // ── Restoring touch batch cure section ──

  it('renders restoring touch batch cure section with matching conditions', async () => {
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeConditions') return ['blinded'];
      return null;
    });

    await renderModal({ current: 15, max: 20 }, {
      restoringTouchConditions: ['Blinded', 'Poisoned'],
      alsoCures: [],
    });
    expect(screen.getByText(/Select conditions affecting/)).toBeInTheDocument();
  });

  it('does not render batch cure section when restoringTouchConditions is empty or null', async () => {
    await renderModal({ current: 15, max: 20 }, { restoringTouchConditions: null, alsoCures: [] });
    expect(screen.queryByText(/Select conditions affecting/)).not.toBeInTheDocument();
  });

  it('does not render batch cure section when no matching conditions on target', async () => {
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeConditions') return ['poisoned'];
      return null;
    });

    await renderModal({ current: 15, max: 20 }, {
      restoringTouchConditions: ['Blinded'],
      alsoCures: [],
    });
    expect(screen.queryByText(/Select conditions affecting/)).not.toBeInTheDocument();
  });

  it('only shows buttons for conditions the target actually has', async () => {
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeConditions') return ['blinded'];
      return null;
    });

    await renderModal({ current: 15, max: 20 }, {
      restoringTouchConditions: ['Blinded', 'Poisoned', 'Frightened'],
      alsoCures: [],
    });
    expect(screen.getByText(/Blinded/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Poisoned/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Frightened/i })).not.toBeInTheDocument();
  });

  // ── Batch cure selection ──

  it('toggles condition selection on button click', async () => {
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeConditions') return ['blinded'];
      return null;
    });

    await renderModal({ current: 15, max: 20 }, {
      restoringTouchConditions: ['Blinded'],
      alsoCures: [],
    });

    const blindedBtn = screen.getByText(/Blinded/);
    expect(blindedBtn).not.toHaveClass('cure-btn-active');

    fireEvent.click(blindedBtn);
    expect(blindedBtn).toHaveClass('cure-btn-active');

    // Toggle off
    fireEvent.click(blindedBtn);
    expect(blindedBtn).not.toHaveClass('cure-btn-active');
  });

  it('batch cure button is disabled when no conditions selected', async () => {
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeConditions') return ['blinded'];
      return null;
    });

    await renderModal({ current: 15, max: 20 }, {
      restoringTouchConditions: ['Blinded'],
      alsoCures: [],
    });
    const batchBtn = screen.getByRole('button', { name: /Cure Selected/i });
    expect(batchBtn).toBeDisabled();
  });

  it('batch cure button enabled after selecting a condition with sufficient pool', async () => {
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeConditions') return ['blinded'];
      return null;
    });

    await renderModal({ current: 20, max: 20 }, {
      restoringTouchConditions: ['Blinded'],
      alsoCures: [],
    });
    fireEvent.click(screen.getByText(/Blinded/));
    const batchBtn = screen.getByRole('button', { name: /Cure Selected/i });
    expect(batchBtn).not.toBeDisabled();
  });

  it('batch cure button disabled when selected conditions exceed pool', async () => {
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeConditions') return ['blinded', 'charmed'];
      return null;
    });

    await renderModal({ current: 3, max: 20 }, {
      restoringTouchConditions: ['Blinded', 'Charmed'],
      alsoCures: [],
      cureCost: 3,
    });
    fireEvent.click(screen.getByText(/Blinded/));
    fireEvent.click(screen.getByText(/Charmed/));
    const batchBtn = screen.getByRole('button', { name: /Cure Selected/i });
    expect(batchBtn).toBeDisabled();
  });

  // ── Batch cure behavior ──

  it('applies batch cure for all selected conditions', async () => {
    damageUtils.getCombatContext.mockResolvedValue(mockCombatSummary);
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeConditions') return ['blinded', 'charmed'];
      if (key === 'currentHitPoints') return 15;
      return null;
    });

    await renderModal({ current: 20, max: 20 }, {
      restoringTouchConditions: ['Blinded', 'Charmed'],
      alsoCures: [],
      cureCost: 3,
    });
    fireEvent.click(screen.getByText(/Blinded/));
    fireEvent.click(screen.getByText(/Charmed/));
    fireEvent.click(screen.getByRole('button', { name: /Cure Selected/i }));

    expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
      'Paladin1',
      'activeConditions',
      expect.any(Array),
      mockCampaignName,
    );
  });

  it('batch cure deducts total cost from pool', async () => {
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeConditions') return ['blinded', 'charmed'];
      return null;
    });

    await renderModal({ current: 20, max: 20 }, {
      restoringTouchConditions: ['Blinded', 'Charmed'],
      alsoCures: [],
      cureCost: 3,
    });
    fireEvent.click(screen.getByText(/Blinded/));
    fireEvent.click(screen.getByText(/Charmed/));
    fireEvent.click(screen.getByRole('button', { name: /Cure Selected/i }));

    expect(updateFn).toHaveBeenCalledWith(14);
  });

  it('batch cure adds log entries for each cured condition', async () => {
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeConditions') return ['blinded', 'poisoned'];
      return null;
    });

    await renderModal({ current: 20, max: 20 }, {
      restoringTouchConditions: ['Blinded', 'Poisoned'],
      alsoCures: [],
      cureCost: 3,
    });
    fireEvent.click(screen.getByText(/Blinded/));
    fireEvent.click(screen.getByText(/Poisoned/));
    fireEvent.click(screen.getByRole('button', { name: /Cure Selected/i }));

    const rows = getLogTableRows();
    expect(rows).toHaveLength(2);
  });

  it('batch cure log entries show correct cost per condition', async () => {
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeConditions') return ['blinded', 'poisoned'];
      return null;
    });

    await renderModal({ current: 20, max: 20 }, {
      restoringTouchConditions: ['Blinded', 'Poisoned'],
      alsoCures: [],
      cureCost: 5,
    });
    fireEvent.click(screen.getByText(/Blinded/));
    fireEvent.click(screen.getByText(/Poisoned/));
    fireEvent.click(screen.getByRole('button', { name: /Cure Selected/i }));

    const rows = getLogTableRows();
    expect(rows[0]).toHaveTextContent('5');
    expect(rows[1]).toHaveTextContent('5');
  });

  it('resets selected conditions after batch cure', async () => {
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeConditions') return ['blinded'];
      return null;
    });

    await renderModal({ current: 20, max: 20 }, {
      restoringTouchConditions: ['Blinded'],
      alsoCures: [],
    });
    fireEvent.click(screen.getByText(/Blinded/));
    fireEvent.click(screen.getByRole('button', { name: /Cure Selected/i }));

    const blindedBtn = screen.getByText(/Blinded/);
    expect(blindedBtn).not.toHaveClass('cure-btn-active');
  });

  it('batch cure button shows correct count and total cost', async () => {
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeConditions') return ['blinded', 'charmed', 'poisoned'];
      return null;
    });

    await renderModal({ current: 20, max: 20 }, {
      restoringTouchConditions: ['Blinded', 'Charmed', 'Poisoned'],
      alsoCures: [],
      cureCost: 3,
    });
    fireEvent.click(screen.getByText(/Blinded/));
    fireEvent.click(screen.getByText(/Charmed/));
    const batchBtn = screen.getByRole('button', { name: /Cure Selected \(2 for 6 HP\)/i });
    expect(batchBtn).toBeInTheDocument();
  });

  // ── Pool after / warning display ──

  it('shows "Pool after" info when selections are affordable', async () => {
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeConditions') return ['blinded'];
      return null;
    });

    await renderModal({ current: 20, max: 20 }, {
      restoringTouchConditions: ['Blinded'],
      alsoCures: [],
    });
    fireEvent.click(screen.getByText(/Blinded/));

    expect(screen.getByText(/Pool after/)).toBeInTheDocument();
  });

  it('shows warning when not enough pool for batch cure', async () => {
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeConditions') return ['blinded'];
      return null;
    });

    await renderModal({ current: 1, max: 20 }, {
      restoringTouchConditions: ['Blinded'],
      alsoCures: [],
      cureCost: 5,
    });
    fireEvent.click(screen.getByText(/Blinded/));

    expect(screen.getByText(/Not enough pool!/)).toBeInTheDocument();
    const batchBtn = screen.getByRole('button', { name: /Cure Selected/i });
    expect(batchBtn).toBeDisabled();
  });

  it('shows correct remaining pool needed in warning message', async () => {
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeConditions') return ['blinded', 'charmed', 'poisoned'];
      return null;
    });

    await renderModal({ current: 3, max: 20 }, {
      restoringTouchConditions: ['Blinded', 'Charmed', 'Poisoned'],
      alsoCures: [],
      cureCost: 5,
    });
    fireEvent.click(screen.getByText(/Blinded/));
    fireEvent.click(screen.getByText(/Charmed/));
    fireEvent.click(screen.getByText(/Poisoned/));

    expect(screen.getByText(/Need 12 more HP/)).toBeInTheDocument();
  });

  // ── Merged cure sections (alsoCures + restoringTouchConditions both present) ──

  it('renders restoring touch section when both alsoCures and restoringTouchConditions are provided', async () => {
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeConditions') return ['blinded'];
      return null;
    });

    await renderModal({ current: 15, max: 20 }, {
      alsoCures: ['Blinded'],
      restoringTouchConditions: ['Blinded'],
    });
    expect(screen.getByText(/Select conditions affecting/)).toBeInTheDocument();
  });

  // ── Cure cost display ──

  it('shows cure cost in section header', async () => {
    await renderModal({ current: 15, max: 20 }, { cureCost: 5 });
    expect(screen.getByText(/Cure Conditions \(5 HP each\)/)).toBeInTheDocument();
  });

  it('shows cure cost in batch cure section when restoring touch', async () => {
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeConditions') return ['blinded'];
      return null;
    });

    await renderModal({ current: 15, max: 20 }, {
      restoringTouchConditions: ['Blinded'],
      alsoCures: [],
      cureCost: 4,
    });
    expect(screen.getByText(/Cure Conditions \(4 HP each\)/)).toBeInTheDocument();
  });
});
