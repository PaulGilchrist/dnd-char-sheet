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
import * as damageUtils from '../../../../services/rules/combat/damageUtils.js';
import * as applyHealingService from '../../../../services/rules/combat/applyHealing.js';

// ── Test fixtures ──

const mockPlayerStats = {
  name: 'Paladin1',
  level: 3,
  hitPoints: 40,
  abilities: { CHA: 14 },
};
const mockCampaignName = 'test-campaign';
const npcTarget = {
  name: 'Orc Warrior',
  type: 'npc',
  maxHp: 30,
  currentHp: 15,
  conditions: [{ key: 'blinded' }],
};

const mockCombatSummary = {
  creatures: [
    { name: 'Paladin1', type: 'player', targetName: 'Orc Warrior' },
    npcTarget,
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

// ── Tests ──

describe('HealingPoolModal - Healing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: vi.fn() });
    damageUtils.getCombatContext.mockResolvedValue(mockCombatSummary);
    damageUtils.getTargetFromAttacker.mockReturnValue(npcTarget);
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeConditions') return ['blinded'];
      return null;
    });
    setupPoolMock();
  });

  // ── Apply heal with combat context (NPC target) ──

  it('applies healing when apply heal is clicked', async () => {
    applyHealingService.applyHealingToTarget.mockReturnValue({
      actualHeal: 5,
      oldHp: 15,
      newHp: 20,
    });
    damageUtils.getCombatContext.mockResolvedValue(mockCombatSummary);
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'currentHitPoints') return 15;
      if (key === 'activeConditions') return [];
      return null;
    });

    await renderModal({ current: 20, max: 20 });
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /Apply Heal/i }));

    expect(applyHealingService.applyHealingToTarget).toHaveBeenCalledWith(
      mockCombatSummary,
      'Paladin1',
      5,
      mockCampaignName,
    );
    expect(updateFn).toHaveBeenCalled();
  });

  it('adds heal entry to log after applying healing', async () => {
    applyHealingService.applyHealingToTarget.mockReturnValue({
      actualHeal: 5,
      oldHp: 15,
      newHp: 20,
    });
    damageUtils.getCombatContext.mockResolvedValue(mockCombatSummary);
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'currentHitPoints') return 15;
      if (key === 'activeConditions') return [];
      return null;
    });

    await renderModal({ current: 20, max: 20 });
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /Apply Heal/i }));

    const table = screen.getByRole('table');
    const rows = table.querySelectorAll('tr');
    const dataRows = Array.from(rows).slice(1);
    expect(dataRows).toHaveLength(1);
    expect(dataRows[0]).toHaveTextContent('Heal');
    expect(dataRows[0]).toHaveTextContent('Paladin1');
    expect(dataRows[0]).toHaveTextContent('5');
  });

  // ── Apply heal without combat context (self-heal) ──

  it('applies self-heal when no combat context exists', async () => {
    damageUtils.getCombatContext.mockResolvedValue(null);
    damageUtils.getTargetFromAttacker.mockReturnValue(null);
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'currentHitPoints') return 20;
      if (key === 'activeConditions') return [];
      return null;
    });

    await renderModal({ current: 20, max: 20 });
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /Apply Heal/i }));

    expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith(
      mockPlayerStats.name,
      'currentHitPoints',
      expect.any(Number),
      mockCampaignName,
    );
    const logCalls = global.fetch.mock.calls.filter(
      (call) => call[0] === '/api/campaigns/test-campaign/log',
    );
    expect(logCalls.length).toBeGreaterThan(0);
  });
});
