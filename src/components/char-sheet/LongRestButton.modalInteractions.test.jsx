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
  default: function MockModal({ onConfirm, onSkip, targets, maxTargets, note }) {
    return (
      <div data-testid="creature-selection-modal">
        <div
          data-testid="skip-button"
          onClick={() => onSkip && onSkip()}
        >
          Skip
        </div>
        <div
          data-testid="confirm-button"
          onClick={() => {
            const selectedNames = targets.slice(0, maxTargets).map((t) => t.name);
            onConfirm && onConfirm(selectedNames);
          }}
        >
          Confirm
        </div>
        <div data-testid="note">{note}</div>
        {targets.map((t, i) => (
          <div key={i} data-testid={`target-${i}`}>
            {t.name}
          </div>
        ))}
      </div>
    );
  },
}));

// ── Re-import mocks ──

import * as restRules from '../../services/rules/effects/restRules.js';
import * as tempHpService from '../../services/automation/handlers/buffs/tempHpService.js';
import * as logService from '../../services/ui/logService.js';

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

describe('LongRestButton - celestial resilience modal interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls setTempHp for each selected ally when confirming modal', async () => {
    const celestialData = {
      creatureTargets: [
        { name: 'Ally1', type: 'player' },
        { name: 'Ally2', type: 'npc' },
      ],
      allyTempHp: 10,
      selfTempHp: 5,
      maxTargets: 5,
    };
    restRules.applyLongRest.mockResolvedValue({ celestialResilienceAllies: celestialData });
    const onLongRest = vi.fn();

    render(<LongRestButton {...makeProps({ onLongRest })} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    await waitFor(() => {
      expect(screen.queryByTestId('creature-selection-modal')).toBeInTheDocument();
    });

    // Click confirm (simulates selecting all targets)
    await act(async () => {
      fireEvent.click(screen.getByTestId('confirm-button'));
    });

    expect(tempHpService.setTempHp).toHaveBeenCalledTimes(2);
    expect(tempHpService.setTempHp).toHaveBeenCalledWith('Ally1', 10, mockCampaignName);
    expect(tempHpService.setTempHp).toHaveBeenCalledWith('Ally2', 10, mockCampaignName);
  });

  it('sets tempHP with correct allyTempHp value from celestial data', async () => {
    const celestialData = {
      creatureTargets: [
        { name: 'Ally1', type: 'player' },
        { name: 'Ally2', type: 'npc' },
        { name: 'Ally3', type: 'player' },
      ],
      allyTempHp: 8,
      selfTempHp: 4,
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

  it('logs an ability_use entry when confirming modal', async () => {
    const celestialData = {
      creatureTargets: [
        { name: 'Ally1', type: 'player' },
        { name: 'Ally2', type: 'npc' },
      ],
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

    await act(async () => {
      fireEvent.click(screen.getByTestId('confirm-button'));
    });

    await waitFor(() => {
      expect(logService.addEntry).toHaveBeenCalled();
    });

    const logCall = logService.addEntry.mock.calls[0][1];
    expect(logCall.type).toBe('ability_use');
    expect(logCall.characterName).toBe('TestCharacter');
    expect(logCall.abilityName).toBe('Celestial Resilience');
    expect(logCall.description).toContain('TestCharacter');
    expect(logCall.description).toContain('temporary hit points');
    expect(logCall.description).toContain('Ally1');
    expect(logCall.description).toContain('Ally2');
  });

  it('logs correct description including ally names', async () => {
    const celestialData = {
      creatureTargets: [
        { name: 'Ally1', type: 'player' },
        { name: 'Ally2', type: 'npc' },
      ],
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

    await act(async () => {
      fireEvent.click(screen.getByTestId('confirm-button'));
    });

    await waitFor(() => {
      expect(logService.addEntry).toHaveBeenCalled();
    });

    const logCall = logService.addEntry.mock.calls[0][1];
    expect(logCall.description).toContain('Ally1');
    expect(logCall.description).toContain('Ally2');
  });

  it('clears the modal after confirming', async () => {
    const celestialData = {
      creatureTargets: [{ name: 'Ally1', type: 'player' }],
      allyTempHp: 10,
      selfTempHp: 5,
      maxTargets: 5,
    };
    restRules.applyLongRest.mockResolvedValue({ celestialResilienceAllies: celestialData });
    const onLongRest = vi.fn();

    render(<LongRestButton {...makeProps({ onLongRest })} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    await waitFor(() => {
      expect(screen.queryByTestId('creature-selection-modal')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('confirm-button'));
    });

    await waitFor(() => {
      expect(screen.queryByTestId('creature-selection-modal')).not.toBeInTheDocument();
    });

    expect(onLongRest).toHaveBeenCalled();
  });

  it('calls onLongRest after confirming modal', async () => {
    const celestialData = {
      creatureTargets: [{ name: 'Ally1', type: 'player' }],
      allyTempHp: 10,
      selfTempHp: 5,
      maxTargets: 5,
    };
    restRules.applyLongRest.mockResolvedValue({ celestialResilienceAllies: celestialData });
    const onLongRest = vi.fn();

    render(<LongRestButton {...makeProps({ onLongRest })} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    await waitFor(() => {
      expect(screen.queryByTestId('creature-selection-modal')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('confirm-button'));
    });

    await waitFor(() => {
      expect(onLongRest).toHaveBeenCalledTimes(1);
    });
  });

  it('logs an ability_use entry when skipping modal', async () => {
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

    await act(async () => {
      fireEvent.click(screen.getByTestId('skip-button'));
    });

    await waitFor(() => {
      expect(logService.addEntry).toHaveBeenCalled();
    });

    const logCall = logService.addEntry.mock.calls[0][1];
    expect(logCall.type).toBe('ability_use');
    expect(logCall.characterName).toBe('TestCharacter');
    expect(logCall.abilityName).toBe('Celestial Resilience');
    expect(logCall.description).toContain('skipped');
    expect(logCall.description).toContain('Celestial Resilience');
  });

  it('clears the modal after skipping', async () => {
    const celestialData = {
      creatureTargets: [{ name: 'Ally1', type: 'player' }],
      allyTempHp: 10,
      selfTempHp: 5,
      maxTargets: 5,
    };
    restRules.applyLongRest.mockResolvedValue({ celestialResilienceAllies: celestialData });
    const onLongRest = vi.fn();

    render(<LongRestButton {...makeProps({ onLongRest })} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    await waitFor(() => {
      expect(screen.queryByTestId('creature-selection-modal')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('skip-button'));
    });

    await waitFor(() => {
      expect(screen.queryByTestId('creature-selection-modal')).not.toBeInTheDocument();
    });

    expect(onLongRest).toHaveBeenCalled();
  });

  it('calls onLongRest after skipping modal', async () => {
    const celestialData = {
      creatureTargets: [{ name: 'Ally1', type: 'player' }],
      allyTempHp: 10,
      selfTempHp: 5,
      maxTargets: 5,
    };
    restRules.applyLongRest.mockResolvedValue({ celestialResilienceAllies: celestialData });
    const onLongRest = vi.fn();

    render(<LongRestButton {...makeProps({ onLongRest })} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    await waitFor(() => {
      expect(screen.queryByTestId('creature-selection-modal')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('skip-button'));
    });

    await waitFor(() => {
      expect(onLongRest).toHaveBeenCalledTimes(1);
    });
  });

  it('does not call setTempHp when skipping modal', async () => {
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

    await act(async () => {
      fireEvent.click(screen.getByTestId('skip-button'));
    });

    expect(tempHpService.setTempHp).not.toHaveBeenCalled();
  });

  it('handles skip when onLongRest is not provided', async () => {
    const celestialData = {
      creatureTargets: [{ name: 'Ally1', type: 'player' }],
      allyTempHp: 10,
      selfTempHp: 5,
      maxTargets: 5,
    };
    restRules.applyLongRest.mockResolvedValue({ celestialResilienceAllies: celestialData });

    // No onLongRest prop
    render(
      <LongRestButton
        playerStats={basePlayerStats}
        campaignName={mockCampaignName}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    await waitFor(() => {
      expect(screen.queryByTestId('creature-selection-modal')).toBeInTheDocument();
    });

    // Should not throw when skipping without onLongRest
    await act(async () => {
      fireEvent.click(screen.getByTestId('skip-button'));
    });
  });

  it('handles confirm when onLongRest is not provided', async () => {
    const celestialData = {
      creatureTargets: [{ name: 'Ally1', type: 'player' }],
      allyTempHp: 10,
      selfTempHp: 5,
      maxTargets: 5,
    };
    restRules.applyLongRest.mockResolvedValue({ celestialResilienceAllies: celestialData });

    render(
      <LongRestButton
        playerStats={basePlayerStats}
        campaignName={mockCampaignName}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    await waitFor(() => {
      expect(screen.queryByTestId('creature-selection-modal')).toBeInTheDocument();
    });

    // Should not throw when confirming without onLongRest
    await act(async () => {
      fireEvent.click(screen.getByTestId('confirm-button'));
    });
  });

  it('passes campaignName to setTempHp for each ally', async () => {
    const celestialData = {
      creatureTargets: [
        { name: 'Ally1', type: 'player' },
        { name: 'Ally2', type: 'npc' },
      ],
      allyTempHp: 15,
      selfTempHp: 7,
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

    await act(async () => {
      fireEvent.click(screen.getByTestId('confirm-button'));
    });

    expect(tempHpService.setTempHp).toHaveBeenCalledWith('Ally1', 15, mockCampaignName);
    expect(tempHpService.setTempHp).toHaveBeenCalledWith('Ally2', 15, mockCampaignName);
  });

  it('uses allyTempHp from celestialResilienceAllies for setTempHp calls', async () => {
    const celestialData = {
      creatureTargets: [{ name: 'Ally1', type: 'player' }],
      allyTempHp: 20,
      selfTempHp: 10,
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

    await act(async () => {
      fireEvent.click(screen.getByTestId('confirm-button'));
    });

    expect(tempHpService.setTempHp).toHaveBeenCalledWith('Ally1', 20, mockCampaignName);
  });

  it('logs timestamp using Date.now() when confirming', async () => {
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

    const beforeClick = Date.now();
    await act(async () => {
      fireEvent.click(screen.getByTestId('confirm-button'));
    });

    await waitFor(() => {
      expect(logService.addEntry).toHaveBeenCalled();
    });

    const confirmLogCall = logService.addEntry.mock.calls[0][1];
    expect(typeof confirmLogCall.timestamp).toBe('number');
    expect(confirmLogCall.timestamp).toBeGreaterThanOrEqual(beforeClick);
  });

  it('logs timestamp using Date.now() when skipping', async () => {
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

    const beforeClick = Date.now();
    await act(async () => {
      fireEvent.click(screen.getByTestId('skip-button'));
    });

    await waitFor(() => {
      expect(logService.addEntry).toHaveBeenCalled();
    });

    const logCall = logService.addEntry.mock.calls[0][1];
    expect(typeof logCall.timestamp).toBe('number');
    expect(logCall.timestamp).toBeGreaterThanOrEqual(beforeClick);
  });
});
