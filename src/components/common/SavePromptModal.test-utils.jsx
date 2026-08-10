// Shared test utilities for SavePromptModal tests

import React from 'react';
import { vi } from 'vitest';

// ── Subscriber mock factory ──

export function createMockSubscriber(campaignName) {
  return function MockSubscriber({ handleEvent }) {
    return React.createElement(
      'div',
      { 'data-testid': 'subscriber' },
      React.createElement(
        'button',
        {
          'data-testid': 'subscriber-trigger',
          onClick: () =>
            handleEvent({
              key: `change-${campaignName}-savePrompt-testTarget`,
              data: {
                promptId: 'test-prompt-1',
                targetName: 'testTarget',
                saveType: 'con',
                saveDc: 12,
                disadvantage: false,
              },
            }),
        }
      ),
      React.createElement(
        'button',
        {
          'data-testid': 'subscriber-trigger-second',
          onClick: () =>
            handleEvent({
              key: `change-${campaignName}-savePrompt-testTarget2`,
              data: {
                promptId: 'test-prompt-2',
                targetName: 'testTarget2',
                saveType: 'dex',
                saveDc: 15,
                disadvantage: true,
                dcSuccess: 'half',
              },
            }),
        }
      ),
      React.createElement(
        'button',
        {
          'data-testid': 'subscriber-trigger-cleared',
          onClick: () =>
            handleEvent({
              key: `change-${campaignName}-savePromptCleared-testTarget`,
              data: {
                promptId: 'test-prompt-1',
              },
            }),
        }
      ),
      React.createElement(
        'button',
        {
          'data-testid': 'subscriber-trigger-disadvantage',
          onClick: () =>
            handleEvent({
              key: `change-${campaignName}-savePrompt-testTarget3`,
              data: {
                promptId: 'test-prompt-disadv',
                targetName: 'testTarget3',
                saveType: 'str',
                saveDc: 14,
                disadvantage: true,
                dcSuccess: 'half',
                sourceName: 'Fireball',
              },
            }),
        }
      ),
      React.createElement(
        'button',
        {
          'data-testid': 'subscriber-trigger-dex',
          onClick: () =>
            handleEvent({
              key: `change-${campaignName}-savePrompt-testTarget`,
              data: {
                promptId: 'test-prompt-dex',
                targetName: 'testTarget',
                saveType: 'dex',
                saveDc: 17,
                disadvantage: false,
                dcSuccess: 'half',
                sourceName: 'Sacred Flame',
              },
            }),
        }
      ),
      React.createElement(
        'button',
        {
          'data-testid': 'subscriber-trigger-none-dc',
          onClick: () =>
            handleEvent({
              key: `change-${campaignName}-savePrompt-testTarget4`,
              data: {
                promptId: 'test-prompt-none',
                targetName: 'testTarget4',
                saveType: 'wis',
                saveDc: 16,
                disadvantage: false,
                dcSuccess: 'none',
              },
            }),
        }
      ),
    );
  };
}

// ── EventSource setup ──

const MockEventSource = vi.fn();
MockEventSource.prototype.close = vi.fn();

export function setupGlobalEventSource() {
  Object.defineProperty(globalThis, 'EventSource', {
    value: MockEventSource,
    writable: true,
    configurable: true,
  });
}

export function teardownGlobalEventSource() {
  delete globalThis.EventSource;
}

// ── Fixtures ──

export function createCharacter(name, saveModifiers, evasionEffects, abilities) {
  return {
    name,
    computedStats: {
      abilities: abilities || [
        { name: 'Strength', bonus: 2 },
        { name: 'Dexterity', bonus: 1 },
        { name: 'Constitution', bonus: 3 },
        { name: 'Intelligence', bonus: 0 },
        { name: 'Wisdom', bonus: 1 },
        { name: 'Charisma', bonus: 4 },
      ],
      evasionEffects: evasionEffects || [],
    },
    saveModifiers: saveModifiers || [],
  };
}

export function createRageCharacter(name, rageDamage) {
  return {
    name,
    level: 1,
    class: { class_levels: [{ rage_damage: rageDamage }] },
    computedStats: {
      abilities: [{ name: 'Constitution', bonus: 3 }],
      evasionEffects: [],
      automation: { passives: [] },
    },
    saveModifiers: [],
  };
}

// ── Default beforeEach/afterEach setup ──

export function setupDefaults(rollD20, computeAuraBonus, getRuntimeValue) {
  vi.clearAllMocks();
  setupGlobalEventSource();
  rollD20.mockReturnValue(15);
  computeAuraBonus.mockResolvedValue({ bonus: 0, sourceName: null });
  getRuntimeValue.mockImplementation(() => null);
}

export function cleanupDefaults() {
  vi.clearAllMocks();
  teardownGlobalEventSource();
}
