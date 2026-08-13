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

// ── Test helpers ──

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

function getPoolParagraph() {
  const poolSection = document.querySelector('.short-rest-section');
  if (!poolSection) return null;
  const p = poolSection.querySelector('p');
  return p?.textContent || null;
}

function getLogTableRows() {
  const table = screen.getByRole('table');
  const rows = table.querySelectorAll('tr');
  return Array.from(rows).slice(1);
}

// ── Tests ──

describe('HealingPoolModal', () => {
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

  // ── Loading state ──

  it('hides loading spinner after combat context resolves', async () => {
    await renderModal({ current: 15, max: 20 });
    expect(screen.queryByText(/Loading/)).not.toBeInTheDocument();
  });

  // ── Pool display ──

  it('displays pool amount and maximum after loading', async () => {
    await renderModal({ current: 15, max: 20 });
    const poolText = getPoolParagraph();
    expect(poolText).toBe('Pool: 15 / 20 HP');
  });

  it('shows pool text with HP suffix for non-dice pool', async () => {
    await renderModal({ current: 10, max: 15 });
    const poolText = getPoolParagraph();
    expect(poolText).toContain('HP');
    expect(poolText).not.toContain('d');
  });

  it('shows pool as 0 when tracked resource current is zero', async () => {
    await renderModal({ current: 0, max: 20 });
    const poolText = getPoolParagraph();
    expect(poolText).toBe('Pool: 0 / 20 HP');
  });

  it('safeMax falls back to 0 when hook returns non-numeric max', async () => {
    updateFn = vi.fn();
    useTrackedResource.mockReturnValue({ current: 10, max: NaN, update: updateFn });
    const rendered = render(<HealingPoolModal {...makeProps()} />);
    await waitFor(() => {
      expect(screen.queryByText(/Loading/)).not.toBeInTheDocument();
    });
    const poolText = getPoolParagraph();
    expect(poolText).toBe('Pool: 10 / 0 HP');
    rendered.unmount?.();
  });

  // ── Target display ──

  it('shows target name with current and max HP', async () => {
    damageUtils.getCombatContext.mockResolvedValue(mockCombatSummary);
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'currentHitPoints') return 15;
      if (key === 'hitPoints') return 40;
      if (key === 'activeConditions') return [];
      return null;
    });
    await renderModal({ current: 15, max: 20 });
    expect(screen.getByText(/Heal — Paladin1 \(15 \/ 40 HP\)/)).toBeInTheDocument();
  });

  it('uses player stats as fallback when no target found', async () => {
    damageUtils.getCombatContext.mockResolvedValue(null);
    useRuntimeState.getRuntimeValue.mockImplementation((name, key) => {
      if (key === 'currentHitPoints') return 30;
      if (key === 'activeConditions') return [];
      return null;
    });
    await renderModal({ current: 15, max: 20 });
    expect(screen.getByText(/Heal — Paladin1 \(30 \/ 40 HP\)/)).toBeInTheDocument();
  });

  it('uses playerStats.hitPoints when currentHitPoints runtime value is missing', async () => {
    damageUtils.getCombatContext.mockResolvedValue(null);
    useRuntimeState.getRuntimeValue.mockReturnValue(null);
    await renderModal({ current: 15, max: 20 });
    expect(screen.getByText(/Heal — Paladin1 \(40 \/ 40 HP\)/)).toBeInTheDocument();
  });

  // ── Heal input and button ──

  it('renders heal amount input', async () => {
    await renderModal({ current: 15, max: 20 });
    const input = screen.getByRole('spinbutton');
    expect(input).toBeInTheDocument();
  });

  it('disables apply heal when pool is zero', async () => {
    await renderModal({ current: 0, max: 20 });
    const btn = screen.getByRole('button', { name: /Apply Heal/i });
    expect(btn).toBeDisabled();
  });

  it('disables apply heal when amount is zero or negative', async () => {
    await renderModal({ current: 15, max: 20 });
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '0' } });
    const btn = screen.getByRole('button', { name: /Apply Heal/i });
    expect(btn).toBeDisabled();
  });

  it('updates heal amount on input change', async () => {
    await renderModal({ current: 15, max: 20 });
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '10' } });
    expect(input.value).toBe('10');
  });

  it('caps heal amount to remaining pool in the input display', async () => {
    await renderModal({ current: 3, max: 20 });
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '10' } });
    expect(input.value).toBe('3');
  });

  it('handles negative input values gracefully', async () => {
    await renderModal({ current: 15, max: 20 });
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '-5' } });
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Apply Heal/i });
      expect(btn).toBeDisabled();
    });
  });

  // ── Log section ──

  it('does not render log section when no actions taken', async () => {
    await renderModal({ current: 15, max: 20 });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('accumulates multiple entries in the log', async () => {
    let callCounter = 0;
    applyHealingService.applyHealingToTarget.mockImplementation(() => {
      callCounter++;
      return { actualHeal: 5, oldHp: 15 + (callCounter - 1) * 5, newHp: 20 + (callCounter - 1) * 5 };
    });

    await renderModal({ current: 20, max: 20 });
    for (let i = 0; i < 3; i++) {
      fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '5' } });
      fireEvent.click(screen.getByRole('button', { name: /Apply Heal/i }));
    }

    const rows = getLogTableRows();
    expect(rows).toHaveLength(3);
  });

  // ── Modal close interactions ──

  it('calls onClose when Done button is clicked', async () => {
    const onClose = vi.fn();
    await renderModal({ current: 15, max: 20 }, { onClose });
    fireEvent.click(screen.getByText('Done'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape key press', async () => {
    const onClose = vi.fn();
    await renderModal({ current: 15, max: 20 }, { onClose });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when clicking the overlay background', async () => {
    const onClose = vi.fn();
    await renderModal({ current: 15, max: 20 }, { onClose });
    const overlay = document.querySelector('.short-rest-overlay');
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ── Default feature name ──

  it('uses default feature name "Lay On Hands" when name prop is omitted', async () => {
    await renderModal({ current: 15, max: 20 }, { name: undefined });
    expect(screen.getByText('Lay On Hands')).toBeInTheDocument();
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
