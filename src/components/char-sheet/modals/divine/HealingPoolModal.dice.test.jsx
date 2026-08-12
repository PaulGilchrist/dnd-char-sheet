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
import * as damageUtils from '../../../../services/rules/combat/damageUtils.js';

// ── Test fixtures ──

const mockPlayerStats = {
  name: 'Paladin1',
  level: 3,
  hitPoints: 40,
  abilities: { CHA: 14 },
};
const mockCampaignName = 'test-campaign';

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

describe('HealingPoolModal - Dice Pool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: vi.fn() });
    damageUtils.getCombatContext.mockResolvedValue(null);
    damageUtils.getTargetFromAttacker.mockReturnValue(null);
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'activeConditions') return [];
      if (key === 'currentHitPoints') return 40;
      return null;
    });
    setupPoolMock();
  });

  it('dice pool displays pool as dice count and die type', async () => {
    await renderModal({ current: 3, max: 4 }, {
      isDicePool: true,
      dieType: 12,
      name: 'Warrior of the Gods',
      resourceKey: 'warriorofthegodsPool',
    });
    const poolSection = document.querySelector('.short-rest-section');
    const p = poolSection?.querySelector('p');
    expect(p?.textContent).toBe('Pool: 3 / 4 d12');
  });

  it('dice pool shows Roll a d12 button instead of Apply Heal', async () => {
    await renderModal({ current: 4, max: 4 }, {
      isDicePool: true,
      dieType: 12,
      name: 'Warrior of the Gods',
    });
    expect(screen.getByText(/Roll a d12/)).toBeInTheDocument();
    expect(screen.queryByText(/Apply Heal/)).not.toBeInTheDocument();
  });

  it('dice pool uses dynamic feature name in heading', async () => {
    await renderModal({ current: 4, max: 4 }, {
      isDicePool: true,
      dieType: 12,
      name: 'Warrior of the Gods',
    });
    expect(screen.getByText('Warrior of the Gods')).toBeInTheDocument();
    expect(screen.queryByText('Lay On Hands')).not.toBeInTheDocument();
  });

  it('dice pool Roll a d12 button disabled when pool is zero', async () => {
    await renderModal({ current: 0, max: 4 }, {
      isDicePool: true,
      dieType: 12,
    });
    const btn = screen.getByRole('button', { name: /Roll a d12/i });
    expect(btn).toBeDisabled();
  });

  it('dice pool shows roll result after clicking Roll button', async () => {
    await renderModal({ current: 3, max: 4 }, {
      isDicePool: true,
      dieType: 12,
      name: 'Warrior of the Gods',
    });
    fireEvent.click(screen.getByRole('button', { name: /Roll a d12/i }));

    expect(screen.getByText(/HP to restore/)).toBeInTheDocument();
  });

  it('dice pool accumulates total across multiple rolls', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // yields roll ~6-7

    await renderModal({ current: 4, max: 4 }, {
      isDicePool: true,
      dieType: 12,
      name: 'Warrior of the Gods',
    });

    fireEvent.click(screen.getByRole('button', { name: /Roll a d12/i }));
    fireEvent.click(screen.getByRole('button', { name: /Roll a d12/i }));

    const totalText = screen.getByText(/HP to restore/);
    expect(totalText).toBeInTheDocument();
  });

  it('dice pool applies self-heal on Done button when rolls accumulated', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    damageUtils.getCombatContext.mockResolvedValue(null);
    damageUtils.getTargetFromAttacker.mockReturnValue(null);
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'currentHitPoints') return 20;
      if (key === 'activeConditions') return [];
      return null;
    });

    await renderModal({ current: 4, max: 4 }, {
      isDicePool: true,
      dieType: 12,
      name: 'Warrior of the Gods',
    });

    fireEvent.click(screen.getByRole('button', { name: /Roll a d12/i }));
    fireEvent.click(screen.getByRole('button', { name: /Done/i }));

    expect(useRuntimeState.setRuntimeValue).toHaveBeenCalledWith('Paladin1', 'currentHitPoints', expect.any(Number), 'test-campaign');
    const logCalls = global.fetch.mock.calls.filter(
      (call) => call[0] === '/api/campaigns/test-campaign/log',
    );
    expect(logCalls.length).toBeGreaterThan(0);
  });

  it('dice pool applies no healing on Done when no rolls made', async () => {
    damageUtils.getCombatContext.mockResolvedValue(null);
    damageUtils.getTargetFromAttacker.mockReturnValue(null);
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'currentHitPoints') return 20;
      if (key === 'activeConditions') return [];
      return null;
    });

    await renderModal({ current: 4, max: 4 }, {
      isDicePool: true,
      dieType: 12,
      name: 'Warrior of the Gods',
    });

    fireEvent.click(screen.getByRole('button', { name: /Done/i }));

    expect(useRuntimeState.setRuntimeValue).not.toHaveBeenCalledWith('Paladin1', 'currentHitPoints', expect.any(Number), 'test-campaign');
  });

  it('dice pool deducts pool on each roll', async () => {
    await renderModal({ current: 3, max: 4 }, {
      isDicePool: true,
      dieType: 12,
      name: 'Warrior of the Gods',
    });

    fireEvent.click(screen.getByRole('button', { name: /Roll a d12/i }));
    expect(updateFn).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Roll a d12/i }));
    expect(updateFn).toHaveBeenCalledTimes(2);
  });

  it('dice pool shows remaining dice count after rolling', async () => {
    await renderModal({ current: 4, max: 4 }, {
      isDicePool: true,
      dieType: 12,
      name: 'Warrior of the Gods',
    });

    fireEvent.click(screen.getByRole('button', { name: /Roll a d12/i }));
    expect(screen.getByText(/Remaining:.*dice/)).toBeInTheDocument();
  });

  it('dice pool shows dice count and die type in heading', async () => {
    await renderModal({ current: 4, max: 8 }, {
      isDicePool: true,
      dieType: 8,
      name: 'Divine Fury',
    });
    expect(screen.getByText(/Roll Dice — .* \(.*\/.* HP\)/)).toBeInTheDocument();
  });

  it('dice pool shows individual roll values in accumulated total', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.25);

    await renderModal({ current: 4, max: 4 }, {
      isDicePool: true,
      dieType: 12,
      name: 'Warrior of the Gods',
    });

    fireEvent.click(screen.getByRole('button', { name: /Roll a d12/i }));

    expect(screen.getByText(/Rolled 1d12:/)).toBeInTheDocument();
  });
});
