// @cleaned-by-ai
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

  // ── Individual cure conditions (no restoring touch) ──

  it('renders individual cure buttons when alsoCures provided without restoringTouch', async () => {
    await renderModal({ current: 15, max: 20 }, { restoringTouchConditions: null });
    expect(screen.getByText(/Cure Conditions/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Blinded/i })).toBeInTheDocument();
  });

  it('applies individual cure when cure button clicked', async () => {
    damageUtils.getCombatContext.mockResolvedValue(mockCombatSummary);
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeConditions') return ['blinded'];
      if (key === 'currentHitPoints') return 15;
      return null;
    });

    await renderModal({ current: 10, max: 20 });
    fireEvent.click(screen.getByRole('button', { name: /Blinded/i }));

    expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
      'Paladin1',
      'activeConditions',
      expect.any(Array),
      mockCampaignName,
    );
  });

  it('does not apply cure when pool insufficient for cost', async () => {
    await renderModal({ current: 1, max: 20 }, { cureCost: 3 });
    const btn = screen.getByRole('button', { name: /Blinded/i });
    expect(btn).toBeDisabled();
  });

  it('individual cure adds log entry with capitalized condition label', async () => {
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

  it('individual cure does not call storage.set for player targets', async () => {
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

  it('does not render individual cure buttons when alsoCures is empty or null', async () => {
    await renderModal({ current: 15, max: 20 }, { alsoCures: [] });
    expect(screen.queryByText(/Cure Conditions/)).not.toBeInTheDocument();
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

  it('does not render batch cure section when no matching conditions on target', async () => {
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeConditions') return ['poisoned'];
      return null;
    });

    await renderModal({ current: 15, max: 20 }, {
      restoringTouchConditions: ['Blinded'],
      alsoCures: [],
    });
    expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalled();
  });

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

  it('applies batch cure for all selected conditions', async () => {
    damageUtils.getCombatContext.mockResolvedValue(mockCombatSummary);
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeConditions') return ['blinded'];
      if (key === 'currentHitPoints') return 15;
      return null;
    });

    await renderModal({ current: 20, max: 20 }, {
      restoringTouchConditions: ['Blinded'],
      alsoCures: [],
    });
    fireEvent.click(screen.getByText(/Blinded/));
    fireEvent.click(screen.getByRole('button', { name: /Cure Selected/i }));

    expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
      'Paladin1',
      'activeConditions',
      expect.any(Array),
      mockCampaignName,
    );
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

  it('does not render batch cure section when restoringTouchConditions is empty or null', async () => {
    await renderModal({ current: 15, max: 20 }, { restoringTouchConditions: null, alsoCures: [] });
    expect(screen.queryByText(/Select conditions affecting/)).not.toBeInTheDocument();
  });
});
