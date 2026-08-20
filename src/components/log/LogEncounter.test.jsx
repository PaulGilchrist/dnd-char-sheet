// @improved-by-ai
import { screen, cleanup, render } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockState = vi.hoisted(() => ({ logEntries: [], initialized: true }));
const mockAddEntry = vi.hoisted(() => vi.fn(async () => {}));

vi.mock('../../hooks/runtime/useLog.js', () => ({
  default: vi.fn(() => ({
    logEntries: mockState.logEntries,
    initialized: mockState.initialized,
    addEntry: mockAddEntry,
  })),
}));

import Log from './Log.jsx';

const CHARS = [{ name: 'Frodo' }, { name: 'Aragorn' }];

const enc = (o = {}) => ({
  id: 'e', type: 'encounter', action: 'started', encounterName: 'Orc Ambush',
  monsters: [], xpPerChar: 0, lootItems: [], timestamp: Date.now(), ...o,
});

function q(sel) {
  return document.querySelector(sel);
}

function setup(entries, initialized, characters) {
  mockState.logEntries.length = 0;
  if (entries) mockState.logEntries.push(...entries);
  mockState.initialized = initialized ?? true;
  return render(<Log campaignName="test-campaign" characters={characters ?? CHARS} />);
}

describe('Log - EncounterEntry rendering', () => {
  beforeEach(() => {
    cleanup();
    mockState.logEntries.length = 0;
    mockState.initialized = true;
    mockAddEntry.mockClear();
  });

  describe('started encounter', () => {
    it('renders encounter name, skull icon, monster list, and CSS classes', () => {
      setup([enc({ action: 'started', monsters: ['Gob x4', 'Troll'] })]);
      expect(screen.getByText(/Encounter Started/i)).toBeInTheDocument();
      expect(q('.log-encounter i.fa-skull')).toBeInTheDocument();
      expect(q('.log-entry.log-encounter.log-encounter-start')).toBeInTheDocument();
      expect(q('.log-encounter-name')).toHaveTextContent(/Orc Ambush/i);
      expect(screen.getByText(/Gob x4/i)).toBeInTheDocument();
      expect(q('.log-encounter-monster')).toBeInTheDocument();
    });

    it('renders timestamp', () => {
      const ts = Date.now();
      setup([enc({ action: 'started', timestamp: ts })]);
      expect(q('.log-time')).toBeInTheDocument();
    });

    it('renders without monsters when monsters is an empty array', () => {
      setup([enc({ action: 'started', monsters: [] })]);
      expect(screen.getByText(/Encounter Started/i)).toBeInTheDocument();
      expect(q('.log-encounter-monsters')).not.toBeInTheDocument();
    });

    it('renders without monsters when monsters is undefined', () => {
      setup([enc({ action: 'started', monsters: undefined })]);
      expect(screen.getByText(/Encounter Started/i)).toBeInTheDocument();
      expect(q('.log-encounter-monsters')).not.toBeInTheDocument();
    });

    it('renders without monster names when encounterName is missing', () => {
      setup([enc({ action: 'started', encounterName: '' })]);
      expect(screen.getByText(/Encounter Started/i)).toBeInTheDocument();
      expect(q('.log-encounter-name')).toHaveTextContent('');
    });
  });

  describe('completed encounter', () => {
    it('renders encounter completed text, trophy icon, XP, loot items, and CSS classes', () => {
      setup([enc({ action: 'completed', xpPerChar: 750, lootItems: ['Sword'] })]);
      expect(screen.getByText(/Encounter Completed/i)).toBeInTheDocument();
      expect(q('.log-encounter i.fa-trophy')).toBeInTheDocument();
      expect(q('.log-entry.log-encounter.log-encounter-end')).toBeInTheDocument();
      expect(screen.getByText(/750 XP per character/i)).toBeInTheDocument();
      expect(q('.log-encounter-xp i.fa-star')).toBeInTheDocument();
      expect(screen.getByText(/Sword/i)).toBeInTheDocument();
      expect(q('.log-encounter-loot-item')).toBeInTheDocument();
    });

    it('renders timestamp', () => {
      const ts = Date.now();
      setup([enc({ action: 'completed', timestamp: ts })]);
      expect(q('.log-time')).toBeInTheDocument();
    });

    it('hides XP display when xpPerChar is zero', () => {
      setup([enc({ action: 'completed', xpPerChar: 0 })]);
      expect(screen.queryByText(/XP per character/i)).not.toBeInTheDocument();
    });

    it('hides XP display when xpPerChar is negative', () => {
      setup([enc({ action: 'completed', xpPerChar: -100 })]);
      expect(screen.queryByText(/XP per character/i)).not.toBeInTheDocument();
    });

    it('hides loot list when lootItems is an empty array', () => {
      setup([enc({ action: 'completed', lootItems: [] })]);
      expect(q('.log-encounter-loot')).not.toBeInTheDocument();
    });

    it('hides loot list when lootItems is undefined', () => {
      setup([enc({ action: 'completed', lootItems: undefined })]);
      expect(q('.log-encounter-loot')).not.toBeInTheDocument();
    });

    it('hides loot list when lootItems is missing entirely', () => {
      const entry = enc({ action: 'completed' });
      delete entry.lootItems;
      setup([entry]);
      expect(q('.log-encounter-loot')).not.toBeInTheDocument();
    });
  });
});
