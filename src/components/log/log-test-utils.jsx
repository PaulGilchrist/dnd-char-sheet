import { render, cleanup } from '@testing-library/react';
import { vi } from 'vitest';

const mockState = vi.hoisted(() => ({ logEntries: [], initialized: true }));
const mockAddEntry = vi.hoisted(() => vi.fn(async () => {}));

vi.mock('../../hooks/runtime/useLog.js', () => ({
  default: vi.fn(() => ({
    logEntries: mockState.logEntries,
    initialized: mockState.initialized,
    addEntry: mockAddEntry,
  })),
}));

export { mockState, mockAddEntry, cleanup };

export const CHARS = [{ name: 'Frodo' }, { name: 'Aragorn' }];

// ── factories with spread-last so overrides work ────────────
export const roll = (o = {}) => ({
  id: 'r', type: 'roll', rollType: 'attack', characterName: 'Frodo',
  name: 'LS Attack', timestamp: Date.now(), rolls: [15], total: 20,
  bonus: 5, hit: true, targetAc: 15, isAutoMiss: false, isNatural20: false,
  isNatural1: false, targetName: 'Orc', coverAcBonus: 0, coverReason: '',
  rangeReason: '', damageType: '', mode: '', ...o,
});

export const note = (o = {}) => ({
  id: 'n', type: 'note', characterName: 'Frodo', timestamp: Date.now(),
  noteText: 'Quest begins.', ...o,
});

export const travel = (o = {}) => ({
  id: 't', type: 'travel', action: 'advance', hex: { q: 3, r: -7 },
  timestamp: Date.now(), terrain: '', weather: '', eventTitle: '', ...o,
});

export const loot = (o = {}) => ({
  id: 'l', type: 'loot', timestamp: Date.now(), xpPerChar: 0, lootItems: [], ...o,
});

export const cond = (o = {}) => ({
  id: 'c', type: 'condition', characterName: 'Gollum', action: 'applied',
  condition: 'charmed', dc: 13, ability: 'wisdom', sourceName: '',
  timestamp: Date.now(), ...o,
});

export const enc = (o = {}) => ({
  id: 'e', type: 'encounter', action: 'started', encounterName: 'Orc Ambush',
  monsters: [], xpPerChar: 0, lootItems: [], timestamp: Date.now(), ...o,
});

export const hp = (o = {}) => ({
  id: 'hp', type: 'hp_change', targetName: 'Gimli', delta: -5, currentHp: 20,
  maxHp: 25, threshold: undefined, sourceName: '', isUnconscious: false,
  timestamp: Date.now(), ...o,
});

export const ds = (o = {}) => ({
  id: 'ds', type: 'death_save', characterName: 'Gimli', success: true, roll: 15,
  isNatural20: false, isNatural1: false, timestamp: Date.now(), ...o,
});

export const spell = (o = {}) => ({
  id: 's', type: 'spell', characterName: 'Gandalf', spellName: 'Fireball',
  spellLevel: 3, castingTime: 'Action', metamagic: [], spCost: 0,
  timestamp: Date.now(), ...o,
});

export const meta = (o = {}) => ({
  id: 'm', type: 'metamagic', characterName: 'Gandalf', spellName: 'Fireball',
  targetName: 'Orc', originalDamage: 30, newTotal: 38, damageDifference: 8,
  rerolledDiceCount: 2, rollType: 'empowered-spell', timestamp: Date.now(), ...o,
});

// ── Q helpers so we don't repeat code ───────────────────────
export const q = (sel) => document.querySelector(sel);

export function setup(Log, entries, initialized, characters) {
  mockState.logEntries.length = 0;
  if (entries) mockState.logEntries.push(...entries);
  mockState.initialized = initialized ?? true;
  return render(<Log campaignName="test-campaign" characters={characters ?? CHARS} />);
}

export function beforeEachSetup() {
  cleanup();
  mockState.logEntries.length = 0;
  mockState.initialized = true;
  mockAddEntry.mockClear();
}
