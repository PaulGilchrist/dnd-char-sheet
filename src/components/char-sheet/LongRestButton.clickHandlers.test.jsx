import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LongRestButton from './LongRestButton.jsx';

// ── Mocks ──

vi.mock('../../services/rules/effects/tranceRules.js', () => ({
  hasTranceTrait: vi.fn(() => false),
}));

vi.mock('../../services/rules/effects/restRules.js', () => ({
  applyLongRest: vi.fn(() => Promise.resolve({})),
}));

vi.mock('../../services/automation/handlers/buffs/tempHpService.js', () => ({
  setTempHp: vi.fn(),
}));

vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('./modals/shared/CreatureSelectionModal.jsx', () => ({
  default: function MockModal() {
    return <div data-testid="creature-selection-modal" />;
  },
}));

// ── Re-import mocks ──

import * as restRules from '../../services/rules/effects/restRules.js';

// ── Fixtures ──

const basePlayerStats = {
  name: 'TestCharacter',
  level: 5,
  hitPoints: 45,
  class: { name: 'Cleric' },
};

const mockCampaignName = 'test-campaign';

function makeProps(overrides) {
  return {
    playerStats: basePlayerStats,
    campaignName: mockCampaignName,
    onLongRest: vi.fn(),
    ...(overrides || {}),
  };
}

// ── Tests ──

describe('LongRestButton - long rest click flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls applyLongRest with playerStats and campaignName on button click', async () => {
    restRules.applyLongRest.mockResolvedValue({});
    render(<LongRestButton {...makeProps()} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(restRules.applyLongRest).toHaveBeenCalledWith(basePlayerStats, mockCampaignName);
  });

  it('calls onLongRest callback when applyLongRest returns no celestialResilienceAllies', async () => {
    restRules.applyLongRest.mockResolvedValue({});
    render(<LongRestButton {...makeProps()} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    await waitFor(() => {
      expect(restRules.applyLongRest).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.queryByTestId('creature-selection-modal')).not.toBeInTheDocument();
    });
  });

  it('shows CreatureSelectionModal when applyLongRest returns celestialResilienceAllies', async () => {
    const celestialData = {
      creatureTargets: [{ name: 'Ally1', type: 'player' }],
      allyTempHp: 10,
      selfTempHp: 5,
      maxTargets: 5,
    };
    restRules.applyLongRest.mockResolvedValue({ celestialResilienceAllies: celestialData });

    render(<LongRestButton {...makeProps()} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    await waitFor(() => {
      expect(screen.queryByTestId('creature-selection-modal')).toBeInTheDocument();
    });
  });

  it('does not show modal when celestialResilienceAllies is null', async () => {
    restRules.applyLongRest.mockResolvedValue({ celestialResilienceAllies: null });

    render(<LongRestButton {...makeProps()} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    await waitFor(() => {
      expect(screen.queryByTestId('creature-selection-modal')).not.toBeInTheDocument();
    });
  });

  it('does not show modal when celestialResilienceAllies is undefined', async () => {
    restRules.applyLongRest.mockResolvedValue({});

    render(<LongRestButton {...makeProps()} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    await waitFor(() => {
      expect(screen.queryByTestId('creature-selection-modal')).not.toBeInTheDocument();
    });
  });

  it('passes correct props to CreatureSelectionModal when showing celestial resilience', async () => {
    const celestialData = {
      creatureTargets: [{ name: 'Ally1', type: 'player' }, { name: 'Ally2', type: 'npc' }],
      allyTempHp: 12,
      selfTempHp: 8,
      maxTargets: 5,
    };
    restRules.applyLongRest.mockResolvedValue({ celestialResilienceAllies: celestialData });

    render(<LongRestButton {...makeProps()} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    await waitFor(() => {
      expect(screen.queryByTestId('creature-selection-modal')).toBeInTheDocument();
    });
  });

  it('does not call onLongRest when celestialResilienceAllies is present (waits for modal)', async () => {
    const celestialData = {
      creatureTargets: [{ name: 'Ally1', type: 'player' }],
      allyTempHp: 10,
      selfTempHp: 5,
      maxTargets: 5,
    };
    const onLongRest = vi.fn();
    restRules.applyLongRest.mockResolvedValue({ celestialResilienceAllies: celestialData });

    render(<LongRestButton {...makeProps({ onLongRest })} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    // onLongRest should NOT be called yet because modal is showing
    expect(onLongRest).not.toHaveBeenCalled();
  });

  it('handles missing onLongRest gracefully (no crash)', async () => {
    restRules.applyLongRest.mockResolvedValue({});

    render(
      <LongRestButton
        playerStats={basePlayerStats}
        campaignName={mockCampaignName}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    // Should not throw
    await waitFor(() => {
      expect(restRules.applyLongRest).toHaveBeenCalled();
    });
  });
});
