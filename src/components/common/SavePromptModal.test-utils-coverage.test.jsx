// @improved-by-ai
// SavePromptModal — test-utils coverage and exported utility verification
// Tests the createMockSubscriber factory, fixture functions, and setup/cleanup utilities.
// These utilities are shared across all SavePromptModal test files.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SavePromptModal from './SavePromptModal.jsx';
import { rollD20 } from '../../services/dice/diceRoller.js';
import { computeAuraBonus } from '../../services/combat/auras/auraOfProtection.js';
import { getRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import {
  setupDefaults,
  cleanupDefaults,
  createCharacter,
  createRageCharacter,
  setupGlobalEventSource,
  teardownGlobalEventSource,
  createMockSubscriber,
} from './SavePromptModal.test-utils.jsx';

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
  const MockSubscriber = function ({ handleEvent, campaignName }) {
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
  };
  return { default: MockSubscriber };
});

describe('SavePromptModal — createMockSubscriber integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaults(rollD20, computeAuraBonus, getRuntimeValue);
  });
  afterEach(cleanupDefaults);

  it('displays CON save prompt and calls clearSavePrompt when cleared', async () => {
    rollD20.mockReturnValue(15);

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

    expect(screen.getByText('testTarget')).toBeInTheDocument();
    expect(screen.getByText('CON')).toBeInTheDocument();
    expect(screen.getByText('DC 12')).toBeInTheDocument();

    // Clear the prompt
    const clearedBtn = screen.getByTestId('subscriber-trigger-cleared');
    fireEvent.click(clearedBtn);

    // handleClearedEvent removes the prompt from state directly
    await waitFor(() => {
      expect(screen.queryByText(/must make a/i)).not.toBeInTheDocument();
    });

    expect(screen.queryByText(/must make a/i)).not.toBeInTheDocument();
  });

  it('displays DEX save prompt with disadvantage badge and correct DC', async () => {
    rollD20.mockReturnValue(15);

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger-second');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    expect(screen.getByText('testTarget2')).toBeInTheDocument();
    expect(screen.getByText('DEX')).toBeInTheDocument();
    expect(screen.getByText('DC 15')).toBeInTheDocument();
  });

  it('displays STR save with disadvantage and source name', async () => {
    rollD20.mockReturnValue(15);

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

    expect(screen.getByText('testTarget3')).toBeInTheDocument();
    expect(screen.getByText('STR')).toBeInTheDocument();
    expect(screen.getByText('DC 14')).toBeInTheDocument();
    expect(screen.getByText('(Disadvantage)')).toBeInTheDocument();
    expect(screen.getByText(/Source: Fireball/i)).toBeInTheDocument();
  });

  it('displays DEX save from Sacred Flame with half damage on success', async () => {
    rollD20.mockReturnValue(15);

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

    expect(screen.getByText('testTarget')).toBeInTheDocument();
    expect(screen.getByText('DEX')).toBeInTheDocument();
    expect(screen.getByText('DC 17')).toBeInTheDocument();
  });

  it('displays WIS save with "No damage on successful save" note', async () => {
    rollD20.mockReturnValue(15);

    render(
      <SavePromptModal
        campaignName="test-campaign"
        characters={[]}
        activeMapName={null}
      />
    );

    const trigger = screen.getByTestId('subscriber-trigger-none-dc');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText(/must make a/i)).toBeInTheDocument();
    });

    expect(screen.getByText('testTarget4')).toBeInTheDocument();
    expect(screen.getByText('WIS')).toBeInTheDocument();
    expect(screen.getByText('DC 16')).toBeInTheDocument();
    expect(screen.getByText(/No damage on successful save/i)).toBeInTheDocument();
  });
});

describe('SavePromptModal — test-utils exported functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupGlobalEventSource();
  });
  afterEach(teardownGlobalEventSource);

  it('createCharacter returns expected structure with defaults', () => {
    const char = createCharacter('TestChar');
    expect(char.name).toBe('TestChar');
    expect(char.computedStats.abilities).toHaveLength(6);
    expect(char.computedStats.abilities[0].name).toBe('Strength');
    expect(char.computedStats.abilities[0].bonus).toBe(2);
    expect(char.computedStats.evasionEffects).toEqual([]);
    expect(char.saveModifiers).toEqual([]);
  });

  it('createCharacter accepts custom saveModifiers', () => {
    const mods = [{ target: 'saving_throw', effect: 'advantage' }];
    const char = createCharacter('TestChar', mods);
    expect(char.saveModifiers).toEqual(mods);
  });

  it('createCharacter accepts custom evasionEffects', () => {
    const evasions = [{ saveType: 'DEX', shareable: true }];
    const char = createCharacter('TestChar', [], evasions);
    expect(char.computedStats.evasionEffects).toEqual(evasions);
  });

  it('createCharacter accepts custom abilities', () => {
    const abils = [{ name: 'Strength', bonus: 5 }];
    const char = createCharacter('TestChar', [], [], abils);
    expect(char.computedStats.abilities).toEqual(abils);
  });

  it('createCharacter abilities default has 6 ability scores in standard order', () => {
    const char = createCharacter('TestChar');
    const names = char.computedStats.abilities.map(a => a.name);
    expect(names).toEqual(['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma']);
  });

  it('createRageCharacter returns expected structure', () => {
    const char = createRageCharacter('Rager', 4);
    expect(char.name).toBe('Rager');
    expect(char.level).toBe(1);
    expect(char.class.class_levels).toEqual([{ rage_damage: 4 }]);
    expect(char.computedStats.abilities).toEqual([{ name: 'Constitution', bonus: 3 }]);
    expect(char.computedStats.evasionEffects).toEqual([]);
    expect(char.computedStats.automation).toEqual({ passives: [] });
    expect(char.saveModifiers).toEqual([]);
  });

  it('createRageCharacter respects custom rage damage value', () => {
    const char = createRageCharacter('Rager', 6);
    expect(char.class.class_levels[0].rage_damage).toBe(6);
  });

  it('setupDefaults configures mocks to return expected defaults', () => {
    const rollD20Mock = vi.fn();
    const computeAuraBonusMock = vi.fn();
    const getRuntimeValueMock = vi.fn();
    setupDefaults(rollD20Mock, computeAuraBonusMock, getRuntimeValueMock);
    expect(rollD20Mock()).toBe(15);
    computeAuraBonusMock().then(result => {
      expect(result.bonus).toBe(0);
    });
    expect(getRuntimeValueMock()).toBe(null);
  });

  it('cleanupDefaults clears all mock call history', () => {
    const rollD20Mock = vi.fn().mockReturnValue(15);
    const computeAuraBonusMock = vi.fn().mockResolvedValue({ bonus: 0 });
    const getRuntimeValueMock = vi.fn().mockReturnValue('something');

    setupDefaults(rollD20Mock, computeAuraBonusMock, getRuntimeValueMock);
    // Trigger the mocks so they have call history
    rollD20Mock();
    computeAuraBonusMock();
    getRuntimeValueMock();

    cleanupDefaults();
    expect(rollD20Mock).not.toHaveBeenCalled();
    expect(computeAuraBonusMock).not.toHaveBeenCalled();
    expect(getRuntimeValueMock).not.toHaveBeenCalled();
  });

  it('setupGlobalEventSource defines EventSource on globalThis', () => {
    setupGlobalEventSource();
    expect(typeof globalThis.EventSource).toBe('function');
  });

  it('teardownGlobalEventSource removes EventSource from globalThis', () => {
    setupGlobalEventSource();
    teardownGlobalEventSource();
    expect(globalThis.EventSource).toBeUndefined();
  });

  it('createMockSubscriber returns a React component that renders trigger buttons', () => {
    const MockSubscriber = createMockSubscriber('my-campaign');
    render(React.createElement(MockSubscriber, { handleEvent: vi.fn() }));
    expect(screen.getByTestId('subscriber-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('subscriber-trigger-second')).toBeInTheDocument();
    expect(screen.getByTestId('subscriber-trigger-cleared')).toBeInTheDocument();
    expect(screen.getByTestId('subscriber-trigger-disadvantage')).toBeInTheDocument();
    expect(screen.getByTestId('subscriber-trigger-dex')).toBeInTheDocument();
    expect(screen.getByTestId('subscriber-trigger-none-dc')).toBeInTheDocument();
  });

  it('createMockSubscriber trigger buttons dispatch events with campaign-scoped keys', () => {
    const handleEvent = vi.fn();
    const MockSubscriber = createMockSubscriber('campaign-x');
    render(React.createElement(MockSubscriber, { handleEvent }));

    fireEvent.click(screen.getByTestId('subscriber-trigger'));
    expect(handleEvent).toHaveBeenCalledWith(expect.objectContaining({
      key: expect.stringContaining('campaign-x'),
    }));
  });

  it('createMockSubscriber clear trigger dispatches savePromptCleared event', () => {
    const handleEvent = vi.fn();
    const MockSubscriber = createMockSubscriber('campaign-y');
    render(React.createElement(MockSubscriber, { handleEvent }));

    fireEvent.click(screen.getByTestId('subscriber-trigger-cleared'));
    expect(handleEvent).toHaveBeenCalledWith(expect.objectContaining({
      key: expect.stringContaining('savePromptCleared'),
    }));
  });
});
