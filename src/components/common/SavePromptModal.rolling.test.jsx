// @cleaned-by-ai
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SavePromptModal from './SavePromptModal.jsx';
import { getCombatSummary } from '../../services/encounters/combatData.js';
import { rollD20 } from '../../services/dice/diceRoller.js';
import { computeAuraBonus } from '../../services/combat/auras/auraOfProtection.js';
import { getRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import { setupDefaults, cleanupDefaults } from './SavePromptModal.test-utils.jsx';

// ── Mocks ──

vi.mock('../../services/ui/utils.js', () => ({
  default: {
    getName: (name) => name || 'Unknown',
  },
}));

vi.mock('../../services/dice/diceRoller.js', () => ({
  rollD20: vi.fn(),
  rollExpression: vi.fn(),
}));

vi.mock('../../services/combat/conditions/savePromptService.js', () => ({
  sendSaveResult: vi.fn(),
  clearSavePrompt: vi.fn(),
}));

vi.mock('../../services/combat/auras/auraOfProtection.js', () => ({
  computeAuraBonus: vi.fn(async () => ({ bonus: 0, sourceName: null })),
}));

vi.mock('../../services/combat/conditions/conditionUtils.js', () => ({
  getAbilitySaveBonus: vi.fn(() => 3),
}));

vi.mock('../../hooks/runtime/useRuntimeState.js', () => ({
  getStore: vi.fn(() => new Map()),
  useSyncedState: vi.fn(() => [null, vi.fn()]),
  listeners: new Map(),
  getRuntimeValue: vi.fn(() => null),
  setRuntimeValue: vi.fn(),
}));

vi.mock('../../services/encounters/combatData.js', () => ({
  getCombatSummary: vi.fn(),
}));

vi.mock('../../services/ui/logService.js', () => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../services/ui/storage.js', () => ({
  default: {
    set: vi.fn(() => Promise.resolve()),
    get: vi.fn(() => Promise.resolve(null)),
  },
}));

vi.mock('../../hooks/useAllySelection.js', () => ({
  getAllyList: vi.fn(() => []),
}));

vi.mock('../../services/automation/handlers/buffs/circleOfPowerHandler.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    isCircleOfPowerActive: vi.fn(() => false),
  };
});

vi.mock('./Subscriber.jsx', () => {
  function MockSubscriber({ handleEvent, campaignName }) {
    return React.createElement(
      'div',
      { 'data-testid': 'subscriber', 'data-campaign': campaignName },
      React.createElement('button', { 'data-testid': 'subscriber-trigger', onClick: () => handleEvent({ key: `change-${campaignName}-savePrompt-testTarget`, data: { promptId: 'test-prompt-1', targetName: 'testTarget', saveType: 'con', saveDc: 12, disadvantage: false } }) }),
      React.createElement('button', { 'data-testid': 'subscriber-trigger-second', onClick: () => handleEvent({ key: `change-${campaignName}-savePrompt-testTarget2`, data: { promptId: 'test-prompt-2', targetName: 'testTarget2', saveType: 'dex', saveDc: 15, disadvantage: true, dcSuccess: 'half' } }) }),
      React.createElement('button', { 'data-testid': 'subscriber-trigger-cleared', onClick: () => handleEvent({ key: `change-${campaignName}-savePromptCleared-testTarget`, data: { promptId: 'test-prompt-1' } }) }),
      React.createElement('button', { 'data-testid': 'subscriber-trigger-disadvantage', onClick: () => handleEvent({ key: `change-${campaignName}-savePrompt-testTarget3`, data: { promptId: 'test-prompt-disadv', targetName: 'testTarget3', saveType: 'str', saveDc: 14, disadvantage: true, dcSuccess: 'half', sourceName: 'Fireball' } }) }),
      React.createElement('button', { 'data-testid': 'subscriber-trigger-dex', onClick: () => handleEvent({ key: `change-${campaignName}-savePrompt-testTarget`, data: { promptId: 'test-prompt-dex', targetName: 'testTarget', saveType: 'dex', saveDc: 17, disadvantage: false, dcSuccess: 'half', sourceName: 'Sacred Flame' } }) }),
      React.createElement('button', { 'data-testid': 'subscriber-trigger-none-dc', onClick: () => handleEvent({ key: `change-${campaignName}-savePrompt-testTarget4`, data: { promptId: 'test-prompt-none', targetName: 'testTarget4', saveType: 'wis', saveDc: 16, disadvantage: false, dcSuccess: 'none' } }) }),
    );
  }
  return { default: MockSubscriber };
});

describe('SavePromptModal — rolling', () => {
  beforeEach(() => setupDefaults(rollD20, computeAuraBonus, getRuntimeValue));
  afterEach(cleanupDefaults);

  it('rolls two d20s and takes the minimum for disadvantage', async () => {
    rollD20.mockReturnValueOnce(18).mockReturnValueOnce(5);

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger-disadvantage');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    const rollBtn = screen.getByRole('button', { name: 'Roll Save' });
    fireEvent.click(rollBtn);

    await waitFor(() => {
      expect(screen.getByText(/d20/i)).toBeInTheDocument();
    });

    expect(rollD20).toHaveBeenCalledTimes(2);
  });

  it('rolls two d20s for DEX saves when the target is Charmed', async () => {
    vi.mocked(getRuntimeValue).mockImplementation((name, key) => {
      if (name === 'testTarget' && key === 'activeConditions') return ['charmed', 'speed_zero'];
      return null;
    });
    rollD20.mockReturnValueOnce(18).mockReturnValueOnce(5);

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />
    );

    fireEvent.click(screen.getByTestId('subscriber-trigger-dex'));

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    const rollBtn = screen.getByRole('button', { name: 'Roll Save' });
    fireEvent.click(rollBtn);

    await waitFor(() => {
      expect(screen.getByText(/d20/i)).toBeInTheDocument();
    });

    expect(rollD20).toHaveBeenCalledTimes(2);
    expect(screen.getAllByText(/\(Disadvantage\)/i).length).toBeGreaterThan(0);
  });

  it('rolls two d20s for DEX saves when the target has Otto\'s Irresistible Dance', async () => {
    vi.mocked(getRuntimeValue).mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [{ target: 'testTarget', effect: 'ottos_irresistible_dance', source: 'Goblin', dc: 15, duration: 'concentration', conditions: ['charmed', 'speed_zero'] }];
      return null;
    });
    rollD20.mockReturnValueOnce(18).mockReturnValueOnce(5);

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />
    );

    fireEvent.click(screen.getByTestId('subscriber-trigger-dex'));

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    const rollBtn = screen.getByRole('button', { name: 'Roll Save' });
    fireEvent.click(rollBtn);

    await waitFor(() => {
      expect(screen.getByText(/d20/i)).toBeInTheDocument();
    });

    expect(rollD20).toHaveBeenCalledTimes(2);
    expect(screen.getAllByText(/\(Disadvantage\)/i).length).toBeGreaterThan(0);
  });

  it('does not roll with disadvantage for non-DEX saves when the target is Charmed', async () => {
    vi.mocked(getRuntimeValue).mockImplementation((name, key) => {
      if (name === 'testTarget' && key === 'activeConditions') return ['charmed'];
      return null;
    });
    rollD20.mockReturnValueOnce(15);

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />
    );

    fireEvent.click(screen.getByTestId('subscriber-trigger'));

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    const rollBtn = screen.getByRole('button', { name: 'Roll Save' });
    fireEvent.click(rollBtn);

    await waitFor(() => {
      expect(screen.getByText(/d20/i)).toBeInTheDocument();
    });

    expect(rollD20).toHaveBeenCalledTimes(1);
  });

  it('uses character save bonus from getAbilitySaveBonus when character is found', async () => {
    rollD20.mockReturnValue(15);
    const targetChar = {
      name: 'testTarget',
      level: 1,
      class: { class_levels: [] },
      computedStats: {
        abilities: [{ name: 'Constitution', bonus: 3 }],
        evasionEffects: [],
      },
      saveModifiers: [],
    };

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[targetChar]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    const rollBtn = screen.getByRole('button', { name: 'Roll Save' });
    fireEvent.click(rollBtn);

    await waitFor(() => {
      expect(screen.getByText(/Total:/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/SAVE SUCCESS|SAVE FAILURE/i)).toBeInTheDocument();
  });

  it('uses creature saveBonuses from combatSummary when character is not found', async () => {
    rollD20.mockReturnValue(15);
    vi.mocked(getCombatSummary).mockReturnValue({
      creatures: [{ name: 'testTarget', saveBonuses: { con: 5 } }],
    });

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    const rollBtn = screen.getByRole('button', { name: 'Roll Save' });
    fireEvent.click(rollBtn);

    await waitFor(() => {
      expect(screen.getByText(/Total:/i)).toBeInTheDocument();
    });
  });

  it('does not grant own evasion when incapacitated', async () => {
    rollD20.mockReturnValue(15);
    getRuntimeValue.mockImplementation((name, key, campaign) => {
      if (name === 'testTarget' && key === 'activeConditions' && campaign === 'test-campaign') return ['incapacitated'];
      return null;
    });

    const targetChar = {
      name: 'testTarget',
      level: 1,
      class: { class_levels: [] },
      computedStats: {
        abilities: [{ name: 'Constitution', bonus: 3 }],
        evasionEffects: [{ saveType: 'CON' }],
      },
      saveModifiers: [],
    };

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[targetChar]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    const rollBtn = screen.getByRole('button', { name: 'Roll Save' });
    fireEvent.click(rollBtn);

    await waitFor(() => {
      expect(screen.getByText(/Total:/i)).toBeInTheDocument();
    });
  });
});
