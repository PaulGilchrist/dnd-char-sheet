import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SavePromptModal from './SavePromptModal.jsx';
import { rollD20 } from '../../services/dice/diceRoller.js';
import { computeAuraBonus } from '../../services/combat/auras/auraOfProtection.js';
import { getRuntimeValue } from '../../hooks/runtime/useRuntimeState.js';
import { setupDefaults, cleanupDefaults, createCharacter, createRageCharacter, setupGlobalEventSource, teardownGlobalEventSource } from './SavePromptModal.test-utils.jsx';

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
  const { createMockSubscriber } = require('./SavePromptModal.test-utils.jsx');
  return { default: createMockSubscriber('test-campaign') };
});

describe('SavePromptModal — test-utils coverage (createMockSubscriber)', () => {
  beforeEach(() => setupDefaults(rollD20, computeAuraBonus, getRuntimeValue));
  afterEach(cleanupDefaults);

  it('triggers handleEvent callback when subscriber-trigger is clicked (createMockSubscriber statement coverage)', async () => {
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
  });

  it('triggers handleEvent callback when subscriber-trigger-second is clicked (createMockSubscriber statement coverage)', async () => {
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

  it('triggers handleEvent callback when subscriber-trigger-cleared is clicked (createMockSubscriber statement coverage)', async () => {
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

    const clearedBtn = screen.getByTestId('subscriber-trigger-cleared');
    fireEvent.click(clearedBtn);

    await waitFor(() => {
      expect(screen.queryByText(/must make a/i)).not.toBeInTheDocument();
    });
  });

  it('triggers handleEvent callback when subscriber-trigger-disadvantage is clicked (createMockSubscriber statement coverage)', async () => {
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

  it('triggers handleEvent callback when subscriber-trigger-dex is clicked (createMockSubscriber statement coverage)', async () => {
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

  it('triggers handleEvent callback when subscriber-trigger-none-dc is clicked (createMockSubscriber statement coverage)', async () => {
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

  it('setupDefaults configures mocks correctly', () => {
    const rollD20Mock = vi.fn();
    const computeAuraBonusMock = vi.fn();
    const getRuntimeValueMock = vi.fn();
    setupDefaults(rollD20Mock, computeAuraBonusMock, getRuntimeValueMock);
    // mockReturnValue(15) configures the mock to return 15 on next call
    expect(rollD20Mock()).toBe(15);
    // mockResolvedValue configures the mock to resolve with the given value
    computeAuraBonusMock().then(result => {
      expect(result.bonus).toBe(0);
    });
    // mockImplementation configures the mock to return null
    expect(getRuntimeValueMock()).toBe(null);
  });

  it('cleanupDefaults clears mocks and tears down EventSource', () => {
    const rollD20Mock = vi.fn();
    const computeAuraBonusMock = vi.fn();
    const getRuntimeValueMock = vi.fn();
    setupDefaults(rollD20Mock, computeAuraBonusMock, getRuntimeValueMock);
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
});
