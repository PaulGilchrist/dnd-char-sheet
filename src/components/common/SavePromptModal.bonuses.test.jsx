import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SavePromptModal from './SavePromptModal.jsx';
import { rollD20 } from '../../services/dice/diceRoller.js';
import { computeAuraBonus } from '../../services/combat/auras/auraOfProtection.js';
import { getRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import { rollExpression } from '../../services/dice/diceRoller.js';
import { getCombatSummary } from '../../services/encounters/combatData.js';
import { getAllyList } from '../../hooks/useAllySelection.js';
import * as circleOfPowerHandler from '../../services/automation/handlers/buffs/circleOfPowerHandler.js';
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

describe('SavePromptModal — save bonus sources', () => {
  beforeEach(() => setupDefaults(rollD20, computeAuraBonus, getRuntimeValue));
  afterEach(cleanupDefaults);

  // ── saveModifiers advantage ──

  it('grants advantage when saveModifiers has advantage against_spell condition', async () => {
    rollD20.mockReturnValueOnce(15).mockReturnValueOnce(18);
    const targetChar = {
      name: 'testTarget',
      level: 1,
      class: { class_levels: [] },
      computedStats: {
        abilities: [{ name: 'Constitution', bonus: 3 }],
        evasionEffects: [],
      },
      saveModifiers: [{ target: 'saving_throw', effect: 'advantage', condition: 'against_spell' }],
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
      expect(screen.getByText(/Advantage/)).toBeInTheDocument();
    });

    expect(rollD20).toHaveBeenCalledTimes(1);
  });

  // ── Dodge buff ──

  it('grants advantage on DEX saves when Dodge buff is active', async () => {
    rollD20.mockReturnValueOnce(15).mockReturnValueOnce(18);
    getRuntimeValue.mockImplementation((name, key, campaign) => {
      if (name === 'testTarget' && key === 'activeBuffs' && campaign === 'test-campaign') return [{ effect: 'dodge' }];
      return null;
    });

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger-dex');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    const rollBtn = screen.getByRole('button', { name: 'Roll Save' });
    fireEvent.click(rollBtn);

    await waitFor(() => {
      expect(screen.getByText(/Advantage/)).toBeInTheDocument();
    });
  });

  it('does not grant Dodge advantage on non-DEX saves', async () => {
    rollD20.mockReturnValue(15);
    getRuntimeValue.mockImplementation((name, key, campaign) => {
      if (name === 'testTarget' && key === 'activeBuffs' && campaign === 'test-campaign') return [{ effect: 'dodge' }];
      return null;
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

    expect(rollD20).toHaveBeenCalledTimes(1);
  });

  // ── Circle of Power ──

  it('grants advantage on all saves when Circle of Power is active', async () => {
    rollD20.mockReturnValueOnce(15).mockReturnValueOnce(18);
    vi.mocked(circleOfPowerHandler.isCircleOfPowerActive).mockReturnValue(true);

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
      expect(screen.getByText(/Advantage/)).toBeInTheDocument();
    });
  });

  // ── Holy Nimbus ──

  it('grants advantage when Holy Nimbus is active against fiend attacker', async () => {
    rollD20.mockReturnValueOnce(15).mockReturnValueOnce(18);
    getRuntimeValue.mockImplementation((name, key, campaign) => {
      if (key === 'holyNimbusActive' && campaign === 'test-campaign') return true;
      return null;
    });
    vi.mocked(getCombatSummary).mockReturnValue({
      creatures: [{ name: 'Fiend', type: 'Fiend' }, { name: 'testTarget', type: 'player' }],
    });
    vi.mocked(getAllyList).mockReturnValue(['testTarget']);

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={['testAlly']}
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
      expect(screen.getByText(/Advantage/)).toBeInTheDocument();
    });
  });

  // ── Bane ──

  it('applies bane penalty when target has bane_penalty targetEffect', async () => {
    rollD20.mockReturnValue(15);
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [{ target: 'testTarget', effect: 'bane_penalty' }];
      return null;
    });
    vi.mocked(rollExpression).mockReturnValue({ total: 2 });

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
      expect(screen.getByText(/Bane/i)).toBeInTheDocument();
    });
  });

  // ── Bless ──

  it('applies bless bonus when target has bless_bonus targetEffect', async () => {
    rollD20.mockReturnValue(15);
    getRuntimeValue.mockImplementation((name, key) => {
      if (name === 'campaign' && key === 'targetEffects') return [{ target: 'testTarget', effect: 'bless_bonus' }];
      return null;
    });
    vi.mocked(rollExpression).mockReturnValue({ total: 4 });

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
      expect(screen.getByText(/Bless/i)).toBeInTheDocument();
    });
  });

  // ── Warding Bond ──

  it('applies warding bond bonus when target has warding_bond buff', async () => {
    rollD20.mockReturnValue(15);
    getRuntimeValue.mockImplementation((name, key, campaign) => {
      if (name === 'testTarget' && key === 'activeBuffs' && campaign === 'test-campaign') return [{ effect: 'warding_bond', saveBonus: 1 }];
      return null;
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
      expect(screen.getByText(/Warding Bond/i)).toBeInTheDocument();
    });
  });
});
